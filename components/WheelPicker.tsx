
import React, { useRef, useEffect, useState } from 'react';

interface WheelPickerProps {
  value: number;
  min: number;
  max: number;
  onChange: (val: number) => void;
}

export const WheelPicker: React.FC<WheelPickerProps> = ({ value, min, max, onChange }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = useState(0);
  
  // 配置参数
  const ITEM_HEIGHT = 60; // 单个数字高度
  const CONTAINER_HEIGHT = 300; // 容器总高度
  const VISIBLE_ITEMS = 5; // 可视区域显示的数字数量
  
  // 生成数字范围
  const range = Array.from({ length: max - min + 1 }, (_, i) => i + min);

  // 初始化滚动位置
  useEffect(() => {
    if (containerRef.current) {
      const initialIndex = value - min;
      const targetScroll = initialIndex * ITEM_HEIGHT;
      // 只有当偏差较大时才调整，避免微小抖动
      if (Math.abs(containerRef.current.scrollTop - targetScroll) > 1) {
        containerRef.current.scrollTop = targetScroll;
        setScrollTop(targetScroll);
      }
    }
  }, []); // 仅挂载时执行一次定位，后续由滚动事件接管

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const currentScrollTop = e.currentTarget.scrollTop;
    setScrollTop(currentScrollTop);

    // 计算当前选中的索引
    // 容器中心点在滚动内容中的位置 = currentScrollTop + 容器高度一半
    // 实际上由于Padding的存在，我们只需要计算偏移
    const selectedIndex = Math.round(currentScrollTop / ITEM_HEIGHT);
    const newValue = Math.min(max, Math.max(min, min + selectedIndex));

    if (newValue !== value) {
      onChange(newValue);
    }
  };

  return (
    <div className="relative w-[260px] h-[300px] flex items-center justify-center overflow-hidden">
      
      {/* 顶部渐变遮罩 */}
      <div className="absolute top-0 left-0 right-0 h-24 bg-gradient-to-b from-black/90 via-black/40 to-transparent z-20 pointer-events-none" />
      
      {/* 底部渐变遮罩 */}
      <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-black/90 via-black/40 to-transparent z-20 pointer-events-none" />

      {/* 选中项指示器 (可选，目前设计依靠字体大小区分，所以这里只留一个极淡的线条或留空) */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-[60px] border-y border-white/5 z-10 pointer-events-none" />

      {/* 固定的单位标签 */}
      <div className="absolute right-8 top-1/2 -translate-y-1/2 mt-2 z-30 pointer-events-none opacity-60">
        <span className="text-sm font-medium text-white tracking-widest">分钟</span>
      </div>

      <div 
        ref={containerRef}
        className="w-full h-full overflow-y-auto no-scrollbar snap-y snap-mandatory scroll-smooth"
        onScroll={handleScroll}
        style={{
          // 利用 padding 让第一个和最后一个元素能居中
          paddingTop: (CONTAINER_HEIGHT - ITEM_HEIGHT) / 2,
          paddingBottom: (CONTAINER_HEIGHT - ITEM_HEIGHT) / 2,
        }}
      >
        {range.map((num) => {
          // 计算当前数字距离中心的距离
          const itemOffset = (num - min) * ITEM_HEIGHT;
          const distance = Math.abs(scrollTop - itemOffset);
          
          // 视觉计算逻辑：距离中心越近，越大越亮
          // maxDistance 约为容器一半高度
          const maxDistance = CONTAINER_HEIGHT / 2;
          
          // 归一化距离 (0 = 中心, 1 = 边缘)
          let normalizedDistance = Math.min(1, distance / maxDistance);
          
          // 缩放计算：中心 1.0，边缘 0.6
          const scale = 1.0 - (normalizedDistance * 0.5); 
          
          // 透明度计算：中心 1.0，边缘 0.2
          const opacity = 1.0 - (normalizedDistance * 0.8);
          
          // 旋转计算：模拟滚轮的 X 轴旋转效果
          const rotateX = normalizedDistance * 45 * (scrollTop > itemOffset ? -1 : 1);

          // 字体大小：根据选中状态剧烈变化
          const isSelected = distance < ITEM_HEIGHT / 2;

          return (
            <div 
              key={num}
              className="w-full flex items-center justify-center snap-center"
              style={{
                height: `${ITEM_HEIGHT}px`,
                transform: `scale(${scale}) perspective(500px) rotateX(${rotateX}deg)`,
                opacity: opacity,
                transition: 'transform 0.1s ease-out, opacity 0.1s ease-out'
              }}
            >
              <span 
                className={`font-light tabular-nums tracking-tighter transition-all duration-200 ${
                  isSelected 
                    ? 'text-[64px] text-white font-normal drop-shadow-lg' 
                    : 'text-[32px] text-white/50'
                }`}
              >
                {num}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};
