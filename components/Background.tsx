import React, { useState, useEffect } from 'react';
import { NapMode } from '../types';

interface BackgroundProps {
  activeModeId: string;
  modes: NapMode[];
}

export const Background: React.FC<BackgroundProps> = ({ activeModeId, modes }) => {
  // 获取当前激活模式的主题色，用于混合遮罩
  const activeColor = modes.find(m => m.id === activeModeId)?.themeColor || '#000000';
  
  // 跟踪图片加载状态
  const [loadedImages, setLoadedImages] = useState<Set<string>>(new Set());

  // 预加载逻辑
  useEffect(() => {
    modes.forEach(mode => {
      const img = new Image();
      img.src = mode.bgImage;
      img.onload = () => {
        setLoadedImages(prev => {
            const newSet = new Set(prev);
            newSet.add(mode.id);
            return newSet;
        });
      };
    });
  }, [modes]);

  return (
    <div className="fixed -inset-[100px] z-0 bg-black">
      {/* 
        性能优化 v2：
        1. 预加载图片
        2. 在图片加载完成前，先显示纯色背景 (Theme Color)，避免加载时的空白或闪烁
        3. 加载完成后，图片层淡入 (Opacity 0 -> 0.6)
      */}
      {modes.map((mode) => {
         const isLoaded = loadedImages.has(mode.id);
         const isActive = mode.id === activeModeId;
         
         return (
            <React.Fragment key={mode.id}>
                {/* 纯色占位层：当处于激活状态但图片还没加载好时显示 */}
                <div 
                    className="absolute inset-0 transition-opacity duration-700 ease-in-out"
                    style={{
                        backgroundColor: mode.themeColor,
                        // 如果激活但未加载：显示 (0.3透明度作为底色)
                        // 如果已加载：隐藏 (让图片层接管)
                        // 如果不激活：隐藏
                        opacity: isActive && !isLoaded ? 0.3 : 0, 
                        pointerEvents: 'none',
                    }}
                />

                {/* 图片层 */}
                <div 
                  className="absolute inset-0 bg-cover bg-center transition-opacity duration-700 ease-in-out will-change-[opacity]"
                  style={{ 
                    backgroundImage: `url(${mode.bgImage})`,
                    // 只有当激活且加载完成时才显示
                    opacity: isActive && isLoaded ? 0.6 : 0,
                    pointerEvents: 'none',
                  }}
                />
            </React.Fragment>
         );
      })}
      
      {/* 
        颜色混合层：使用 mix-blend-multiply 叠加主题色。
        transition-colors 确保颜色切换也是平滑过渡的。
      */}
      <div 
        className="absolute inset-0 transition-colors duration-700 ease-in-out mix-blend-multiply opacity-80"
        style={{ backgroundColor: activeColor }}
      />
      
      {/* 底部渐变遮罩，保证底部文字可读性 */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/40" />
      
      {/* 全局微模糊，增加质感 */}
      <div className="absolute inset-0 backdrop-blur-[2px]" />
    </div>
  );
};
