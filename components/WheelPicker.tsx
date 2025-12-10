import React, { useRef, useEffect, UIEvent } from 'react';

interface WheelPickerProps {
  value: number;
  min: number;
  max: number;
  onChange: (val: number) => void;
}

export const WheelPicker: React.FC<WheelPickerProps> = ({ value, min, max, onChange }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const isScrolling = useRef<number | null>(null);
  const ITEM_HEIGHT = 64; 

  // Generate the range of numbers
  const range = Array.from({ length: max - min + 1 }, (_, i) => i + min);

  // Sync scroll position with value on initial mount or when value changes externally
  useEffect(() => {
    if (containerRef.current) {
      const index = value - min;
      const targetScrollTop = index * ITEM_HEIGHT;
      // Only set scroll position if it's not already there, to avoid conflicts with user scrolling
      if (containerRef.current.scrollTop !== targetScrollTop) {
        containerRef.current.scrollTop = targetScrollTop;
      }
    }
  }, [value, min]);

  const handleScrollEnd = () => {
    if (!containerRef.current) return;
    
    const scrollTop = containerRef.current.scrollTop;
    const index = Math.round(scrollTop / ITEM_HEIGHT);
    const newValue = Math.max(min, Math.min(max, min + index));

    // Snap to the nearest item
    const targetScrollTop = index * ITEM_HEIGHT;
    containerRef.current.scrollTo({
      top: targetScrollTop,
      behavior: 'smooth',
    });

    // Update the state if the value has changed
    if (newValue !== value) {
      onChange(newValue);
    }
  };

  const onScroll = (e: UIEvent<HTMLDivElement>) => {
    e.stopPropagation(); // Prevent parent swipe gestures
    if (isScrolling.current) {
      clearTimeout(isScrolling.current);
    }
    isScrolling.current = window.setTimeout(handleScrollEnd, 150);
  };
  
  const stopPropagation = (e: React.SyntheticEvent) => e.stopPropagation();

  return (
    <div 
      className="relative h-[256px] w-[260px] flex items-center justify-center"
      onTouchStart={stopPropagation}
      onTouchMove={stopPropagation}
      onMouseDown={stopPropagation}
    >
      
      {/* Selection Lines / Scale Indicators */}
      <div className="absolute top-1/2 left-4 right-4 h-[64px] -translate-y-1/2 border-y border-white/20 pointer-events-none z-20" />

      {/* Fixed "Minutes" Label */}
      <div className="absolute right-12 top-1/2 -translate-y-1/2 mt-1 z-30 pointer-events-none">
          <span className="text-sm font-medium text-white/50 tracking-widest">分钟</span>
      </div>

      {/* Scrollable Container with Mask for Fade Effect */}
      <div 
        ref={containerRef}
        className="h-full w-full overflow-y-scroll snap-y snap-mandatory no-scrollbar py-[96px]"
        onScroll={onScroll}
        style={{
          maskImage: 'linear-gradient(to bottom, transparent 0%, black 25%, black 75%, transparent 100%)',
          WebkitMaskImage: 'linear-gradient(to bottom, transparent 0%, black 25%, black 75%, transparent 100%)'
        }}
      >
        {range.map((num) => {
          // Calculate distance from center for dynamic styling
          const center = (containerRef.current?.scrollTop || 0) + ITEM_HEIGHT * 1.5;
          const itemTop = (num - min) * ITEM_HEIGHT;
          const distance = Math.abs(center - (itemTop + ITEM_HEIGHT / 2));
          const scale = Math.max(0.8, 1 - distance / (ITEM_HEIGHT * 3));
          const opacity = Math.max(0.3, 1 - distance / (ITEM_HEIGHT * 3));
          
          return (
            <div 
              key={num} 
              className="h-[64px] flex items-center justify-center snap-center select-none"
              style={{
                transform: `scale(${scale})`,
                opacity: opacity,
                transition: 'transform 150ms ease, opacity 150ms ease'
              }}
            >
              <span className={`font-light tabular-nums leading-none tracking-tight text-white ${
                  num === value ? 'text-[72px]' : 'text-[60px]'
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
