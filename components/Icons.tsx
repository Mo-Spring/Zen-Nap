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

// Zen App 图标：更新为 Safe Zone 修正版设计
export const ZenAppIcon = ({ className }: { className?: string }) => (
  <svg 
    viewBox="0 0 24 24" 
    fill="none" 
    className={className} 
    stroke="currentColor"
    strokeLinecap="round" 
    strokeLinejoin="round"
  >
    {/* 圆环 (Radius 5.5) */}
    <path 
        d="M 12 6.5 A 5.5 5.5 0 1 1 12 17.5 A 5.5 5.5 0 1 1 12 6.5" 
        strokeWidth="1.5" 
        className="opacity-40" 
    />
    
    {/* 大 Z */}
    <path 
        d="M 9.5 9.5 H 14.5 L 9.5 14.5 H 14.5" 
        strokeWidth="2" 
        className="opacity-100"
    />
    
    {/* 小 z */}
    <path 
        d="M 15.5 5.5 H 17.5 L 15.5 7.5 H 17.5" 
        strokeWidth="1.2" 
        className="opacity-70" 
    />
  </svg>
);
