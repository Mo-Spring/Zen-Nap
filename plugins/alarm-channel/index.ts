import { registerPlugin } from '@capacitor/core';

export interface AlarmChannelPlugin {
    createAlarmChannel(options: { channelId?: string; channelName?: string }): Promise<{ success: boolean; message?: string }>;
}

const AlarmChannel = registerPlugin<AlarmChannelPlugin>('AlarmChannel');

export default AlarmChannel;
