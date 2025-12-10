// src/components/WheelPicker.tsx
import React, { useRef, useEffect, UIEvent, useState } from 'react';

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

  const ITEM_HEIGHT = 64;
  const VISIBLE_ITEMS = 5; // odd number
  const PADDING_TOP = ((VISIBLE_ITEMS - 1) / 2) * ITEM_HEIGHT;

  const range = Array.from({ length: max - min + 1 }, (_, i) => i + min);

  // Sync scroll on value change
  useEffect(() => {
    if (containerRef.current && !isDragging) {
      const index = value - min;
      const targetScrollTop = index * ITEM_HEIGHT;
      containerRef.current.scrollTo({ top: targetScrollTop, behavior: 'smooth' });
    }
  }, [value, min, isDragging]);

  const handleScrollEnd = () => {
    if (!containerRef.current || isDragging) return;
    const scrollTop = containerRef.current.scrollTop;
    const rawIndex = scrollTop / ITEM_HEIGHT;
    const index = Math.round(rawIndex);
    const newValue = Math.max(min, Math.min(max, min + index));
    if (newValue !== value) {
      const targetScrollTop = index * ITEM_HEIGHT;
      containerRef.current.scrollTo({ top: targetScrollTop, behavior: 'smooth' });
      onChange(newValue);
    }
    setIsDragging(false);
  };

  const onScroll = (e: UIEvent<HTMLDivElement>) => {
    e.stopPropagation();
    if (!containerRef.current) return;
    setIsDragging(true);
    if (isScrolling.current) clearTimeout(isScrolling.current);
    isScrolling.current = window.setTimeout(handleScrollEnd, 150);
  };

  const onTouchStart = () => setIsDragging(true);
  const onTouchEnd = () => {
    if (isScrolling.current) clearTimeout(isScrolling.current);
    isScrolling.current = window.setTimeout(handleScrollEnd, 100);
  };
  const stopPropagation = (e: React.SyntheticEvent) => e.stopPropagation();

  return (
    <div
      className="relative h-[320px] w-[260px] flex items-center justify-center"
      onTouchStart={stopPropagation}
      onTouchMove={stopPropagation}
      onMouseDown={stopPropagation}
    >
      {/* Center Highlight */}
      <div className="absolute top-1/2 left-0 right-0 h-[64px] -translate-y-1/2 border-y border-white/30 pointer-events-none z-20" />
      <div className="absolute right-8 top-1/2 -translate-y-1/2 text-white/60 text-sm font-medium tracking-widest z-30 pointer-events-none">
        分钟
      </div>

      {/* Scrollable List with Mask */}
      <div
        ref={containerRef}
        className="w-full overflow-y-scroll no-scrollbar"
        style={{
          paddingTop: `${PADDING_TOP}px`,
          paddingBottom: `${PADDING_TOP}px`,
          maskImage: 'linear-gradient(to bottom, transparent 0%, black 20%, black 80%, transparent 100%)',
          WebkitMaskImage: 'linear-gradient(to bottom, transparent 0%, black 20%, black 80%, transparent 100%)',
        }}
        onScroll={onScroll}
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
        onMouseDown={onTouchStart}
        onMouseUp={onTouchEnd}
      >
        {range.map((num) => {
          const itemTop = (num - min) * ITEM_HEIGHT;
          const center = itemTop + ITEM_HEIGHT / 2;
          const distanceFromCenter = Math.abs(containerRef.current?.scrollTop + PADDING_TOP - center) || 0;
          const scale = Math.max(0.7, 1 - distanceFromCenter / (ITEM_HEIGHT * 2));
          const opacity = Math.max(0.3, 1 - distanceFromCenter / (ITEM_HEIGHT * 2.5));
          const isSelected = distanceFromCenter < ITEM_HEIGHT / 2;

          return (
            <div
              key={num}
              className="h-[64px] flex items-center justify-center select-none"
              style={{
                transform: `scale(${scale})`,
                opacity,
                transition: isDragging ? 'none' : 'transform 150ms cubic-bezier(0.4,0,0.2,1), opacity 150ms cubic-bezier(0.4,0,0.2,1)',
              }}
            >
              <span
                className={`font-medium tabular-nums leading-none ${
                  isSelected ? 'text-[72px] text-white' : 'text-[56px] text-white/90'
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
