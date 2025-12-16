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

// Zen App 图标：同步更新为 v5 设计 (纤细新月 + 分离式 Z)
export const ZenAppIcon = ({ className }: { className?: string }) => (
  <svg 
    viewBox="0 0 24 24" 
    fill="none" 
    className={className} 
    stroke="currentColor"
    strokeLinecap="round" 
    strokeLinejoin="round"
  >
    {/* 纤细新月 (Filled) */}
    <path 
        d="M 13 5 A 8 8 0 1 0 13 19 A 7.1 7.1 0 0 1 13 5 Z" 
        fill="currentColor"
        strokeWidth="0"
    />
    
    {/* 大 Z */}
    <path 
        d="M 15 13 H 19 L 15 17 H 19" 
        strokeWidth="2" 
    />
    
    {/* 小 z */}
    <path 
        d="M 20 5 H 23 L 20 8 H 23" 
        strokeWidth="1.5" 
        strokeOpacity="0.5"
    />
  </svg>
);
