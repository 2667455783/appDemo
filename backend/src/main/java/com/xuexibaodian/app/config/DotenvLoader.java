package com.xuexibaodian.app.config;

import java.io.BufferedReader;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.List;

/**
 * 启动前按 Spring profile 加载 backend/.env.{profile}（缺省 dev），写入系统属性。
 * 不覆盖已有环境变量 / 系统属性，便于线上用 SPRING_PROFILES_ACTIVE=prod + 服务器环境注入。
 */
public final class DotenvLoader {

  private DotenvLoader() {}

  public static void load() {
    String profile = resolveProfile();
    for (Path path : candidatePaths(profile)) {
      if (Files.isRegularFile(path)) {
        loadFile(path);
        return;
      }
    }
  }

  /** SPRING_PROFILES_ACTIVE → spring.profiles.active → 默认 dev；多 profile 取第一个非空。 */
  static String resolveProfile() {
    String raw = firstNonBlank(
        System.getenv("SPRING_PROFILES_ACTIVE"),
        System.getProperty("spring.profiles.active"),
        System.getProperty("SPRING_PROFILES_ACTIVE"));
    if (raw == null || raw.isBlank()) return "dev";
    String first = raw.split(",")[0].trim();
    return first.isEmpty() ? "dev" : first;
  }

  private static List<Path> candidatePaths(String profile) {
    List<Path> paths = new ArrayList<>();
    String named = ".env." + profile;
    paths.add(Path.of(named));
    paths.add(Path.of("backend", named));
    // 兼容旧单文件 .env
    paths.add(Path.of(".env"));
    paths.add(Path.of("backend", ".env"));
    return paths;
  }

  private static String firstNonBlank(String... values) {
    if (values == null) return null;
    for (String v : values) {
      if (v != null && !v.isBlank()) return v.trim();
    }
    return null;
  }

  private static void loadFile(Path path) {
    try (BufferedReader reader = Files.newBufferedReader(path, StandardCharsets.UTF_8)) {
      String line;
      while ((line = reader.readLine()) != null) {
        line = line.trim();
        if (line.isEmpty() || line.startsWith("#")) continue;
        int eq = line.indexOf('=');
        if (eq <= 0) continue;
        String key = line.substring(0, eq).trim();
        String value = line.substring(eq + 1).trim();
        if ((value.startsWith("\"") && value.endsWith("\""))
            || (value.startsWith("'") && value.endsWith("'"))) {
          value = value.substring(1, value.length() - 1);
        }
        if (System.getenv(key) == null && System.getProperty(key) == null) {
          System.setProperty(key, value);
        }
      }
    } catch (IOException ignored) {
      /* 无 .env 时走环境变量 / 默认值 */
    }
  }
}
