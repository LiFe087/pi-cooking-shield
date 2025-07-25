// src/components/WorldMap.tsx - Simple Geographic Threat Visualization
import React from 'react';
import { GlobeIcon, AlertIcon } from './Icons';

interface Activity {
  id: number;
  message: string;
  threat_score: number;
  status: string;
  alert_level: string;
  timestamp: string;
  source: string;
  ip_address?: string;
  dst_country?: string;
}

interface WorldMapProps {
  activities: Activity[];
}

// Utilidad para obtener el código ISO2 a partir del nombre de país (simple, para demo)
const countryNameToISO2: Record<string, string> = {
  'United States': 'US',
  'Mexico': 'MX',
  'Canada': 'CA',
  'Brazil': 'BR',
  'Argentina': 'AR',
  'United Kingdom': 'GB',
  'France': 'FR',
  'Germany': 'DE',
  'Russia': 'RU',
  'China': 'CN',
  'Japan': 'JP',
  'India': 'IN',
  'Australia': 'AU',
  'Spain': 'ES',
  'Italy': 'IT',
  'Unknown': 'UN',
};

// SVG flags (solo algunos países comunes, puedes expandir)
const FlagSVG: React.FC<{ code: string; size?: number }> = ({ code, size = 18 }) => {
  switch (code) {
    case 'US': return <svg width={size} height={size} viewBox="0 0 32 32"><rect width="32" height="32" fill="#b22234"/><g fill="#fff"><rect y="2" width="32" height="4"/><rect y="10" width="32" height="4"/><rect y="18" width="32" height="4"/><rect y="26" width="32" height="4"/></g><rect width="14" height="14" fill="#3c3b6e"/><g fill="#fff"><circle cx="2" cy="2" r="1"/><circle cx="6" cy="2" r="1"/><circle cx="10" cy="2" r="1"/><circle cx="2" cy="6" r="1"/><circle cx="6" cy="6" r="1"/><circle cx="10" cy="6" r="1"/><circle cx="2" cy="10" r="1"/><circle cx="6" cy="10" r="1"/><circle cx="10" cy="10" r="1"/></g></svg>;
    case 'MX': return <svg width={size} height={size} viewBox="0 0 32 32"><rect width="32" height="32" fill="#fff"/><rect width="10.67" height="32" fill="#006847"/><rect x="21.33" width="10.67" height="32" fill="#ce1126"/></svg>;
    case 'CA': return <svg width={size} height={size} viewBox="0 0 32 32"><rect width="32" height="32" fill="#fff"/><rect width="7" height="32" fill="#d52b1e"/><rect x="25" width="7" height="32" fill="#d52b1e"/><polygon points="16,8 18,16 16,14 14,16" fill="#d52b1e"/></svg>;
    case 'BR': return <svg width={size} height={size} viewBox="0 0 32 32"><rect width="32" height="32" fill="#009b3a"/><polygon points="16,6 28,16 16,26 4,16" fill="#ffdf00"/><circle cx="16" cy="16" r="6" fill="#3e4095"/></svg>;
    case 'GB': return <svg width={size} height={size} viewBox="0 0 32 32"><rect width="32" height="32" fill="#00247d"/><rect x="14" width="4" height="32" fill="#fff"/><rect y="14" width="32" height="4" fill="#fff"/><rect x="15" width="2" height="32" fill="#cf142b"/><rect y="15" width="32" height="2" fill="#cf142b"/></svg>;
    case 'FR': return <svg width={size} height={size} viewBox="0 0 32 32"><rect width="32" height="32" fill="#fff"/><rect width="10.67" height="32" fill="#0055a4"/><rect x="21.33" width="10.67" height="32" fill="#ef4135"/></svg>;
    case 'DE': return <svg width={size} height={size} viewBox="0 0 32 32"><rect width="32" height="10.67" fill="#000"/><rect y="10.67" width="32" height="10.67" fill="#dd0000"/><rect y="21.33" width="32" height="10.67" fill="#ffce00"/></svg>;
    case 'RU': return <svg width={size} height={size} viewBox="0 0 32 32"><rect width="32" height="10.67" fill="#fff"/><rect y="10.67" width="32" height="10.67" fill="#0039a6"/><rect y="21.33" width="32" height="10.67" fill="#d52b1e"/></svg>;
    case 'CN': return <svg width={size} height={size} viewBox="0 0 32 32"><rect width="32" height="32" fill="#de2910"/><polygon points="6,6 8,12 2,9 10,9 4,12" fill="#ffde00"/></svg>;
    case 'JP': return <svg width={size} height={size} viewBox="0 0 32 32"><rect width="32" height="32" fill="#fff"/><circle cx="16" cy="16" r="8" fill="#bc002d"/></svg>;
    case 'IN': return <svg width={size} height={size} viewBox="0 0 32 32"><rect width="32" height="32" fill="#fff"/><rect y="0" width="32" height="10.67" fill="#ff9933"/><rect y="21.33" width="32" height="10.67" fill="#138808"/><circle cx="16" cy="16" r="4" fill="#000088"/></svg>;
    case 'AU': return <svg width={size} height={size} viewBox="0 0 32 32"><rect width="32" height="32" fill="#00247d"/><rect x="14" width="4" height="32" fill="#fff"/><rect y="14" width="32" height="4" fill="#fff"/></svg>;
    case 'ES': return <svg width={size} height={size} viewBox="0 0 32 32"><rect width="32" height="32" fill="#aa151b"/><rect y="8" width="32" height="16" fill="#f1bf00"/></svg>;
    case 'IT': return <svg width={size} height={size} viewBox="0 0 32 32"><rect width="32" height="32" fill="#fff"/><rect width="10.67" height="32" fill="#008c45"/><rect x="21.33" width="10.67" height="32" fill="#cd212a"/></svg>;
    default: return <svg width={size} height={size} viewBox="0 0 32 32"><rect width="32" height="32" fill="#888"/></svg>;
  }
};

const WorldMap: React.FC<WorldMapProps> = ({ activities }) => {
  // Estado para filtro interactivo de país
  const [selectedCountry, setSelectedCountry] = React.useState<string | null>(null);
  // Group activities by destination country (real backend field)
  type CountryStats = { count: number; highThreat: number };
  const countryStats: Record<string, CountryStats> = activities.reduce((acc, activity) => {
    const country = activity.dst_country || 'Unknown';
    if (!acc[country]) {
      acc[country] = { count: 0, highThreat: 0 };
    }
    acc[country].count++;
    if (activity.status === 'high') {
      acc[country].highThreat++;
    }
    return acc;
  }, {} as Record<string, CountryStats>);

  const topCountries: [string, CountryStats][] = Object.entries(countryStats)
    .sort(([,a], [,b]) => (b as CountryStats).count - (a as CountryStats).count)
    .slice(0, 10);

  const getThreatColor = (count: number, highThreat: number) => {
    if (highThreat > 0) return 'text-red-400';
    if (count > 5) return 'text-yellow-400';
    if (count > 0) return 'text-green-400';
    return 'text-gray-400';
  };

  const getThreatLevel = (count: number, highThreat: number) => {
    if (highThreat > 0) return 'HIGH';
    if (count > 5) return 'MEDIUM';
    if (count > 0) return 'LOW';
    return 'NONE';
  };

  // Filtrar eventos recientes según país seleccionado
  const filteredActivities = selectedCountry && selectedCountry !== 'All'
    ? activities.filter(a => (a.dst_country || 'Unknown') === selectedCountry)
    : activities;

  return (
    <div className="space-y-4">
      {activities.length === 0 ? (
        <div className="text-center py-8">
          <GlobeIcon size={48} color="#6B7280" className="mx-auto mb-4" />
          <p className="text-gray-400">No geographic data available</p>
          <p className="text-gray-500 text-sm mt-2">
            Threat locations will appear here when activity is detected
          </p>
        </div>
      ) : (
        <>
          {/* World Map Placeholder */}
          <div className="bg-gray-700 rounded-lg p-8 text-center relative overflow-hidden">
            <div className="absolute inset-0 opacity-10">
              <svg viewBox="0 0 1000 500" className="w-full h-full">
                {/* Simplified world map outline */}
                <g fill="currentColor" className="text-gray-400">
                  {/* North America */}
                  <path d="M150 150 L250 140 L280 180 L250 220 L150 200 Z" />
                  {/* Europe */}
                  <path d="M450 120 L520 115 L540 140 L520 160 L450 155 Z" />
                  {/* Asia */}
                  <path d="M550 120 L750 110 L780 180 L550 190 Z" />
                  {/* Africa */}
                  <path d="M450 200 L550 195 L540 300 L460 305 Z" />
                  {/* South America */}
                  <path d="M250 250 L320 245 L310 350 L240 345 Z" />
                  {/* Australia */}
                  <path d="M650 320 L750 315 L740 360 L650 365 Z" />
                </g>
              </svg>
            </div>
            
            {/* Threat indicators on map */}
            <div className="relative z-10">
              <GlobeIcon size={64} color="#3B82F6" className="mx-auto mb-4" />
              <h4 className="text-white text-lg font-semibold">Global Threat Map</h4>
              <p className="text-gray-400 text-sm">
                {activities.length} activities from {Object.keys(countryStats).length} locations
              </p>
            </div>

            {/* Simulated threat points */}
            {topCountries.slice(0, 5).map(([country, stats], index) => (
              <div
                key={country}
                className="absolute animate-ping"
                style={{
                  left: `${20 + index * 15}%`,
                  top: `${30 + index * 8}%`,
                }}
              >
                <div className={`w-3 h-3 rounded-full ${
                  stats.highThreat > 0 ? 'bg-red-500' : 
                  stats.count > 5 ? 'bg-yellow-500' : 'bg-green-500'
                }`}></div>
              </div>
            ))}
          </div>

          {/* Country Statistics */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Top Threat Countries */}
            <div className="bg-gray-700 rounded-lg p-4">
              <h5 className="text-white font-semibold mb-3 flex items-center">
                <AlertIcon size={16} className="mr-2" />
                Top Threat Sources
              </h5>
              <div className="space-y-2">
                {topCountries.slice(0, 5).map(([country, stats]) => {
                  // Buscar código ISO2
                  const iso2 = countryNameToISO2[country] || 'UN';
                  const isSelected = selectedCountry === country;
                  return (
                    <div
                      key={country}
                      className={`flex items-center justify-between p-2 bg-gray-800 rounded cursor-pointer transition border ${isSelected ? 'border-blue-400 shadow-lg' : 'border-transparent hover:border-blue-700'}`}
                      onClick={() => setSelectedCountry(isSelected ? null : country)}
                      title={isSelected ? 'Quitar filtro' : `Ver solo eventos de ${country}`}
                    >
                      <div className="flex items-center space-x-2">
                        <div className={`w-2 h-2 rounded-full ${
                          stats.highThreat > 0 ? 'bg-red-500' : 
                          stats.count > 5 ? 'bg-yellow-500' : 'bg-green-500'
                        }`}></div>
                        <FlagSVG code={iso2} size={18} />
                        <span className={`text-sm ${isSelected ? 'text-blue-300 font-bold' : 'text-white'}`}>{country}</span>
                      </div>
                      <div className="text-right">
                        <div className={`text-xs font-medium ${getThreatColor(stats.count, stats.highThreat)}`}>
                          {getThreatLevel(stats.count, stats.highThreat)}
                        </div>
                        <div className="text-gray-400 text-xs">{stats.count} events</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Geographic Summary */}
            <div className="bg-gray-700 rounded-lg p-4">
              <h5 className="text-white font-semibold mb-3 flex items-center">
                <GlobeIcon size={16} className="mr-2" />
                Geographic Summary
              </h5>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-400">Total Locations:</span>
                  <span className="text-white">{Object.keys(countryStats).length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">High Risk Countries:</span>
                  <span className="text-red-400">
                    {Object.values(countryStats).filter(s => s.highThreat > 0).length}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Medium Risk Countries:</span>
                  <span className="text-yellow-400">
                    {Object.values(countryStats).filter(s => s.count > 5 && s.highThreat === 0).length}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Low Risk Countries:</span>
                  <span className="text-green-400">
                    {Object.values(countryStats).filter(s => s.count > 0 && s.count <= 5 && s.highThreat === 0).length}
                  </span>
                </div>
              </div>

              {/* Threat Level Distribution */}
              <div className="mt-4">
                <p className="text-gray-400 text-xs mb-2">Global Threat Level</p>
                <div className="flex space-x-1">
                  <div className="flex-1 h-2 bg-green-500 rounded-l"></div>
                  <div className="flex-1 h-2 bg-yellow-500"></div>
                  <div className="flex-1 h-2 bg-red-500 rounded-r"></div>
                </div>
                <div className="flex justify-between text-xs text-gray-400 mt-1">
                  <span>Low</span>
                  <span>Medium</span>
                  <span>High</span>
                </div>
              </div>
            </div>
          </div>

          {/* Recent Geographic Events */}
          <div className="bg-gray-700 rounded-lg p-4">
            <h5 className="text-white font-semibold mb-3 flex items-center">
              Recent Geographic Events
              {selectedCountry && (
                <button
                  className="ml-3 px-2 py-1 text-xs rounded bg-blue-800 text-white border border-blue-400 hover:bg-blue-700 transition"
                  onClick={() => setSelectedCountry(null)}
                  title="Quitar filtro de país"
                >Quitar filtro</button>
              )}
            </h5>
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {filteredActivities.slice(0, 8).map((activity) => {
                const iso2 = countryNameToISO2[activity.dst_country || 'Unknown'] || 'UN';
                return (
                  <div key={activity.id} className="flex items-center justify-between p-2 bg-gray-800 rounded text-sm">
                    <div className="flex items-center space-x-2">
                      <div className={`w-2 h-2 rounded-full ${
                        activity.status === 'high' ? 'bg-red-500' : 
                        activity.status === 'medium' ? 'bg-yellow-500' : 'bg-green-500'
                      }`}></div>
                      <FlagSVG code={iso2} size={16} />
                      <span className="text-white">{activity.dst_country || 'Unknown'}</span>
                    </div>
                    <div className="text-right">
                      <div className="text-gray-400">{activity.ip_address || 'N/A'}</div>
                      <div className="text-xs text-gray-500">
                        {new Date(activity.timestamp).toLocaleTimeString()}
                      </div>
                    </div>
                  </div>
                );
              })}
              {filteredActivities.length === 0 && (
                <div className="text-gray-400 text-center py-4">No events for this country.</div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default WorldMap;