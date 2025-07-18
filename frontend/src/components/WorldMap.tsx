import React, { useState } from 'react';
import { AlertIcon, NetworkIcon } from './Icons';

interface ThreatData {
  country: string;
  countryCode: string;
  threatCount: number;
  severity: 'low' | 'medium' | 'high';
  coordinates: [number, number];
  lastAttack?: string;
}

interface WorldMapProps {
  threatData?: ThreatData[];
  onCountryClick?: (country: ThreatData) => void;
}

const WorldMap: React.FC<WorldMapProps> = ({ threatData, onCountryClick }) => {
  const [hoveredCountry, setHoveredCountry] = useState<string | null>(null);
  const [selectedCountry, setSelectedCountry] = useState<string | null>(null);

  // Lightweight sample data (RPi-friendly)
  const sampleThreatData: ThreatData[] = [
    { country: 'China', countryCode: 'CN', threatCount: 247, severity: 'high', coordinates: [116, 39], lastAttack: '2 min ago' },
    { country: 'Russia', countryCode: 'RU', threatCount: 156, severity: 'high', coordinates: [37, 55], lastAttack: '5 min ago' },
    { country: 'USA', countryCode: 'US', threatCount: 89, severity: 'medium', coordinates: [-95, 39], lastAttack: '12 min ago' },
    { country: 'Brazil', countryCode: 'BR', threatCount: 34, severity: 'low', coordinates: [-47, -15], lastAttack: '1 hour ago' },
    { country: 'Germany', countryCode: 'DE', threatCount: 67, severity: 'medium', coordinates: [10, 51], lastAttack: '8 min ago' }
  ];

  const displayData = threatData || sampleThreatData;

  const getThreatColor = (severity: string) => {
    switch (severity) {
      case 'high': return '#EF4444';
      case 'medium': return '#F59E0B';
      case 'low': return '#10B981';
      default: return '#6B7280';
    }
  };

  const getThreatSize = (threatCount: number) => {
    if (threatCount > 200) return 10;
    if (threatCount > 100) return 8;
    if (threatCount > 50) return 6;
    return 4;
  };

  const handleCountryClick = (country: ThreatData) => {
    setSelectedCountry(country.countryCode);
    onCountryClick?.(country);
  };

  return (
    <div className="bg-gray-800 p-6 rounded-lg border border-gray-700 hover-lift transition-all duration-300 animate-fadeIn">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-white flex items-center space-x-2">
          <NetworkIcon size={20} color="#3B82F6" />
          <span>Global Threat Intelligence</span>
        </h3>
        <div className="flex items-center space-x-2">
          <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
          <span className="text-xs text-gray-400">Live monitoring</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* World Map Visualization */}
        <div className="lg:col-span-2">
          <div className="relative bg-gray-900 rounded-lg p-4 border border-gray-600 h-64 lg:h-80">
            {/* Simple SVG World Map */}
            <svg
              viewBox="0 0 800 400"
              className="w-full h-full"
              style={{ background: '#111827' }}
            >
              {/* Grid lines for professional look */}
              <defs>
                <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                  <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#374151" strokeWidth="0.5" opacity="0.3"/>
                </pattern>
              </defs>
              <rect width="800" height="400" fill="url(#grid)" />

              {/* Simplified continent outlines (super lightweight) */}
              <g fill="#1F2937" stroke="#4B5563" strokeWidth="1">
                {/* North America */}
                <path d="M 50,80 L 180,60 L 220,120 L 180,160 L 120,150 Z" />
                {/* South America */}
                <path d="M 150,200 L 180,190 L 190,280 L 170,320 L 140,280 Z" />
                {/* Europe */}
                <path d="M 380,70 L 420,75 L 410,110 L 390,105 Z" />
                {/* Africa */}
                <path d="M 380,130 L 420,125 L 430,220 L 410,260 L 385,220 Z" />
                {/* Asia */}
                <path d="M 450,50 L 650,60 L 680,140 L 580,130 L 520,110 Z" />
                {/* Australia */}
                <path d="M 580,260 L 650,265 L 645,290 L 585,285 Z" />
              </g>

              {/* Threat indicators */}
              {displayData.map((threat, index) => {
                // Convert lat/lng to SVG coordinates (simplified projection)
                const x = ((threat.coordinates[0] + 180) / 360) * 800;
                const y = ((90 - threat.coordinates[1]) / 180) * 400;
                
                return (
                  <g key={threat.countryCode}>
                    {/* Threat indicator circle */}
                    <circle
                      cx={x}
                      cy={y}
                      r={getThreatSize(threat.threatCount)}
                      fill={getThreatColor(threat.severity)}
                      opacity={hoveredCountry === threat.countryCode ? 1 : 0.8}
                      className={`cursor-pointer transition-all duration-200 ${
                        threat.severity === 'high' ? 'animate-pulse' : ''
                      }`}
                      onMouseEnter={() => setHoveredCountry(threat.countryCode)}
                      onMouseLeave={() => setHoveredCountry(null)}
                      onClick={() => handleCountryClick(threat)}
                    />
                    
                    {/* Ripple effect for high severity */}
                    {threat.severity === 'high' && (
                      <circle
                        cx={x}
                        cy={y}
                        r={getThreatSize(threat.threatCount) + 3}
                        fill="none"
                        stroke={getThreatColor(threat.severity)}
                        strokeWidth="2"
                        opacity="0.4"
                        className="animate-ping"
                      />
                    )}
                    
                    {/* Threat count label */}
                    <text
                      x={x}
                      y={y - getThreatSize(threat.threatCount) - 5}
                      textAnchor="middle"
                      className="fill-white text-xs font-bold"
                      style={{ fontSize: '8px', textShadow: '1px 1px 1px rgba(0,0,0,0.8)' }}
                    >
                      {threat.threatCount > 99 ? '99+' : threat.threatCount}
                    </text>
                  </g>
                );
              })}

              {/* Attack flow lines (lightweight animation) */}
              {displayData
                .filter(threat => threat.severity === 'high')
                .map((threat, index) => {
                  const x = ((threat.coordinates[0] + 180) / 360) * 800;
                  const y = ((90 - threat.coordinates[1]) / 180) * 400;
                  
                  return (
                    <line
                      key={`flow-${threat.countryCode}`}
                      x1={x}
                      y1={y}
                      x2="400"
                      y2="200"
                      stroke={getThreatColor(threat.severity)}
                      strokeWidth="1"
                      opacity="0.3"
                      strokeDasharray="3,3"
                      className="animate-pulse"
                    />
                  );
                })}
            </svg>

            {/* Hover tooltip (lightweight) */}
            {hoveredCountry && (
              <div className="absolute top-2 right-2 bg-gray-700 p-2 rounded border border-gray-600 animate-fadeIn text-xs">
                {(() => {
                  const country = displayData.find(t => t.countryCode === hoveredCountry);
                  return country ? (
                    <div>
                      <div className="font-semibold text-white">{country.country}</div>
                      <div className="text-gray-300">Threats: {country.threatCount}</div>
                      <div className={`text-xs ${
                        country.severity === 'high' ? 'text-red-400' :
                        country.severity === 'medium' ? 'text-yellow-400' :
                        'text-green-400'
                      }`}>
                        {country.severity.toUpperCase()} RISK
                      </div>
                      {country.lastAttack && (
                        <div className="text-gray-400">Last: {country.lastAttack}</div>
                      )}
                    </div>
                  ) : null;
                })()}
              </div>
            )}
          </div>

          {/* Legend */}
          <div className="flex items-center justify-center space-x-6 mt-3 text-xs text-gray-400">
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-red-500 rounded-full"></div>
              <span>High Risk (200+ threats)</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
              <span>Medium Risk (50-200)</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
              <span>Low Risk ({'<'}50)</span>
            </div>
          </div>
        </div>

        {/* Threat Rankings */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-md font-semibold text-white flex items-center space-x-2">
              <AlertIcon size={16} color="#EF4444" />
              <span>Top Threats</span>
            </h4>
            <span className="text-xs text-gray-400">Live updates</span>
          </div>
          
          <div className="space-y-2">
            {displayData
              .sort((a, b) => b.threatCount - a.threatCount)
              .slice(0, 5)
              .map((country, index) => (
                <div
                  key={country.countryCode}
                  className={`p-3 rounded-lg border cursor-pointer transition-all duration-200 hover-lift ${
                    selectedCountry === country.countryCode 
                      ? 'bg-gray-600 border-blue-500 ring-1 ring-blue-500' 
                      : 'bg-gray-700 border-gray-600 hover:bg-gray-600'
                  }`}
                  onClick={() => handleCountryClick(country)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="text-lg font-bold text-gray-400">#{index + 1}</div>
                      <div>
                        <div className="font-semibold text-white text-sm">{country.country}</div>
                        {country.lastAttack && (
                          <div className="text-xs text-gray-400">Last attack: {country.lastAttack}</div>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-bold text-white">{country.threatCount}</div>
                      <div 
                        className={`text-xs font-semibold px-2 py-1 rounded ${
                          country.severity === 'high' ? 'bg-red-900 text-red-200' :
                          country.severity === 'medium' ? 'bg-yellow-900 text-yellow-200' :
                          'bg-green-900 text-green-200'
                        }`}
                      >
                        {country.severity.toUpperCase()}
                      </div>
                    </div>
                  </div>
                  
                  {/* Simple progress bar */}
                  <div className="mt-2 w-full bg-gray-600 rounded-full h-1">
                    <div
                      className={`h-1 rounded-full transition-all duration-500 ${
                        country.severity === 'high' ? 'bg-red-500' :
                        country.severity === 'medium' ? 'bg-yellow-500' :
                        'bg-green-500'
                      }`}
                      style={{ 
                        width: `${Math.min((country.threatCount / 250) * 100, 100)}%` 
                      }}
                    ></div>
                  </div>
                </div>
              ))}
          </div>

          {/* Summary stats */}
          <div className="bg-gray-700 p-3 rounded-lg border border-gray-600">
            <div className="text-sm font-semibold text-white mb-2">Global Summary</div>
            <div className="space-y-1 text-xs text-gray-300">
              <div className="flex justify-between">
                <span>Total threats:</span>
                <span className="font-semibold">{displayData.reduce((sum, country) => sum + country.threatCount, 0)}</span>
              </div>
              <div className="flex justify-between">
                <span>High risk countries:</span>
                <span className="font-semibold text-red-400">{displayData.filter(c => c.severity === 'high').length}</span>
              </div>
              <div className="flex justify-between">
                <span>Active monitoring:</span>
                <span className="font-semibold text-green-400">{displayData.length} regions</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WorldMap;