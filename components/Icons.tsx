import { Zap, Coffee, Plane, Moon, Settings, BarChart2, ChevronLeft, Info, Hexagon } from 'lucide-react';

export const IconMap = {
  lightning: Zap,
  coffee: Coffee,
  plane: Plane,
  bed: Moon,
  custom: Settings,
};

export const MenuIcon = () => <BarChart2 className="w-6 h-6 text-white/80" strokeWidth={1.5} />;
export const SettingsIcon = () => <Hexagon className="w-6 h-6 text-white/80" strokeWidth={1.5} />;
export const BackIcon = () => <ChevronLeft className="w-8 h-8 text-white/90" strokeWidth={1.5} />;
export const InfoIcon = () => <Info className="w-6 h-6 text-white/80" strokeWidth={1.5} />;

// Zen App 图标：同步更新为 v6 设计 (美学叠加版)
export const ZenAppIcon = ({ className }: { className?: string }) => (
  <svg 
    viewBox="0 0 24 24" 
    fill="none" 
    className={className} 
    stroke="currentColor"
    strokeLinecap="round" 
    strokeLinejoin="round"
  >
    {/* 优雅的 C 型新月 */}
    <path 
        d="M 11 3 A 9 9 0 1 0 11 21 A 7.5 7.5 0 0 1 11 3 Z" 
        fill="currentColor"
        strokeWidth="0"
    />
    
    {/* 大 Z (Cutout Mask / Background Stroke) */}
    {/* 这里使用黑色描边模拟“切割”效果，适应 APP 的深色背景 */}
    <path 
        d="M 13.5 12.5 H 17.5 L 13.5 16.5 H 17.5" 
        stroke="black"
        strokeWidth="3.5" 
    />
    
    {/* 大 Z (White/Foreground) */}
    <path 
        d="M 13.5 12.5 H 17.5 L 13.5 16.5 H 17.5" 
        strokeWidth="2" 
    />
    
    {/* 小 Z */}
    <path 
        d="M 19.5 5.5 H 22 L 19.5 8 H 22" 
        strokeWidth="1.5" 
        strokeOpacity="0.6"
    />
  </svg>
);
