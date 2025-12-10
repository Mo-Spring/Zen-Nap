
import { LucideIcon } from 'lucide-react';

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
