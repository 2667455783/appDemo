package com.englishdemo.app.vosk;

import android.Manifest;
import android.content.Context;
import android.util.Log;

import androidx.annotation.NonNull;

import com.getcapacitor.JSObject;
import com.getcapacitor.PermissionState;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;

import org.json.JSONException;
import org.json.JSONObject;
import org.vosk.Model;
import org.vosk.Recognizer;
import org.vosk.android.RecognitionListener;
import org.vosk.android.SpeechService;
import org.vosk.android.StorageService;

import java.io.IOException;

/**
 * 本地 Vosk 离线语音识别 Capacitor 插件。
 *
 * 与上游 @capacitor-community/speech-recognition 不同，本插件完全不依赖系统
 * SpeechRecognizer / Google 语音服务，纯本地 Vosk 模型推理，可在无 GMS 的国产
 * ROM 上离线工作。
 *
 * 支持多模型按需加载（中文 / 英文），通过 loadModel(name) 切换。
 */
@CapacitorPlugin(
    name = "VoskSpeech",
    permissions = {
        @Permission(strings = { Manifest.permission.RECORD_AUDIO }, alias = "speechRecognition")
    }
)
public class VoskSpeechPlugin extends Plugin {

    private static final String TAG = "VoskSpeech";

    private Model model;
    private String loadedModelName = null;
    private Recognizer recognizer;
    private SpeechService speechService;
    private boolean isListening = false;

    @Override
    public void load() {
        super.load();
        // Vosk 通过 JNA 返回中文等非 ASCII 文本，需指定 UTF-8 编码，否则中文会乱码（见 vosk-api#1330）
        try {
            System.setProperty("jna.encoding", "utf-8");
        } catch (Throwable t) { /* ignore */ }
    }

    /**
     * 加载（或切换）Vosk 模型。模型资产目录需放在
     * android/app/src/main/assets/<name>/ 下（解压后的模型文件夹内容）。
     *
     * 调用：loadModel({ name: "vosk-model-small-cn" })
     */
    @PluginMethod
    public void loadModel(PluginCall call) {
        String name = call.getString("name");
        if (name == null || name.isEmpty()) {
            call.reject("loadModel requires 'name'");
            return;
        }
        final Context context = getContext();
        final String targetName = "model-" + name;

        // 已加载同名模型，直接复用
        if (model != null && name.equals(loadedModelName)) {
            JSObject r = new JSObject();
            r.put("loaded", true);
            r.put("name", name);
            r.put("cached", true);
            call.resolve(r);
            return;
        }

        // 切换模型：先释放旧的
        releaseRuntime();
        releaseModel();

        final PluginCall loadCall = call;
        try {
            // StorageService.unpack: 两个 Callback，成功与失败均通过 onComplete 回调
            StorageService.unpack(context, name, targetName,
                (Model unpackedModel) -> {
                    VoskSpeechPlugin.this.model = unpackedModel;
                    VoskSpeechPlugin.this.loadedModelName = name;
                    Log.d(TAG, "Model loaded: " + name);
                    JSObject r = new JSObject();
                    r.put("loaded", true);
                    r.put("name", name);
                    r.put("cached", false);
                    loadCall.resolve(r);
                },
                (IOException e) -> {
                    Log.e(TAG, "Model load failed: " + e.getMessage());
                    loadCall.reject("Model load failed: " + e.getMessage());
                }
            );
        } catch (Exception e) {
            call.reject("Model load error: " + e.getMessage());
        }
    }

    /**
     * 查询当前是否已加载模型。
     */
    @PluginMethod
    public void isModelLoaded(PluginCall call) {
        JSObject r = new JSObject();
        r.put("loaded", model != null);
        r.put("name", loadedModelName);
        call.resolve(r);
    }

    /**
     * 开始监听麦克风并识别。需先 loadModel。
     * 结果通过 partialResult / onResult / onFinalResult / onError 事件返回。
     */
    @PluginMethod
    public void startListening(PluginCall call) {
        Log.d(TAG, "startListening called, model=" + (model != null) + " isListening=" + isListening);
        if (model == null) {
            Log.e(TAG, "startListening rejected: model_not_loaded");
            call.reject("model_not_loaded");
            return;
        }
        if (isListening) {
            call.resolve(new JSObject().put("started", false));
            return;
        }
        if (getPermissionState("speechRecognition") != PermissionState.GRANTED) {
            Log.e(TAG, "startListening rejected: permission_required");
            call.reject("permission_required");
            return;
        }

        try {
            recognizer = new Recognizer(model, 16000.0f);
            speechService = new SpeechService(recognizer, 16000.0f);

            RecognitionListener listener = new RecognitionListener() {
                @Override
                public void onPartialResult(String hypothesis) {
                    String partial = extractField(hypothesis, "partial");
                    if (partial != null && !partial.isEmpty()) {
                        JSObject r = new JSObject();
                        r.put("matches", partial);
                        notifyListeners("partialResult", r);
                    }
                }

                @Override
                public void onResult(String hypothesis) {
                    String text = extractField(hypothesis, "text");
                    JSObject r = new JSObject();
                    r.put("result", text == null ? "" : text);
                    notifyListeners("onResult", r);
                }

                @Override
                public void onFinalResult(String hypothesis) {
                    String text = extractField(hypothesis, "text");
                    JSObject r = new JSObject();
                    r.put("final", text == null ? "" : text);
                    notifyListeners("onFinalResult", r);
                }

                @Override
                public void onError(Exception exception) {
                    Log.e(TAG, "onError: " + exception.getMessage());
                    JSObject r = new JSObject();
                    r.put("message", exception.getMessage() == null ? "recognition error" : exception.getMessage());
                    notifyListeners("onError", r);
                }

                @Override
                public void onTimeout() {
                    Log.w(TAG, "onTimeout");
                    isListening = false;
                    JSObject r = new JSObject();
                    r.put("message", "timeout");
                    notifyListeners("onError", r);
                }
            };

            speechService.startListening(listener);
            isListening = true;
            Log.d(TAG, "SpeechService started, isListening=" + isListening);
            JSObject r = new JSObject();
            r.put("started", true);
            call.resolve(r);
        } catch (IOException e) {
            call.reject("Failed to start: " + e.getMessage());
        } catch (Exception e) {
            call.reject("Failed to start: " + e.getMessage());
        }
    }

    @PluginMethod
    public void stopListening(PluginCall call) {
        try {
            if (speechService != null) {
                speechService.stop();
            }
        } catch (Exception e) {
            Log.w(TAG, "stop error: " + e.getMessage());
        }
        releaseRuntime();
        isListening = false;
        call.resolve();
    }

    @PluginMethod
    public void isListening(PluginCall call) {
        JSObject r = new JSObject();
        r.put("isListening", isListening);
        call.resolve(r);
    }

    @Override
    protected void handleOnDestroy() {
        releaseRuntime();
        releaseModel();
        super.handleOnDestroy();
    }

    private void releaseRuntime() {
        try {
            if (speechService != null) {
                speechService.stop();
            }
        } catch (Exception e) { /* ignore */ }
        speechService = null;
        if (recognizer != null) {
            try { recognizer.close(); } catch (Exception e) { /* ignore */ }
        }
        recognizer = null;
    }

    private void releaseModel() {
        if (model != null) {
            try { model.close(); } catch (Exception e) { /* ignore */ }
        }
        model = null;
        loadedModelName = null;
    }

    private static String extractField(String json, String field) {
        if (json == null || json.isEmpty()) return null;
        try {
            JSONObject o = new JSONObject(json);
            if (o.has(field)) {
                String v = o.optString(field, null);
                return v;
            }
            // 兜底：返回原始字符串
            return json;
        } catch (JSONException e) {
            return json;
        }
    }
}
