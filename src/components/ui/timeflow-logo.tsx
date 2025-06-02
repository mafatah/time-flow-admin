import React from 'react';

interface EbdaaTimeLogoProps {
  size?: number;
  className?: string;
  showText?: boolean;
}

const EbdaaTimeLogo: React.FC<EbdaaTimeLogoProps> = ({ 
  size = 40, 
  className = '', 
  showText = false 
}) => {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <svg
        width={size}
        height={size}
        viewBox="0 0 48 48"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="drop-shadow-sm"
      >
        {/* Outer Circle - Premium Gradient */}
        <circle
          cx="24"
          cy="24"
          r="22"
          fill="url(#gradient1)"
          stroke="currentColor"
          strokeWidth="2"
        />
        
        {/* Inner Creative Burst Pattern */}
        <circle
          cx="24"
          cy="24"
          r="18"
          fill="white"
          stroke="currentColor"
          strokeWidth="1"
          opacity="0.95"
        />
        
        {/* Creative Spark Pattern */}
        <g stroke="currentColor" strokeWidth="1.5" opacity="0.7">
          {/* Central Star Pattern */}
          <path d="M24 8 L26 16 L24 24 L22 16 Z" fill="url(#gradient2)" />
          <path d="M40 24 L32 26 L24 24 L32 22 Z" fill="url(#gradient2)" />
          <path d="M24 40 L22 32 L24 24 L26 32 Z" fill="url(#gradient2)" />
          <path d="M8 24 L16 22 L24 24 L16 26 Z" fill="url(#gradient2)" />
          
          {/* Diagonal Rays */}
          <path d="M33.5 14.5 L29 19 L24 24 L29 19 Z" fill="url(#gradient3)" opacity="0.6" />
          <path d="M33.5 33.5 L29 29 L24 24 L29 29 Z" fill="url(#gradient3)" opacity="0.6" />
          <path d="M14.5 33.5 L19 29 L24 24 L19 29 Z" fill="url(#gradient3)" opacity="0.6" />
          <path d="M14.5 14.5 L19 19 L24 24 L19 19 Z" fill="url(#gradient3)" opacity="0.6" />
        </g>
        
        {/* Time Elements */}
        <g stroke="currentColor" strokeLinecap="round" opacity="0.8">
          {/* Hour Hand - pointing to 3 (E for Ebdaa) */}
          <line
            x1="24"
            y1="24"
            x2="32"
            y2="24"
            strokeWidth="3"
            opacity="0.9"
          />
          
          {/* Minute Hand - pointing to 12 */}
          <line
            x1="24"
            y1="24"
            x2="24"
            y2="14"
            strokeWidth="2"
            opacity="0.9"
          />
          
          {/* Second Hand - Dynamic sweep */}
          <line
            x1="24"
            y1="24"
            x2="30"
            y2="18"
            strokeWidth="1"
            stroke="#ef4444"
            opacity="0.9"
          />
        </g>
        
        {/* Center Creative Hub */}
        <circle
          cx="24"
          cy="24"
          r="3"
          fill="url(#gradient2)"
          opacity="0.9"
        />
        
        {/* Innovation Arrow */}
        <path
          d="M30 20 L38 16 L38 18 L44 18 L44 22 L38 22 L38 24 Z"
          fill="url(#gradient4)"
          opacity="0.8"
        />
        
        {/* Gradient Definitions */}
        <defs>
          <linearGradient id="gradient1" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#3b82f6" />
            <stop offset="50%" stopColor="#6366f1" />
            <stop offset="100%" stopColor="#8b5cf6" />
          </linearGradient>
          <linearGradient id="gradient2" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#f59e0b" />
            <stop offset="100%" stopColor="#ef4444" />
          </linearGradient>
          <linearGradient id="gradient3" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#3b82f6" />
            <stop offset="100%" stopColor="#1d4ed8" />
          </linearGradient>
          <linearGradient id="gradient4" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#10b981" />
            <stop offset="100%" stopColor="#059669" />
          </linearGradient>
        </defs>
      </svg>
      
      {showText && (
        <div className="flex flex-col">
          <span className="font-bold text-lg text-primary">Ebdaa Work Time</span>
          <span className="text-xs text-muted-foreground">Employee Tracking</span>
        </div>
      )}
    </div>
  );
};

export default EbdaaTimeLogo; 