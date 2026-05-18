package com.zennaptimer.alarmchannel;

import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.content.Context;
import android.media.AudioAttributes;
import android.media.MediaPlayer;
import android.net.Uri;
import android.os.ParcelFileDescriptor;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "AlarmChannel")
public class AlarmChannelPlugin extends Plugin {

    private MediaPlayer mediaPlayer;

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

    /**
     * 使用 STREAM_ALARM 播放音频，走闹钟音量通道。
     */
    @PluginMethod()
    public void playAlarmAudio(PluginCall call) {
        String uriStr = call.getString("uri");
        if (uriStr == null || uriStr.isEmpty()) {
            // No custom music provided — fall back to system default alarm
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

            // 使用 ContentResolver 打开 content:// URI，兼容 Capacitor Filesystem 插件返回的路径
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

    /**
     * 停止闹钟音频播放。
     */
    @PluginMethod()
    public void stopAlarmAudio(PluginCall call) {
        stopInternal();
        JSObject result = new JSObject();
        result.put("success", true);
        call.resolve(result);
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
