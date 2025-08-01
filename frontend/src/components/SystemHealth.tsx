// src/components/SystemHealth.tsx - NUEVO: Monitoreo Completo del Sistema
import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area, BarChart, Bar } from 'recharts';
import { 
  CpuIcon, 
  ActivityIcon, 
  AlertIcon, 
  NetworkIcon,
  PulseIcon,
  SpinIcon,
  SettingsIcon,
  SoundOnIcon,
  SoundOffIcon,
  CriticalIcon,
  WarningAlertIcon,
  GlobeIcon,
  RefreshIcon,
  ChartIcon,
  MemoryIcon,
  FireIcon,
  DiskIcon
} from './Icons';

interface SystemMetrics {
  cpu_usage: number;
  memory_usage: number;
  disk_usage: number;
  system_load: number;
  uptime: string;
  temperature: number;
  network_interfaces?: NetworkInterface[];
  process_count?: number;
  boot_time?: string;
  timestamp: string;
  power_performance?: PowerPerformanceStats;
}

interface NetworkInterface {
  name: string;
  bytes_sent: number;
  bytes_recv: number;
  packets_sent: number;
  packets_recv: number;
  is_up: boolean;
}

interface PowerPerformanceStats {
  cpu_frequency?: {
    current: number;
    min: number;
    max: number;
  };
  estimated_power_watts?: number;
  process_count: number;
  top_cpu_processes: Array<{
    name: string;
    cpu_percent: number;
    memory_percent: number;
  }>;
  disk_io?: {
    read_bytes: number;
    write_bytes: number;
    read_count: number;
    write_count: number;
  };
  network_io?: {
    bytes_sent: number;
    bytes_recv: number;
    packets_sent: number;
    packets_recv: number;
  };
  memory_details?: {
    available_gb: number;
    used_gb: number;
    cached_gb: number;
    swap_used_percent: number;
  };
  uptime_hours: number;
  load_average?: {
    '1min': number;
    '5min': number;
    '15min': number;
  };
  cpu_voltage?: number;
  throttling_status?: string;
}

interface HistoricalData {
  timestamp: string;
  cpu: number;
  memory: number;
  disk: number;
  temperature: number;
  load: number;
}

interface SystemHealthProps {
  refreshInterval?: number;
  stats?: any;
  externalLoading?: boolean;
  externalError?: string;
}

// Configuración de umbrales para alertas
interface AlertThresholds {
  cpu: { warning: number; critical: number };
  memory: { warning: number; critical: number };
  disk: { warning: number; critical: number };
  temperature: { warning: number; critical: number };
}

// Interface para alertas
interface Alert {
  id: string;
  type: 'cpu' | 'memory' | 'disk' | 'temperature' | 'network';
  level: 'warning' | 'critical';
  message: string;
  value: number;
  timestamp: Date;
}

// Componente Toast para alertas
const AlertToast: React.FC<{ alert: Alert; onClose: () => void }> = ({ alert, onClose }) => {
  useEffect(() => {
    const timer = setTimeout(onClose, 6000);
    return () => clearTimeout(timer);
  }, [onClose]);

  const bgColor = alert.level === 'critical' ? 'bg-red-700' : 'bg-yellow-700';
  const borderColor = alert.level === 'critical' ? 'border-red-500' : 'border-yellow-500';

  return createPortal(
    <div className={`fixed top-6 right-6 z-50 ${bgColor} ${borderColor} border text-white px-6 py-4 rounded-lg shadow-lg animate-bounce max-w-sm`}>
      <div className="flex items-start">
        <AlertIcon size={20} className="mt-0.5 mr-3 flex-shrink-0" />
        <div className="flex-1">
          <div className="font-bold text-sm flex items-center">
            {alert.level === 'critical' ? (
              <>
                <CriticalIcon size={16} color="#EF4444" className="mr-1" />
                CRÍTICO
              </>
            ) : (
              <>
                <WarningAlertIcon size={16} color="#F59E0B" className="mr-1" />
                ADVERTENCIA
              </>
            )}
          </div>
          <div className="text-sm mt-1">{alert.message}</div>
          <div className="text-xs mt-1 opacity-80">
            {alert.timestamp.toLocaleTimeString()}
          </div>
        </div>
        <button 
          onClick={onClose}
          className="ml-2 text-white hover:text-gray-300 text-lg"
        >
          ×
        </button>
      </div>
    </div>,
    document.body
  );
};

const SystemHealth: React.FC<SystemHealthProps> = ({ 
  refreshInterval = 5000,
  stats,
  externalLoading = false,
  externalError = null
}) => {
  const [metrics, setMetrics] = useState<SystemMetrics | null>(null);
  const [historicalData, setHistoricalData] = useState<HistoricalData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedMetric, setSelectedMetric] = useState<string>('cpu');
  
  // Estados para el sistema de alertas
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [alertHistory, setAlertHistory] = useState<Alert[]>([]);
  const [soundEnabled, setSoundEnabled] = useState(false);
  const [thresholds, setThresholds] = useState<AlertThresholds>({
    cpu: { warning: 75, critical: 85 },
    memory: { warning: 80, critical: 90 },
    disk: { warning: 85, critical: 95 },
    temperature: { warning: 65, critical: 75 }
  });

  // Fetch system health data
  const fetchSystemHealth = async () => {
    try {
      // Usar la URL base dinámica y el endpoint correcto
      const API_BASE_URL = process.env.NODE_ENV === 'development' 
        ? 'http://localhost:5000' 
        : 'http://192.168.101.4:5000';
      
      const response = await fetch(`${API_BASE_URL}/api/system/health`);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: Failed to fetch system health`);
      }
      const data = await response.json();
      
      setMetrics(data);
      
      // Verificar alertas antes de actualizar datos históricos
      checkForAlerts(data);
      
      // Add to historical data (keep last 20 points)
      const newDataPoint: HistoricalData = {
        timestamp: new Date().toLocaleTimeString(),
        cpu: data.cpu_usage || 0,
        memory: data.memory_usage || 0,
        disk: data.disk_usage || 0,
        temperature: data.temperature || 0,
        load: data.system_load || 0
      };
      
      setHistoricalData(prev => {
        const updated = [...prev, newDataPoint];
        return updated.slice(-20); // Keep last 20 points
      });
      
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
      console.error('Failed to fetch system health:', err);
    } finally {
      setLoading(false);
    }
  };

  // Función para verificar y generar alertas
  const checkForAlerts = (data: SystemMetrics) => {
    const newAlerts: Alert[] = [];

    // Verificar CPU
    if (data.cpu_usage >= thresholds.cpu.critical) {
      newAlerts.push({
        id: `cpu-${Date.now()}`,
        type: 'cpu',
        level: 'critical',
        message: `CPU al ${data.cpu_usage.toFixed(1)}% - Sistema sobrecargado`,
        value: data.cpu_usage,
        timestamp: new Date()
      });
    } else if (data.cpu_usage >= thresholds.cpu.warning) {
      newAlerts.push({
        id: `cpu-${Date.now()}`,
        type: 'cpu',
        level: 'warning',
        message: `CPU al ${data.cpu_usage.toFixed(1)}% - Uso elevado`,
        value: data.cpu_usage,
        timestamp: new Date()
      });
    }

    // Verificar Memoria
    if (data.memory_usage >= thresholds.memory.critical) {
      newAlerts.push({
        id: `memory-${Date.now()}`,
        type: 'memory',
        level: 'critical',
        message: `Memoria al ${data.memory_usage.toFixed(1)}% - Crítico`,
        value: data.memory_usage,
        timestamp: new Date()
      });
    } else if (data.memory_usage >= thresholds.memory.warning) {
      newAlerts.push({
        id: `memory-${Date.now()}`,
        type: 'memory',
        level: 'warning',
        message: `Memoria al ${data.memory_usage.toFixed(1)}% - Advertencia`,
        value: data.memory_usage,
        timestamp: new Date()
      });
    }

    // Verificar Disco
    if (data.disk_usage >= thresholds.disk.critical) {
      newAlerts.push({
        id: `disk-${Date.now()}`,
        type: 'disk',
        level: 'critical',
        message: `Disco al ${data.disk_usage.toFixed(1)}% - Espacio crítico`,
        value: data.disk_usage,
        timestamp: new Date()
      });
    } else if (data.disk_usage >= thresholds.disk.warning) {
      newAlerts.push({
        id: `disk-${Date.now()}`,
        type: 'disk',
        level: 'warning',
        message: `Disco al ${data.disk_usage.toFixed(1)}% - Poco espacio`,
        value: data.disk_usage,
        timestamp: new Date()
      });
    }

    // Verificar Temperatura
    if (data.temperature >= thresholds.temperature.critical) {
      newAlerts.push({
        id: `temp-${Date.now()}`,
        type: 'temperature',
        level: 'critical',
        message: `Temperatura ${data.temperature.toFixed(1)}°C - Sobrecalentamiento`,
        value: data.temperature,
        timestamp: new Date()
      });
    } else if (data.temperature >= thresholds.temperature.warning) {
      newAlerts.push({
        id: `temp-${Date.now()}`,
        type: 'temperature',
        level: 'warning',
        message: `Temperatura ${data.temperature.toFixed(1)}°C - Elevada`,
        value: data.temperature,
        timestamp: new Date()
      });
    }

    // Verificar interfaces de red caídas
    if (data.network_interfaces) {
      data.network_interfaces.forEach(iface => {
        if (!iface.is_up && !iface.name.startsWith('lo')) {
          newAlerts.push({
            id: `network-${iface.name}-${Date.now()}`,
            type: 'network',
            level: 'critical',
            message: `Interfaz ${iface.name} desconectada`,
            value: 0,
            timestamp: new Date()
          });
        }
      });
    }

    // Evitar alertas duplicadas recientes (últimos 2 minutos)
    const recentAlerts = alertHistory.filter(alert => 
      Date.now() - alert.timestamp.getTime() < 120000
    );
    
    const filteredNewAlerts = newAlerts.filter(newAlert => 
      !recentAlerts.some(recent => 
        recent.type === newAlert.type && recent.level === newAlert.level
      )
    );

    if (filteredNewAlerts.length > 0) {
      setAlerts(prev => [...prev, ...filteredNewAlerts]);
      setAlertHistory(prev => [...prev, ...filteredNewAlerts].slice(-50)); // Mantener últimas 50

      // Reproducir sonido si está habilitado
      if (soundEnabled && filteredNewAlerts.some(alert => alert.level === 'critical')) {
        playAlertSound();
      }
    }
  };

  // Reproducir sonido de alerta
  const playAlertSound = () => {
    try {
      const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+j2r2IRBTyV3O/ENRwJl1jJnr5g5jIUP0JntG1VJgVQ9Ig7GXVDJgV8yK2sLILO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJL'); 
      audio.play().catch(() => {}); // Ignorar errores de permisos
    } catch (error) {
      console.warn('No se pudo reproducir el sonido de alerta');
    }
  };

  // Eliminar alerta
  const dismissAlert = (alertId: string) => {
    setAlerts(prev => prev.filter(alert => alert.id !== alertId));
  };

  // Actualizar umbrales de alerta
  const updateThreshold = (metric: keyof AlertThresholds, level: 'warning' | 'critical', value: number) => {
    setThresholds(prev => ({
      ...prev,
      [metric]: {
        ...prev[metric],
        [level]: value
      }
    }));
  };

  useEffect(() => {
    // Initial fetch
    fetchSystemHealth();
    
    // Set up interval
    const interval = setInterval(fetchSystemHealth, refreshInterval);
    
    return () => clearInterval(interval);
  }, [refreshInterval]);

  // Helper functions
  const formatUptime = (uptime: string) => {
    if (!uptime || uptime === 'Unknown') return 'Unknown';
    return uptime;
  };

  const getHealthStatus = () => {
    if (!metrics) return { status: 'unknown', color: 'gray' };
    
    const avgUsage = (metrics.cpu_usage + metrics.memory_usage + metrics.disk_usage) / 3;
    
    if (avgUsage > 80) return { status: 'critical', color: 'red' };
    if (avgUsage > 60) return { status: 'warning', color: 'yellow' };
    return { status: 'healthy', color: 'green' };
  };

  const getUsageColor = (value: number) => {
    if (value > 80) return 'text-red-400';
    if (value > 60) return 'text-yellow-400';
    return 'text-green-400';
  };

  const getUsageBarColor = (value: number) => {
    if (value > 80) return '#EF4444';
    if (value > 60) return '#F59E0B';
    return '#10B981';
  };

  if (loading && !metrics) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-center h-64 bg-gray-800 rounded-lg border border-gray-700">
          <div className="text-center">
            <SpinIcon size={40} color="#3B82F6" animate={true} />
            <p className="text-gray-400 mt-4">Loading system health data...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error && !metrics) {
    return (
      <div className="space-y-6">
        <div className="bg-red-900/20 border border-red-500 rounded-lg p-6">
          <div className="flex items-center">
            <AlertIcon size={24} color="#EF4444" />
            <h3 className="text-red-400 font-semibold ml-3">System Health Error</h3>
          </div>
          <p className="text-red-300 mt-2">{error}</p>
          <p className="text-gray-400 mt-2 text-sm">
            Please ensure the backend service has system monitoring enabled.
          </p>
        </div>
      </div>
    );
  }

  const healthStatus = getHealthStatus();

  return (
    <div className="space-y-6">
      {/* Overall System Health Status */}
      <div className={`bg-gray-800 p-6 rounded-lg border border-gray-700`}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-white">System Health Monitor</h2>
          <div className="flex items-center space-x-4">
            {/* Toggle de sonido */}
            <button
              onClick={() => setSoundEnabled(!soundEnabled)}
              className={`px-3 py-1 rounded text-xs border transition flex items-center ${
                soundEnabled 
                  ? 'bg-blue-800 text-white border-blue-400' 
                  : 'bg-gray-700 text-gray-300 border-gray-600'
              }`}
              title={soundEnabled ? 'Desactivar sonido' : 'Activar sonido'}
            >
              {soundEnabled ? (
                <SoundOnIcon size={14} className="mr-1" />
              ) : (
                <SoundOffIcon size={14} className="mr-1" />
              )}
              {soundEnabled ? 'ON' : 'OFF'}
            </button>
            <div className="flex items-center">
              <PulseIcon 
                size={12} 
                color={healthStatus.color === 'red' ? '#EF4444' : healthStatus.color === 'yellow' ? '#F59E0B' : '#10B981'} 
                animate={true} 
              />
              <span className={`ml-2 text-sm font-medium ${
                healthStatus.color === 'red' ? 'text-red-400' : 
                healthStatus.color === 'yellow' ? 'text-yellow-400' : 'text-green-400'
              }`}>
                {healthStatus.status.toUpperCase()}
              </span>
            </div>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-yellow-900/20 border border-yellow-500 rounded-lg">
            <p className="text-yellow-400 text-sm flex items-center">
              <WarningAlertIcon size={16} className="mr-2" />
              {error}
            </p>
          </div>
        )}

        {/* Historial de alertas recientes */}
        {alertHistory.length > 0 && (
          <div className="mb-4 p-3 bg-gray-700 rounded-lg">
            <h4 className="text-white text-sm font-medium mb-2">Alertas Recientes:</h4>
            <div className="space-y-1 max-h-20 overflow-y-auto">
              {alertHistory.slice(-3).reverse().map(alert => (
                <div key={alert.id} className="text-xs text-gray-300 flex items-center">
                  <span className={`w-2 h-2 rounded-full mr-2 ${
                    alert.level === 'critical' ? 'bg-red-500' : 'bg-yellow-500'
                  }`}></span>
                  {alert.timestamp.toLocaleTimeString()} - {alert.message}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Real-time Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* CPU Usage */}
        <div 
          className={`bg-gray-800 p-6 rounded-lg border transition-all duration-200 cursor-pointer ${
            selectedMetric === 'cpu' 
              ? 'border-blue-500 shadow-lg shadow-blue-500/20' 
              : 'border-gray-700 hover:border-blue-400'
          }`}
          onClick={() => setSelectedMetric('cpu')}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm">CPU Usage</p>
              <p className={`text-2xl font-bold ${getUsageColor(metrics?.cpu_usage || 0)}`}>
                {metrics?.cpu_usage ? `${metrics.cpu_usage.toFixed(1)}%` : 'N/A'}
              </p>
            </div>
            <div className="text-blue-400">
              <CpuIcon size={32} />
            </div>
          </div>
          {metrics?.cpu_usage !== undefined && (
            <div className="mt-3">
              <div className="w-full bg-gray-700 rounded-full h-2">
                <div 
                  className="h-2 rounded-full transition-all duration-300"
                  style={{ 
                    width: `${Math.min(metrics.cpu_usage, 100)}%`,
                    backgroundColor: getUsageBarColor(metrics.cpu_usage)
                  }}
                ></div>
              </div>
            </div>
          )}
        </div>

        {/* Memory Usage */}
        <div 
          className={`bg-gray-800 p-6 rounded-lg border transition-all duration-200 cursor-pointer ${
            selectedMetric === 'memory' 
              ? 'border-green-500 shadow-lg shadow-green-500/20' 
              : 'border-gray-700 hover:border-green-400'
          }`}
          onClick={() => setSelectedMetric('memory')}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm">Memory Usage</p>
              <p className={`text-2xl font-bold ${getUsageColor(metrics?.memory_usage || 0)}`}>
                {metrics?.memory_usage ? `${metrics.memory_usage.toFixed(1)}%` : 'N/A'}
              </p>
            </div>
            <div className="text-green-400">
              <ActivityIcon size={32} />
            </div>
          </div>
          {metrics?.memory_usage !== undefined && (
            <div className="mt-3">
              <div className="w-full bg-gray-700 rounded-full h-2">
                <div 
                  className="h-2 rounded-full transition-all duration-300"
                  style={{ 
                    width: `${Math.min(metrics.memory_usage, 100)}%`,
                    backgroundColor: getUsageBarColor(metrics.memory_usage)
                  }}
                ></div>
              </div>
            </div>
          )}
        </div>

        {/* Disk Usage */}
        <div 
          className={`bg-gray-800 p-6 rounded-lg border transition-all duration-200 cursor-pointer ${
            selectedMetric === 'disk' 
              ? 'border-yellow-500 shadow-lg shadow-yellow-500/20' 
              : 'border-gray-700 hover:border-yellow-400'
          }`}
          onClick={() => setSelectedMetric('disk')}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm">Disk Usage</p>
              <p className={`text-2xl font-bold ${getUsageColor(metrics?.disk_usage || 0)}`}>
                {metrics?.disk_usage ? `${metrics.disk_usage.toFixed(1)}%` : 'N/A'}
              </p>
            </div>
            <div className="text-yellow-400">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
                <rect x="3" y="4" width="18" height="16" rx="2" stroke="currentColor" strokeWidth="2"/>
                <path d="M7 8h10M7 12h6" stroke="currentColor" strokeWidth="2"/>
              </svg>
            </div>
          </div>
          {metrics?.disk_usage !== undefined && (
            <div className="mt-3">
              <div className="w-full bg-gray-700 rounded-full h-2">
                <div 
                  className="h-2 rounded-full transition-all duration-300"
                  style={{ 
                    width: `${Math.min(metrics.disk_usage, 100)}%`,
                    backgroundColor: getUsageBarColor(metrics.disk_usage)
                  }}
                ></div>
              </div>
            </div>
          )}
        </div>

        {/* Temperature */}
        <div 
          className={`bg-gray-800 p-6 rounded-lg border transition-all duration-200 cursor-pointer ${
            selectedMetric === 'temperature' 
              ? 'border-red-500 shadow-lg shadow-red-500/20' 
              : 'border-gray-700 hover:border-red-400'
          }`}
          onClick={() => setSelectedMetric('temperature')}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm">Temperature</p>
              <p className={`text-2xl font-bold ${
                (metrics?.temperature || 0) > 70 ? 'text-red-400' : 
                (metrics?.temperature || 0) > 60 ? 'text-yellow-400' : 'text-green-400'
              }`}>
                {metrics?.temperature ? `${metrics.temperature.toFixed(1)}°C` : 'N/A'}
              </p>
            </div>
            <div className="text-red-400">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
                <path d="M14 14.76V3.5a2.5 2.5 0 0 0-5 0v11.26a4.5 4.5 0 1 0 5 0Z" stroke="currentColor" strokeWidth="2"/>
              </svg>
            </div>
          </div>
          {metrics?.temperature !== undefined && (
            <div className="mt-3">
              <div className="w-full bg-gray-700 rounded-full h-2">
                <div 
                  className="h-2 rounded-full transition-all duration-300"
                  style={{ 
                    width: `${Math.min((metrics.temperature / 100) * 100, 100)}%`,
                    backgroundColor: (metrics.temperature > 70) ? '#EF4444' : (metrics.temperature > 60) ? '#F59E0B' : '#10B981'
                  }}
                ></div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Historical Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Resource Usage Trends */}
        <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
          <h3 className="text-lg font-semibold text-white mb-4">Resource Usage Trends</h3>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={historicalData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis dataKey="timestamp" stroke="#9CA3AF" />
              <YAxis stroke="#9CA3AF" domain={[0, 100]} />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: '#1F2937', 
                  border: '1px solid #374151',
                  borderRadius: '8px'
                }}
                formatter={(value) => [`${Number(value).toFixed(1)}%`, '']}
              />
              <Area type="monotone" dataKey="cpu" stackId="1" stroke="#3B82F6" fill="#3B82F6" fillOpacity={0.3} />
              <Area type="monotone" dataKey="memory" stackId="2" stroke="#10B981" fill="#10B981" fillOpacity={0.3} />
              <Area type="monotone" dataKey="disk" stackId="3" stroke="#F59E0B" fill="#F59E0B" fillOpacity={0.3} />
            </AreaChart>
          </ResponsiveContainer>
          <div className="mt-4 flex justify-center space-x-6">
            <div className="flex items-center">
              <div className="w-3 h-3 bg-blue-500 rounded-full mr-2"></div>
              <span className="text-gray-400 text-sm">CPU</span>
            </div>
            <div className="flex items-center">
              <div className="w-3 h-3 bg-green-500 rounded-full mr-2"></div>
              <span className="text-gray-400 text-sm">Memory</span>
            </div>
            <div className="flex items-center">
              <div className="w-3 h-3 bg-yellow-500 rounded-full mr-2"></div>
              <span className="text-gray-400 text-sm">Disk</span>
            </div>
          </div>
        </div>

        {/* System Load & Temperature */}
        <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
          <h3 className="text-lg font-semibold text-white mb-4">System Load & Temperature</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={historicalData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis dataKey="timestamp" stroke="#9CA3AF" />
              <YAxis yAxisId="load" stroke="#9CA3AF" domain={[0, 'dataMax']} />
              <YAxis yAxisId="temp" orientation="right" stroke="#EF4444" domain={[0, 100]} />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: '#1F2937', 
                  border: '1px solid #374151',
                  borderRadius: '8px'
                }}
              />
              <Line 
                yAxisId="load" 
                type="monotone" 
                dataKey="load" 
                stroke="#8B5CF6" 
                strokeWidth={2}
                dot={false}
              />
              <Line 
                yAxisId="temp" 
                type="monotone" 
                dataKey="temperature" 
                stroke="#EF4444" 
                strokeWidth={2}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
          <div className="mt-4 flex justify-center space-x-6">
            <div className="flex items-center">
              <div className="w-3 h-3 bg-purple-500 rounded-full mr-2"></div>
              <span className="text-gray-400 text-sm">Load Average</span>
            </div>
            <div className="flex items-center">
              <div className="w-3 h-3 bg-red-500 rounded-full mr-2"></div>
              <span className="text-gray-400 text-sm">Temperature (°C)</span>
            </div>
          </div>
        </div>
      </div>

      {/* System Information */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* System Details */}
        <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
          <h3 className="text-lg font-semibold text-white mb-4">System Information</h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-gray-400">Uptime</span>
              <span className="text-white">{formatUptime(metrics?.uptime || 'Unknown')}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-400">System Load</span>
              <span className="text-white">{metrics?.system_load?.toFixed(2) || 'N/A'}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-400">Process Count</span>
              <span className="text-white">{metrics?.process_count || 'N/A'}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-400">Boot Time</span>
              <span className="text-white">
                {metrics?.boot_time ? new Date(metrics.boot_time).toLocaleString() : 'N/A'}
              </span>
            </div>
          </div>
        </div>

        {/* Network Interfaces */}
        <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
          <h3 className="text-lg font-semibold text-white mb-4">Network Interfaces</h3>
          {metrics?.network_interfaces && metrics.network_interfaces.length > 0 ? (
            <div className="space-y-3">
              {metrics.network_interfaces.map((iface, index) => (
                <div key={index} className="p-3 bg-gray-700 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-white font-medium">{iface.name}</span>
                    <span className={`px-2 py-1 rounded text-xs ${
                      iface.is_up ? 'bg-green-900 text-green-300' : 'bg-red-900 text-red-300'
                    }`}>
                      {iface.is_up ? 'UP' : 'DOWN'}
                    </span>
                  </div>
                  <div className="text-sm text-gray-400 space-y-1">
                    <div>Sent: {(iface.bytes_sent / 1024 / 1024).toFixed(2)} MB</div>
                    <div>Received: {(iface.bytes_recv / 1024 / 1024).toFixed(2)} MB</div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-4">
              <NetworkIcon size={48} color="#6B7280" className="mx-auto mb-4" />
              <p className="text-gray-400">No network interface data available</p>
            </div>
          )}
        </div>
      </div>

      {/* Power & Performance Statistics */}
      {metrics?.power_performance && (
        <div className="space-y-6">
          {/* Power Consumption & CPU Frequency */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
              <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
                ⚡ Power Consumption
              </h3>
              <div className="space-y-3">
                {metrics.power_performance.estimated_power_watts && (
                  <div className="flex justify-between items-center">
                    <span className="text-gray-400">Estimated Power</span>
                    <span className="text-green-400 font-bold">
                      {metrics.power_performance.estimated_power_watts} W
                    </span>
                  </div>
                )}
                {metrics.power_performance.cpu_voltage && (
                  <div className="flex justify-between items-center">
                    <span className="text-gray-400">CPU Voltage</span>
                    <span className="text-yellow-400">
                      {metrics.power_performance.cpu_voltage} V
                    </span>
                  </div>
                )}
                {metrics.power_performance.throttling_status && (
                  <div className="flex justify-between items-center">
                    <span className="text-gray-400">Throttling</span>
                    <span className={`text-xs px-2 py-1 rounded ${
                      metrics.power_performance.throttling_status === 'throttled=0x0' 
                        ? 'bg-green-900 text-green-300' 
                        : 'bg-red-900 text-red-300'
                    }`}>
                      {metrics.power_performance.throttling_status === 'throttled=0x0' ? 'Normal' : 'Throttled'}
                    </span>
                  </div>
                )}
              </div>
            </div>

            <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
              <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
                <RefreshIcon size={20} color="#10B981" className="mr-2" />
                CPU Frequency
              </h3>
              {metrics.power_performance.cpu_frequency ? (
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-400">Current</span>
                    <span className="text-blue-400 font-bold">
                      {metrics.power_performance.cpu_frequency.current} MHz
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-400">Min</span>
                    <span className="text-gray-300">
                      {metrics.power_performance.cpu_frequency.min} MHz
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-400">Max</span>
                    <span className="text-gray-300">
                      {metrics.power_performance.cpu_frequency.max} MHz
                    </span>
                  </div>
                  <div className="mt-4">
                    <div className="bg-gray-700 rounded-full h-2">
                      <div 
                        className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                        style={{
                          width: `${(metrics.power_performance.cpu_frequency.current / metrics.power_performance.cpu_frequency.max) * 100}%`
                        }}
                      ></div>
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-gray-400">Frequency data not available</p>
              )}
            </div>

            <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
              <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
                <ChartIcon size={20} color="#10B981" className="mr-2" />
                System Load
              </h3>
              {metrics.power_performance.load_average ? (
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-400">1 min</span>
                    <span className="text-purple-400">
                      {metrics.power_performance.load_average['1min']}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-400">5 min</span>
                    <span className="text-purple-400">
                      {metrics.power_performance.load_average['5min']}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-400">15 min</span>
                    <span className="text-purple-400">
                      {metrics.power_performance.load_average['15min']}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-400">Uptime</span>
                    <span className="text-green-400">
                      {metrics.power_performance.uptime_hours.toFixed(1)} hrs
                    </span>
                  </div>
                </div>
              ) : (
                <p className="text-gray-400">Load data not available</p>
              )}
            </div>
          </div>

          {/* Memory Details & Top Processes */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
              <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
                <MemoryIcon size={20} color="#10B981" className="mr-2" />
                Memory Details
              </h3>
              {metrics.power_performance.memory_details ? (
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-400">Available</span>
                    <span className="text-green-400">
                      {metrics.power_performance.memory_details.available_gb} GB
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-400">Used</span>
                    <span className="text-orange-400">
                      {metrics.power_performance.memory_details.used_gb} GB
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-400">Cached</span>
                    <span className="text-blue-400">
                      {metrics.power_performance.memory_details.cached_gb} GB
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-400">Swap Used</span>
                    <span className={`${
                      metrics.power_performance.memory_details.swap_used_percent > 50 
                        ? 'text-red-400' : 'text-gray-300'
                    }`}>
                      {metrics.power_performance.memory_details.swap_used_percent}%
                    </span>
                  </div>
                </div>
              ) : (
                <p className="text-gray-400">Memory details not available</p>
              )}
            </div>

            <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
              <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
                <FireIcon size={20} color="#10B981" className="mr-2" />
                Top CPU Processes
              </h3>
              {metrics.power_performance.top_cpu_processes && metrics.power_performance.top_cpu_processes.length > 0 ? (
                <div className="space-y-2">
                  {metrics.power_performance.top_cpu_processes.map((proc, index) => (
                    <div key={index} className="bg-gray-700 p-3 rounded">
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-white text-sm font-medium">{proc.name}</span>
                        <span className="text-red-400 text-sm font-bold">
                          {proc.cpu_percent}%
                        </span>
                      </div>
                      <div className="text-xs text-gray-400">
                        Memory: {proc.memory_percent.toFixed(1)}%
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-400">Process data not available</p>
              )}
            </div>
          </div>

          {/* I/O Statistics */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
              <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
                <DiskIcon size={20} color="#10B981" className="mr-2" />
                Disk I/O
              </h3>
              {metrics.power_performance.disk_io ? (
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-400">Read</span>
                    <span className="text-blue-400">
                      {(metrics.power_performance.disk_io.read_bytes / 1024 / 1024 / 1024).toFixed(2)} GB
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-400">Written</span>
                    <span className="text-green-400">
                      {(metrics.power_performance.disk_io.write_bytes / 1024 / 1024 / 1024).toFixed(2)} GB
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-400">Read Ops</span>
                    <span className="text-gray-300">
                      {metrics.power_performance.disk_io.read_count.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-400">Write Ops</span>
                    <span className="text-gray-300">
                      {metrics.power_performance.disk_io.write_count.toLocaleString()}
                    </span>
                  </div>
                </div>
              ) : (
                <p className="text-gray-400">Disk I/O data not available</p>
              )}
            </div>

            <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
              <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
                <GlobeIcon size={20} color="#10B981" className="mr-2" />
                Network I/O
              </h3>
              {metrics.power_performance.network_io ? (
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-400">Sent</span>
                    <span className="text-blue-400">
                      {(metrics.power_performance.network_io.bytes_sent / 1024 / 1024 / 1024).toFixed(2)} GB
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-400">Received</span>
                    <span className="text-green-400">
                      {(metrics.power_performance.network_io.bytes_recv / 1024 / 1024 / 1024).toFixed(2)} GB
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-400">Packets Sent</span>
                    <span className="text-gray-300">
                      {metrics.power_performance.network_io.packets_sent.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-400">Packets Recv</span>
                    <span className="text-gray-300">
                      {metrics.power_performance.network_io.packets_recv.toLocaleString()}
                    </span>
                  </div>
                </div>
              ) : (
                <p className="text-gray-400">Network I/O data not available</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Configuración de Alertas */}
      <div className="bg-gray-900 p-4 rounded-lg border border-gray-700">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-white font-medium flex items-center">
            <SettingsIcon size={20} color="#10B981" className="mr-2" />
            Alert Configuration
          </h3>
          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className={`flex items-center px-3 py-1 rounded text-sm ${
              soundEnabled ? 'bg-green-900 text-green-300' : 'bg-gray-700 text-gray-400'
            }`}
          >
            {soundEnabled ? (
              <SoundOnIcon size={16} className="mr-1" />
            ) : (
              <SoundOffIcon size={16} className="mr-1" />
            )}
            Sound {soundEnabled ? 'ON' : 'OFF'}
          </button>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* CPU Thresholds */}
          <div className="space-y-2">
            <label className="text-gray-400 text-sm">CPU Thresholds (%)</label>
            <div className="flex space-x-2">
              <input
                type="number"
                placeholder="Warning"
                value={thresholds.cpu.warning}
                onChange={(e) => updateThreshold('cpu', 'warning', Number(e.target.value))}
                className="flex-1 bg-gray-800 border border-gray-600 rounded px-2 py-1 text-white text-sm"
                min="0"
                max="100"
              />
              <input
                type="number"
                placeholder="Critical"
                value={thresholds.cpu.critical}
                onChange={(e) => updateThreshold('cpu', 'critical', Number(e.target.value))}
                className="flex-1 bg-gray-800 border border-gray-600 rounded px-2 py-1 text-white text-sm"
                min="0"
                max="100"
              />
            </div>
          </div>

          {/* Memory Thresholds */}
          <div className="space-y-2">
            <label className="text-gray-400 text-sm">Memory Thresholds (%)</label>
            <div className="flex space-x-2">
              <input
                type="number"
                placeholder="Warning"
                value={thresholds.memory.warning}
                onChange={(e) => updateThreshold('memory', 'warning', Number(e.target.value))}
                className="flex-1 bg-gray-800 border border-gray-600 rounded px-2 py-1 text-white text-sm"
                min="0"
                max="100"
              />
              <input
                type="number"
                placeholder="Critical"
                value={thresholds.memory.critical}
                onChange={(e) => updateThreshold('memory', 'critical', Number(e.target.value))}
                className="flex-1 bg-gray-800 border border-gray-600 rounded px-2 py-1 text-white text-sm"
                min="0"
                max="100"
              />
            </div>
          </div>
        </div>

        {/* Recent Alerts History */}
        {alertHistory.length > 0 && (
          <div className="mt-4 pt-4 border-t border-gray-700">
            <h4 className="text-gray-400 text-sm mb-2">Recent Alerts ({alertHistory.slice(-5).length})</h4>
            <div className="space-y-1 max-h-24 overflow-y-auto">
              {alertHistory.slice(-5).map((alert, index) => (
                <div key={index} className="text-xs text-gray-500 flex justify-between">
                  <span className={alert.level === 'critical' ? 'text-red-400' : 'text-yellow-400'}>
                    {alert.message}
                  </span>
                  <span>{alert.timestamp.toLocaleTimeString()}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Last Update */}
      <div className="bg-gray-900 p-4 rounded-lg border border-gray-700">
        <div className="flex items-center justify-between">
          <span className="text-gray-400 text-sm">
            Last updated: {metrics?.timestamp ? new Date(metrics.timestamp).toLocaleString() : 'Never'}
          </span>
          <div className="flex items-center">
            <PulseIcon size={8} color="#10B981" animate={true} />
            <span className="text-green-400 text-sm ml-2">
              Refreshing every {refreshInterval / 1000}s
            </span>
          </div>
        </div>
      </div>

      {/* Renderizar alertas activas */}
      {alerts.map(alert => (
        <AlertToast 
          key={alert.id} 
          alert={alert} 
          onClose={() => dismissAlert(alert.id)} 
        />
      ))}
    </div>
  );
};

export default SystemHealth;