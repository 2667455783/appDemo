package com.englishdemo.app.reminder;

import android.app.AlarmManager;
import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.graphics.Color;
import android.os.Build;

import com.englishdemo.app.MainActivity;
import com.englishdemo.app.R;

import java.util.Calendar;

final class ReminderScheduler {

    static final String PREFS = "study_reminder";
    static final String KEY_ENABLED = "enabled";
    static final String KEY_HOUR = "hour";
    static final String KEY_MINUTE = "minute";
    static final String KEY_TITLE = "title";
    static final String KEY_BODY = "body";
    static final String CHANNEL_ID = "study-reminder";
    static final int ALARM_ID = 7001;
    static final int NOTIFICATION_ID = 7001;

    private ReminderScheduler() {}

    static SharedPreferences prefs(Context context) {
        return context.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
    }

    static boolean isEnabled(Context context) {
        return prefs(context).getBoolean(KEY_ENABLED, false);
    }

    static void saveSchedule(Context context, int hour, int minute, String title, String body) {
        prefs(context)
            .edit()
            .putBoolean(KEY_ENABLED, true)
            .putInt(KEY_HOUR, hour)
            .putInt(KEY_MINUTE, minute)
            .putString(KEY_TITLE, title)
            .putString(KEY_BODY, body)
            .apply();
    }

    static void disable(Context context) {
        prefs(context).edit().putBoolean(KEY_ENABLED, false).apply();
        cancel(context);
    }

    static void cancel(Context context) {
        AlarmManager am = (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);
        if (am != null) {
            am.cancel(buildAlarmPendingIntent(context));
        }
        NotificationManager nm = (NotificationManager) context.getSystemService(Context.NOTIFICATION_SERVICE);
        if (nm != null) {
            nm.cancel(NOTIFICATION_ID);
        }
    }

    static void scheduleNext(Context context) {
        SharedPreferences p = prefs(context);
        if (!p.getBoolean(KEY_ENABLED, false)) return;

        int hour = p.getInt(KEY_HOUR, 20);
        int minute = p.getInt(KEY_MINUTE, 0);
        long trigger = nextTriggerMillis(hour, minute);

        AlarmManager am = (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);
        if (am == null) return;

        PendingIntent pi = buildAlarmPendingIntent(context);
        AlarmManager.AlarmClockInfo info = new AlarmManager.AlarmClockInfo(trigger, pi);
        am.setAlarmClock(info, pi);
    }

    static long nextTriggerMillis(int hour, int minute) {
        Calendar cal = Calendar.getInstance();
        cal.set(Calendar.SECOND, 0);
        cal.set(Calendar.MILLISECOND, 0);
        cal.set(Calendar.HOUR_OF_DAY, hour);
        cal.set(Calendar.MINUTE, minute);
        if (cal.getTimeInMillis() <= System.currentTimeMillis()) {
            cal.add(Calendar.DAY_OF_YEAR, 1);
        }
        return cal.getTimeInMillis();
    }

    private static PendingIntent buildAlarmPendingIntent(Context context) {
        Intent intent = new Intent(context, ReminderAlarmReceiver.class);
        intent.setAction(ReminderAlarmReceiver.ACTION_FIRE);
        int flags = PendingIntent.FLAG_UPDATE_CURRENT;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            flags |= PendingIntent.FLAG_IMMUTABLE;
        }
        return PendingIntent.getBroadcast(context, ALARM_ID, intent, flags);
    }

    static void showNotification(Context context) {
        ensureChannel(context);
        SharedPreferences p = prefs(context);
        String title = p.getString(KEY_TITLE, "知卷 · 该学习啦");
        String body = p.getString(KEY_BODY, "来背词或练一组听力吧");

        Intent launch = new Intent(context, MainActivity.class);
        launch.setFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        launch.putExtra("route", "/train");
        int flags = PendingIntent.FLAG_UPDATE_CURRENT;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            flags |= PendingIntent.FLAG_IMMUTABLE;
        }
        PendingIntent content = PendingIntent.getActivity(context, NOTIFICATION_ID, launch, flags);

        Notification.Builder builder =
            Build.VERSION.SDK_INT >= Build.VERSION_CODES.O
                ? new Notification.Builder(context, CHANNEL_ID)
                : new Notification.Builder(context);

        builder
            .setSmallIcon(R.drawable.ic_stat_reminder)
            .setContentTitle(title)
            .setContentText(body)
            .setAutoCancel(true)
            .setContentIntent(content)
            .setWhen(System.currentTimeMillis())
            .setShowWhen(true);

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            builder.setColor(Color.parseColor("#1f4d3a"));
        }

        NotificationManager nm = (NotificationManager) context.getSystemService(Context.NOTIFICATION_SERVICE);
        if (nm != null) {
            nm.notify(NOTIFICATION_ID, builder.build());
        }
    }

    private static void ensureChannel(Context context) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return;
        NotificationManager nm = (NotificationManager) context.getSystemService(Context.NOTIFICATION_SERVICE);
        if (nm == null || nm.getNotificationChannel(CHANNEL_ID) != null) return;
        NotificationChannel channel = new NotificationChannel(
            CHANNEL_ID,
            "学习提醒",
            NotificationManager.IMPORTANCE_HIGH
        );
        channel.setDescription("每天固定时间提醒上线学习");
        channel.enableVibration(true);
        nm.createNotificationChannel(channel);
    }
}
