
import React, { useMemo } from 'react';

// components/CircularTimer.tsx
export interface CircularTimerProps {
  size: number;
  minutes: number;
  seconds: number;
  progress: number;
  color: string;
}
export const CircularTimer: React.FC<CircularTimerProps> = ({ 
  progress, 
  size = 300, 
  color = "white",
  showTicks = true
}) => {
  const radius = size / 2;
  const strokeWidth = 2;
  const normalizedRadius = radius - strokeWidth * 2;
  const circumference = normalizedRadius * 2 * Math.PI;
  const strokeDashoffset = circumference - progress * circumference;

  // Generate ticks
  const ticks = useMemo(() => {
    if (!showTicks) return null;
    const tickCount = 120; // Number of ticks around the circle
    const tickElements = [];
    for (let i = 0; i < tickCount; i++) {
      const angle = (i / tickCount) * 360;
      const isMajor = i % 10 === 0; // Every 10th tick is longer? (Visuals show uniform mostly, but let's keep uniform)
      
      // We start from -90deg (top)
      const rotation = `rotate(${angle} ${radius} ${radius})`;
      
      tickElements.push(
        <line
          key={i}
          x1={radius}
          y1={strokeWidth + (isMajor ? 0 : 0)} 
          x2={radius}
          y2={strokeWidth + 15} // Length of tick
          stroke="rgba(255,255,255,0.3)"
          strokeWidth={1.5}
          transform={rotation}
        />
      );
    }
    return tickElements;
  }, [radius, showTicks]);

  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <svg
        height={size}
        width={size}
        className="absolute top-0 left-0 transform -rotate-90 transition-all duration-500"
      >
        {/* Background Ticks */}
        {ticks}

        {/* Progress Circle (The solid line overlaying ticks or inside them) 
            Looking at the reference, it's a dashed ring that fills up. 
            Let's simulate the filling effect using a dashed stroke.
        */}
        <circle
          stroke={color}
          fill="transparent"
          strokeWidth={4}
          strokeDasharray={`${circumference} ${circumference}`}
          style={{ strokeDashoffset }}
          strokeLinecap="round"
          r={normalizedRadius - 20} // Slightly inner ring
          cx={radius}
          cy={radius}
          className="transition-all duration-1000 ease-linear opacity-90"
        />
      </svg>
    </div>
  );
};
