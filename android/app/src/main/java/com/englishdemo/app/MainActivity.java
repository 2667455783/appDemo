package com.englishdemo.app;

import android.content.Intent;
import android.os.Bundle;
import android.webkit.WebSettings;

import com.englishdemo.app.file.PickDeviceFilePlugin;
import com.englishdemo.app.reminder.StudyReminderPlugin;
import com.englishdemo.app.share.ShareAppPlugin;
import com.englishdemo.app.tts.AppTtsPlugin;
import com.englishdemo.app.vosk.VoskSpeechPlugin;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(VoskSpeechPlugin.class);
        registerPlugin(ShareAppPlugin.class);
        registerPlugin(AppTtsPlugin.class);
        registerPlugin(StudyReminderPlugin.class);
        registerPlugin(PickDeviceFilePlugin.class);
        super.onCreate(savedInstanceState);
        // 兜底：https 壳访问 http API，避免 Failed to fetch
        try {
            if (getBridge() != null && getBridge().getWebView() != null) {
                getBridge()
                    .getWebView()
                    .getSettings()
                    .setMixedContentMode(WebSettings.MIXED_CONTENT_ALWAYS_ALLOW);
            }
        } catch (Exception ignored) {
            /* bridge 未就绪时忽略，依赖 capacitor allowMixedContent */
        }
        handleIncomingShare(getIntent());
    }

    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        setIntent(intent);
        handleIncomingShare(intent);
    }

    private void handleIncomingShare(Intent intent) {
        PickDeviceFilePlugin plugin = PickDeviceFilePlugin.getInstance();
        if (plugin == null || intent == null) return;
        plugin.handleIncomingShareIntent(intent);
    }
}
