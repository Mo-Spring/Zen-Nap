import React, { useRef, useEffect, UIEvent } from 'react';

interface WheelPickerProps {
  value: number;
  min: number;
  max: number;
  onChange: (val: number) => void;
}

export const WheelPicker: React.FC<WheelPickerProps> = ({ value, min, max, onChange }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const isScrolling = useRef<number | null>(null);
  const ITEM_HEIGHT = 64; 
  const VISIBLE_ITEMS = 4; // 可见区域显示4个item（256px / 64px = 4）

  // Generate the range of numbers
  const range = Array.from({ length: max - min + 1 }, (_, i) => i + min);

  // Sync scroll position with value on initial mount or when value changes externally
  useEffect(() => {
    if (containerRef.current) {
      const index = value - min;
      const targetScrollTop = index * ITEM_HEIGHT;
      // Only set scroll position if it's not already there, to avoid conflicts with user scrolling
      if (containerRef.current.scrollTop !== targetScrollTop) {
        containerRef.current.scrollTop = targetScrollTop;
      }
    }
  }, [value, min]);

  const handleScrollEnd = () => {
    if (!containerRef.current) return;
    
    const scrollTop = containerRef.current.scrollTop;
    // 关键修复：四舍五入时使用正确的偏移量
    const index = Math.round(scrollTop / ITEM_HEIGHT);
    const newValue = Math.max(min, Math.min(max, min + index));

    // Snap to the nearest item
    const targetScrollTop = index * ITEM_HEIGHT;
    containerRef.current.scrollTo({
      top: targetScrollTop,
      behavior: 'smooth',
    });

    // Update the state if the value has changed
    if (newValue !== value) {
      onChange(newValue);
    }
  };

  const onScroll = (e: UIEvent<HTMLDivElement>) => {
    e.stopPropagation(); // Prevent parent swipe gestures
    if (isScrolling.current) {
      clearTimeout(isScrolling.current);
    }
    isScrolling.current = window.setTimeout(handleScrollEnd, 150);
  };
  
  const stopPropagation = (e: React.SyntheticEvent) => e.stopPropagation();

  return (
    <div 
      className="relative h-[256px] w-[260px] flex items-center justify-center"
      onTouchStart={stopPropagation}
      onTouchMove={stopPropagation}
      onMouseDown={stopPropagation}
    >
      
      {/* Selection Lines / Scale Indicators */}
      {/* 关键修复：调整选区位置，确保正好框住中心项 */}
      <div className="absolute top-[calc(50%-32px)] left-4 right-4 h-[64px] border-y border-white/20 pointer-events-none z-20" />

      {/* Fixed "Minutes" Label */}
      <div className="absolute right-12 top-1/2 -translate-y-1/2 mt-1 z-30 pointer-events-none">
          <span className="text-sm font-medium text-white/50 tracking-widest">分钟</span>
      </div>

      {/* Scrollable Container with Mask for Fade Effect */}
      <div 
        ref={containerRef}
        className="h-full w-full overflow-y-scroll snap-y snap-mandatory no-scrollbar"
        onScroll={onScroll}
        style={{
          maskImage: 'linear-gradient(to bottom, transparent 0%, black 25%, black 75%, transparent 100%)',
          WebkitMaskImage: 'linear-gradient(to bottom, transparent 0%, black 25%, black 75%, transparent 100%)'
        }}
      >
        {/* 关键修复：添加padding确保中心项正确对齐 */}
        <div className="pt-[96px] pb-[96px]">
          {range.map((num) => {
            // 计算距离中心的位置
            // 关键修复：正确计算视觉中心（容器中部）
            const scrollTop = containerRef.current?.scrollTop || 0;
            const itemCenter = (num - min) * ITEM_HEIGHT + ITEM_HEIGHT / 2;
            const containerCenter = scrollTop + (ITEM_HEIGHT * VISIBLE_ITEMS) / 2;
            const distance = Math.abs(containerCenter - itemCenter);
            
            // 计算缩放和透明度（越靠近中心越大越清晰）
            const scale = Math.max(0.7, 1 - distance / (ITEM_HEIGHT * 2));
            const opacity = Math.max(0.2, 1 - distance / (ITEM_HEIGHT * 1.5));
            
            // 判断是否为选中项（距离中心最近）
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
  );
};
