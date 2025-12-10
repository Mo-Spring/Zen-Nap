import React, { useRef, useEffect, UIEvent, useState } from 'react';

interface WheelPickerProps {
  value: number;
  min: number;
  max: number;
  onChange: (val: number) => void;
}

export const WheelPicker: React.FC<WheelPickerProps> = ({ value, min, max, onChange }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const isScrolling = useRef<number | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [scrollTop, setScrollTop] = useState(0);
  const ITEM_HEIGHT = 64; 

  // Generate the range of numbers
  const range = Array.from({ length: max - min + 1 }, (_, i) => i + min);

  // Sync scroll position with value on initial mount
  useEffect(() => {
    if (containerRef.current && !isDragging) {
      const index = value - min;
      const targetScrollTop = index * ITEM_HEIGHT;
      if (Math.abs(containerRef.current.scrollTop - targetScrollTop) > 1) {
        containerRef.current.scrollTop = targetScrollTop;
        setScrollTop(targetScrollTop);
      }
    }
  }, [value, min, max, isDragging]);

  const handleScrollEnd = () => {
    if (!containerRef.current || isDragging) return;
    
    const scrollTop = containerRef.current.scrollTop;
    
    // 修复：使用 Math.round 确保选择正确的项目，但要考虑惯性滚动
    const rawIndex = scrollTop / ITEM_HEIGHT;
    const index = Math.round(rawIndex);
    const newValue = Math.max(min, Math.min(max, min + index));

    // 修复：只有在值改变时才更新和滚动
    if (newValue !== value) {
      const targetScrollTop = index * ITEM_HEIGHT;
      
      // 平滑滚动到目标位置
      containerRef.current.scrollTo({
        top: targetScrollTop,
        behavior: 'smooth',
      });
      
      onChange(newValue);
    }
    
    setIsDragging(false);
  };

  const onScroll = (e: UIEvent<HTMLDivElement>) => {
    e.stopPropagation();
    if (!containerRef.current) return;
    
    const currentScrollTop = containerRef.current.scrollTop;
    setScrollTop(currentScrollTop);
    setIsDragging(true);
    
    if (isScrolling.current) {
      clearTimeout(isScrolling.current);
    }
    
    isScrolling.current = window.setTimeout(() => {
      handleScrollEnd();
    }, 150);
  };

  const onTouchStart = () => {
    setIsDragging(true);
  };

  const onTouchEnd = () => {
    if (isScrolling.current) {
      clearTimeout(isScrolling.current);
    }
    isScrolling.current = window.setTimeout(() => {
      handleScrollEnd();
    }, 100);
  };

  const stopPropagation = (e: React.SyntheticEvent) => e.stopPropagation();

  // 计算中心位置（修正了之前的错误）
  const centerPosition = scrollTop + ITEM_HEIGHT * 2; // 容器高度的一半

  return (
    <div 
      className="relative h-[256px] w-[260px] flex items-center justify-center"
      onTouchStart={stopPropagation}
      onTouchMove={stopPropagation}
      onMouseDown={stopPropagation}
    >
      
      {/* Selection Lines / Scale Indicators */}
      <div className="absolute top-1/2 left-4 right-4 h-[64px] -translate-y-1/2 border-y border-white/20 pointer-events-none z-20" />

      {/* Fixed "Minutes" Label */}
      <div className="absolute right-12 top-1/2 -translate-y-1/2 mt-1 z-30 pointer-events-none">
          <span className="text-sm font-medium text-white/50 tracking-widest">分钟</span>
      </div>

      {/* Scrollable Container with Mask for Fade Effect */}
      <div 
        ref={containerRef}
        className="h-full w-full overflow-y-scroll no-scrollbar py-[96px]"
        onScroll={onScroll}
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
        onMouseDown={onTouchStart}
        onMouseUp={onTouchEnd}
        style={{
          maskImage: 'linear-gradient(to bottom, transparent 0%, black 25%, black 75%, transparent 100%)',
          WebkitMaskImage: 'linear-gradient(to bottom, transparent 0%, black 25%, black 75%, transparent 100%)'
        }}
      >
        {range.map((num) => {
          const itemTop = (num - min) * ITEM_HEIGHT;
          const itemCenter = itemTop + ITEM_HEIGHT / 2;
          const distance = Math.abs(centerPosition - itemCenter);
          
          // 更精确的计算，避免跳跃
          const scale = 0.8 + 0.4 * Math.max(0, 1 - distance / (ITEM_HEIGHT * 1.5));
          const opacity = 0.3 + 0.7 * Math.max(0, 1 - distance / (ITEM_HEIGHT * 1.5));
          
          const isSelected = distance < ITEM_HEIGHT / 3;
          
          return (
            <div 
              key={num} 
              className="h-[64px] flex items-center justify-center select-none"
              style={{
                transform: `scale(${scale})`,
                opacity: opacity,
                transition: isDragging ? 'none' : 'transform 150ms ease, opacity 150ms ease'
              }}
            >
              <span className={`font-light tabular-nums leading-none tracking-tight text-white ${
                  isSelected ? 'text-[72px]' : 'text-[60px]'
              }`}>
                  {num}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};
