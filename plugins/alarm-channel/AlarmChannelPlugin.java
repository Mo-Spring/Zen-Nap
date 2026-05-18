package com.zennaptimer.alarmchannel;

import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.AlarmManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.media.AudioAttributes;
import android.media.MediaPlayer;
import android.net.Uri;
import android.os.Build;
import android.os.ParcelFileDescriptor;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "AlarmChannel")
public class AlarmChannelPlugin extends Plugin {

    private MediaPlayer mediaPlayer;
    private static final int ALARM_REQUEST_CODE = 1001;

    @PluginMethod()
    public void createAlarmChannel(PluginCall call) {
        Context context = getContext();
        NotificationManager manager = (NotificationManager)
                context.getSystemService(Context.NOTIFICATION_SERVICE);

        if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.O) {
            String channelId = call.getString("channelId", "zen_nap_alarm_channel");
            String channelName = call.getString("channelName", "小憩闹钟");

            NotificationChannel channel = new NotificationChannel(
                    channelId,
                    channelName,
                    NotificationManager.IMPORTANCE_HIGH
            );
            channel.setDescription("小憩结束时的闹钟提醒");
            channel.enableVibration(true);
            channel.enableLights(true);
            channel.setShowBadge(true);
            channel.setLockscreenVisibility(android.app.Notification.VISIBILITY_PUBLIC);

            AudioAttributes audioAttributes = new AudioAttributes.Builder()
                    .setUsage(AudioAttributes.USAGE_ALARM)
                    .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                    .build();
            channel.setSound(
                    android.provider.Settings.System.DEFAULT_ALARM_ALERT_URI,
                    audioAttributes
            );

            manager.createNotificationChannel(channel);

            JSObject result = new JSObject();
            result.put("success", true);
            call.resolve(result);
        } else {
            JSObject result = new JSObject();
            result.put("success", false);
            result.put("message", "Requires Android O+");
            call.resolve(result);
        }
    }

    @PluginMethod()
    public void playAlarmAudio(PluginCall call) {
        String uriStr = call.getString("uri");
        if (uriStr == null || uriStr.isEmpty()) {
            uriStr = android.provider.Settings.System.DEFAULT_ALARM_ALERT_URI.toString();
        }

        boolean loop = call.getBoolean("loop", false);

        try {
            stopInternal();

            Uri uri = Uri.parse(uriStr);
            Context context = getContext();

            mediaPlayer = new MediaPlayer();

            AudioAttributes attrs = new AudioAttributes.Builder()
                    .setUsage(AudioAttributes.USAGE_ALARM)
                    .setContentType(AudioAttributes.CONTENT_TYPE_MUSIC)
                    .build();
            mediaPlayer.setAudioAttributes(attrs);

            if ("content".equals(uri.getScheme())) {
                ParcelFileDescriptor pfd = context.getContentResolver().openFileDescriptor(uri, "r");
                if (pfd != null) {
                    mediaPlayer.setDataSource(pfd.getFileDescriptor());
                    pfd.close();
                } else {
                    call.reject("Failed to open content URI: " + uriStr);
                    return;
                }
            } else {
                mediaPlayer.setDataSource(context, uri);
            }

            mediaPlayer.setLooping(loop);
            mediaPlayer.prepare();
            mediaPlayer.start();

            JSObject result = new JSObject();
            result.put("success", true);
            call.resolve(result);
        } catch (Exception e) {
            call.reject("Failed to play audio: " + e.getMessage(), e);
        }
    }

    @PluginMethod()
    public void stopAlarmAudio(PluginCall call) {
        stopInternal();
        stopAlarmService();
        JSObject result = new JSObject();
        result.put("success", true);
        call.resolve(result);
    }

    @PluginMethod()
    public void scheduleAlarm(PluginCall call) {
        Double triggerAtMillisValue = call.getDouble("triggerAtMillis");
        if (triggerAtMillisValue == null || triggerAtMillisValue <= 0) {
            call.reject("triggerAtMillis is required");
            return;
        }
        long triggerAtMillis = triggerAtMillisValue.longValue();

        String uriStr = call.getString("uri", "");
        boolean loop = call.getBoolean("loop", true);
        Context context = getContext();
        AlarmManager alarmManager = (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);
        if (alarmManager == null) {
            call.reject("AlarmManager unavailable");
            return;
        }

        PendingIntent pendingIntent = buildAlarmPendingIntent(context, uriStr, loop);
        alarmManager.cancel(pendingIntent);

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
            AlarmManager.AlarmClockInfo alarmClockInfo =
                    new AlarmManager.AlarmClockInfo(triggerAtMillis, null);
            alarmManager.setAlarmClock(alarmClockInfo, pendingIntent);
        } else {
            alarmManager.setExact(AlarmManager.RTC_WAKEUP, triggerAtMillis, pendingIntent);
        }

        JSObject result = new JSObject();
        result.put("success", true);
        call.resolve(result);
    }

    @PluginMethod()
    public void cancelScheduledAlarm(PluginCall call) {
        Context context = getContext();
        AlarmManager alarmManager = (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);
        if (alarmManager != null) {
            alarmManager.cancel(buildAlarmPendingIntent(context, "", true));
        }
        stopAlarmService();

        JSObject result = new JSObject();
        result.put("success", true);
        call.resolve(result);
    }

    private PendingIntent buildAlarmPendingIntent(Context context, String uriStr, boolean loop) {
        Intent intent = new Intent(context, AlarmReceiver.class);
        intent.putExtra(AlarmPlaybackService.EXTRA_URI, uriStr);
        intent.putExtra(AlarmPlaybackService.EXTRA_LOOP, loop);
        return PendingIntent.getBroadcast(
                context,
                ALARM_REQUEST_CODE,
                intent,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );
    }

    private void stopAlarmService() {
        Context context = getContext();
        Intent intent = new Intent(context, AlarmPlaybackService.class);
        intent.setAction(AlarmPlaybackService.ACTION_STOP);
        context.stopService(intent);
    }

    private void stopInternal() {
        if (mediaPlayer != null) {
            try {
                if (mediaPlayer.isPlaying()) {
                    mediaPlayer.stop();
                }
                mediaPlayer.release();
            } catch (Exception ignored) {
            }
            mediaPlayer = null;
        }
    }

    @Override
    protected void handleOnDestroy() {
        super.handleOnDestroy();
        stopInternal();
    }
}
