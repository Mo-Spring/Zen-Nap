import React from 'react';

interface BackgroundProps {
  color: string;
  image: string;
}

export const Background: React.FC<BackgroundProps> = ({ color, image }) => {
  return (
    <div className="fixed -inset-[50px] z-0 transition-colors duration-700 ease-in-out bg-black">
      {/* Base Image */}
      <div 
        className="absolute inset-0 bg-cover bg-center transition-opacity duration-700 opacity-60"
        style={{ backgroundImage: `url(${image})` }}
      />
      
      {/* Color Overlay - The gradient logic */}
      <div 
        className={`absolute inset-0 transition-all duration-700 mix-blend-multiply opacity-80`}
        style={{ backgroundColor: color }}
      />
      
      {/* Fog/Gradient Overlay for legibility */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/40" />
      <div className="absolute inset-0 backdrop-blur-[2px]" />
    </div>
  );
};
