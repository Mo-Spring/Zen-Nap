package com.zennaptimer.alarmchannel;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.os.Build;

public class AlarmReceiver extends BroadcastReceiver {
    @Override
    public void onReceive(Context context, Intent intent) {
        Intent serviceIntent = new Intent(context, AlarmPlaybackService.class);
        serviceIntent.setAction(AlarmPlaybackService.ACTION_PLAY);
        serviceIntent.putExtra(AlarmPlaybackService.EXTRA_URI, intent.getStringExtra(AlarmPlaybackService.EXTRA_URI));
        serviceIntent.putExtra(AlarmPlaybackService.EXTRA_LOOP, intent.getBooleanExtra(AlarmPlaybackService.EXTRA_LOOP, true));

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            context.startForegroundService(serviceIntent);
        } else {
            context.startService(serviceIntent);
        }
    }
}
