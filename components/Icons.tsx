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

// Zen App 图标：严格对应 Android 图标设计
export const ZenAppIcon = ({ className }: { className?: string }) => (
  <svg 
    viewBox="0 0 24 24" 
    fill="none" 
    className={className} 
    stroke="currentColor"
    strokeLinecap="round" 
    strokeLinejoin="round"
  >
    {/* 外部圆环 - 深灰色 */}
    <path 
        d="M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z" 
        strokeWidth="1.5" 
        className="opacity-40" 
    />
    
    {/* 大 Z - 亮白色 */}
    <path 
        d="M8 9h8l-8 8h8" 
        strokeWidth="2" 
        className="opacity-100"
    />
    
    {/* 小 z (上标) - 稍暗 */}
    <path 
        d="M18.5 5h3l-3 3h3" 
        strokeWidth="1.5" 
        className="opacity-70" 
    />
  </svg>
);
