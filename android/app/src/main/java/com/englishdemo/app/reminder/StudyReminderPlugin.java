package com.englishdemo.app.reminder;

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
        ReminderScheduler.scheduleNext(getContext());
        call.resolve();
    }

    @PluginMethod
    public void cancelDaily(PluginCall call) {
        ReminderScheduler.disable(getContext());
        call.resolve();
    }

    @PluginMethod
    public void isScheduled(PluginCall call) {
        JSObject ret = new JSObject();
        ret.put("scheduled", ReminderScheduler.isEnabled(getContext()));
        call.resolve(ret);
    }
}
