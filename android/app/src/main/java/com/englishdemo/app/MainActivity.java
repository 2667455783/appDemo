package com.englishdemo.app;

import android.os.Bundle;

import com.englishdemo.app.vosk.VoskSpeechPlugin;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(VoskSpeechPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
