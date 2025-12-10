import React, { useRef, useEffect, useState, UIEvent } from 'react';
import { ChevronLeft, Settings } from 'lucide-react';

interface WheelPickerProps {
  value: number;
  min: number;
  max: number;
  onChange: (val: number) => void;
  onClose: () => void;
  title?: string;
}

export const WheelPicker: React.FC<WheelPickerProps> = ({ 
  value, min, max, onChange, onClose, title = "设置时长" 
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const isScrolling = useRef<number | null>(null);
  const [isEntering, setIsEntering] = useState(true);
  const [scaleLineVisible, setScaleLineVisible] = useState(false);
  const [buttonsVisible, setButtonsVisible] = useState(true);
  
  const ITEM_HEIGHT = 64;
  const VISIBLE_ITEMS = 4;

  const range = Array.from({ length: max - min + 1 }, (_, i) => i + min);

  // 进入动画
  useEffect(() => {
    // 按钮先开始淡出
    setButtonsVisible(false);
    
    // 延迟显示刻度线并开始放大动画
    const timer = setTimeout(() => {
      setScaleLineVisible(true);
    }, 100);
    
    // 结束进入状态
    const endTimer = setTimeout(() => {
      setIsEntering(false);
    }, 600);
    
    return () => {
      clearTimeout(timer);
      clearTimeout(endTimer);
    };
  }, []);

  // 同步滚动位置
  useEffect(() => {
    if (containerRef.current && !isEntering) {
      const index = value - min;
      const targetScrollTop = index * ITEM_HEIGHT;
      if (containerRef.current.scrollTop !== targetScrollTop) {
        containerRef.current.scrollTop = targetScrollTop;
      }
    }
  }, [value, min, isEntering]);

  const handleScrollEnd = () => {
    if (!containerRef.current || isEntering) return;
    
    const scrollTop = containerRef.current.scrollTop;
    const index = Math.round(scrollTop / ITEM_HEIGHT);
    const newValue = Math.max(min, Math.min(max, min + index));

    // 吸附到最近的项
    const targetScrollTop = index * ITEM_HEIGHT;
    containerRef.current.scrollTo({
      top: targetScrollTop,
      behavior: 'smooth',
    });

    if (newValue !== value) {
      onChange(newValue);
    }
  };

  const onScroll = (e: UIEvent<HTMLDivElement>) => {
    if (isEntering) return;
    
    e.stopPropagation();
    if (isScrolling.current) {
      clearTimeout(isScrolling.current);
    }
    isScrolling.current = window.setTimeout(handleScrollEnd, 150);
  };
  
  const stopPropagation = (e: React.SyntheticEvent) => e.stopPropagation();

  // 关闭时的动画
  const handleClose = () => {
    setIsEntering(true);
    setScaleLineVisible(false);
    setButtonsVisible(true);
    
    // 动画完成后关闭
    setTimeout(() => {
      onClose();
    }, 400);
  };

  return (
    <div className="fixed inset-0 bg-black z-50 flex flex-col">
      {/* 头部 - 带有渐隐动画 */}
      <div 
        className={`px-6 pt-12 pb-6 flex items-center justify-between transition-all duration-500 ${
          buttonsVisible ? 'opacity-100' : 'opacity-0 translate-y-[-20px]'
        }`}
        style={{
          pointerEvents: buttonsVisible ? 'auto' : 'none'
        }}
      >
        <button
          onClick={handleClose}
          className="p-3 rounded-full hover:bg-white/10 active:bg-white/20 transition-colors touch-manipulation"
          aria-label="返回"
        >
          <ChevronLeft className="w-6 h-6" />
        </button>
        
        <h1 className="text-xl font-light tracking-wider">{title}</h1>
        
        <button
          className="p-3 rounded-full hover:bg-white/10 active:bg-white/20 transition-colors touch-manipulation"
          aria-label="设置"
        >
          <Settings className="w-6 h-6" />
        </button>
      </div>

      {/* 主体内容 - 滚轮选择器 */}
      <div className="flex-1 flex items-center justify-center">
        <div 
          className="relative h-[256px] w-[260px] flex items-center justify-center"
          onTouchStart={stopPropagation}
          onTouchMove={stopPropagation}
          onMouseDown={stopPropagation}
        >
          {/* 动画化的中心刻度线 */}
          <div 
            className={`absolute left-4 right-4 h-[64px] border-y border-white/20 pointer-events-none z-20 transition-all duration-500 ease-out ${
              scaleLineVisible 
                ? 'top-[calc(50%-32px)] opacity-100 scale-100' 
                : 'top-1/2 opacity-0 scale-50 -translate-y-1/2'
            }`}
            style={{
              transformOrigin: 'center center'
            }}
          />
          
          {/* "分钟" 标签 - 同步动画 */}
          <div 
            className={`absolute right-12 top-1/2 -translate-y-1/2 mt-1 z-30 pointer-events-none transition-all duration-500 ${
              scaleLineVisible ? 'opacity-100' : 'opacity-0 translate-x-10'
            }`}
          >
            <span className="text-sm font-medium text-white/50 tracking-widest">分钟</span>
          </div>

          {/* 滚动容器 */}
          <div 
            ref={containerRef}
            className="h-full w-full overflow-y-scroll snap-y snap-mandatory no-scrollbar"
            onScroll={onScroll}
            style={{
              maskImage: 'linear-gradient(to bottom, transparent 0%, black 25%, black 75%, transparent 100%)',
              WebkitMaskImage: 'linear-gradient(to bottom, transparent 0%, black 25%, black 75%, transparent 100%)',
              opacity: scaleLineVisible ? 1 : 0,
              transform: scaleLineVisible ? 'scale(1)' : 'scale(0.8)',
              transition: 'all 500ms ease-out'
            }}
          >
            {/* 顶部和底部填充确保中心对齐 */}
            <div className="pt-[96px] pb-[96px]">
              {range.map((num) => {
                const scrollTop = containerRef.current?.scrollTop || 0;
                const itemCenter = (num - min) * ITEM_HEIGHT + ITEM_HEIGHT / 2;
                const containerCenter = scrollTop + (ITEM_HEIGHT * VISIBLE_ITEMS) / 2;
                const distance = Math.abs(containerCenter - itemCenter);
                
                const scale = Math.max(0.7, 1 - distance / (ITEM_HEIGHT * 2));
                const opacity = Math.max(0.2, 1 - distance / (ITEM_HEIGHT * 1.5));
                const isSelected = distance <= ITEM_HEIGHT / 2;
                
                return (
                  <div 
                    key={num} 
                    className="h-[64px] flex items-center justify-center snap-center select-none"
                    style={{
                      transform: `scale(${scale})`,
                      opacity: opacity,
                      transition: 'transform 150ms ease, opacity 150ms ease'
                    }}
                  >
                    <span className={`font-light tabular-nums leading-none tracking-tight text-white ${
                      isSelected ? 'text-[72px] font-medium' : 'text-[60px]'
                    }`}>
                      {num}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* 底部确认按钮 - 带有渐隐动画 */}
      <div 
        className={`px-6 pb-8 pt-6 transition-all duration-500 ${
          buttonsVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
        }`}
        style={{
          pointerEvents: buttonsVisible ? 'auto' : 'none'
        }}
      >
        <button
          onClick={handleClose}
          className="w-full py-4 bg-white/10 hover:bg-white/20 active:bg-white/30 rounded-2xl 
                   text-lg font-medium tracking-wider transition-all duration-300 
                   touch-manipulation border border-white/20"
        >
          确认
        </button>
      </div>
    </div>
  );
};
