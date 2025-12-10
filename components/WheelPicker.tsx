import React, { useRef, useEffect, useState } from 'react';

interface WheelPickerProps {
  value: number;
  min: number;
  max: number;
  onChange: (val: number) => void;
}

export const WheelPicker: React.FC<WheelPickerProps> = ({ value, min, max, onChange }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [scrollTop, setScrollTop] = useState(0);
  const ITEM_HEIGHT = 60;
  const VISIBLE_ITEMS = 5;

  const range = Array.from({ length: max - min + 1 }, (_, i) => i + min);

  // 初始化和同步滚动位置
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
    if (!containerRef.current) return;
    
    const currentScrollTop = containerRef.current.scrollTop;
    const rawIndex = currentScrollTop / ITEM_HEIGHT;
    const roundedIndex = Math.round(rawIndex);
    const newValue = Math.max(min, Math.min(max, min + roundedIndex));

    // 平滑滚动到准确位置
    const targetScrollTop = roundedIndex * ITEM_HEIGHT;
    
    if (Math.abs(currentScrollTop - targetScrollTop) > 1) {
      containerRef.current.scrollTo({
        top: targetScrollTop,
        behavior: 'smooth'
      });
    }
    
    if (newValue !== value) {
      onChange(newValue);
    }
    
    setIsDragging(false);
  };

  const handleScroll = () => {
    if (!containerRef.current) return;
    
    const currentScrollTop = containerRef.current.scrollTop;
    setScrollTop(currentScrollTop);
    setIsDragging(true);
    
    // 清除之前的定时器
    if ((window as any).wheelScrollTimeout) {
      clearTimeout((window as any).wheelScrollTimeout);
    }
    
    // 设置新的定时器
    (window as any).wheelScrollTimeout = setTimeout(() => {
      handleScrollEnd();
    }, 150);
  };

  // 阻止事件冒泡
  const stopPropagation = (e: React.SyntheticEvent) => {
    e.stopPropagation();
    e.preventDefault();
  };

  // 计算中心位置
  const centerY = scrollTop + (ITEM_HEIGHT * (VISIBLE_ITEMS / 2));

  return (
    <div className="relative h-[300px] w-full flex items-center justify-center">
      
      {/* 中心指示线 - 更明显的样式 */}
      <div className="absolute top-1/2 left-0 right-0 flex items-center justify-center z-20">
        <div className="wheel-center-line w-48 h-[3px] rounded-full" />
        <div className="absolute left-4 right-4 h-[60px] border-t border-b border-white/30 -translate-y-1/2" />
      </div>

      {/* 分钟标签 */}
      <div className="absolute right-8 top-1/2 -translate-y-1/2 z-30 pointer-events-none">
        <span className="text-lg font-medium text-white/60 tracking-widest">分钟</span>
      </div>

      {/* 滚轮容器 */}
      <div 
        ref={containerRef}
        className="h-full w-full overflow-y-scroll no-scrollbar py-[120px]"
        onScroll={handleScroll}
        onTouchStart={stopPropagation}
        onTouchMove={stopPropagation}
        onTouchEnd={() => {
          stopPropagation;
          setTimeout(handleScrollEnd, 100);
        }}
        onMouseDown={() => setIsDragging(true)}
        onMouseUp={() => {
          setIsDragging(false);
          handleScrollEnd();
        }}
        style={{
          maskImage: 'linear-gradient(to bottom, transparent 0%, black 15%, black 85%, transparent 100%)',
          WebkitMaskImage: 'linear-gradient(to bottom, transparent 0%, black 15%, black 85%, transparent 100%)'
        }}
      >
        {range.map((num) => {
          const itemTop = (num - min) * ITEM_HEIGHT;
          const itemCenter = itemTop + ITEM_HEIGHT / 2;
          const distance = Math.abs(centerY - itemCenter);
          
          // 计算缩放和透明度
          let scale = 1;
          let opacity = 1;
          let fontSize = 'text-[60px]';
          
          if (distance < ITEM_HEIGHT * 0.6) {
            // 中心区域 - 最大
            scale = 1;
            opacity = 1;
            fontSize = 'text-[72px]';
          } else if (distance < ITEM_HEIGHT * 1.2) {
            // 过渡区域
            const t = (distance - ITEM_HEIGHT * 0.6) / (ITEM_HEIGHT * 0.6);
            scale = 0.9 + 0.1 * (1 - t);
            opacity = 0.7 + 0.3 * (1 - t);
            fontSize = 'text-[64px]';
          } else {
            // 边缘区域
            const t = Math.min(1, (distance - ITEM_HEIGHT * 1.2) / (ITEM_HEIGHT * 2));
            scale = 0.8 + 0.1 * (1 - t);
            opacity = 0.3 + 0.4 * (1 - t);
            fontSize = 'text-[56px]';
          }
          
          const isSelected = distance < ITEM_HEIGHT * 0.3;
          
          return (
            <div 
              key={num} 
              className={`wheel-item h-[60px] flex items-center justify-center select-none ${fontSize}`}
              style={{
                transform: `scale(${scale})`,
                opacity: opacity,
                transition: isDragging ? 'none' : 'all 0.15s cubic-bezier(0.4, 0, 0.2, 1)',
                color: isSelected ? 'white' : 'rgba(255,255,255,0.8)'
              }}
            >
              <span className={`font-light tabular-nums leading-none tracking-tight ${
                isSelected ? 'font-medium' : ''
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
