import React, { useRef, useEffect, UIEvent, useState, useMemo } from 'react';

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
  const range = useMemo(() => Array.from({ length: max - min + 1 }, (_, i) => i + min), [min, max]);

  // Sync scroll position with value on initial mount and value change
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
    
    const currentScrollTop = containerRef.current.scrollTop;
    
    // 计算应该对齐的索引
    // 我们希望数字的中心对齐到容器的中心，即 (container.offsetHeight / 2)
    // 滚轮的中心线对应于 itemTop + ITEM_HEIGHT/2
    // 由于我们想要将项目中心对齐到容器的中心，因此我们应该将滚动位置四舍五入到最近的项目顶部。
    const index = Math.round(currentScrollTop / ITEM_HEIGHT);
    const newValue = Math.max(min, Math.min(max, min + index));

    // 计算目标滚动位置
    const targetScrollTop = index * ITEM_HEIGHT;
    
    // 平滑滚动到目标位置
    containerRef.current.scrollTo({
      top: targetScrollTop,
      behavior: 'smooth',
    });
    
    // 更新值
    if (newValue !== value) {
      onChange(newValue);
    }
    
    setScrollTop(targetScrollTop);
  };
  
  const handleScroll = (e: UIEvent<HTMLDivElement>) => {
    // 清除之前的定时器
    if (isScrolling.current) {
        clearTimeout(isScrolling.current);
    }

    // 设置新的定时器
    isScrolling.current = window.setTimeout(() => {
      isScrolling.current = null;
      handleScrollEnd();
    }, 150); 
    
    setScrollTop(e.currentTarget.scrollTop);
  };

  const onTouchStart = () => setIsDragging(true);
  const onTouchEnd = () => {
    setIsDragging(false);
    // 如果没有活动的 isScrolling 定时器，手动触发 handleScrollEnd
    if (!isScrolling.current) {
        handleScrollEnd();
    }
  };

  // 如果滚轮未渲染，则不执行计算
  if (!containerRef.current) {
      return (
          <div 
              ref={containerRef}
              className="w-full h-[320px] overflow-y-scroll no-scrollbar"
              onScroll={handleScroll}
          >
              <div style={{ height: range.length * ITEM_HEIGHT }} />
          </div>
      );
  }
  
  // 计算当前中心位置（在 WheelPicker 容器内的相对位置）
  // 320px 高度 / 2 = 160px，中心行是 64px 高度。
  // 容器的中心是 scrollTop + 容器高度的一半。
  const centerPosition = scrollTop + containerRef.current.offsetHeight / 2;

  return (
    <div
      ref={containerRef}
      className="w-full h-[320px] overflow-y-scroll no-scrollbar relative"
      onScroll={handleScroll}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
      onMouseDown={onTouchStart}
      onMouseUp={onTouchEnd}
      // 添加遮罩以实现滚轮两端渐隐效果
      style={{
        maskImage: 'linear-gradient(to bottom, transparent 0%, black 25%, black 75%, transparent 100%)',
        WebkitMaskImage: 'linear-gradient(to bottom, transparent 0%, black 25%, black 75%, transparent 100%)'
      }}
    >
      {/* 确保滚轮中间的项目能对齐到容器中心，需要留出上下空间 */}
      <div style={{ height: (containerRef.current.offsetHeight - ITEM_HEIGHT) / 2 }} />

      {range.map((num) => {
        const itemTop = (num - min) * ITEM_HEIGHT + (containerRef.current!.offsetHeight - ITEM_HEIGHT) / 2;
        const itemCenter = itemTop + ITEM_HEIGHT / 2;
        const distance = Math.abs(centerPosition - itemCenter);
        
        // --- 核心样式逻辑修改 ---
        // 归一化距离：距离中心越近，值越接近 0。ITEM_HEIGHT * 2 是一个合理的衰减距离。
        const normalizedDistance = Math.min(1, distance / (ITEM_HEIGHT * 2)); 

        // 缩放 (Scale): 距离中心最远时为 0.75，中心时为 1.05 (稍大)
        const scale = 1.05 - 0.3 * normalizedDistance; // Max 1.05, Min 0.75
        
        // 透明度 (Opacity): 距离中心最远时为 0.3，中心时为 1.0
        const opacity = 1.0 - 0.7 * normalizedDistance; // Max 1.0, Min 0.3
        
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
            <span className={`font-light tabular-nums leading-none tracking-tight text-white text-6xl ${
                isSelected ? 'font-medium' : 'font-extralight' // 选中的字体稍微加粗
            }`}>
              {num.toString().padStart(2, '0')}
            </span>
          </div>
        );
      })}

      {/* 确保滚轮底部有足够的空间 */}
      <div style={{ height: (containerRef.current.offsetHeight - ITEM_HEIGHT) / 2 }} />
      
      {/* 居中标记线 (居中选框的顶部线和底部线) */}
      <div className="absolute top-1/2 left-0 right-0 h-px bg-white/30 transform -translate-y-[32px] pointer-events-none" />
      <div className="absolute top-1/2 left-0 right-0 h-px bg-white/30 transform translate-y-[32px] pointer-events-none" />
    </div>
  );
};
