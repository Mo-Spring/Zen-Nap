import React, { useRef, useEffect } from 'react';

interface WheelPickerProps {
  value: number;
  min: number;
  max: number;
  onChange: (val: number) => void;
}

export const WheelPicker: React.FC<WheelPickerProps> = ({ value, min, max, onChange }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const debounceTimerRef = useRef<number | null>(null);
  const ITEM_HEIGHT = 64; 

  // Generate the range of numbers
  const range = Array.from({ length: max - min + 1 }, (_, i) => i + min);

  // Sync scroll position with value on mount
  useEffect(() => {
    if (containerRef.current) {
      const index = value - min;
      containerRef.current.scrollTop = index * ITEM_HEIGHT;
    }
  }, []);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    // Clear any existing timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    
    // Set a new timer
    debounceTimerRef.current = window.setTimeout(() => {
      const scrollTop = e.currentTarget.scrollTop;
      const index = Math.round(scrollTop / ITEM_HEIGHT);
      const newValue = Math.max(min, Math.min(max, min + index));
      
      // Only trigger change if value is different
      if (newValue !== value) {
        onChange(newValue);
      }
    }, 150); // Debounce delay of 150ms
  };

  return (
    <div 
      className="relative h-[256px] w-[260px] flex items-center justify-center"
      onTouchStart={(e) => e.stopPropagation()}
      onTouchMove={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
    >
      
      {/* Selection Lines / Scale Indicators */}
      <div className="absolute top-1/2 left-4 right-4 h-[64px] -translate-y-1/2 border-y border-white/20 pointer-events-none" />

      {/* Fixed "Minutes" Label */}
      <div className="absolute right-12 top-1/2 -translate-y-1/2 mt-1 z-30 pointer-events-none">
          <span className="text-sm font-medium text-white/50 tracking-widest">分钟</span>
      </div>

      {/* Scrollable Container with Mask for Fade Effect */}
      <div 
        ref={containerRef}
        className="h-full w-full overflow-y-scroll snap-y snap-mandatory no-scrollbar py-[96px]"
        onScroll={handleScroll}
        style={{
          maskImage: 'linear-gradient(to bottom, transparent 0%, black 25%, black 75%, transparent 100%)',
          WebkitMaskImage: 'linear-gradient(to bottom, transparent 0%, black 25%, black 75%, transparent 100%)'
        }}
      >
        {range.map((num) => (
          <div 
            key={num} 
            className={`h-[64px] flex items-center justify-center snap-center transition-all duration-300 select-none ${
              num === value 
                ? 'opacity-100 scale-100 blur-0' 
                : 'opacity-30 scale-90 blur-[0.5px]'
            }`}
          >
            <span className={`font-light tabular-nums leading-none tracking-tight transition-all duration-300 ${
                num === value ? 'text-[72px] text-white' : 'text-[60px] text-white'
            }`}>
                {num}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};
