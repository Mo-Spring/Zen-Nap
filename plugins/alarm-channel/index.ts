import { registerPlugin } from '@capacitor/core';

export interface AlarmChannelPlugin {
    createAlarmChannel(options: { channelId?: string; channelName?: string }): Promise<{ success: boolean; message?: string }>;
    playAlarmAudio(options: { uri: string; loop?: boolean }): Promise<{ success: boolean }>;
    stopAlarmAudio(): Promise<{ success: boolean }>;
    scheduleAlarm(options: { uri?: string; triggerAtMillis: number; loop?: boolean }): Promise<{ success: boolean }>;
    cancelScheduledAlarm(): Promise<{ success: boolean }>;
}

const AlarmChannel = registerPlugin<AlarmChannelPlugin>('AlarmChannel');

export default AlarmChannel;
