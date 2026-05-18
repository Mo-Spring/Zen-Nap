package com.zennaptimer.alarmchannel;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.media.AudioAttributes;
import android.media.MediaPlayer;
import android.net.Uri;
import android.os.Build;
import android.os.IBinder;
import android.os.ParcelFileDescriptor;
import android.os.PowerManager;

public class AlarmPlaybackService extends Service {
    public static final String ACTION_PLAY = "com.zennaptimer.alarmchannel.PLAY";
    public static final String ACTION_STOP = "com.zennaptimer.alarmchannel.STOP";
    public static final String EXTRA_URI = "uri";
    public static final String EXTRA_LOOP = "loop";
    public static final String CHANNEL_ID = "zen_nap_alarm_playback_channel";
    private static final int NOTIFICATION_ID = 1001;

    private MediaPlayer mediaPlayer;
    private PowerManager.WakeLock wakeLock;

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        String action = intent != null ? intent.getAction() : null;
        if (ACTION_STOP.equals(action)) {
            stopPlayback();
            stopForeground(true);
            stopSelf();
            return START_NOT_STICKY;
        }

        ensureChannel();
        startForeground(NOTIFICATION_ID, buildNotification());

        String uri = intent != null ? intent.getStringExtra(EXTRA_URI) : null;
        boolean loop = intent != null && intent.getBooleanExtra(EXTRA_LOOP, true);
        startPlayback(uri, loop);
        return START_STICKY;
    }

    private Notification buildNotification() {
        Intent stopIntent = new Intent(this, AlarmPlaybackService.class);
        stopIntent.setAction(ACTION_STOP);
        PendingIntent stopPendingIntent = PendingIntent.getService(
                this,
                2,
                stopIntent,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );

        Notification.Builder builder = Build.VERSION.SDK_INT >= Build.VERSION_CODES.O
                ? new Notification.Builder(this, CHANNEL_ID)
                : new Notification.Builder(this);

        return builder
                .setSmallIcon(getApplicationInfo().icon)
                .setContentTitle("小憩结束")
                .setContentText("闹钟正在播放")
                .setPriority(Notification.PRIORITY_MAX)
                .setCategory(Notification.CATEGORY_ALARM)
                .setOngoing(true)
                .addAction(0, "停止", stopPendingIntent)
                .build();
    }

    private void startPlayback(String uriStr, boolean loop) {
        try {
            stopPlayback();
            acquireWakeLock();
            if (uriStr == null || uriStr.isEmpty()) {
                uriStr = android.provider.Settings.System.DEFAULT_ALARM_ALERT_URI.toString();
            }

            Uri uri = Uri.parse(uriStr);
            mediaPlayer = new MediaPlayer();
            mediaPlayer.setAudioAttributes(new AudioAttributes.Builder()
                    .setUsage(AudioAttributes.USAGE_ALARM)
                    .setContentType(AudioAttributes.CONTENT_TYPE_MUSIC)
                    .build());

            if ("content".equals(uri.getScheme())) {
                ParcelFileDescriptor pfd = getContentResolver().openFileDescriptor(uri, "r");
                if (pfd == null) {
                    throw new IllegalStateException("Unable to open content URI");
                }
                mediaPlayer.setDataSource(pfd.getFileDescriptor());
                pfd.close();
            } else {
                mediaPlayer.setDataSource(this, uri);
            }

            mediaPlayer.setLooping(loop);
            mediaPlayer.prepare();
            mediaPlayer.start();
        } catch (Exception e) {
            stopPlayback();
        }
    }

    private void stopPlayback() {
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
        releaseWakeLock();
    }

    private void acquireWakeLock() {
        if (wakeLock != null && wakeLock.isHeld()) return;
        PowerManager powerManager = (PowerManager) getSystemService(Context.POWER_SERVICE);
        wakeLock = powerManager.newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, "ZenNap:AlarmPlayback");
        wakeLock.acquire(60 * 60 * 1000L);
    }

    private void releaseWakeLock() {
        if (wakeLock != null) {
            try {
                if (wakeLock.isHeld()) {
                    wakeLock.release();
                }
            } catch (Exception ignored) {
            }
            wakeLock = null;
        }
    }

    private void ensureChannel() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return;

        NotificationManager manager = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
        NotificationChannel channel = new NotificationChannel(
                CHANNEL_ID,
                "小憩闹钟",
                NotificationManager.IMPORTANCE_HIGH
        );
        channel.setDescription("小憩结束时的闹钟提醒");
        channel.enableVibration(true);
        channel.setLockscreenVisibility(Notification.VISIBILITY_PUBLIC);
        channel.setSound(null, null);
        manager.createNotificationChannel(channel);
    }

    @Override
    public void onDestroy() {
        stopPlayback();
        super.onDestroy();
    }

    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }
}
