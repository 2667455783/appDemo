package com.englishdemo.app.reminder;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;

/** 重启、覆盖安装、精确闹钟权限变化后恢复闹钟排程（这些场景系统会清掉已排的闹钟） */
public class ReminderBootReceiver extends BroadcastReceiver {

    @Override
    public void onReceive(Context context, Intent intent) {
        if (!ReminderScheduler.isEnabled(context)) return;
        ReminderScheduler.scheduleNext(context);
    }
}
