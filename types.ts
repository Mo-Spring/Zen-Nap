// types.ts
export enum AppState { IDLE, RUNNING, ALARM, SUMMARY }
export interface NapMode { /* ... */ }
export interface SessionStats { /* ... */ }

export enum AppState {
  IDLE = 'IDLE',
  RUNNING = 'RUNNING',
  ALARM = 'ALARM',
  SUMMARY = 'SUMMARY',
}

export interface NapMode {
  id: string;
  name: string;
  durationMinutes: number;
  themeColor: string; // Tailwind class prefix or hex
  accentColor: string;
  iconType: 'lightning' | 'coffee' | 'plane' | 'bed' | 'custom';
  bgImage: string;
}

export interface SessionStats {
  startTime: Date;
  endTime: Date;
  durationSeconds: number;
}

// 添加音乐轨道类型
export interface MusicTrack {
  name: string;
  path: string;
  uri?: string;
}
