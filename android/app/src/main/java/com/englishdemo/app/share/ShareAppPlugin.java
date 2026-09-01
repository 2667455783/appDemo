package com.englishdemo.app.share;

import android.content.ActivityNotFoundException;
import android.content.Context;
import android.content.Intent;
import android.net.Uri;

import androidx.core.content.FileProvider;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.io.File;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.net.HttpURLConnection;
import java.net.URL;

/**
 * 下载 APK 并分享到微信 / QQ 等（发送安装包文件，而非仅链接）。
 */
@CapacitorPlugin(name = "ShareApp")
public class ShareAppPlugin extends Plugin {

    @PluginMethod
    public void shareApkUrl(PluginCall call) {
        String url = call.getString("url");
        String pkg = call.getString("package");
        String fileName = call.getString("fileName", "english-study.apk");

        if (url == null || url.isEmpty()) {
            call.reject("url is required");
            return;
        }
        if (pkg == null || pkg.isEmpty()) {
            call.reject("package is required");
            return;
        }

        notifyProgress("downloading", 0);

        new Thread(() -> {
            try {
                File apk = downloadApk(url, fileName);
                notifyProgress("downloaded", 100);
                bridge.getActivity().runOnUiThread(() -> shareApkFile(apk, pkg, call));
            } catch (Exception e) {
                String msg = e.getMessage() != null ? e.getMessage() : "下载失败";
                call.reject("下载安装包失败：" + msg);
            }
        }).start();
    }

    /** 纯文本分享（备用） */
    @PluginMethod
    public void shareToPackage(PluginCall call) {
        String text = call.getString("text");
        String title = call.getString("title", "分享");
        String pkg = call.getString("package");

        if (text == null || text.isEmpty()) {
            call.reject("text is required");
            return;
        }
        if (pkg == null || pkg.isEmpty()) {
            call.reject("package is required");
            return;
        }

        Intent intent = new Intent(Intent.ACTION_SEND);
        intent.setType("text/plain");
        intent.putExtra(Intent.EXTRA_TEXT, text);
        intent.putExtra(Intent.EXTRA_SUBJECT, title);
        intent.setPackage(pkg);
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);

        try {
            getActivity().startActivity(intent);
            JSObject ret = new JSObject();
            ret.put("ok", true);
            call.resolve(ret);
        } catch (ActivityNotFoundException e) {
            call.reject("未安装目标应用");
        } catch (Exception e) {
            call.reject(e.getMessage() != null ? e.getMessage() : "分享失败");
        }
    }

    private File downloadApk(String urlStr, String fileName) throws Exception {
        Context ctx = getContext();
        File out = new File(ctx.getCacheDir(), sanitizeFileName(fileName));

        // 24 小时内已缓存同文件则复用，避免每次分享都重新下 100MB
        long ageMs = System.currentTimeMillis() - out.lastModified();
        if (out.exists() && out.length() > 1024 * 1024 && ageMs < 24L * 60 * 60 * 1000) {
            return out;
        }

        URL url = new URL(urlStr);
        HttpURLConnection conn = (HttpURLConnection) url.openConnection();
        conn.setConnectTimeout(30_000);
        conn.setReadTimeout(180_000);
        conn.setInstanceFollowRedirects(true);
        conn.connect();

        int code = conn.getResponseCode();
        if (code < 200 || code >= 300) {
            throw new Exception("HTTP " + code);
        }

        int total = conn.getContentLength();
        try (InputStream in = conn.getInputStream();
             FileOutputStream fos = new FileOutputStream(out)) {
            byte[] buf = new byte[8192];
            int n;
            long done = 0;
            while ((n = in.read(buf)) != -1) {
                fos.write(buf, 0, n);
                done += n;
                if (total > 0) {
                    int pct = (int) Math.min(99, (done * 100) / total);
                    notifyProgress("downloading", pct);
                }
            }
        } finally {
            conn.disconnect();
        }

        if (!out.exists() || out.length() < 1024) {
            throw new Exception("安装包文件无效");
        }
        return out;
    }

    private void shareApkFile(File file, String pkg, PluginCall call) {
        Context context = getContext();
        Uri uri = FileProvider.getUriForFile(
            context,
            context.getPackageName() + ".fileprovider",
            file
        );

        try {
            Intent targeted = new Intent(Intent.ACTION_SEND);
            targeted.setType("application/vnd.android.package-archive");
            targeted.putExtra(Intent.EXTRA_STREAM, uri);
            targeted.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
            targeted.setPackage(pkg);
            getActivity().startActivity(targeted);

            JSObject ret = new JSObject();
            ret.put("ok", true);
            ret.put("fileName", file.getName());
            ret.put("size", file.length());
            call.resolve(ret);
        } catch (ActivityNotFoundException e) {
            call.reject("未安装目标应用，请安装后再试");
        } catch (Exception e) {
            call.reject(e.getMessage() != null ? e.getMessage() : "分享失败");
        }
    }

    private String sanitizeFileName(String name) {
        if (name == null || name.isEmpty()) return "english-study.apk";
        return name.replaceAll("[^a-zA-Z0-9._-]", "_");
    }

    private void notifyProgress(String stage, int percent) {
        JSObject data = new JSObject();
        data.put("stage", stage);
        data.put("percent", percent);
        notifyListeners("shareProgress", data);
    }
}
