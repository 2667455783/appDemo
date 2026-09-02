package com.englishdemo.app.tts;

import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.content.pm.ResolveInfo;
import android.media.AudioAttributes;
import android.media.AudioManager;
import android.media.MediaPlayer;
import android.os.Build;
import android.os.Bundle;
import android.speech.tts.TextToSpeech;
import android.speech.tts.UtteranceProgressListener;
import android.speech.tts.Voice;
import android.util.Log;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.io.IOException;
import java.net.HttpURLConnection;
import java.net.URL;
import java.util.List;
import java.util.Locale;
import java.util.Set;

/**
 * 系统 TTS。安卓 WebView 的 speechSynthesis 经常“有 API 但不出声”，
 * 卡片朗读必须走原生引擎。
 */
@CapacitorPlugin(name = "AppTts")
public class AppTtsPlugin extends Plugin {

    private static final String TAG = "AppTts";
    private static final String GOOGLE_TTS = "com.google.android.tts";

    private TextToSpeech tts;
    private boolean ready = false;
    private boolean initializing = false;
    private PluginCall pendingSpeak;
    private PluginCall currentCall;
    private String currentUtteranceId;
    private int utteranceSeq = 0;
    private AudioManager audioManager;
    private MediaPlayer streamPlayer;
    private PluginCall streamCall;
    private File streamFile;
    private int streamSeq = 0;

    @Override
    public void load() {
        super.load();
        audioManager = (AudioManager) getContext().getSystemService(Context.AUDIO_SERVICE);
        initTts();
    }

    @PluginMethod
    public void speak(PluginCall call) {
        String text = call.getString("text", "");
        if (text == null || text.trim().isEmpty()) {
            call.reject("text is required");
            return;
        }
        if (!ready || tts == null) {
            if (pendingSpeak != null && pendingSpeak != call) {
                JSObject skip = new JSObject();
                skip.put("ok", false);
                pendingSpeak.resolve(skip);
            }
            pendingSpeak = call;
            initTts();
            return;
        }
        doSpeak(call);
    }

    @PluginMethod
    public void playUrl(PluginCall call) {
        String url = call.getString("url", "");
        if (url == null || url.trim().isEmpty()) {
            call.reject("url is required");
            return;
        }
        call.setKeepAlive(true);
        final String src = url.trim();
        runOnUi(() -> startStream(call, src));
    }

    @PluginMethod
    public void stop(PluginCall call) {
        pendingSpeak = null;
        finishStream(true, null);
        if (tts != null) {
            try {
                tts.stop();
            } catch (Exception ignored) {
                /* ignore */
            }
        }
        resolveCurrent(true);
        JSObject ret = new JSObject();
        ret.put("ok", true);
        call.resolve(ret);
    }

    @Override
    protected void handleOnDestroy() {
        pendingSpeak = null;
        finishStream(true, null);
        resolveCurrent(true);
        if (tts != null) {
            try {
                tts.stop();
                tts.shutdown();
            } catch (Exception ignored) {
                /* ignore */
            }
            tts = null;
        }
        ready = false;
        super.handleOnDestroy();
    }

    private void initTts() {
        if (tts != null || initializing) return;
        initializing = true;
        final Context ctx = getContext();
        final String engine = findPreferredEngine();
        TextToSpeech.OnInitListener listener = status -> {
            initializing = false;
            ready = status == TextToSpeech.SUCCESS && tts != null;
            if (ready) {
                try {
                    tts.setAudioAttributes(new AudioAttributes.Builder()
                            .setUsage(AudioAttributes.USAGE_MEDIA)
                            .setContentType(AudioAttributes.CONTENT_TYPE_SPEECH)
                            .build());
                } catch (Exception e) {
                    Log.w(TAG, "setAudioAttributes failed", e);
                }
                tts.setOnUtteranceProgressListener(new UtteranceProgressListener() {
                    @Override
                    public void onStart(String utteranceId) { }

                    @Override
                    public void onDone(String utteranceId) {
                        if (utteranceId != null && utteranceId.equals(currentUtteranceId)) {
                            resolveCurrent(true);
                        }
                    }

                    @Override
                    public void onError(String utteranceId) {
                        if (utteranceId != null && utteranceId.equals(currentUtteranceId)) {
                            rejectCurrent("朗读失败");
                        }
                    }

                    @Override
                    public void onError(String utteranceId, int errorCode) {
                        onError(utteranceId);
                    }

                    @Override
                    public void onStop(String utteranceId, boolean interrupted) {
                        if (utteranceId != null && utteranceId.equals(currentUtteranceId)) {
                            resolveCurrent(true);
                        }
                    }
                });
            } else {
                Log.e(TAG, "TTS init failed status=" + status);
            }

            PluginCall queued = pendingSpeak;
            pendingSpeak = null;
            if (queued != null) {
                if (ready) doSpeak(queued);
                else queued.reject("系统语音引擎不可用，请在系统设置中安装中文/英文语音数据");
            }
        };

        try {
            if (engine != null) {
                tts = new TextToSpeech(ctx, listener, engine);
            } else {
                tts = new TextToSpeech(ctx, listener);
            }
        } catch (Exception e) {
            initializing = false;
            ready = false;
            Log.e(TAG, "TTS construct failed", e);
            PluginCall queued = pendingSpeak;
            pendingSpeak = null;
            if (queued != null) queued.reject("系统语音引擎不可用");
        }
    }

    private void doSpeak(PluginCall call) {
        if (tts == null || !ready) {
            call.reject("系统语音引擎未就绪");
            return;
        }

        String text = call.getString("text", "").trim();
        String lang = call.getString("lang", "en-US");
        String gender = call.getString("gender", "");
        boolean useDefault = Boolean.TRUE.equals(call.getBoolean("useDefault"));
        Double rateObj = call.getDouble("rate");
        float rate = rateObj != null ? rateObj.floatValue() : 0.88f;
        if (rate < 0.5f) rate = 0.5f;
        if (rate > 2.0f) rate = 2.0f;
        Double pitchObj = call.getDouble("pitch");
        float pitch = pitchObj != null ? pitchObj.floatValue() : 1.0f;
        if (pitch < 0.5f) pitch = 0.5f;
        if (pitch > 2.0f) pitch = 2.0f;

        resolveCurrent(true);
        finishStream(true, null);
        try {
            tts.stop();
        } catch (Exception ignored) {
            /* ignore */
        }

        applyVoice(lang, gender, pitch, useDefault);
        tts.setSpeechRate(rate);
        requestAudioFocus();

        String id = "u" + (++utteranceSeq);
        currentUtteranceId = id;
        currentCall = call;

        Bundle params = new Bundle();
        params.putString(TextToSpeech.Engine.KEY_PARAM_STREAM, String.valueOf(AudioManager.STREAM_MUSIC));
        int result = tts.speak(text, TextToSpeech.QUEUE_FLUSH, params, id);
        if (result != TextToSpeech.SUCCESS) {
            currentCall = null;
            currentUtteranceId = null;
            call.reject("朗读启动失败，请检查系统是否已安装语音引擎");
        }
    }

    /**
     * 有道美音/英音靠 URL 查询参数 type=0|1 区分。
     * MediaPlayer.setDataSource(uri, headers) 在不少机型上会丢掉 query，
     * 或按路径 /dictvoice 缓存，导致美英听起来完全一样。改为完整下载后再播本地文件。
     */
    private void startStream(PluginCall call, String url) {
        finishStream(true, null);
        try {
            if (tts != null) tts.stop();
        } catch (Exception ignored) {
            /* ignore */
        }
        resolveCurrent(true);
        requestAudioFocus();

        final int seq = ++streamSeq;
        streamCall = call;
        new Thread(() -> downloadThenPlay(call, url, seq), "AppTts-dl").start();
    }

    private void downloadThenPlay(PluginCall call, String url, int seq) {
        File tmp = null;
        try {
            tmp = File.createTempFile("app-tts-", ".mp3", getContext().getCacheDir());
            downloadToFile(url, tmp);
            if (seq != streamSeq) {
                tmp.delete();
                return;
            }
            final File playFile = tmp;
            tmp = null;
            runOnUi(() -> playLocalFile(call, playFile, seq));
        } catch (Exception e) {
            if (tmp != null) {
                //noinspection ResultOfMethodCallIgnored
                tmp.delete();
            }
            Log.e(TAG, "playUrl download failed", e);
            if (seq == streamSeq) {
                final String msg = e.getMessage() != null ? e.getMessage() : "download failed";
                runOnUi(() -> finishStream(false, msg));
            }
        }
    }

    private void downloadToFile(String urlStr, File dest) throws IOException {
        HttpURLConnection conn = null;
        InputStream in = null;
        FileOutputStream out = null;
        try {
            URL url = new URL(urlStr);
            conn = (HttpURLConnection) url.openConnection();
            conn.setInstanceFollowRedirects(true);
            conn.setConnectTimeout(12000);
            conn.setReadTimeout(20000);
            conn.setRequestMethod("GET");
            conn.setRequestProperty("User-Agent",
                    "Mozilla/5.0 (Linux; Android 13) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Mobile Safari/537.36");
            conn.setRequestProperty("Accept", "audio/mpeg,audio/*,*/*");
            conn.setRequestProperty("Accept-Encoding", "identity");
            String host = url.getHost() == null ? "" : url.getHost().toLowerCase(Locale.US);
            if (host.contains("youdao.com")) {
                conn.setRequestProperty("Referer", "https://dict.youdao.com/");
            } else if (host.contains("baidu.com")) {
                conn.setRequestProperty("Referer", "https://fanyi.baidu.com/");
                conn.setRequestProperty("Origin", "https://fanyi.baidu.com");
            }
            conn.connect();
            int code = conn.getResponseCode();
            if (code < 200 || code >= 300) {
                throw new IOException("http " + code);
            }
            String ctype = conn.getContentType();
            if (ctype != null) {
                String c = ctype.toLowerCase(Locale.US);
                if (c.contains("json") || c.contains("text/html")) {
                    throw new IOException("not audio: " + ctype);
                }
            }
            in = conn.getInputStream();
            out = new FileOutputStream(dest);
            byte[] buf = new byte[8192];
            int n;
            long total = 0;
            while ((n = in.read(buf)) > 0) {
                out.write(buf, 0, n);
                total += n;
            }
            out.flush();
            if (total < 64) throw new IOException("empty audio");
        } finally {
            if (out != null) {
                try {
                    out.close();
                } catch (Exception ignored) {
                    /* ignore */
                }
            }
            if (in != null) {
                try {
                    in.close();
                } catch (Exception ignored) {
                    /* ignore */
                }
            }
            if (conn != null) conn.disconnect();
        }
        try (FileInputStream fis = new FileInputStream(dest)) {
            int b0 = fis.read();
            if (b0 == '{' || b0 == '<' || b0 == '[') {
                throw new IOException("not an audio file");
            }
        }
    }

    private void playLocalFile(PluginCall call, File file, int seq) {
        if (seq != streamSeq) {
            //noinspection ResultOfMethodCallIgnored
            file.delete();
            return;
        }
        streamFile = file;
        streamCall = call;
        MediaPlayer mp = new MediaPlayer();
        streamPlayer = mp;
        mp.setAudioAttributes(new AudioAttributes.Builder()
                .setUsage(AudioAttributes.USAGE_MEDIA)
                .setContentType(AudioAttributes.CONTENT_TYPE_MUSIC)
                .build());
        mp.setOnCompletionListener(p -> finishStream(true, null));
        mp.setOnErrorListener((p, what, extra) -> {
            finishStream(false, "audio error " + what + "/" + extra);
            return true;
        });
        try {
            mp.setDataSource(file.getAbsolutePath());
            mp.setOnPreparedListener(p -> {
                if (seq != streamSeq) {
                    finishStream(true, null);
                    return;
                }
                try {
                    p.start();
                } catch (Exception e) {
                    finishStream(false, "start failed");
                }
            });
            mp.prepareAsync();
        } catch (Exception e) {
            Log.e(TAG, "playUrl failed", e);
            finishStream(false, e.getMessage() != null ? e.getMessage() : "playUrl failed");
        }
    }

    private void finishStream(boolean ok, String err) {
        streamSeq++;
        MediaPlayer mp = streamPlayer;
        streamPlayer = null;
        File f = streamFile;
        streamFile = null;
        if (mp != null) {
            try {
                mp.setOnCompletionListener(null);
                mp.setOnErrorListener(null);
                mp.setOnPreparedListener(null);
            } catch (Exception ignored) {
                /* ignore */
            }
            try {
                if (mp.isPlaying()) mp.stop();
            } catch (Exception ignored) {
                /* ignore */
            }
            try {
                mp.reset();
            } catch (Exception ignored) {
                /* ignore */
            }
            try {
                mp.release();
            } catch (Exception ignored) {
                /* ignore */
            }
        }
        if (f != null) {
            //noinspection ResultOfMethodCallIgnored
            f.delete();
        }
        PluginCall c = streamCall;
        streamCall = null;
        if (c == null) return;
        if (err != null) {
            runOnUi(() -> c.reject(err));
            return;
        }
        JSObject ret = new JSObject();
        ret.put("ok", ok);
        runOnUi(() -> c.resolve(ret));
    }

    private void applyVoice(String lang, String gender, float pitch, boolean useDefault) {
        applyLanguage(lang);
        if (!useDefault) {
            Voice chosen = pickVoice(lang, gender);
            if (chosen != null) {
                try {
                    tts.setVoice(chosen);
                } catch (Exception e) {
                    Log.w(TAG, "setVoice failed", e);
                }
            }
        }
        try {
            tts.setPitch(pitch);
        } catch (Exception ignored) {
            /* ignore */
        }
    }

    private Voice pickVoice(String lang, String gender) {
        if (tts == null) return null;
        Set<Voice> voices;
        try {
            voices = tts.getVoices();
        } catch (Exception e) {
            return null;
        }
        if (voices == null || voices.isEmpty()) return null;

        Voice best = null;
        int bestScore = Integer.MIN_VALUE;
        String wantLang = lang == null ? "en-us" : lang.toLowerCase(Locale.US).replace('_', '-');
        String wantPrefix = wantLang.split("-")[0];
        boolean wantFemale = "female".equalsIgnoreCase(gender);
        boolean wantMale = "male".equalsIgnoreCase(gender);

        for (Voice v : voices) {
            if (v == null) continue;
            int score = 0;
            Locale vl = v.getLocale();
            if (vl != null) {
                String tag = (vl.getLanguage() + (vl.getCountry().isEmpty() ? "" : "-" + vl.getCountry()))
                        .toLowerCase(Locale.US);
                if (tag.equals(wantLang)) score += 14;
                else if (vl.getLanguage() != null && vl.getLanguage().equalsIgnoreCase(wantPrefix)) score += 6;
            }
            String n = v.getName() == null ? "" : v.getName().toLowerCase(Locale.US);
            boolean femaleHit = n.contains("female") || n.contains("woman") || n.contains("girl")
                    || n.contains("zira") || n.contains("samantha") || n.contains("aria")
                    || n.contains("sonia") || n.contains("natasha") || n.contains("sfg")
                    || n.contains("xiaoxiao") || n.contains("hwa");
            boolean maleHit = (n.contains("male") && !n.contains("female"))
                    || n.contains("-man") || n.contains("boy") || n.contains("guy")
                    || n.contains("david") || n.contains("ryan") || n.contains("yunxi")
                    || n.contains("tpd") || n.contains("rbc");
            if (wantFemale) {
                if (femaleHit) score += 10;
                else if (maleHit) score -= 8;
            } else if (wantMale) {
                if (maleHit) score += 10;
                else if (femaleHit) score -= 8;
            }
            if (v.isNetworkConnectionRequired()) score -= 3;
            score += Math.max(0, v.getQuality() / 100);
            if (score > bestScore) {
                bestScore = score;
                best = v;
            }
        }
        return best;
    }

    private void applyLanguage(String lang) {
        Locale wanted = localeFrom(lang);
        if (setLang(wanted)) return;
        if (setLang(new Locale(wanted.getLanguage()))) return;
        if ("en".equals(wanted.getLanguage())) {
            if (setLang(Locale.US)) return;
            if (setLang(Locale.ENGLISH)) return;
            if (setLang(Locale.UK)) return;
        } else if ("zh".equals(wanted.getLanguage())) {
            if (setLang(Locale.SIMPLIFIED_CHINESE)) return;
            if (setLang(Locale.CHINESE)) return;
        }
        Log.w(TAG, "no matching TTS language for " + lang + ", using engine default");
    }

    private boolean setLang(Locale loc) {
        try {
            int r = tts.setLanguage(loc);
            return r >= TextToSpeech.LANG_AVAILABLE;
        } catch (Exception e) {
            return false;
        }
    }

    private static Locale localeFrom(String lang) {
        if (lang == null || lang.isEmpty()) return Locale.US;
        String[] parts = lang.replace('_', '-').split("-");
        if (parts.length >= 2) return new Locale(parts[0], parts[1]);
        if ("zh".equalsIgnoreCase(parts[0])) return Locale.SIMPLIFIED_CHINESE;
        if ("en".equalsIgnoreCase(parts[0])) return Locale.US;
        return new Locale(parts[0]);
    }

    private String findPreferredEngine() {
        try {
            Intent intent = new Intent(TextToSpeech.Engine.INTENT_ACTION_TTS_SERVICE);
            PackageManager pm = getContext().getPackageManager();
            List<ResolveInfo> list;
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                list = pm.queryIntentServices(intent, PackageManager.ResolveInfoFlags.of(0));
            } else {
                list = pm.queryIntentServices(intent, 0);
            }
            if (list == null) return null;
            for (ResolveInfo info : list) {
                if (info.serviceInfo != null && GOOGLE_TTS.equals(info.serviceInfo.packageName)) {
                    return GOOGLE_TTS;
                }
            }
        } catch (Exception e) {
            Log.w(TAG, "query TTS engines failed", e);
        }
        return null;
    }

    private void requestAudioFocus() {
        if (audioManager == null) return;
        try {
            audioManager.requestAudioFocus(
                    null,
                    AudioManager.STREAM_MUSIC,
                    AudioManager.AUDIOFOCUS_GAIN_TRANSIENT_MAY_DUCK
            );
        } catch (Exception ignored) {
            /* ignore */
        }
    }

    private void resolveCurrent(boolean ok) {
        final PluginCall call = currentCall;
        currentCall = null;
        currentUtteranceId = null;
        if (call == null) return;
        final JSObject ret = new JSObject();
        ret.put("ok", ok);
        runOnUi(() -> call.resolve(ret));
    }

    private void rejectCurrent(String msg) {
        final PluginCall call = currentCall;
        currentCall = null;
        currentUtteranceId = null;
        if (call == null) return;
        runOnUi(() -> call.reject(msg));
    }

    private void runOnUi(Runnable r) {
        try {
            if (getActivity() != null) {
                getActivity().runOnUiThread(r);
                return;
            }
        } catch (Exception ignored) {
            /* ignore */
        }
        r.run();
    }
}
