import React, { useRef, useEffect } from 'react';

interface WheelPickerProps {
  value: number;
  min: number;
  max: number;
  onChange: (val: number) => void;
}

export const WheelPicker: React.FC<WheelPickerProps> = ({ value, min, max, onChange }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const itemsRef = useRef<(HTMLDivElement | null)[]>([]);
  const isInternalScroll = useRef(false);

  // 配置参数
  const ITEM_HEIGHT = 60; // 单个数字高度
  const CONTAINER_HEIGHT = 300; // 容器总高度
  
  // 生成数字范围
  const range = Array.from({ length: max - min + 1 }, (_, i) => i + min);

  // 核心视觉更新逻辑：直接操作DOM，不通过React渲染流
  const updateVisuals = () => {
    const container = containerRef.current;
    if (!container) return;

    const scrollTop = container.scrollTop;
    const centerOffset = CONTAINER_HEIGHT / 2;

    range.forEach((_, index) => {
        const item = itemsRef.current[index];
        if (!item) return;

        // 计算每一项相对于视口中心的位置
        const itemCenterY = index * ITEM_HEIGHT + ITEM_HEIGHT / 2;
        const scrollCenterY = scrollTop + centerOffset;
        const distance = Math.abs(scrollCenterY - itemCenterY);
        
        // 视觉衰减的最大距离
        const maxDistance = CONTAINER_HEIGHT / 2;
        const normalizedDistance = Math.min(1, distance / maxDistance);

        // 3D效果计算
        const scale = 1.0 - (normalizedDistance * 0.45); // 1.0 -> 0.55
        const opacity = 1.0 - (normalizedDistance * 0.7); // 1.0 -> 0.3
        const rotateX = normalizedDistance * 50 * (itemCenterY < scrollCenterY ? 1 : -1);

        // 直接应用样式，避免React Re-render带来的开销
        item.style.transform = `scale(${scale}) perspective(500px) rotateX(${rotateX}deg)`;
        item.style.opacity = opacity.toFixed(2);
        
        // 字体样式切换
        const span = item.firstElementChild as HTMLElement;
        if (span) {
            if (distance < ITEM_HEIGHT / 2) {
                // 选中状态
                if (span.dataset.active !== 'true') {
                    span.style.fontSize = '64px';
                    span.style.color = '#ffffff';
                    span.style.fontWeight = '400';
                    span.dataset.active = 'true';
                }
            } else {
                // 非选中状态
                if (span.dataset.active !== 'false') {
                    span.style.fontSize = '32px';
                    span.style.color = 'rgba(255, 255, 255, 0.5)';
                    span.style.fontWeight = '300';
                    span.dataset.active = 'false';
                }
            }
        }
    });
  };

  // 处理外部 value 变化 (例如初始化或重置)
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const currentScroll = container.scrollTop;
    const targetScroll = (value - min) * ITEM_HEIGHT;

    // 如果当前滚动位置和目标位置差异较大，且不是由内部滚动触发的，则强制同步位置
    // 添加一个容差，避免微小的计算差异导致死循环
    if (!isInternalScroll.current && Math.abs(currentScroll - targetScroll) > 1) {
        container.scrollTop = targetScroll;
        // 立即更新一次视觉状态
        requestAnimationFrame(updateVisuals);
    }
    
    // 重置标志位
    isInternalScroll.current = false;
  }, [value, min]);

  // 绑定滚动事件
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // 初始化视觉状态
    updateVisuals();

    let rAFId: number;

    const handleScroll = () => {
        isInternalScroll.current = true;
        
        // 使用 requestAnimationFrame 保证在每一帧进行视觉更新
        cancelAnimationFrame(rAFId);
        rAFId = requestAnimationFrame(() => {
            updateVisuals();

            // 计算选中值并通知父组件
            const currentScroll = container.scrollTop;
            const selectedIndex = Math.round(currentScroll / ITEM_HEIGHT);
            const newValue = Math.min(max, Math.max(min, min + selectedIndex));

            if (newValue !== value) {
                onChange(newValue);
            }
        });
    };

    container.addEventListener('scroll', handleScroll, { passive: true });
    
    return () => {
        container.removeEventListener('scroll', handleScroll);
        cancelAnimationFrame(rAFId);
    };
  }, [value, min, max, onChange]); // 依赖项包含回调和范围

  return (
    <div className="relative w-[260px] h-[300px] flex items-center justify-center overflow-hidden">
      
      {/* 顶部渐变遮罩 */}
      <div className="absolute top-0 left-0 right-0 h-24 bg-gradient-to-b from-black/90 via-black/40 to-transparent z-20 pointer-events-none" />
      
      {/* 底部渐变遮罩 */}
      <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-black/90 via-black/40 to-transparent z-20 pointer-events-none" />

      {/* 固定的单位标签 */}
      <div className="absolute right-8 top-1/2 -translate-y-1/2 mt-2 z-30 pointer-events-none opacity-60">
        <span className="text-sm font-medium text-white tracking-widest">分钟</span>
      </div>

      <div 
        ref={containerRef}
        className="w-full h-full overflow-y-auto no-scrollbar snap-y snap-mandatory scroll-smooth"
        style={{
          // 利用 padding 让第一个和最后一个元素能居中
          paddingTop: (CONTAINER_HEIGHT - ITEM_HEIGHT) / 2,
          paddingBottom: (CONTAINER_HEIGHT - ITEM_HEIGHT) / 2,
        }}
      >
        {range.map((num, i) => (
          <div 
            key={num}
            ref={(el) => { itemsRef.current[i] = el; }}
            className="w-full flex items-center justify-center snap-center will-change-transform"
            style={{
              height: `${ITEM_HEIGHT}px`,
              // 初始样式，防止JS执行前的闪烁
              transformOrigin: 'center center',
            }}
          >
            <span 
                className="font-light text-[32px] text-white/50 transition-colors duration-0"
                data-active="false"
            >
              {num}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};
