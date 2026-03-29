package com.zennaptimer.alarmchannel;

import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.content.Context;
import android.media.AudioAttributes;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "AlarmChannel")
public class AlarmChannelPlugin extends Plugin {

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

            // 关键：设置闹钟音频属性，走闹钟音量通道
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
}
