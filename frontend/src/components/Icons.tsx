// src/components/Icons.tsx - CLEAN: Complete SVG Icon Library
import React from 'react';

interface IconProps {
  size?: number;
  color?: string;
  className?: string;
}

// Core System Icons
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
    <path d="M9 12l2 2 4-4" stroke={color} strokeWidth="2" fill="none"/>
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
    <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" 
          stroke={color} strokeWidth="2" fill="none"/>
    <line x1="12" y1="9" x2="12" y2="13" stroke={color} strokeWidth="2"/>
    <line x1="12" y1="17" x2="12.01" y2="17" stroke={color} strokeWidth="2"/>
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

// Missing Icons - Adding them now
export const FilterIcon: React.FC<IconProps> = ({ 
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
    <polygon points="22,3 2,3 10,12.46 10,19 14,21 14,12.46 22,3" stroke={color} strokeWidth="2" fill="none"/>
  </svg>
);

export const ClockIcon: React.FC<IconProps> = ({ 
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
    <circle cx="12" cy="12" r="10" stroke={color} strokeWidth="2" fill="none"/>
    <polyline points="12,6 12,12 16,14" stroke={color} strokeWidth="2" fill="none"/>
  </svg>
);

export const XIcon: React.FC<IconProps> = ({ 
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
    <line x1="18" y1="6" x2="6" y2="18" stroke={color} strokeWidth="2"/>
    <line x1="6" y1="6" x2="18" y2="18" stroke={color} strokeWidth="2"/>
  </svg>
);

// Memory and Storage Icons
export const MemoryIcon: React.FC<IconProps> = ({ 
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
    <rect x="2" y="6" width="20" height="12" rx="2" stroke={color} strokeWidth="2" fill="none"/>
    <line x1="6" y1="10" x2="6" y2="14" stroke={color} strokeWidth="2"/>
    <line x1="10" y1="10" x2="10" y2="14" stroke={color} strokeWidth="2"/>
    <line x1="14" y1="10" x2="14" y2="14" stroke={color} strokeWidth="2"/>
    <line x1="18" y1="10" x2="18" y2="14" stroke={color} strokeWidth="2"/>
  </svg>
);

export const DiskIcon: React.FC<IconProps> = ({ 
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
    <rect x="3" y="4" width="18" height="16" rx="2" stroke={color} strokeWidth="2" fill="none"/>
    <path d="M7 8h10M7 12h6M7 16h4" stroke={color} strokeWidth="2"/>
    <circle cx="17" cy="16" r="1" fill={color}/>
  </svg>
);

export const TemperatureIcon: React.FC<IconProps> = ({ 
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
    <path d="M14 14.76V3.5a2.5 2.5 0 0 0-5 0v11.26a4.5 4.5 0 1 0 5 0Z" 
          stroke={color} strokeWidth="2" fill="none"/>
    <circle cx="12" cy="18" r="2" fill={color}/>
  </svg>
);

// Security and Threat Icons
export const ThreatIcon: React.FC<IconProps> = ({ 
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
    <line x1="9" y1="9" x2="15" y2="15" stroke={color} strokeWidth="2"/>
    <line x1="15" y1="9" x2="9" y2="15" stroke={color} strokeWidth="2"/>
  </svg>
);

export const SecurityIcon: React.FC<IconProps> = ({ 
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
    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" stroke={color} strokeWidth="2" fill="none"/>
    <circle cx="12" cy="16" r="1" fill={color}/>
    <path d="M7 11V7a5 5 0 0 1 10 0v4" stroke={color} strokeWidth="2" fill="none"/>
  </svg>
);

export const ScanIcon: React.FC<IconProps> = ({ 
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
    <path d="M3 7V5a2 2 0 0 1 2-2h2" stroke={color} strokeWidth="2" fill="none"/>
    <path d="M17 3h2a2 2 0 0 1 2 2v2" stroke={color} strokeWidth="2" fill="none"/>
    <path d="M21 17v2a2 2 0 0 1-2 2h-2" stroke={color} strokeWidth="2" fill="none"/>
    <path d="M7 21H5a2 2 0 0 1-2-2v-2" stroke={color} strokeWidth="2" fill="none"/>
    <line x1="12" y1="8" x2="12" y2="16" stroke={color} strokeWidth="2"/>
    <line x1="8" y1="12" x2="16" y2="12" stroke={color} strokeWidth="2"/>
  </svg>
);

// Navigation and UI Icons
export const SearchIcon: React.FC<IconProps> = ({ 
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
    <circle cx="11" cy="11" r="8" stroke={color} strokeWidth="2" fill="none"/>
    <line x1="21" y1="21" x2="16.65" y2="16.65" stroke={color} strokeWidth="2"/>
  </svg>
);

export const SettingsIcon: React.FC<IconProps> = ({ 
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
    <circle cx="12" cy="12" r="3" stroke={color} strokeWidth="2" fill="none"/>
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" 
          stroke={color} strokeWidth="2" fill="none"/>
  </svg>
);

export const RefreshIcon: React.FC<IconProps> = ({ 
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
    <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" stroke={color} strokeWidth="2" fill="none"/>
    <path d="M21 3v5h-5" stroke={color} strokeWidth="2" fill="none"/>
    <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" stroke={color} strokeWidth="2" fill="none"/>
    <path d="M8 16H3v5" stroke={color} strokeWidth="2" fill="none"/>
  </svg>
);

export const CloseIcon: React.FC<IconProps> = ({ 
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
    <line x1="18" y1="6" x2="6" y2="18" stroke={color} strokeWidth="2"/>
    <line x1="6" y1="6" x2="18" y2="18" stroke={color} strokeWidth="2"/>
  </svg>
);

// Data and Analytics Icons
export const ChartIcon: React.FC<IconProps> = ({ 
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
    <line x1="18" y1="20" x2="18" y2="10" stroke={color} strokeWidth="2"/>
    <line x1="12" y1="20" x2="12" y2="4" stroke={color} strokeWidth="2"/>
    <line x1="6" y1="20" x2="6" y2="14" stroke={color} strokeWidth="2"/>
  </svg>
);

export const DatabaseIcon: React.FC<IconProps> = ({ 
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
    <ellipse cx="12" cy="5" rx="9" ry="3" stroke={color} strokeWidth="2" fill="none"/>
    <path d="M3 5v14c0 1.66 4.03 3 9 3s9-1.34 9-3V5" stroke={color} strokeWidth="2" fill="none"/>
    <path d="M3 12c0 1.66 4.03 3 9 3s9-1.34 9-3" stroke={color} strokeWidth="2" fill="none"/>
  </svg>
);

export const ReportIcon: React.FC<IconProps> = ({ 
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
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" 
          stroke={color} strokeWidth="2" fill="none"/>
    <polyline points="14,2 14,8 20,8" stroke={color} strokeWidth="2" fill="none"/>
    <line x1="16" y1="13" x2="8" y2="13" stroke={color} strokeWidth="2"/>
    <line x1="16" y1="17" x2="8" y2="17" stroke={color} strokeWidth="2"/>
    <polyline points="10,9 9,9 8,9" stroke={color} strokeWidth="2" fill="none"/>
  </svg>
);

// Status and Indicator Icons
export const CheckIcon: React.FC<IconProps> = ({ 
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
    <polyline points="20,6 9,17 4,12" stroke={color} strokeWidth="2" fill="none"/>
  </svg>
);

export const InfoIcon: React.FC<IconProps> = ({ 
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
    <circle cx="12" cy="12" r="10" stroke={color} strokeWidth="2" fill="none"/>
    <line x1="12" y1="16" x2="12" y2="12" stroke={color} strokeWidth="2"/>
    <line x1="12" y1="8" x2="12.01" y2="8" stroke={color} strokeWidth="2"/>
  </svg>
);

export const WarningIcon: React.FC<IconProps> = ({ 
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
    <circle cx="12" cy="12" r="10" stroke={color} strokeWidth="2" fill="none"/>
    <line x1="12" y1="8" x2="12" y2="12" stroke={color} strokeWidth="2"/>
    <line x1="12" y1="16" x2="12.01" y2="16" stroke={color} strokeWidth="2"/>
  </svg>
);

// Animated Icons
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

export const BlinkIcon: React.FC<IconProps & { animate?: boolean }> = ({ 
  size = 16, 
  color = '#EF4444', 
  className = '', 
  animate = true 
}) => (
  <div className={`${animate ? 'animate-ping' : ''} ${className}`}>
    <svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
      <circle cx="12" cy="12" r="12"/>
    </svg>
  </div>
);

// Connectivity Icons
export const WifiIcon: React.FC<IconProps> = ({ 
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
    <path d="M5 12.55a11 11 0 0 1 14.08 0" stroke={color} strokeWidth="2" fill="none"/>
    <path d="M1.42 9a16 16 0 0 1 21.16 0" stroke={color} strokeWidth="2" fill="none"/>
    <path d="M8.53 16.11a6 6 0 0 1 6.95 0" stroke={color} strokeWidth="2" fill="none"/>
    <line x1="12" y1="20" x2="12.01" y2="20" stroke={color} strokeWidth="2"/>
  </svg>
);

export const ServerIcon: React.FC<IconProps> = ({ 
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
    <rect x="2" y="3" width="20" height="4" rx="1" stroke={color} strokeWidth="2" fill="none"/>
    <rect x="2" y="9" width="20" height="4" rx="1" stroke={color} strokeWidth="2" fill="none"/>
    <rect x="2" y="15" width="20" height="4" rx="1" stroke={color} strokeWidth="2" fill="none"/>
    <line x1="6" y1="5" x2="6.01" y2="5" stroke={color} strokeWidth="2"/>
    <line x1="6" y1="11" x2="6.01" y2="11" stroke={color} strokeWidth="2"/>
    <line x1="6" y1="17" x2="6.01" y2="17" stroke={color} strokeWidth="2"/>
  </svg>
);

// Geography and Location Icons
export const GlobeIcon: React.FC<IconProps> = ({ 
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
    <circle cx="12" cy="12" r="10" stroke={color} strokeWidth="2" fill="none"/>
    <line x1="2" y1="12" x2="22" y2="12" stroke={color} strokeWidth="2"/>
    <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" 
          stroke={color} strokeWidth="2" fill="none"/>
  </svg>
);

export const MapIcon: React.FC<IconProps> = ({ 
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
    <polygon points="1,6 1,22 8,18 16,22 23,18 23,2 16,6 8,2 1,6" 
             stroke={color} strokeWidth="2" fill="none"/>
    <line x1="8" y1="2" x2="8" y2="18" stroke={color} strokeWidth="2"/>
    <line x1="16" y1="6" x2="16" y2="22" stroke={color} strokeWidth="2"/>
  </svg>
);

// Device and Hardware Icons
export const MonitorIcon: React.FC<IconProps> = ({ 
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
    <rect x="2" y="3" width="20" height="14" rx="2" ry="2" stroke={color} strokeWidth="2" fill="none"/>
    <line x1="8" y1="21" x2="16" y2="21" stroke={color} strokeWidth="2"/>
    <line x1="12" y1="17" x2="12" y2="21" stroke={color} strokeWidth="2"/>
  </svg>
);

export const RaspberryPiIcon: React.FC<IconProps> = ({ 
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
    <rect x="3" y="5" width="18" height="14" rx="2" stroke={color} strokeWidth="2" fill="none"/>
    <circle cx="8" cy="10" r="1" fill={color}/>
    <circle cx="16" cy="10" r="1" fill={color}/>
    <rect x="6" y="13" width="2" height="3" fill={color}/>
    <rect x="10" y="13" width="2" height="3" fill={color}/>
    <rect x="14" y="13" width="2" height="3" fill={color}/>
    <rect x="18" y="13" width="2" height="3" fill={color}/>
  </svg>
);

export const SoundOnIcon: React.FC<IconProps> = ({ 
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
    <polygon points="11,5 6,9 2,9 2,15 6,15 11,19" stroke={color} strokeWidth="2" fill={color}/>
    <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07" stroke={color} strokeWidth="2" fill="none"/>
  </svg>
);

export const SoundOffIcon: React.FC<IconProps> = ({ 
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
    <polygon points="11,5 6,9 2,9 2,15 6,15 11,19" stroke={color} strokeWidth="2" fill={color}/>
    <line x1="23" y1="9" x2="17" y2="15" stroke={color} strokeWidth="2"/>
    <line x1="17" y1="9" x2="23" y2="15" stroke={color} strokeWidth="2"/>
  </svg>
);

export const CriticalIcon: React.FC<IconProps> = ({ 
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
    <circle cx="12" cy="12" r="10" stroke={color} strokeWidth="2" fill="none"/>
    <line x1="12" y1="8" x2="12" y2="12" stroke={color} strokeWidth="2"/>
    <circle cx="12" cy="16" r="1" fill={color}/>
  </svg>
);

export const WarningAlertIcon: React.FC<IconProps> = ({ 
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
    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" stroke={color} strokeWidth="2" fill="none"/>
    <line x1="12" y1="9" x2="12" y2="13" stroke={color} strokeWidth="2"/>
    <circle cx="12" cy="17" r="1" fill={color}/>
  </svg>
);

export const DenyIcon: React.FC<IconProps> = ({ 
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
    <circle cx="12" cy="12" r="10" stroke={color} strokeWidth="2" fill="none"/>
    <line x1="15" y1="9" x2="9" y2="15" stroke={color} strokeWidth="2"/>
    <line x1="9" y1="9" x2="15" y2="15" stroke={color} strokeWidth="2"/>
  </svg>
);

export const AcceptIcon: React.FC<IconProps> = ({ 
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
    <path d="M20 6L9 17l-5-5" stroke={color} strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

export const ProtocolIcon: React.FC<IconProps> = ({ 
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
    <circle cx="12" cy="12" r="3" stroke={color} strokeWidth="2" fill="none"/>
    <path d="M12 1v6m0 6v6" stroke={color} strokeWidth="2"/>
    <path d="M21 12h-6M9 12H3" stroke={color} strokeWidth="2"/>
  </svg>
);

export const InterfaceIcon: React.FC<IconProps> = ({ 
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
    <rect x="2" y="6" width="20" height="12" rx="2" stroke={color} strokeWidth="2" fill="none"/>
    <circle cx="6" cy="12" r="2" fill={color}/>
    <circle cx="18" cy="12" r="2" fill={color}/>
    <path d="M8 12h8" stroke={color} strokeWidth="2"/>
  </svg>
);

export const PolicyIcon: React.FC<IconProps> = ({ 
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
    <path d="M9 12l2 2 4-4" stroke={color} strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

export const FlagIcon: React.FC<IconProps> = ({ 
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
    <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" stroke={color} strokeWidth="2" fill="none"/>
    <line x1="4" y1="22" x2="4" y2="15" stroke={color} strokeWidth="2"/>
  </svg>
);

export const FireIcon: React.FC<IconProps> = ({ 
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
    <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z" stroke={color} strokeWidth="2" fill="none"/>
  </svg>
);

// Export all icons as a collection for easy usage
export const Icons = {
  // Core System
  Shield: ShieldIcon,
  Alert: AlertIcon,
  Cpu: CpuIcon,
  Activity: ActivityIcon,
  Network: NetworkIcon,
  
  // Memory & Storage
  Memory: MemoryIcon,
  Disk: DiskIcon,
  Temperature: TemperatureIcon,
  
  // Security
  Threat: ThreatIcon,
  Security: SecurityIcon,
  Scan: ScanIcon,
  
  // Navigation
  Search: SearchIcon,
  Settings: SettingsIcon,
  Refresh: RefreshIcon,
  Close: CloseIcon,
  Filter: FilterIcon,
  Clock: ClockIcon,
  X: XIcon,
  
  // Data
  Chart: ChartIcon,
  Database: DatabaseIcon,
  Report: ReportIcon,
  
  // Status
  Check: CheckIcon,
  Info: InfoIcon,
  Warning: WarningIcon,
  
  // Audio & Alerts
  SoundOn: SoundOnIcon,
  SoundOff: SoundOffIcon,
  Critical: CriticalIcon,
  WarningAlert: WarningAlertIcon,
  
  // Actions & States
  Deny: DenyIcon,
  Accept: AcceptIcon,
  Protocol: ProtocolIcon,
  Interface: InterfaceIcon,
  Policy: PolicyIcon,
  Flag: FlagIcon,
  Fire: FireIcon,
  
  // Animated
  Pulse: PulseIcon,
  Spin: SpinIcon,
  Blink: BlinkIcon,
  
  // Connectivity
  Wifi: WifiIcon,
  Server: ServerIcon,
  
  // Geography
  Globe: GlobeIcon,
  Map: MapIcon,
  
  // Hardware
  Monitor: MonitorIcon,
  RaspberryPi: RaspberryPiIcon
};

export default Icons;