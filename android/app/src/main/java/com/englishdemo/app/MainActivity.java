package com.englishdemo.app;

import android.os.Bundle;

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
    }
}
