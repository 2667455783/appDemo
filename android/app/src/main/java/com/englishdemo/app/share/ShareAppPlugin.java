package com.englishdemo.app.share;

import android.content.ActivityNotFoundException;
import android.content.Context;
import android.content.Intent;
import android.content.pm.ApplicationInfo;
import android.net.Uri;
import android.os.Build;

import androidx.core.content.FileProvider;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.io.OutputStream;

/**
 * 分享本机已安装的 APK（无需联网再下载）。
 */
@CapacitorPlugin(name = "ShareApp")
public class ShareAppPlugin extends Plugin {

    private static final String DEFAULT_APK_NAME = "学习宝典.apk";

    /** 直接分享当前已安装的本 App 安装包 */
    @PluginMethod
    public void shareInstalledApk(PluginCall call) {
        String pkg = call.getString("package");
        String fileName = call.getString("fileName");

        if (pkg == null || pkg.isEmpty()) {
            call.reject("package is required");
            return;
        }

        try {
            File apk = prepareInstalledApkForShare(fileName);
            shareApkFile(apk, pkg, call);
        } catch (Exception e) {
            String msg = e.getMessage() != null ? e.getMessage() : "无法读取本机安装包";
            call.reject(msg);
        }
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

    /**
     * 从 ApplicationInfo.sourceDir 读取本机安装包，复制到 cache 供 FileProvider 分享。
     * 纯本地磁盘操作，不走网络。
     */
    private File prepareInstalledApkForShare(String preferredName) throws Exception {
        Context ctx = getContext();
        ApplicationInfo info = ctx.getApplicationInfo();
        File src = new File(info.sourceDir);
        if (!src.exists() || !src.canRead()) {
            throw new Exception("无法读取当前安装包");
        }

        String name = preferredName != null && !preferredName.isEmpty()
            ? sanitizeFileName(preferredName)
            : defaultShareFileName(ctx);

        File dest = new File(ctx.getCacheDir(), name);
        // 已复制过且大小一致则直接复用
        if (dest.exists() && dest.length() == src.length()) {
            return dest;
        }

        copyFile(src, dest);
        if (!dest.exists() || dest.length() < 1024) {
            throw new Exception("准备安装包失败");
        }
        return dest;
    }

    private String defaultShareFileName(Context ctx) {
        return DEFAULT_APK_NAME;
    }

    private void copyFile(File src, File dest) throws Exception {
        try (InputStream in = new FileInputStream(src);
             OutputStream out = new FileOutputStream(dest)) {
            byte[] buf = new byte[8192];
            int n;
            while ((n = in.read(buf)) != -1) {
                out.write(buf, 0, n);
            }
        }
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
        if (name == null || name.isEmpty()) return DEFAULT_APK_NAME;
        return name.replaceAll("[/\\\\:*?\"<>|]", "_");
    }
}
