import React from 'react';
import { NapMode } from '../types';

interface BackgroundProps {
  activeModeId: string;
  modes: NapMode[];
}

export const Background: React.FC<BackgroundProps> = ({ activeModeId, modes }) => {
  // 获取当前激活模式的主题色，用于混合遮罩
  const activeColor = modes.find(m => m.id === activeModeId)?.themeColor || '#000000';

  return (
    <div className="fixed -inset-[50px] z-0 bg-black">
      {/* 
        性能优化：预渲染所有模式的背景图片层叠在一起。
        通过切换 opacity 来实现丝滑的 Cross-fade 效果，
        避免直接切换 backgroundImage URL 导致的加载闪烁（黑屏）。
      */}
      {modes.map((mode) => (
        <div 
          key={mode.id}
          className="absolute inset-0 bg-cover bg-center transition-opacity duration-700 ease-in-out will-change-[opacity]"
          style={{ 
            backgroundImage: `url(${mode.bgImage})`,
            // 只有当前选中的模式显示，其他隐藏
            opacity: mode.id === activeModeId ? 0.6 : 0,
            // 优化：非激活图层不参与点击检测（虽然这里是背景）
            pointerEvents: 'none',
          }}
        />
      ))}
      
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
