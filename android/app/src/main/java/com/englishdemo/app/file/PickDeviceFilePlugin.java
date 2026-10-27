package com.englishdemo.app.file;

import android.app.Activity;
import android.content.ActivityNotFoundException;
import android.content.Intent;
import android.database.Cursor;
import android.net.Uri;
import android.provider.OpenableColumns;
import android.webkit.MimeTypeMap;

import androidx.activity.result.ActivityResult;

import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.ActivityCallback;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.io.File;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.io.OutputStream;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;

/**
 * 原生选文件：支持「微信文件」与「手机本地文件」。
 * - wechat：优先拉起微信的 GET_CONTENT（聊天/收藏等文件）
 * - local：系统文档选择器（文件管理 / 下载 等）
 */
@CapacitorPlugin(name = "PickDeviceFile")
public class PickDeviceFilePlugin extends Plugin {

  private static final String WECHAT_PKG = "com.tencent.mm";
  private static final long MAX_COPY_BYTES = 36L * 1024 * 1024;

  @PluginMethod
  public void pick(PluginCall call) {
    String source = call.getString("source", "local");
    boolean multiple = Boolean.TRUE.equals(call.getBoolean("multiple", false));
    String mimeType = call.getString("mimeType", "*/*");
    if (mimeType == null || mimeType.isBlank()) mimeType = "*/*";

    boolean wechat = "wechat".equalsIgnoreCase(source);
    Intent intent = wechat ? buildWeChatIntent(mimeType, multiple) : buildLocalIntent(mimeType, multiple);

    try {
      startActivityForResult(call, intent, "onPickResult");
    } catch (ActivityNotFoundException e) {
      if (wechat) {
        // 微信未安装或不支持 GET_CONTENT：退回系统选择器（侧栏常含「微信」）
        try {
          Intent fallback = Intent.createChooser(buildLocalIntent(mimeType, multiple), "从微信或文件中选择");
          startActivityForResult(call, fallback, "onPickResult");
          return;
        } catch (Exception ignored) {
          call.reject("未安装微信，或无法打开文件选择。请改用「手机本地文件」，或先在微信里把文件「另存为」到手机后再选。");
          return;
        }
      }
      call.reject("无法打开系统文件选择器");
    } catch (Exception e) {
      call.reject(e.getMessage() != null ? e.getMessage() : "打开文件选择器失败");
    }
  }

  private Intent buildLocalIntent(String mimeType, boolean multiple) {
    Intent intent = new Intent(Intent.ACTION_OPEN_DOCUMENT);
    intent.addCategory(Intent.CATEGORY_OPENABLE);
    intent.setType(mimeType);
    intent.putExtra(Intent.EXTRA_ALLOW_MULTIPLE, multiple);
    intent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
    return intent;
  }

  private Intent buildWeChatIntent(String mimeType, boolean multiple) {
    Intent intent = new Intent(Intent.ACTION_GET_CONTENT);
    intent.addCategory(Intent.CATEGORY_OPENABLE);
    intent.setType(mimeType);
    intent.putExtra(Intent.EXTRA_ALLOW_MULTIPLE, multiple);
    intent.setPackage(WECHAT_PKG);
    return intent;
  }

  @ActivityCallback
  private void onPickResult(PluginCall call, ActivityResult result) {
    if (call == null) return;
    if (result.getResultCode() != Activity.RESULT_OK) {
      JSObject ret = new JSObject();
      ret.put("canceled", true);
      ret.put("files", new JSArray());
      call.resolve(ret);
      return;
    }

    Intent data = result.getData();
    if (data == null) {
      call.reject("未选中文件");
      return;
    }

    List<Uri> uris = new ArrayList<>();
    if (data.getClipData() != null) {
      int n = data.getClipData().getItemCount();
      for (int i = 0; i < n; i++) {
        Uri u = data.getClipData().getItemAt(i).getUri();
        if (u != null) uris.add(u);
      }
    } else if (data.getData() != null) {
      uris.add(data.getData());
    }

    if (uris.isEmpty()) {
      call.reject("未选中文件");
      return;
    }

    try {
      JSArray files = new JSArray();
      for (Uri uri : uris) {
        files.put(copyUriToCache(uri));
      }
      JSObject ret = new JSObject();
      ret.put("canceled", false);
      ret.put("files", files);
      call.resolve(ret);
    } catch (Exception e) {
      call.reject(e.getMessage() != null ? e.getMessage() : "读取文件失败");
    }
  }

  private JSObject copyUriToCache(Uri uri) throws Exception {
    String name = queryDisplayName(uri);
    if (name == null || name.isBlank()) name = "file-" + System.currentTimeMillis();
    name = name.replaceAll("[\\\\/]+", "_");

    String mime = getContext().getContentResolver().getType(uri);
    if (mime == null || mime.isBlank()) {
      String ext = "";
      int dot = name.lastIndexOf('.');
      if (dot >= 0) ext = name.substring(dot + 1).toLowerCase(Locale.ROOT);
      mime = MimeTypeMap.getSingleton().getMimeTypeFromExtension(ext);
      if (mime == null) mime = "application/octet-stream";
    }

    File dir = new File(getContext().getCacheDir(), "picked");
    if (!dir.exists() && !dir.mkdirs()) {
      throw new Exception("无法创建临时目录");
    }
    File out = new File(dir, System.currentTimeMillis() + "-" + name);

    long total = 0;
    try (InputStream in = getContext().getContentResolver().openInputStream(uri);
        OutputStream os = new FileOutputStream(out)) {
      if (in == null) throw new Exception("无法读取所选文件：" + name);
      byte[] buf = new byte[8192];
      int n;
      while ((n = in.read(buf)) >= 0) {
        total += n;
        if (total > MAX_COPY_BYTES) {
          //noinspection ResultOfMethodCallIgnored
          out.delete();
          throw new Exception("文件过大（上限 36MB）：" + name);
        }
        os.write(buf, 0, n);
      }
    }

    JSObject file = new JSObject();
    file.put("name", name);
    file.put("mimeType", mime);
    file.put("size", total);
    file.put("path", out.getAbsolutePath());
    return file;
  }

  private String queryDisplayName(Uri uri) {
    Cursor c = null;
    try {
      c = getContext().getContentResolver().query(uri, null, null, null, null);
      if (c != null && c.moveToFirst()) {
        int idx = c.getColumnIndex(OpenableColumns.DISPLAY_NAME);
        if (idx >= 0) return c.getString(idx);
      }
    } catch (Exception ignored) {
      /* fall through */
    } finally {
      if (c != null) c.close();
    }
    String last = uri.getLastPathSegment();
    return last != null ? last : null;
  }
}
