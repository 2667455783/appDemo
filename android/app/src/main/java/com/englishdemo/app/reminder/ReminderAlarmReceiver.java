package com.englishdemo.app.reminder;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;

/** 系统闹钟到点触发：发通知并续排下一天（无需 App 进程） */
public class ReminderAlarmReceiver extends BroadcastReceiver {

    static final String ACTION_FIRE = "com.englishdemo.app.reminder.FIRE";

    @Override
    public void onReceive(Context context, Intent intent) {
        if (!ReminderScheduler.isEnabled(context)) return;
        ReminderScheduler.showNotification(context);
        ReminderScheduler.scheduleNext(context);
    }
}
