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
      
      // 获取上下填充空间
      const topPadding = (containerRef.current.offsetHeight - ITEM_HEIGHT) / 2;
      // 计算最终需要滚动的顶部位置
      const finalScrollTop = targetScrollTop - topPadding;
      
      if (Math.abs(containerRef.current.scrollTop - finalScrollTop) > 1) {
        containerRef.current.scrollTop = finalScrollTop;
        setScrollTop(finalScrollTop);
      }
    }
  }, [value, min, max, isDragging]);

  const handleScrollEnd = () => {
    if (!containerRef.current || isDragging) return;
    
    const currentScrollTop = containerRef.current.scrollTop;
    
    // 获取上下填充空间
    const topPadding = (containerRef.current.offsetHeight - ITEM_HEIGHT) / 2;
    
    // 计算滚轮的逻辑起始位置（减去顶部填充空间）
    const logicalScrollTop = currentScrollTop + topPadding;

    // 计算应该对齐的索引 (四舍五入到最近的项目顶部)
    const index = Math.round(logicalScrollTop / ITEM_HEIGHT);
    const newValue = Math.max(min, Math.min(max, min + index));

    // 计算目标滚动位置 (从逻辑位置减去填充空间)
    const targetLogicalTop = index * ITEM_HEIGHT;
    const targetScrollTop = targetLogicalTop - topPadding;
    
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
    }, 150) as unknown as number; 
    
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

  // 1. 初始渲染时 containerRef.current 为 null，必须先返回
  if (!containerRef.current) {
      const contentHeight = range.length * ITEM_HEIGHT;
      const placeholderHeight = 320;
      
      return (
          <div 
              ref={containerRef}
              className="w-full h-[320px] overflow-y-scroll no-scrollbar relative"
              style={{
                maskImage: 'linear-gradient(to bottom, transparent 0%, black 25%, black 75%, transparent 100%)',
                WebkitMaskImage: 'linear-gradient(to bottom, transparent 0%, black 25%, black 75%, transparent 100%)'
              }}
          >
              {/* 初始占位，等待 ref 被赋值 */}
              <div style={{ height: placeholderHeight, minHeight: contentHeight }} />
          </div>
      );
  }
  
  // 2. 只有在 containerRef.current 确定不为空时，才进行计算
  const containerHeight = containerRef.current.offsetHeight;
  const topPadding = (containerHeight - ITEM_HEIGHT) / 2;
  
  // 滚轮的逻辑中心位置 (scrollTop + 容器顶部到中心的距离)
  const centerPosition = scrollTop + containerHeight / 2;


  return (
    <div
      ref={containerRef}
      className="w-full h-[320px] overflow-y-scroll no-scrollbar relative"
      onScroll={handleScroll}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
      // 移除 onMouseDown, onMouseUp
      // onMouseDown={onTouchStart}
      // onMouseUp={onTouchEnd}
      // 添加遮罩以实现滚轮两端渐隐效果
      style={{
        maskImage: 'linear-gradient(to bottom, transparent 0%, black 25%, black 75%, transparent 100%)',
        WebkitMaskImage: 'linear-gradient(to bottom, transparent 0%, black 25%, black 75%, transparent 100%)'
      }}
    >
      {/* 确保滚轮中间的项目能对齐到容器中心，需要留出上下空间 */}
      <div style={{ height: topPadding }} />

      {range.map((num) => {
        // itemTopRelativeToContent: 项目顶部相对于整个可滚动内容顶部的距离
        const itemTopRelativeToContent = (num - min) * ITEM_HEIGHT;
        // itemCenterRelativeToContainer: 项目中心相对于容器顶部的距离 (包括了顶部填充)
        const itemCenterRelativeToContainer = itemTopRelativeToContent + topPadding + ITEM_HEIGHT / 2;
        
        // 距离中心的绝对差值 (使用 itemCenterRelativeToContainer 和 centerPosition 比较)
        const distance = Math.abs(centerPosition - itemCenterRelativeToContainer);
        
        // --- 样式逻辑 ---
        // 归一化距离：距离中心越近，值越接近 0。
        const normalizedDistance = Math.min(1, distance / (ITEM_HEIGHT * 2.5)); // 2.5 倍 ITEM_HEIGHT 距离时完全衰减

        // 缩放 (Scale): 距离中心最远时为 0.75，中心时为 1.05 
        const scale = 1.05 - 0.3 * normalizedDistance; 
        
        // 透明度 (Opacity): 距离中心最远时为 0.3，中心时为 1.0
        const opacity = 1.0 - 0.7 * normalizedDistance; 
        
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
                isSelected ? 'font-medium' : 'font-extralight' 
            }`}>
              {num.toString().padStart(2, '0')}
            </span>
          </div>
        );
      })}

      {/* 确保滚轮底部有足够的空间 */}
      <div style={{ height: topPadding }} />
      
      {/* 居中标记线 (居中选框的顶部线和底部线) */}
      <div className="absolute top-1/2 left-0 right-0 h-px bg-white/30 transform -translate-y-[32px] pointer-events-none" />
      <div className="absolute top-1/2 left-0 right-0 h-px bg-white/30 transform translate-y-[32px] pointer-events-none" />
    </div>
  );
};
