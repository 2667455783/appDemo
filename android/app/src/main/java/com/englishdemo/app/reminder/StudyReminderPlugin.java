package com.englishdemo.app.reminder;

import android.content.Intent;
import android.net.Uri;
import android.os.Build;
import android.provider.Settings;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "StudyReminder")
public class StudyReminderPlugin extends Plugin {

    @PluginMethod
    public void scheduleDaily(PluginCall call) {
        Integer hour = call.getInt("hour");
        Integer minute = call.getInt("minute");
        String title = call.getString("title", "知卷 · 该学习啦");
        String body = call.getString("body", "来背词或练一组听力吧");
        if (hour == null || minute == null) {
            call.reject("hour and minute are required");
            return;
        }
        ReminderScheduler.saveSchedule(getContext(), hour, minute, title, body);
        boolean exact = ReminderScheduler.scheduleNext(getContext());
        JSObject ret = new JSObject();
        ret.put("exact", exact);
        call.resolve(ret);
    }

    @PluginMethod
    public void cancelDaily(PluginCall call) {
        ReminderScheduler.disable(getContext());
        call.resolve();
    }

    @PluginMethod
    public void isScheduled(PluginCall call) {
        JSObject ret = new JSObject();
        ret.put(
            "scheduled",
            ReminderScheduler.isEnabled(getContext()) && ReminderScheduler.hasPendingAlarm(getContext())
        );
        ret.put("exact", ReminderScheduler.canScheduleExact(getContext()));
        call.resolve(ret);
    }

    @PluginMethod
    public void openExactAlarmSettings(PluginCall call) {
        Intent intent;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            intent = new Intent(Settings.ACTION_REQUEST_SCHEDULE_EXACT_ALARM);
            intent.setData(Uri.parse("package:" + getContext().getPackageName()));
        } else {
            intent = appDetailsIntent();
        }
        startSettings(call, intent);
    }

    @PluginMethod
    public void openAppSettings(PluginCall call) {
        startSettings(call, appDetailsIntent());
    }

    private Intent appDetailsIntent() {
        Intent intent = new Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS);
        intent.setData(Uri.parse("package:" + getContext().getPackageName()));
        return intent;
    }

    private void startSettings(PluginCall call, Intent intent) {
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        try {
            getContext().startActivity(intent);
        } catch (Exception e) {
            try {
                getContext().startActivity(appDetailsIntent().addFlags(Intent.FLAG_ACTIVITY_NEW_TASK));
            } catch (Exception e2) {
                call.reject("无法打开系统设置");
                return;
            }
        }
        call.resolve();
    }
}
