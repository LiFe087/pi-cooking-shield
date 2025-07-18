import React from 'react';

interface IconProps {
  size?: number;
  color?: string;
  className?: string;
}

export const SearchIcon: React.FC<IconProps> = ({ 
  size = 20, 
  color = 'currentColor', 
  className = '' 
}) => (
  <svg 
    width={size} 
    height={size} 
    viewBox="0 0 24 24" 
    fill="none" 
    className={className}
  >
    <circle cx="11" cy="11" r="8" stroke={color} strokeWidth="2"/>
    <path d="m21 21-4.35-4.35" stroke={color} strokeWidth="2"/>
  </svg>
);

export const FilterIcon: React.FC<IconProps> = ({ 
  size = 20, 
  color = 'currentColor', 
  className = '' 
}) => (
  <svg 
    width={size} 
    height={size} 
    viewBox="0 0 24 24" 
    fill="none" 
    className={className}
  >
    <polygon points="22,3 2,3 10,12.46 10,19 14,21 14,12.46" stroke={color} strokeWidth="2" fill="none"/>
  </svg>
);

export const ClockIcon: React.FC<IconProps> = ({ 
  size = 20, 
  color = 'currentColor', 
  className = '' 
}) => (
  <svg 
    width={size} 
    height={size} 
    viewBox="0 0 24 24" 
    fill="none" 
    className={className}
  >
    <circle cx="12" cy="12" r="10" stroke={color} strokeWidth="2"/>
    <polyline points="12,6 12,12 16,14" stroke={color} strokeWidth="2"/>
  </svg>
);

export const XIcon: React.FC<IconProps> = ({ 
  size = 16, 
  color = 'currentColor', 
  className = '' 
}) => (
  <svg 
    width={size} 
    height={size} 
    viewBox="0 0 24 24" 
    fill="none" 
    className={className}
  >
    <line x1="18" y1="6" x2="6" y2="18" stroke={color} strokeWidth="2"/>
    <line x1="6" y1="6" x2="18" y2="18" stroke={color} strokeWidth="2"/>
  </svg>
);

export const ShieldIcon: React.FC<IconProps> = ({ 
  size = 24, 
  color = 'currentColor', 
  className = '' 
}) => (
  <svg 
    width={size} 
    height={size} 
    viewBox="0 0 24 24" 
    fill="none" 
    className={className}
  >
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" stroke={color} strokeWidth="2" fill="none"/>
  </svg>
);

export const AlertIcon: React.FC<IconProps> = ({ 
  size = 24, 
  color = 'currentColor', 
  className = '' 
}) => (
  <svg 
    width={size} 
    height={size} 
    viewBox="0 0 24 24" 
    fill="none" 
    className={className}
  >
    <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" stroke={color} strokeWidth="2" fill="none"/>
    <line x1="12" y1="9" x2="12" y2="13" stroke={color} strokeWidth="2"/>
    <line x1="12" y1="17" x2="12.01" y2="17" stroke={color} strokeWidth="2"/>
  </svg>
);

export const NetworkIcon: React.FC<IconProps> = ({ 
  size = 24, 
  color = 'currentColor', 
  className = '' 
}) => (
  <svg 
    width={size} 
    height={size} 
    viewBox="0 0 24 24" 
    fill="none" 
    className={className}
  >
    <rect x="16" y="16" width="6" height="6" rx="1" stroke={color} strokeWidth="2" fill="none"/>
    <rect x="2" y="16" width="6" height="6" rx="1" stroke={color} strokeWidth="2" fill="none"/>
    <rect x="9" y="2" width="6" height="6" rx="1" stroke={color} strokeWidth="2" fill="none"/>
    <line x1="12" y1="8" x2="12" y2="16" stroke={color} strokeWidth="2"/>
    <line x1="8" y1="19" x2="16" y2="19" stroke={color} strokeWidth="2"/>
  </svg>
);

export const CpuIcon: React.FC<IconProps> = ({ 
  size = 24, 
  color = 'currentColor', 
  className = '' 
}) => (
  <svg 
    width={size} 
    height={size} 
    viewBox="0 0 24 24" 
    fill="none" 
    className={className}
  >
    <rect x="4" y="4" width="16" height="16" rx="2" stroke={color} strokeWidth="2" fill="none"/>
    <rect x="9" y="9" width="6" height="6" stroke={color} strokeWidth="2" fill="none"/>
    <line x1="9" y1="1" x2="9" y2="4" stroke={color} strokeWidth="2"/>
    <line x1="15" y1="1" x2="15" y2="4" stroke={color} strokeWidth="2"/>
    <line x1="9" y1="20" x2="9" y2="23" stroke={color} strokeWidth="2"/>
    <line x1="15" y1="20" x2="15" y2="23" stroke={color} strokeWidth="2"/>
    <line x1="20" y1="9" x2="23" y2="9" stroke={color} strokeWidth="2"/>
    <line x1="20" y1="14" x2="23" y2="14" stroke={color} strokeWidth="2"/>
    <line x1="1" y1="9" x2="4" y2="9" stroke={color} strokeWidth="2"/>
    <line x1="1" y1="14" x2="4" y2="14" stroke={color} strokeWidth="2"/>
  </svg>
);

export const ActivityIcon: React.FC<IconProps> = ({ 
  size = 24, 
  color = 'currentColor', 
  className = '' 
}) => (
  <svg 
    width={size} 
    height={size} 
    viewBox="0 0 24 24" 
    fill="none" 
    className={className}
  >
    <polyline points="22,12 18,12 15,21 9,3 6,12 2,12" stroke={color} strokeWidth="2" fill="none"/>
  </svg>
);

// Animated icons for special effects
export const PulseIcon: React.FC<IconProps & { animate?: boolean }> = ({ 
  size = 8, 
  color = '#10B981', 
  className = '', 
  animate = true 
}) => (
  <div className={`${animate ? 'animate-pulse' : ''} ${className}`}>
    <svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
      <circle cx="12" cy="12" r="12"/>
    </svg>
  </div>
);

export const SpinIcon: React.FC<IconProps & { animate?: boolean }> = ({ 
  size = 20, 
  color = 'currentColor', 
  className = '', 
  animate = true 
}) => (
  <svg 
    width={size} 
    height={size} 
    viewBox="0 0 24 24" 
    fill="none" 
    className={`${animate ? 'animate-spin' : ''} ${className}`}
  >
    <path d="M21 12a9 9 0 11-6.219-8.56" stroke={color} strokeWidth="2"/>
  </svg>
);