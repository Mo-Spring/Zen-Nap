
import React, { useRef, useEffect } from 'react';

interface WheelPickerProps {
  value: number;
  min: number;
  max: number;
  onChange: (val: number) => void;
}

const ITEM_HEIGHT = 64;
const VISIBLE_COUNT = 5; // 可视区域显示的数字数量

export const WheelPicker: React.FC<WheelPickerProps> = ({ value, min, max, onChange }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const itemsRef = useRef<(HTMLDivElement | null)[]>([]);
  
  // 物理引擎状态
  const state = useRef({
    currentY: 0,        // 当前滚动位置 (pixels)
    targetY: 0,         // 目标位置
    isDragging: false,  // 是否在拖拽中
    startY: 0,          // 拖拽起始Y
    startScrollY: 0,    // 拖拽起始的滚动位置
    lastY: 0,           // 上一帧的Y (用于计算速度)
    lastTime: 0,        // 上一帧的时间
    velocity: 0,        // 当前速度
    amplitude: 0,       // 惯性幅度
    rafId: 0            // 动画帧ID
  });

  const range = Array.from({ length: max - min + 1 }, (_, i) => i + min);

  // 初始化位置
  useEffect(() => {
    // 初始定位到选中值
    // 注意：Y轴向下为正，但我们向上滚动内容，所以 offset 应该是负的
    // index 0 在最上面，要让 index k 在中间，需要移动 k * ITEM_HEIGHT
    const index = Math.max(0, Math.min(value - min, range.length - 1));
    state.current.currentY = -index * ITEM_HEIGHT;
    state.current.targetY = -index * ITEM_HEIGHT;
    updateVisuals();
  }, [min]); // 仅在min变化时重置，value变化由另一个effect处理以避免冲突

  // 监听外部 value 变化
  useEffect(() => {
    if (state.current.isDragging) return;
    const index = value - min;
    const targetY = -index * ITEM_HEIGHT;
    
    // 如果差异较大，平滑滚动过去；如果差异小（通常是组件内部触发的onChange），直接同步
    if (Math.abs(targetY - state.current.targetY) > ITEM_HEIGHT * 0.5) {
        state.current.targetY = targetY;
        startAnimation();
    }
  }, [value, min]);

  // 核心渲染逻辑
  const updateVisuals = () => {
    const container = containerRef.current;
    if (!container) return;

    const centerY = container.clientHeight / 2;
    const currentY = state.current.currentY;

    range.forEach((_, i) => {
      const item = itemsRef.current[i];
      if (!item) return;

      // 计算每个item相对于容器中心的绝对位置
      // item原始位置是 i * ITEM_HEIGHT (相对于内容顶部)
      // 内容整体移动了 currentY
      const itemY = i * ITEM_HEIGHT + currentY + centerY - (ITEM_HEIGHT / 2);
      
      // 距离中心的距离
      const distance = itemY - (centerY - ITEM_HEIGHT/2);
      
      // 简单的可视性优化
      if (Math.abs(distance) > (VISIBLE_COUNT + 2) * ITEM_HEIGHT / 2) {
        item.style.display = 'none';
        return;
      }
      item.style.display = 'flex';

      // 3D 效果计算
      const normalizedDist = Math.min(1, Math.abs(distance) / (centerY * 0.8));
      
      // 缩放：中间大(1.2)，两边小(0.8)
      const scale = 1.2 - (normalizedDist * 0.4); 
      
      // 透明度：中间不透明，边缘透明
      const opacity = 1 - Math.pow(normalizedDist, 1.5);
      
      // 旋转：模拟圆柱体表面，上方为正旋转，下方为负旋转
      const rotateX = -distance * 0.1;

      // 位移：保持在中心垂直排列
      const translateY = itemY - (i * ITEM_HEIGHT); // 抵消原始布局位置，完全由JS控制

      item.style.transform = `translateY(${translateY}px) rotateX(${rotateX}deg) scale(${scale})`;
      item.style.opacity = opacity.toFixed(2);
      item.style.zIndex = Math.round((1 - normalizedDist) * 100).toString();
      
      // 字体样式切换
      const span = item.firstElementChild as HTMLElement;
      if (span) {
          if (normalizedDist < 0.2) {
               span.classList.add('text-white');
               span.classList.remove('text-white/40');
               span.style.fontWeight = '500';
          } else {
               span.classList.add('text-white/40');
               span.classList.remove('text-white');
               span.style.fontWeight = '300';
          }
      }
    });
  };

  const startAnimation = () => {
    if (state.current.rafId) cancelAnimationFrame(state.current.rafId);
    
    const animate = () => {
      const { targetY, currentY, isDragging } = state.current;
      
      if (isDragging) {
        // 拖拽中，不做惯性动画，只更新视觉
        updateVisuals();
        state.current.rafId = requestAnimationFrame(animate);
        return;
      }

      // 惯性/回弹逻辑
      // 简单的 lerp 插值趋向目标
      const diff = targetY - currentY;
      
      if (Math.abs(diff) < 0.5) {
        state.current.currentY = targetY;
        updateVisuals();
        state.current.rafId = 0;
        return;
      }

      state.current.currentY = currentY + diff * 0.15; // 0.15 是平滑系数
      updateVisuals();
      state.current.rafId = requestAnimationFrame(animate);
    };
    
    state.current.rafId = requestAnimationFrame(animate);
  };

  // 触摸/鼠标事件处理
  const handleStart = (y: number) => {
    state.current.isDragging = true;
    state.current.startY = y;
    state.current.startScrollY = state.current.currentY;
    state.current.lastY = y;
    state.current.lastTime = Date.now();
    state.current.velocity = 0;
    
    if (state.current.rafId) cancelAnimationFrame(state.current.rafId);
    state.current.rafId = requestAnimationFrame(() => updateVisuals()); // 启动渲染循环
  };

  const handleMove = (y: number) => {
    if (!state.current.isDragging) return;
    
    const delta = y - state.current.startY;
    const now = Date.now();
    
    // 计算速度
    const dt = now - state.current.lastTime;
    if (dt > 0) {
        const v = (y - state.current.lastY) / dt;
        state.current.velocity = v;
    }
    
    state.current.lastY = y;
    state.current.lastTime = now;
    state.current.currentY = state.current.startScrollY + delta;
  };

  const handleEnd = () => {
    state.current.isDragging = false;
    
    // 计算惯性目标
    const velocity = state.current.velocity;
    const currentY = state.current.currentY;
    
    // 简单的惯性公式
    let targetY = currentY + velocity * 300;
    
    // 吸附到最近的格子
    const index = Math.round(-targetY / ITEM_HEIGHT);
    
    // 限制范围
    const clampedIndex = Math.max(0, Math.min(range.length - 1, index));
    targetY = -clampedIndex * ITEM_HEIGHT;
    
    state.current.targetY = targetY;
    startAnimation();

    // 触发 onChange
    const newValue = min + clampedIndex;
    if (newValue !== value) {
        onChange(newValue);
    }
  };

  return (
    <div 
      className="relative w-[260px] h-[320px] select-none"
      style={{ 
          // 使用 mask-image 实现上下渐隐，替代黑色渐变框
          maskImage: 'linear-gradient(to bottom, transparent 0%, black 20%, black 80%, transparent 100%)',
          WebkitMaskImage: 'linear-gradient(to bottom, transparent 0%, black 20%, black 80%, transparent 100%)'
      }}
      // Mouse events
      onMouseDown={(e) => handleStart(e.clientY)}
      onMouseMove={(e) => handleMove(e.clientY)}
      onMouseUp={handleEnd}
      onMouseLeave={() => { if(state.current.isDragging) handleEnd() }}
      // Touch events
      onTouchStart={(e) => handleStart(e.touches[0].clientY)}
      onTouchMove={(e) => handleMove(e.touches[0].clientY)}
      onTouchEnd={handleEnd}
    >
      {/* 固定的单位标签 */}
      <div className="absolute right-8 top-1/2 -translate-y-1/2 ml-2 z-10 opacity-60 pointer-events-none">
        <span className="text-sm font-medium text-white tracking-widest">分钟</span>
      </div>

      <div 
        ref={containerRef}
        className="w-full h-full relative overflow-hidden"
      >
        {range.map((num, i) => (
          <div 
            key={num}
            ref={(el) => { itemsRef.current[i] = el; }}
            className="absolute left-0 right-0 flex items-center justify-center will-change-transform h-[64px]"
            style={{ 
                top: 0 // 位置完全由 transform 控制
            }}
          >
            <span className="text-[42px] transition-colors duration-200">
              {num}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};
