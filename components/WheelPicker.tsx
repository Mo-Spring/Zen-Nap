
import React, { useRef, useEffect } from 'react';

interface WheelPickerProps {
  value: number;
  min: number;
  max: number;
  onChange: (val: number) => void;
}

const ITEM_HEIGHT = 50; // 单个数字的逻辑高度 (px)
const RADIUS = 110;     // 3D 滚轮半径 (px)

export const WheelPicker: React.FC<WheelPickerProps> = ({ value, min, max, onChange }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const itemsRef = useRef<(HTMLDivElement | null)[]>([]);
  
  // 物理引擎状态
  const state = useRef({
    currentY: 0,        // 当前滚动位置 (负值，对应索引 * ITEM_HEIGHT)
    targetY: 0,         // 目标位置
    isDragging: false,
    startY: 0,
    startCurrentY: 0,
    velocity: 0,
    lastTime: 0,
    lastY: 0,
    rafId: 0
  });

  const range = Array.from({ length: max - min + 1 }, (_, i) => i + min);

  // 初始化位置
  useEffect(() => {
    // 根据当前 value 设置初始滚动位置
    // 注意：ScrollY 是负值，0 代表第一个元素在中心
    const index = Math.max(0, Math.min(value - min, range.length - 1));
    state.current.currentY = -index * ITEM_HEIGHT;
    state.current.targetY = -index * ITEM_HEIGHT;
    
    // 强制执行一次渲染以确保初始位置正确
    requestAnimationFrame(updateVisuals);
  }, [min]);

  // 监听外部 value 变化 (例如点击预设模式时)
  useEffect(() => {
    if (state.current.isDragging) return;
    const index = value - min;
    const targetY = -index * ITEM_HEIGHT;
    
    // 如果差异较大，平滑滚动；否则直接同步
    if (Math.abs(targetY - state.current.targetY) > 1) {
        state.current.targetY = targetY;
        startAnimation();
    }
  }, [value, min]);

  // --- 核心渲染逻辑：3D 圆柱投影 ---
  const updateVisuals = () => {
    if (!containerRef.current) return;
    
    const centerY = containerRef.current.clientHeight / 2;
    const { currentY } = state.current;

    range.forEach((_, i) => {
      const item = itemsRef.current[i];
      if (!item) return;

      // 1. 计算每个元素相对于“中心线”的弧长距离
      // i * ITEM_HEIGHT 是元素在展开列表中的位置
      // currentY 是列表的偏移量
      const distance = (i * ITEM_HEIGHT) + currentY;
      
      // 2. 将弧长转换为角度 (弧度制)
      // theta = distance / radius
      const theta = distance / RADIUS;

      // 3. 可视范围优化 (只渲染前方 +/- 90度左右的内容)
      if (theta < -1.6 || theta > 1.6) {
          item.style.display = 'none';
          return;
      }
      item.style.display = 'flex';

      // 4. 3D 投影计算
      // y = r * sin(theta) -> 屏幕上的垂直位置
      // z = r * cos(theta) -> 深度，用于缩放和透明度
      
      const y = RADIUS * Math.sin(theta);
      const z = RADIUS * Math.cos(theta); 
      
      // 归一化深度 (0~1, 1为正中心最前)
      const depth = z / RADIUS; 

      // 缩放：中心最大(1.2)，边缘变小
      const scale = 0.7 + (0.5 * depth); // 范围 0.7 ~ 1.2
      
      // 透明度：边缘迅速透明
      const opacity = Math.pow(depth, 4); // 指数级衰减，让边缘更柔和

      // 旋转：让文字贴合圆柱表面
      const rotateX = -theta * (180 / Math.PI);

      // 5. 应用样式
      // item 是 absolute top:0, 所以 translateY 直接决定 Y 坐标
      // 居中位置 centerY + 投影偏移 y - 元素自身高度修正
      const translateY = centerY + y - (ITEM_HEIGHT / 2);

      item.style.transform = `translateY(${translateY}px) rotateX(${rotateX}deg) scale(${scale})`;
      item.style.opacity = opacity.toFixed(3);
      item.style.zIndex = Math.round(depth * 100).toString();
      
      // 6. 文字样式高亮
      const span = item.firstElementChild as HTMLElement;
      if (span) {
          if (Math.abs(theta) < 0.2) { // 接近中心
              span.style.color = '#ffffff';
              span.style.fontWeight = '600';
              // span.style.filter = 'drop-shadow(0 2px 8px rgba(255,255,255,0.3))'; // 可选：发光效果
          } else {
              span.style.color = 'rgba(255,255,255,0.5)';
              span.style.fontWeight = '400';
              // span.style.filter = 'none';
          }
      }
    });
  };

  // --- 物理引擎与交互逻辑 ---

  const startAnimation = () => {
    if (state.current.rafId) cancelAnimationFrame(state.current.rafId);
    
    const animate = () => {
      const { targetY, currentY, isDragging } = state.current;
      
      if (isDragging) {
        updateVisuals();
        state.current.rafId = requestAnimationFrame(animate);
        return;
      }

      // 惯性平滑插值 (Lerp)
      const diff = targetY - currentY;
      if (Math.abs(diff) < 0.1) {
        state.current.currentY = targetY;
        updateVisuals();
        state.current.rafId = 0;
        return;
      }

      state.current.currentY = currentY + diff * 0.15; // 0.15 阻尼系数
      updateVisuals();
      state.current.rafId = requestAnimationFrame(animate);
    };
    
    state.current.rafId = requestAnimationFrame(animate);
  };

  const handleStart = (y: number) => {
    state.current.isDragging = true;
    state.current.startY = y;
    state.current.startCurrentY = state.current.currentY;
    state.current.lastY = y;
    state.current.lastTime = Date.now();
    state.current.velocity = 0;
    
    if (state.current.rafId) cancelAnimationFrame(state.current.rafId);
    state.current.rafId = requestAnimationFrame(() => updateVisuals());
  };

  const handleMove = (y: number) => {
    if (!state.current.isDragging) return;
    
    const delta = y - state.current.startY;
    const now = Date.now();
    const dt = now - state.current.lastTime;
    
    // 阻尼拖拽：稍微降低跟随速度增加重量感
    state.current.currentY = state.current.startCurrentY + delta;
    
    if (dt > 0) {
        const v = (y - state.current.lastY) / dt;
        // 简单低通滤波平滑速度
        state.current.velocity = v * 0.8 + state.current.velocity * 0.2;
    }
    
    state.current.lastY = y;
    state.current.lastTime = now;
  };

  const handleEnd = () => {
    state.current.isDragging = false;
    
    const { velocity, currentY } = state.current;
    
    // 计算惯性距离 (调整系数 300 可以改变滑行距离)
    let targetY = currentY + velocity * 300;
    
    // 吸附逻辑
    const index = Math.round(-targetY / ITEM_HEIGHT);
    const clampedIndex = Math.max(0, Math.min(range.length - 1, index));
    
    state.current.targetY = -clampedIndex * ITEM_HEIGHT;
    startAnimation();

    // 触发变更
    const newValue = min + clampedIndex;
    if (newValue !== value) {
        onChange(newValue);
    }
  };

  return (
    <div 
      className="relative w-[280px] h-[320px] select-none touch-none"
      style={{ 
          // 上下渐隐 Mask
          maskImage: 'linear-gradient(to bottom, transparent 0%, black 15%, black 85%, transparent 100%)',
          WebkitMaskImage: 'linear-gradient(to bottom, transparent 0%, black 15%, black 85%, transparent 100%)'
      }}
      // Event Handlers
      onMouseDown={(e) => handleStart(e.clientY)}
      onMouseMove={(e) => handleMove(e.clientY)}
      onMouseUp={handleEnd}
      onMouseLeave={() => { if(state.current.isDragging) handleEnd() }}
      onTouchStart={(e) => handleStart(e.touches[0].clientY)}
      onTouchMove={(e) => handleMove(e.touches[0].clientY)}
      onTouchEnd={handleEnd}
    >
      {/* 固定的单位标签 (视觉辅助) */}
      <div className="absolute right-12 top-1/2 -translate-y-1/2 z-20 pointer-events-none transition-opacity duration-300">
        <span className="text-sm font-medium text-white/50 tracking-widest">分钟</span>
      </div>

      <div 
        ref={containerRef}
        className="w-full h-full relative"
      >
        {range.map((num, i) => (
          <div 
            key={num}
            ref={(el) => { itemsRef.current[i] = el; }}
            className="absolute left-0 right-0 flex items-center justify-center will-change-transform"
            style={{ 
                height: ITEM_HEIGHT,
                top: 0 // 位置完全由 transform 控制，防止布局回流
            }}
          >
            <span className="text-[44px] tracking-tight transition-colors duration-150" style={{ fontVariantNumeric: 'tabular-nums' }}>
              {num}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};
