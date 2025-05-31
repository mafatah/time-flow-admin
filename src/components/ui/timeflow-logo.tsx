import React from 'react';

interface TimeFlowLogoProps {
  size?: number;
  className?: string;
  showText?: boolean;
}

const TimeFlowLogo: React.FC<TimeFlowLogoProps> = ({ 
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
        {/* Outer Circle - Primary Color */}
        <circle
          cx="24"
          cy="24"
          r="22"
          fill="url(#gradient1)"
          stroke="currentColor"
          strokeWidth="2"
        />
        
        {/* Inner Circle - Background */}
        <circle
          cx="24"
          cy="24"
          r="18"
          fill="white"
          stroke="currentColor"
          strokeWidth="1"
          opacity="0.9"
        />
        
        {/* Clock Face Marks */}
        <g stroke="currentColor" strokeWidth="1.5" opacity="0.6">
          {/* 12, 3, 6, 9 o'clock marks */}
          <line x1="24" y1="8" x2="24" y2="12" strokeWidth="2" />
          <line x1="40" y1="24" x2="36" y2="24" strokeWidth="2" />
          <line x1="24" y1="40" x2="24" y2="36" strokeWidth="2" />
          <line x1="8" y1="24" x2="12" y2="24" strokeWidth="2" />
          
          {/* Other hour marks */}
          <line x1="32.5" y1="10.5" x2="31" y2="12" />
          <line x1="37.5" y1="15.5" x2="36" y2="17" />
          <line x1="37.5" y1="32.5" x2="36" y2="31" />
          <line x1="32.5" y1="37.5" x2="31" y2="36" />
          <line x1="15.5" y1="37.5" x2="17" y2="36" />
          <line x1="10.5" y1="32.5" x2="12" y2="31" />
          <line x1="10.5" y1="15.5" x2="12" y2="17" />
          <line x1="15.5" y1="10.5" x2="17" y2="12" />
        </g>
        
        {/* Clock Hands */}
        <g stroke="currentColor" strokeLinecap="round">
          {/* Hour Hand - pointing to 10 */}
          <line
            x1="24"
            y1="24"
            x2="18"
            y2="16"
            strokeWidth="3"
            opacity="0.8"
          />
          
          {/* Minute Hand - pointing to 2 */}
          <line
            x1="24"
            y1="24"
            x2="32"
            y2="14"
            strokeWidth="2"
            opacity="0.8"
          />
          
          {/* Second Hand - pointing to 6 */}
          <line
            x1="24"
            y1="24"
            x2="24"
            y2="35"
            strokeWidth="1"
            stroke="#ef4444"
            opacity="0.9"
          />
        </g>
        
        {/* Center Dot */}
        <circle
          cx="24"
          cy="24"
          r="2"
          fill="currentColor"
          opacity="0.8"
        />
        
        {/* Flow Arrow */}
        <path
          d="M30 24 L36 20 L36 22 L42 22 L42 26 L36 26 L36 28 Z"
          fill="url(#gradient2)"
          opacity="0.7"
        />
        
        {/* Gradient Definitions */}
        <defs>
          <linearGradient id="gradient1" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="hsl(var(--primary))" />
            <stop offset="100%" stopColor="hsl(var(--primary) / 0.8)" />
          </linearGradient>
          <linearGradient id="gradient2" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="hsl(var(--primary))" />
            <stop offset="100%" stopColor="hsl(var(--primary) / 0.6)" />
          </linearGradient>
        </defs>
      </svg>
      
      {showText && (
        <div className="flex flex-col">
          <span className="font-bold text-lg text-primary">TimeFlow</span>
          <span className="text-xs text-muted-foreground">Time Tracking</span>
        </div>
      )}
    </div>
  );
};

export default TimeFlowLogo; 