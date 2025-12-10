[file name]: components/WheelPicker.tsx
[file content begin]
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
  const CONTAINER_HEIGHT = 256; // 容器高度
  const VISIBLE_ITEMS = 5; // 可见项目数（中间1个+上下各2个）

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
    
    // 更精确的滚动结束处理
    const rawIndex = scrollTop / ITEM_HEIGHT;
    const index = Math.round(rawIndex);
    const newValue = Math.max(min, Math.min(max, min + index));

    // 只有在值改变时才更新
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

  // 计算中心位置（容器的中间）
  const centerPosition = CONTAINER_HEIGHT / 2;

  return (
    <div 
      className="relative h-[256px] w-[260px] flex items-center justify-center"
      onTouchStart={stopPropagation}
      onTouchMove={stopPropagation}
      onMouseDown={stopPropagation}
    >
      
      {/* 中心选择指示器 - 更明显的样式 */}
      <div className="absolute top-1/2 left-2 right-14 h-[64px] -translate-y-1/2 
                      border-t-2 border-b-2 border-white/40 pointer-events-none z-20">
        {/* 中心高亮背景 */}
        <div className="absolute inset-0 bg-white/10 rounded-lg" />
      </div>

      {/* Fixed "Minutes" Label */}
      <div className="absolute right-14 top-1/2 -translate-y-1/2 mt-1 z-30 pointer-events-none">
          <span className="text-sm font-medium text-white/70 tracking-widest">分钟</span>
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
          maskImage: 'linear-gradient(to bottom, transparent 0%, black 20%, black 80%, transparent 100%)',
          WebkitMaskImage: 'linear-gradient(to bottom, transparent 0%, black 20%, black 80%, transparent 100%)'
        }}
      >
        {range.map((num) => {
          const itemTop = (num - min) * ITEM_HEIGHT;
          const itemCenter = itemTop + ITEM_HEIGHT / 2;
          const distance = Math.abs(centerPosition - itemCenter);
          
          // 更精确的距离计算（以像素为单位）
          const normalizedDistance = Math.min(distance / ITEM_HEIGHT, 1);
          
          // 缩放比例：中心最大，越远越小
          const scale = 1 - 0.3 * normalizedDistance;
          
          // 透明度：中心最亮，越远越暗
          const opacity = 1 - 0.7 * normalizedDistance;
          
          // 字体大小：中心最大
          const fontSize = 72 - 24 * normalizedDistance;
          
          // 字体粗细：中心最粗
          const fontWeight = normalizedDistance < 0.1 ? 'font-medium' : 'font-light';
          
          const isSelected = distance < ITEM_HEIGHT / 2;

          return (
            <div 
              key={num} 
              className="h-[64px] flex items-center justify-center select-none transition-all duration-100"
              style={{
                transform: `scale(${scale})`,
                opacity: opacity,
              }}
            >
              <span className={`tabular-nums leading-none text-white ${fontWeight} transition-all duration-100`}
                    style={{ fontSize: `${fontSize}px` }}>
                  {num}
              </span>
            </div>
          );
        })}
      </div>
      
      {/* 上下渐变遮罩，增强滚轮效果 */}
      <div className="absolute top-0 left-0 right-0 h-24 bg-gradient-to-b from-black/80 to-transparent pointer-events-none z-10" />
      <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-black/80 to-transparent pointer-events-none z-10" />
    </div>
  );
};
[file content end]
