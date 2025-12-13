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

// Zen App 图标：同步更新为 Safe Zone 紧凑布局
export const ZenAppIcon = ({ className }: { className?: string }) => (
  <svg 
    viewBox="0 0 24 24" 
    fill="none" 
    className={className} 
    stroke="currentColor"
    strokeLinecap="round" 
    strokeLinejoin="round"
  >
    {/* 圆环 (Radius 4.5) */}
    <path 
        d="M 12 7.5 A 4.5 4.5 0 1 1 12 16.5 A 4.5 4.5 0 1 1 12 7.5" 
        strokeWidth="1.5" 
        className="opacity-40" 
    />
    
    {/* 大 Z */}
    <path 
        d="M 10 10 H 14 L 10 14 H 14" 
        strokeWidth="2" 
        className="opacity-100"
    />
    
    {/* 小 z */}
    <path 
        d="M 14 7 H 15.5 L 14 8.5 H 15.5" 
        strokeWidth="1.2" 
        className="opacity-70" 
    />
  </svg>
);
