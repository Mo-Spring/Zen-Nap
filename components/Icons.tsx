import React from 'react';
import { Zap, Coffee, Plane, Moon, Settings, Music, BarChart2, X, ChevronLeft, Info, Hexagon } from 'lucide-react';

export const IconMap = {
  lightning: Zap,
  coffee: Coffee,
  plane: Plane,
  bed: Moon, // Using Moon as proxy for the pillow/sleep icon
  custom: Settings,
};

export const MenuIcon = () => <BarChart2 className="w-6 h-6 text-white/80" strokeWidth={1.5} />;
export const SettingsIcon = () => <Hexagon className="w-6 h-6 text-white/80" strokeWidth={1.5} />;
export const BackIcon = () => <ChevronLeft className="w-8 h-8 text-white/90" strokeWidth={1.5} />;
export const InfoIcon = () => <Info className="w-6 h-6 text-white/80" strokeWidth={1.5} />;