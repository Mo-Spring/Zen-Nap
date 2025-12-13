
import { Zap, Coffee, Plane, Moon, 设置, BarChart2, ChevronLeft, Info, Hexagon } from 'lucide-react';

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

// 新增的 App 图标：时钟圆环 + Zzz
export const ZenAppIcon = ({ className }: { className?: string }) => (
  <svg 
    viewBox="0 0 24 24" 
    fill="none" 
    className={className} 
    stroke="currentColor"
    strokeLinecap="round" 
    strokeLinejoin="round"
  >
    {/* 外部圆环，代表时钟/计时/循环，透明度降低作为背景 */}
    <circle cx="12" cy="13" r="9" strokeWidth="1.5" strokeOpacity="0.3" />
    
    {/* 主体的 Z，代表睡眠 */}
    <path d="M9 10h6l-6 7h6" strokeWidth="2" />
    
    {/* 右上角的小 z，增加 Zzz 的动态感，也打破圆形的沉闷 */}
    <path d="M19 4h3l-3 3h3" strokeWidth="1.5" strokeOpacity="0.8" />
  </svg>
);

