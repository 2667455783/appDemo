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
 * 原生选文件：
 * - local：系统文档选择器
 * - wechat：拉起微信，由用户在聊天记录里打开文件 →「用其他应用打开」→ 本应用
 *   （第三方 App 无法调用小程序的 chooseMessageFile；这是拿聊天文件的可靠方式）
 */
@CapacitorPlugin(name = "PickDeviceFile")
public class PickDeviceFilePlugin extends Plugin {

  private static final String WECHAT_PKG = "com.tencent.mm";
  private static final long MAX_COPY_BYTES = 36L * 1024 * 1024;

  private static PickDeviceFilePlugin instance;

  private PluginCall pendingWeChatPick;
  private boolean expectingWeChatFile;
  private JSObject pendingIncomingFile;

  @Override
  public void load() {
    instance = this;
  }

  public static PickDeviceFilePlugin getInstance() {
    return instance;
  }

  @PluginMethod
  public void pick(PluginCall call) {
    String source = call.getString("source", "local");
    boolean multiple = Boolean.TRUE.equals(call.getBoolean("multiple", false));
    String mimeType = call.getString("mimeType", "*/*");
    if (mimeType == null || mimeType.isBlank()) mimeType = "*/*";

    if ("wechat".equalsIgnoreCase(source)) {
      startWeChatChatPick(call);
      return;
    }

    Intent intent = buildLocalIntent(mimeType, multiple);
    try {
      startActivityForResult(call, intent, "onPickResult");
    } catch (ActivityNotFoundException e) {
      call.reject("无法打开系统文件选择器");
    } catch (Exception e) {
      call.reject(e.getMessage() != null ? e.getMessage() : "打开文件选择器失败");
    }
  }

  /** 取消正在等待的「微信聊天文件」选取 */
  @PluginMethod
  public void cancelPick(PluginCall call) {
    finishWeChatPickCanceled();
    call.resolve();
  }

  /** 冷启动时若已收到微信传来的文件，前端可取走 */
  @PluginMethod
  public void consumePendingIncoming(PluginCall call) {
    JSObject ret = new JSObject();
    if (pendingIncomingFile != null) {
      ret.put("hasFile", true);
      ret.put("file", pendingIncomingFile);
      pendingIncomingFile = null;
    } else {
      ret.put("hasFile", false);
    }
    call.resolve(ret);
  }

  private void startWeChatChatPick(PluginCall call) {
    Intent launch = getContext().getPackageManager().getLaunchIntentForPackage(WECHAT_PKG);
    if (launch == null) {
      call.reject("未安装微信。请安装微信后，在聊天记录中打开文件并选择「用其他应用打开」。");
      return;
    }
    if (pendingWeChatPick != null) {
      finishWeChatPickCanceled();
    }
    call.setKeepAlive(true);
    pendingWeChatPick = call;
    expectingWeChatFile = true;
    try {
      launch.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
      getContext().startActivity(launch);
    } catch (Exception e) {
      pendingWeChatPick = null;
      expectingWeChatFile = false;
      call.reject("无法打开微信：" + (e.getMessage() != null ? e.getMessage() : "未知错误"));
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

  /**
   * 由 MainActivity 在 ACTION_VIEW / ACTION_SEND 时调用：接收微信「用其他应用打开」传来的文件。
   */
  public void handleIncomingShareIntent(Intent intent) {
    if (intent == null) return;
    String action = intent.getAction();
    if (action == null) return;
    boolean view = Intent.ACTION_VIEW.equals(action);
    boolean send = Intent.ACTION_SEND.equals(action);
    if (!view && !send) return;

    Uri uri = intent.getData();
    if (uri == null && send) {
      uri = intent.getParcelableExtra(Intent.EXTRA_STREAM);
    }
    if (uri == null) return;

    try {
      JSObject file = copyUriToCache(uri);
      deliverIncomingFile(file);
    } catch (Exception e) {
      PluginCall call = pendingWeChatPick;
      if (call != null) {
        pendingWeChatPick = null;
        expectingWeChatFile = false;
        call.reject(e.getMessage() != null ? e.getMessage() : "读取微信文件失败");
      }
    }
  }

  private void deliverIncomingFile(JSObject file) {
    PluginCall call = pendingWeChatPick;
    if (call != null) {
      pendingWeChatPick = null;
      expectingWeChatFile = false;
      JSArray files = new JSArray();
      files.put(file);
      JSObject ret = new JSObject();
      ret.put("canceled", false);
      ret.put("files", files);
      call.resolve(ret);
      return;
    }

    // 非 pick 流程（例如直接从微信冷启动打开）：缓存并通知前端
    pendingIncomingFile = file;
    expectingWeChatFile = false;
    JSObject event = new JSObject();
    event.put("file", file);
    notifyListeners("incomingFile", event);
  }

  private void finishWeChatPickCanceled() {
    expectingWeChatFile = false;
    PluginCall call = pendingWeChatPick;
    pendingWeChatPick = null;
    if (call == null) return;
    JSObject ret = new JSObject();
    ret.put("canceled", true);
    ret.put("files", new JSArray());
    call.resolve(ret);
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
    String path = uri.getPath();
    if (path != null) {
      int slash = path.lastIndexOf('/');
      if (slash >= 0 && slash < path.length() - 1) return path.substring(slash + 1);
    }
    String last = uri.getLastPathSegment();
    return last != null ? last : null;
  }
}
