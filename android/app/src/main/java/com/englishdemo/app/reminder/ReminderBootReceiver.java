package com.englishdemo.app.reminder;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;

/** 重启后恢复闹钟排程 */
public class ReminderBootReceiver extends BroadcastReceiver {

    @Override
    public void onReceive(Context context, Intent intent) {
        if (!ReminderScheduler.isEnabled(context)) return;
        ReminderScheduler.scheduleNext(context);
    }
}
