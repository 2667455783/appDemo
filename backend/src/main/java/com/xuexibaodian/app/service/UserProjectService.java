package com.xuexibaodian.app.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.xuexibaodian.app.common.ApiException;
import com.xuexibaodian.app.dto.UserProjectDetailDto;
import com.xuexibaodian.app.dto.UserProjectSummaryDto;
import com.xuexibaodian.app.dto.UserProjectUpsertRequest;
import com.xuexibaodian.app.entity.UserProject;
import com.xuexibaodian.app.repo.UserProjectRepository;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.nio.charset.Charset;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.format.DateTimeFormatter;
import java.util.Base64;
import java.util.Collections;
import java.util.Enumeration;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.stream.Collectors;
import java.util.zip.ZipEntry;
import java.util.zip.ZipException;
import java.util.zip.ZipFile;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

@Service
public class UserProjectService {

  private static final int MAX_FILES = 200;
  private static final long MAX_ZIP_BYTES = 30L * 1024 * 1024;
  private static final long MAX_TEXT_BYTES = 2L * 1024 * 1024;
  private static final long MAX_BIN_BYTES = 10L * 1024 * 1024;
  private static final DateTimeFormatter TS = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");

  private final UserProjectRepository projects;
  private final JsonHelper json;

  public UserProjectService(UserProjectRepository projects, JsonHelper json) {
    this.projects = projects;
    this.json = json;
  }

  @Transactional(readOnly = true)
  public List<UserProjectSummaryDto> list(Long userId) {
    return projects.findByUserIdOrderByUpdatedAtDesc(userId).stream()
        .map(this::toSummary)
        .collect(Collectors.toList());
  }

  @Transactional(readOnly = true)
  public UserProjectDetailDto get(Long userId, Long id) {
    return toDetail(require(userId, id));
  }

  @Transactional
  public UserProjectDetailDto upsert(Long userId, UserProjectUpsertRequest body) {
    if (body == null || body.files == null || body.files.isEmpty()) {
      throw new ApiException(400, "files 不能为空");
    }
    if (body.files.size() > MAX_FILES) {
      throw new ApiException(400, "一次最多保存 " + MAX_FILES + " 个文件");
    }
    Map<String, String> files = normalizeFiles(body.files);
    String openFile = firstNonBlank(body.openFile, pickOpenFile(files));
    String title = firstNonBlank(body.title, deriveTitle(files, "个人项目"));
    String sourceType = firstNonBlank(body.sourceType, "upload");

    UserProject row;
    if (body.id != null) {
      row = require(userId, body.id);
    } else {
      row = new UserProject();
      row.setUserId(userId);
    }
    row.setTitle(title);
    row.setSourceType(sourceType);
    row.setOpenFile(openFile);
    row.setFileCount(files.size());
    row.setFilesJson(json.write(files));
    projects.save(row);
    return toDetail(row);
  }

  @Transactional
  public UserProjectDetailDto uploadZip(Long userId, MultipartFile file, String title) {
    if (file == null || file.isEmpty()) {
      throw new ApiException(400, "请选择 zip 文件（文件不能为空）");
    }
    String name = file.getOriginalFilename() == null ? "project.zip" : file.getOriginalFilename();
    if (file.getSize() > MAX_ZIP_BYTES) {
      throw new ApiException(400, "zip 过大（上限 30MB）");
    }
    try {
      return uploadZipBytes(userId, file.getBytes(), name, title);
    } catch (ApiException e) {
      throw e;
    } catch (IOException e) {
      throw new ApiException(400, "读取 zip 失败：" + e.getMessage());
    }
  }

  @Transactional
  public UserProjectDetailDto uploadZipBytes(
      Long userId, byte[] zipBytes, String filename, String title) {
    if (zipBytes == null || zipBytes.length == 0) {
      throw new ApiException(400, "zip 内容为空，请重新选择文件后再上传");
    }
    if (zipBytes.length > MAX_ZIP_BYTES) {
      throw new ApiException(400, "zip 过大（上限 30MB）");
    }
    String name = filename == null ? "project.zip" : filename;
    if (!name.toLowerCase(Locale.ROOT).endsWith(".zip")) {
      name = name + ".zip";
    }
    Map<String, String> files = extractZipBytes(zipBytes);
    if (files.isEmpty()) {
      throw new ApiException(
          400, "zip 内没有可读的网页/代码文件（支持 html/css/js/vue/react/json 等）");
    }
    UserProjectUpsertRequest body = new UserProjectUpsertRequest();
    String fromName = name.replaceAll("(?i)\\.zip$", "");
    body.title = firstNonBlank(title, fromName.isBlank() ? "Zip 项目" : fromName);
    body.sourceType = "zip";
    body.files = files;
    body.openFile = pickOpenFile(files);
    return upsert(userId, body);
  }

  @Transactional
  public void delete(Long userId, Long id) {
    UserProject row = require(userId, id);
    projects.delete(row);
  }

  private UserProject require(Long userId, Long id) {
    return projects
        .findByIdAndUserId(id, userId)
        .orElseThrow(() -> new ApiException(404, "个人项目不存在"));
  }

  private UserProjectSummaryDto toSummary(UserProject row) {
    UserProjectSummaryDto dto = new UserProjectSummaryDto();
    dto.id = row.getId();
    dto.title = row.getTitle();
    dto.sourceType = row.getSourceType();
    dto.openFile = row.getOpenFile();
    dto.fileCount = row.getFileCount();
    dto.updatedAt = row.getUpdatedAt() == null ? null : row.getUpdatedAt().format(TS);
    return dto;
  }

  private UserProjectDetailDto toDetail(UserProject row) {
    UserProjectDetailDto dto = new UserProjectDetailDto();
    dto.id = row.getId();
    dto.title = row.getTitle();
    dto.sourceType = row.getSourceType();
    dto.openFile = row.getOpenFile();
    dto.fileCount = row.getFileCount();
    dto.updatedAt = row.getUpdatedAt() == null ? null : row.getUpdatedAt().format(TS);
    Map<String, String> files = readFiles(row.getFilesJson());
    dto.files = files == null ? Collections.emptyMap() : files;
    return dto;
  }

  private Map<String, String> readFiles(String filesJson) {
    Map<String, String> map =
        json.read(filesJson, new TypeReference<Map<String, String>>() {});
    return map == null ? Collections.emptyMap() : map;
  }

  private Map<String, String> normalizeFiles(Map<String, String> raw) {
    Map<String, String> out = new LinkedHashMap<>();
    for (Map.Entry<String, String> e : raw.entrySet()) {
      String path = normalizePath(e.getKey());
      if (path.isBlank() || path.endsWith("/")) continue;
      if (shouldSkip(path)) continue;
      out.put(path, e.getValue() == null ? "" : e.getValue());
      if (out.size() > MAX_FILES) {
        throw new ApiException(400, "一次最多保存 " + MAX_FILES + " 个文件");
      }
    }
    return out;
  }

  /**
   * 用 ZipFile（读中央目录）解压。浏览器/JSZip 常生成「STORE + data descriptor」条目，
   * ZipInputStream 对这类条目会读出空内容，必须走 ZipFile。
   */
  private Map<String, String> extractZipBytes(byte[] zipBytes) {
    Path tmp = null;
    try {
      tmp = Files.createTempFile("user-project-", ".zip");
      Files.write(tmp, zipBytes);
      Map<String, String> utf8 = extractZipFile(tmp, StandardCharsets.UTF_8);
      if (!utf8.isEmpty()) return utf8;
      Map<String, String> gbk = extractZipFile(tmp, Charset.forName("GBK"));
      if (!gbk.isEmpty()) return gbk;
      return utf8;
    } catch (ApiException e) {
      throw e;
    } catch (ZipException e) {
      throw new ApiException(400, "无法解析 zip（可能已损坏或不是 zip）：" + e.getMessage());
    } catch (IOException e) {
      throw new ApiException(400, "读取 zip 失败：" + e.getMessage());
    } finally {
      if (tmp != null) {
        try {
          Files.deleteIfExists(tmp);
        } catch (IOException ignored) {
          /* ignore */
        }
      }
    }
  }

  private Map<String, String> extractZipFile(Path zipPath, Charset charset) throws IOException {
    Map<String, String> files = new LinkedHashMap<>();
    try (ZipFile zf = new ZipFile(zipPath.toFile(), charset)) {
      Enumeration<? extends ZipEntry> en = zf.entries();
      while (en.hasMoreElements()) {
        ZipEntry entry = en.nextElement();
        if (entry.isDirectory()) continue;
        String path;
        try {
          path = normalizePath(entry.getName());
        } catch (ApiException ex) {
          continue;
        }
        if (path.isBlank() || shouldSkip(path)) continue;
        if (files.size() >= MAX_FILES) {
          throw new ApiException(400, "zip 内文件过多（上限 " + MAX_FILES + "）");
        }
        long size = entry.getSize();
        long limit = isBinaryPath(path) ? MAX_BIN_BYTES : MAX_TEXT_BYTES;
        if (size > limit) {
          throw new ApiException(400, "文件过大：" + path);
        }
        byte[] bytes;
        try (InputStream in = zf.getInputStream(entry)) {
          bytes = readLimited(in, limit, path);
        }
        if (isTextPath(path) || isPlainName(path)) {
          files.put(path, new String(bytes, StandardCharsets.UTF_8));
        } else if (isBinaryPath(path)) {
          String mime = guessMime(path);
          files.put(path, "data:" + mime + ";base64," + Base64.getEncoder().encodeToString(bytes));
        } else if (bytes.length <= 512 * 1024) {
          files.put(path, new String(bytes, StandardCharsets.UTF_8));
        }
      }
    }
    return stripCommonRoot(files);
  }

  /** LICENSE / Makefile 等无扩展名文本 */
  private static boolean isPlainName(String path) {
    String leaf = path.contains("/") ? path.substring(path.lastIndexOf('/') + 1) : path;
    String lower = leaf.toLowerCase(Locale.ROOT);
    return lower.equals("license")
        || lower.equals("licence")
        || lower.equals("makefile")
        || lower.equals("dockerfile")
        || lower.equals("readme");
  }

  private static byte[] readLimited(InputStream in, long max, String path) throws IOException {
    ByteArrayOutputStream buf = new ByteArrayOutputStream();
    byte[] chunk = new byte[8192];
    long total = 0;
    int n;
    while ((n = in.read(chunk)) >= 0) {
      total += n;
      if (total > max) {
        throw new ApiException(400, "文件过大：" + path);
      }
      buf.write(chunk, 0, n);
    }
    return buf.toByteArray();
  }

  private static Map<String, String> stripCommonRoot(Map<String, String> files) {
    if (files.size() <= 1) return files;
    List<String> paths = files.keySet().stream().toList();
    String[][] parts =
        paths.stream().map(p -> p.split("/")).toArray(String[][]::new);
    int depth = 0;
    while (true) {
      String head = parts[0].length > depth ? parts[0][depth] : null;
      if (head == null) break;
      boolean same = true;
      for (String[] p : parts) {
        if (p.length <= depth + 1 || !head.equals(p[depth])) {
          same = false;
          break;
        }
      }
      if (!same) break;
      depth++;
    }
    if (depth == 0) return files;
    Map<String, String> out = new LinkedHashMap<>();
    for (Map.Entry<String, String> e : files.entrySet()) {
      String[] p = e.getKey().split("/");
      String next = String.join("/", java.util.Arrays.copyOfRange(p, depth, p.length));
      if (!next.isBlank()) out.put(next, e.getValue());
    }
    return out;
  }

  private static String pickOpenFile(Map<String, String> files) {
    if (files.containsKey("index.html")) return "index.html";
    if (files.containsKey("public/index.html")) return "public/index.html";
    for (String p :
        List.of(
            "src/App.vue",
            "src/App.jsx",
            "src/main.js",
            "src/main.ts",
            "src/main.jsx",
            "src/main.tsx")) {
      if (files.containsKey(p)) return p;
    }
    return files.keySet().stream()
        .filter(p -> p.toLowerCase(Locale.ROOT).endsWith(".html"))
        .sorted()
        .findFirst()
        .orElse(files.keySet().stream().sorted().findFirst().orElse(""));
  }

  private static String deriveTitle(Map<String, String> files, String fallback) {
    if (files.containsKey("package.json")) {
      String raw = files.get("package.json");
      if (raw != null) {
        int i = raw.indexOf("\"name\"");
        if (i >= 0) {
          int q1 = raw.indexOf('"', i + 6);
          int q2 = raw.indexOf('"', q1 + 1);
          if (q1 > 0 && q2 > q1) return raw.substring(q1 + 1, q2);
        }
      }
    }
    return fallback + " · " + files.size() + " 个文件";
  }

  private static boolean shouldSkip(String path) {
    String lower = path.toLowerCase(Locale.ROOT);
    if (lower.startsWith("__macosx/") || lower.contains("/__macosx/")) return true;
    if (lower.contains("/node_modules/") || lower.startsWith("node_modules/")) return true;
    String leaf = path.contains("/") ? path.substring(path.lastIndexOf('/') + 1) : path;
    return leaf.startsWith(".");
  }

  private static boolean isTextPath(String path) {
    return path.matches(
        "(?i).+\\.(html?|css|js|mjs|cjs|jsx|tsx|ts|vue|json|md|svg|txt|xml|map|less|scss|sass)$");
  }

  private static boolean isBinaryPath(String path) {
    return path.matches(
        "(?i).+\\.(png|jpe?g|gif|webp|avif|ico|bmp|woff2?|ttf|otf|eot)$");
  }

  private static String guessMime(String path) {
    String lower = path.toLowerCase(Locale.ROOT);
    if (lower.endsWith(".png")) return "image/png";
    if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) return "image/jpeg";
    if (lower.endsWith(".gif")) return "image/gif";
    if (lower.endsWith(".webp")) return "image/webp";
    if (lower.endsWith(".svg")) return "image/svg+xml";
    if (lower.endsWith(".ico")) return "image/x-icon";
    if (lower.endsWith(".woff2")) return "font/woff2";
    if (lower.endsWith(".woff")) return "font/woff";
    return "application/octet-stream";
  }

  private static String normalizePath(String raw) {
    if (raw == null) return "";
    String p = raw.replace('\\', '/').trim();
    while (p.startsWith("./")) p = p.substring(2);
    while (p.startsWith("/")) p = p.substring(1);
    if (p.contains("..")) {
      throw new ApiException(400, "非法路径：" + raw);
    }
    return p;
  }

  private static String firstNonBlank(String... vals) {
    if (vals == null) return "";
    for (String v : vals) {
      if (v != null && !v.isBlank()) return v.trim();
    }
    return "";
  }
}
