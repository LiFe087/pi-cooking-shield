import React, { useState, useEffect } from 'react';

// Interface compatible con tu sistema existente
interface ThreatLocation {
  id: string;
  lat: number;
  lng: number;
  country: string;
  city: string;
  threatType: 'critical' | 'high' | 'medium' | 'low';
  count: number;
  ip: string;
}

// Interface para compatibilidad con tu Activity data
interface Activity {
  id: number;
  message: string;
  threat_score: number;
  status: string;
  alert_level: string;
  timestamp: string;
  source: string;
  ip_address?: string;
  country?: string;
}

interface WorldMapProps {
  threats?: ThreatLocation[];
  activities?: Activity[]; // Compatibilidad con tu data existente
  className?: string;
}

const WorldMap: React.FC<WorldMapProps> = ({ 
  threats = [], 
  activities = [],
  className = "" 
}) => {
  const [animatedThreats, setAnimatedThreats] = useState<ThreatLocation[]>([]);
  const [mapLoaded, setMapLoaded] = useState(false);

  // Convertir tus activities a formato ThreatLocation
  const convertActivitiesToThreats = (activities: Activity[]): ThreatLocation[] => {
    return activities
      .filter(activity => activity.country && activity.ip_address)
      .map((activity, index) => ({
        id: activity.id.toString(),
        lat: getCountryCoordinates(activity.country!).lat,
        lng: getCountryCoordinates(activity.country!).lng,
        country: activity.country!,
        city: activity.country!, // Simplificado para demo
        threatType: activity.status === 'high' ? 'critical' : 
                   activity.status === 'medium' ? 'high' : 'medium' as 'critical' | 'high' | 'medium' | 'low',
        count: Math.floor(activity.threat_score * 100),
        ip: activity.ip_address || '0.0.0.0'
      }));
  };

  // Coordenadas simplificadas de países
  const getCountryCoordinates = (country: string) => {
    const coords: { [key: string]: { lat: number; lng: number } } = {
      'China': { lat: 39.9042, lng: 116.4074 },
      'Russia': { lat: 55.7558, lng: 37.6176 },
      'USA': { lat: 40.7128, lng: -74.0060 },
      'Germany': { lat: 52.5200, lng: 13.4050 },
      'Brazil': { lat: -23.5505, lng: -46.6333 },
      'Japan': { lat: 35.6762, lng: 139.6503 },
      'India': { lat: 28.6139, lng: 77.2090 },
      'UK': { lat: 51.5074, lng: -0.1278 }
    };
    return coords[country] || { lat: 0, lng: 0 };
  };

  // Datos de demo para mostrar actividad global
  const demoThreats: ThreatLocation[] = [
    { id: '1', lat: 39.9042, lng: 116.4074, country: 'China', city: 'Beijing', threatType: 'critical', count: 156, ip: '202.96.134.133' },
    { id: '2', lat: 55.7558, lng: 37.6176, country: 'Russia', city: 'Moscow', threatType: 'high', count: 89, ip: '77.88.55.77' },
    { id: '3', lat: 40.7128, lng: -74.0060, country: 'USA', city: 'New York', threatType: 'medium', count: 67, ip: '8.8.8.8' },
    { id: '4', lat: 51.5074, lng: -0.1278, country: 'UK', city: 'London', threatType: 'low', count: 34, ip: '212.58.244.23' },
    { id: '5', lat: 35.6762, lng: 139.6503, country: 'Japan', city: 'Tokyo', threatType: 'high', count: 78, ip: '202.232.2.133' },
    { id: '6', lat: -23.5505, lng: -46.6333, country: 'Brazil', city: 'São Paulo', threatType: 'medium', count: 45, ip: '200.160.2.3' },
    { id: '7', lat: 28.6139, lng: 77.2090, country: 'India', city: 'New Delhi', threatType: 'critical', count: 134, ip: '117.239.107.108' },
    { id: '8', lat: 52.5200, lng: 13.4050, country: 'Germany', city: 'Berlin', threatType: 'low', count: 23, ip: '217.160.0.112' },
  ];

  // Combinar threats prop con activities convertidas y demo threats
  const realThreats = threats.length > 0 ? threats : convertActivitiesToThreats(activities);
  const allThreats = realThreats.length > 0 ? realThreats : demoThreats;

  useEffect(() => {
    // Simular carga del mapa
    const timer = setTimeout(() => {
      setMapLoaded(true);
      setAnimatedThreats(allThreats);
    }, 1000);

    return () => clearTimeout(timer);
  }, []);

  // Función para convertir coordenadas geográficas a posición SVG
  const coordToSVG = (lat: number, lng: number) => {
    const x = ((lng + 180) / 360) * 800;
    const y = ((90 - lat) / 180) * 400;
    return { x, y };
  };

  // Función para obtener color según el tipo de amenaza
  const getThreatColor = (type: string): string => {
    switch (type) {
      case 'critical': return '#dc2626'; // Rojo intenso
      case 'high': return '#ea580c';     // Naranja
      case 'medium': return '#d97706';   // Amarillo
      case 'low': return '#16a34a';      // Verde
      default: return '#6b7280';         // Gris
    }
  };

  // Función para obtener tamaño del punto según el count
  const getThreatSize = (count: number): number => {
    if (count > 100) return 8;
    if (count > 50) return 6;
    if (count > 20) return 4;
    return 3;
  };

  return (
    <div className={`relative bg-gray-800 rounded-lg border border-gray-700 overflow-hidden ${className}`} style={{ zIndex: 1 }}>
      {/* Header */}
      <div className="p-4 border-b border-gray-700">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-white">
            🌍 Mapa Global de Amenazas
          </h3>
          <div className="flex items-center space-x-4 text-sm">
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
              <span className="text-gray-300">En tiempo real</span>
            </div>
            <span className="text-gray-400">
              {animatedThreats.length} ubicaciones activas
            </span>
          </div>
        </div>
      </div>

      {/* Loading State */}
      {!mapLoaded && (
        <div className="flex items-center justify-center h-96 bg-dark-bg">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyber-blue mx-auto mb-4"></div>
            <p className="text-gray-400">Cargando datos globales...</p>
          </div>
        </div>
      )}

      {/* World Map SVG */}
      {mapLoaded && (
        <div className="relative h-96 bg-gray-900 overflow-hidden" style={{ zIndex: 1 }}>
          <svg
            viewBox="0 0 800 400"
            className="w-full h-full"
            style={{ background: 'linear-gradient(180deg, #1e293b 0%, #0f172a 100%)' }}
          >
            {/* Simplified world map outline */}
            <g fill="none" stroke="#374151" strokeWidth="1" opacity="0.3">
              {/* Continents - Simplified outlines */}
              {/* North America */}
              <path d="M 100 120 Q 150 100 200 120 L 250 140 L 280 180 L 200 200 L 150 180 L 100 160 Z" />
              
              {/* South America */}
              <path d="M 180 220 Q 200 240 220 280 L 240 320 L 200 340 L 180 320 L 160 280 L 170 240 Z" />
              
              {/* Europe */}
              <path d="M 350 100 Q 380 90 420 100 L 450 120 L 430 140 L 400 130 L 370 120 Z" />
              
              {/* Africa */}
              <path d="M 380 150 Q 420 160 440 200 L 450 260 L 420 290 L 390 280 L 370 240 L 375 180 Z" />
              
              {/* Asia */}
              <path d="M 480 80 Q 550 70 620 90 L 680 110 L 720 140 L 700 180 L 650 160 L 580 150 L 520 130 L 480 110 Z" />
              
              {/* Australia */}
              <path d="M 600 280 Q 650 270 680 280 L 700 300 L 680 310 L 640 305 L 610 295 Z" />
            </g>

            {/* Grid lines for professional look */}
            <defs>
              <pattern id="grid" width="40" height="20" patternUnits="userSpaceOnUse">
                <path d="M 40 0 L 0 0 0 20" fill="none" stroke="#1f2937" strokeWidth="0.5" opacity="0.2"/>
              </pattern>
            </defs>
            <rect width="800" height="400" fill="url(#grid)" />

            {/* Threat points */}
            {animatedThreats.map((threat, index) => {
              const pos = coordToSVG(threat.lat, threat.lng);
              const size = getThreatSize(threat.count);
              const color = getThreatColor(threat.threatType);
              
              return (
                <g key={threat.id}>
                  {/* Pulsing circle effect */}
                  <circle
                    cx={pos.x}
                    cy={pos.y}
                    r={size * 2}
                    fill={color}
                    opacity="0.2"
                    className="animate-ping"
                    style={{
                      animationDelay: `${index * 0.3}s`,
                      animationDuration: '2s'
                    }}
                  />
                  
                  {/* Main threat point */}
                  <circle
                    cx={pos.x}
                    cy={pos.y}
                    r={size}
                    fill={color}
                    stroke="#ffffff"
                    strokeWidth="1"
                    className="cursor-pointer hover:scale-125 transition-transform duration-200"
                    style={{
                      filter: 'drop-shadow(0 0 4px rgba(255,255,255,0.3))',
                      animation: `fadeIn 0.8s ease-out ${index * 0.2}s both`
                    }}
                  />
                  
                  {/* Threat count label */}
                  {threat.count > 50 && (
                    <text
                      x={pos.x}
                      y={pos.y - size - 8}
                      textAnchor="middle"
                      className="text-xs fill-white font-semibold"
                      style={{
                        filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.8))',
                        animation: `fadeIn 1s ease-out ${index * 0.2 + 0.5}s both`
                      }}
                    >
                      {threat.count}
                    </text>
                  )}
                </g>
              );
            })}

            {/* Connection lines between major threats */}
            {animatedThreats
              .filter(t => t.threatType === 'critical' || t.threatType === 'high')
              .slice(0, 4)
              .map((threat, index, arr) => {
                if (index === arr.length - 1) return null;
                const start = coordToSVG(threat.lat, threat.lng);
                const end = coordToSVG(arr[index + 1].lat, arr[index + 1].lng);
                
                return (
                  <line
                    key={`connection-${index}`}
                    x1={start.x}
                    y1={start.y}
                    x2={end.x}
                    y2={end.y}
                    stroke="#ef4444"
                    strokeWidth="1"
                    opacity="0.3"
                    strokeDasharray="2,2"
                    className="animate-pulse"
                  />
                );
              })}
          </svg>

          {/* Floating threat info cards */}
          <div className="absolute top-4 right-4 space-y-2" style={{ zIndex: 2, maxWidth: '200px' }}>
            {animatedThreats
              .filter(t => t.threatType === 'critical')
              .slice(0, 2)
              .map((threat, index) => (
                <div
                  key={`info-${threat.id}`}
                  className="bg-red-900 bg-opacity-90 backdrop-blur-sm rounded-lg p-2 border border-red-500 shadow-lg text-xs"
                  style={{
                    animation: `slideIn 0.8s ease-out ${index * 0.3}s both`,
                    zIndex: 3
                  }}
                >
                  <div className="flex items-center space-x-1">
                    <div className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse"></div>
                    <span className="text-red-200 font-semibold text-xs">CRÍTICO</span>
                  </div>
                  <p className="text-white text-xs font-medium">{threat.city}, {threat.country}</p>
                  <p className="text-red-200 text-xs">{threat.count} amenazas</p>
                  <p className="text-gray-300 text-xs font-mono">{threat.ip}</p>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Legend */}
      <div className="p-4 border-t border-gray-700 bg-dark-bg">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-6">
            <span className="text-sm text-gray-400 font-medium">Nivel de Amenaza:</span>
            <div className="flex items-center space-x-4">
              {[
                { type: 'critical', label: 'Crítico', color: '#dc2626' },
                { type: 'high', label: 'Alto', color: '#ea580c' },
                { type: 'medium', label: 'Medio', color: '#d97706' },
                { type: 'low', label: 'Bajo', color: '#16a34a' }
              ].map(({ type, label, color }) => (
                <div key={type} className="flex items-center space-x-2">
                  <div 
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: color }}
                  ></div>
                  <span className="text-xs text-gray-300">{label}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="text-xs text-gray-500">
            Actualizado: {new Date().toLocaleTimeString()}
          </div>
        </div>
      </div>

      {/* CSS Animations usando style normal */}
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: scale(0.8); }
          to { opacity: 1; transform: scale(1); }
        }
        
        @keyframes slideIn {
          from { 
            opacity: 0; 
            transform: translateX(100%);
          }
          to { 
            opacity: 1; 
            transform: translateX(0);
          }
        }
        
        @keyframes pulse {
          0%, 100% { opacity: 0.4; }
          50% { opacity: 0.8; }
        }
      `}</style>
    </div>
  );
};

export default WorldMap;