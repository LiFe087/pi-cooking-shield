// ===================================================================
// DASHBOARD REFACTORIZADO - LIBRE DE CÓDIGO SPAGHETTI 
// Universidad Politécnica de Querétaro - Cybersecurity Monitoring
// ===================================================================

import React, { useState, useMemo, useEffect } from 'react';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, 
  ResponsiveContainer, PieChart, Pie, Cell 
} from 'recharts';

// Importar tipos y hooks unificados
import { SystemStats, Activity } from '../types';
import { useOptimizedHistoricalData } from '../hooks/useOptimizedHistoricalData';
import { 
  AlertIcon, ShieldIcon, NetworkIcon, SpinIcon, DatabaseIcon, ClockIcon,
  ReportIcon, SearchIcon, XIcon
} from './Icons';
import WorldMap from './WorldMap';
import AdvancedSearchBar from './AdvancedSearchBar';

// ===================================================================
// INTERFACES Y TIPOS
// ===================================================================

interface DashboardProps {
  stats: SystemStats;
  activities: Activity[];
  loading?: boolean;
  error?: string | null;
}

// ===================================================================
// UTILIDADES MEJORADAS - COMPONENTES MEMOIZADOS
// ===================================================================

const Toast = React.memo<{ message: string; onClose: () => void }>(({ message, onClose }) => (
  <div className="fixed top-4 right-4 bg-red-600 text-white px-4 py-2 rounded-lg shadow-lg z-[9999] animate-fade-in max-w-sm">
    <div className="flex items-center justify-between">
      <span className="text-sm">{message}</span>
      <button onClick={onClose} className="ml-4 text-white hover:text-gray-200 flex-shrink-0">×</button>
    </div>
  </div>
));

const FlagSVG = React.memo<{ country?: string }>(({ country }) => {
  if (!country || country === 'N/A' || country === 'Local') {
    return <div className="w-4 h-3 bg-gray-600 rounded-sm mr-2"></div>;
  }
  return (
    <img 
      src={`https://flagcdn.com/w20/${country.toLowerCase().slice(0,2)}.png`}
      alt={country}
      className="w-4 h-3 mr-2 rounded-sm"
      onError={(e) => {
        e.currentTarget.style.display = 'none';
      }}
    />
  );
});

const getCountryFlag = (country?: string) => {
  if (!country || country === 'N/A' || country === 'Local') return '🏠';
  const countryMap: Record<string, string> = {
    'United States': '🇺🇸', 'US': '🇺🇸', 'USA': '🇺🇸',
    'China': '🇨🇳', 'CN': '🇨🇳',
    'Russia': '🇷🇺', 'RU': '🇷🇺',
    'Germany': '🇩🇪', 'DE': '🇩🇪',
    'United Kingdom': '🇬🇧', 'UK': '🇬🇧', 'GB': '🇬🇧',
    'France': '🇫🇷', 'FR': '🇫🇷',
    'Japan': '🇯🇵', 'JP': '🇯🇵',
    'India': '🇮🇳', 'IN': '🇮🇳',
    'Mexico': '🇲🇽', 'MX': '🇲🇽',
    'Brazil': '🇧🇷', 'BR': '🇧🇷',
    'Canada': '🇨🇦', 'CA': '🇨🇦'
  };
  return countryMap[country] || '🌍';
};

// ===================================================================
// COMPONENTE DASHBOARD - REFACTORIZADO Y LIMPIO
// ===================================================================

const Dashboard: React.FC<DashboardProps> = ({ stats, activities, loading = false, error = null }) => {
  // Hook optimizado para actividades históricas
  const {
    activities: historicalActivities,
    allActivities,
    loading: historicalLoading,
    error: historicalError,
    currentPage,
    totalPages,
    totalActivities,
    hasNextPage,
    hasPrevPage,
    stats: activityStats,
    statusDistribution,
    goToPage,
    nextPage,
    prevPage,
    refresh: refreshHistorical,
    statusFilter,
    setStatusFilter,
  } = useOptimizedHistoricalData({
    days: 7,
    pageSize: 10,
    autoRefresh: true,
    refreshInterval: 30000
  });

  // Estados locales simplificados
  const [selectedCard, setSelectedCard] = useState<string | null>(null);
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [modalActivity, setModalActivity] = useState<Activity | null>(null);
  const [currentDateRange, setCurrentDateRange] = useState<'live' | 'historical'>('live');
  const [lastUpdateTime, setLastUpdateTime] = useState<Date>(new Date());

  // Auto-dismiss toast
  useEffect(() => {
    if (toastMsg) {
      const timer = setTimeout(() => setToastMsg(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [toastMsg]);

  // Actualizar timestamp cuando llegan nuevas actividades
  useEffect(() => {
    if (activities && activities.length > 0) {
      setLastUpdateTime(new Date());
    }
  }, [activities]);

  // Funciones para la barra de búsqueda
  const onFilteredResults = (filteredResults: Activity[]) => {
    // Esta función maneja los resultados filtrados de la búsqueda
    console.log('Resultados filtrados:', filteredResults.length, 'actividades');
  };

  const onClearFilters = () => {
    // Esta función limpia los filtros aplicados
    console.log('Filtros limpiados');
  };

  // Datos unificados - usar fuente correcta según vista
  const displayActivities = currentDateRange === 'live' ? activities : historicalActivities;
  const displayLoading = currentDateRange === 'live' ? loading : historicalLoading;
  const displayError = currentDateRange === 'live' ? error : historicalError;

  // Threat Trends - usar allActivities para gráficas
  const threatTrendData = useMemo(() => {
    const dataSource = allActivities.length > 0 ? allActivities : activities;
    
    if (!dataSource.length) {
      return [
        { time: '6h ago', threats: 0, normal: 0 },
        { time: '4h ago', threats: 0, normal: 0 },
        { time: '2h ago', threats: 0, normal: 0 },
        { time: 'Now', threats: 0, normal: 0 }
      ];
    }

    const now = new Date();
    const timeBlocks = [
      { label: '6h ago', start: 6, end: 4 },
      { label: '4h ago', start: 4, end: 2 },
      { label: '2h ago', start: 2, end: 0.5 },
      { label: 'Now', start: 0.5, end: 0 }
    ];

    return timeBlocks.map((block) => {
      let threats = 0;
      let normal = 0;

      dataSource.forEach((activity: Activity) => {
        try {
          const activityTime = new Date(activity.timestamp);
          if (!isNaN(activityTime.getTime())) {
            const hoursAgo = (now.getTime() - activityTime.getTime()) / (1000 * 60 * 60);
            
            if (hoursAgo >= block.end && hoursAgo < block.start) {
              if (activity.status === 'high' || activity.status === 'medium') {
                threats++;
              } else {
                normal++;
              }
            }
          }
        } catch (e) {
          // Ignorar errores de parseo
        }
      });

      return { time: block.label, threats, normal };
    });
  }, [allActivities, activities]);

  // Status Distribution - usar datos del hook
  const statusDistributionData = useMemo(() => {
    // Usar las estadísticas del hook si están disponibles
    const distribution = statusDistribution;
    const total = distribution.high + distribution.medium + distribution.low;
    
    if (total === 0) {
      return [
        { name: 'Low', value: 0, color: '#10B981', count: 0 },
        { name: 'Medium', value: 0, color: '#F59E0B', count: 0 },
        { name: 'High', value: 0, color: '#EF4444', count: 0 }
      ];
    }
    
    const result = [];
    if (distribution.low > 0) result.push({ 
      name: 'Low', 
      value: Math.round((distribution.low / total) * 100), 
      color: '#10B981',
      count: distribution.low 
    });
    if (distribution.medium > 0) result.push({ 
      name: 'Medium', 
      value: Math.round((distribution.medium / total) * 100), 
      color: '#F59E0B',
      count: distribution.medium 
    });
    if (distribution.high > 0) result.push({ 
      name: 'High', 
      value: Math.round((distribution.high / total) * 100), 
      color: '#EF4444',
      count: distribution.high 
    });

    // Asegurar que suma 100%
    const sum = result.reduce((acc, item) => acc + item.value, 0);
    if (sum < 100 && result.length > 0) {
      result[0].value += (100 - sum);
    }

    return result;
  }, [statusDistribution]);

  // Nueva gráfica: Tendencia de 7 días usando datos del hook
  const weeklyTrendData = useMemo(() => {
    // Usar estadísticas diarias del hook si están disponibles
    if (activityStats?.daily_stats && activityStats.daily_stats.length > 0) {
      return activityStats.daily_stats.slice(-7).map(stat => ({
        date: new Date(stat.date).toLocaleDateString('es-MX', { weekday: 'short', day: 'numeric' }),
        threats: stat.high_threats + stat.medium_threats,
        normal: stat.low_threats,
        total: stat.total_logs,
        fullDate: stat.date
      }));
    }
    
    // Fallback: generar datos básicos usando allActivities
    const days = [];
    const now = new Date();
    
    for (let i = 6; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      date.setHours(0, 0, 0, 0);
      
      const nextDay = new Date(date);
      nextDay.setDate(nextDay.getDate() + 1);
      
      // Usar allActivities para datos de gráficas
      const dayLogs = allActivities.filter((log: Activity) => {
        const logDate = new Date(log.timestamp);
        return logDate >= date && logDate < nextDay;
      });
      
      const threats = dayLogs.filter((log: Activity) => log.status === 'high' || log.status === 'medium').length;
      const normal = dayLogs.filter((log: Activity) => log.status === 'low').length;
      const total = dayLogs.length;
      
      days.push({
        date: date.toLocaleDateString('es-MX', { weekday: 'short', day: 'numeric' }),
        threats,
        normal,
        total,
        fullDate: date.toISOString().split('T')[0]
      });
    }
    
    return days;
  }, [activityStats, allActivities]);

  // System Metrics - AÑADIDO
  const systemMetrics = useMemo(() => {
    // USAR DATOS REALES DEL BACKEND cuando están disponibles
    const hasRealData = stats.cpu_usage !== undefined || stats.memory_usage !== undefined || stats.disk_usage !== undefined;
    
    if (hasRealData) {
      return [
        { name: 'CPU', value: Math.round(stats.cpu_usage || 0), color: '#3B82F6' },
        { name: 'Memory', value: Math.round(stats.memory_usage || 0), color: '#10B981' },
        { name: 'Disk', value: Math.round(stats.disk_usage || 0), color: '#F59E0B' },
      ];
    }
    
    // MÉTRICAS SIMULADAS SI NO HAY DATOS
    return [
      { name: 'CPU', value: 45, color: '#3B82F6' },
      { name: 'Memory', value: 38, color: '#10B981' },
      { name: 'Disk', value: 25, color: '#F59E0B' },
    ];
  }, [stats]);

  // ===================================================================
  // FUNCIONES UTILITARIAS
  // ===================================================================
  
  // Función formatCDMXDate - AÑADIDA
  const formatCDMXDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleString('es-MX', { 
      timeZone: 'America/Mexico_City',
      hour12: false,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const getNetworkStatusColor = (status: string) => {
    switch (status.toUpperCase()) {
      case 'SECURE': return 'text-green-400';
      case 'WARNING': return 'text-yellow-400';
      case 'ALERT': return 'text-red-400';
      case 'CONNECTING': return 'text-blue-400';
      default: return 'text-gray-400';
    }
  };

  const getNetworkStatusIcon = (status: string) => {
    switch (status.toUpperCase()) {
      case 'SECURE': return <ShieldIcon size={20} color="#10B981" />;
      case 'WARNING': return <AlertIcon size={20} color="#F59E0B" />;
      case 'ALERT': return <AlertIcon size={20} color="#EF4444" />;
      case 'CONNECTING': return <SpinIcon size={20} color="#3B82F6" animate={true} />;
      default: return <NetworkIcon size={20} color="#6B7280" />;
    }
  };

  // Handler functions for AdvancedSearchBar (simplificado)
  const handleSearchFilterResults = (filtered: Activity[]) => {
    console.log('Search filtering:', filtered.length);
  };

  const handleClearSearchFilters = () => {
    setStatusFilter('');
    console.log('Search filters cleared');
  };

  // Datos sincronizados - usar hook para paginación
  const paginatedActivities = displayActivities;

  // Función para obtener el label del rango actual (LIMPIO)
  const getCurrentRangeLabel = () => {
    return currentDateRange === 'live' ? 'Live Feed' : 'Historical Data';
  };

  // Función para obtener estadísticas del período actual (simplificada)
  const getCurrentPeriodStats = () => {
    const currentLogs = displayActivities;
    const totalLogs = currentLogs.length;
    const highRisk = currentLogs.filter(log => log.status === 'high').length;
    const mediumRisk = currentLogs.filter(log => log.status === 'medium').length;
    const lowRisk = currentLogs.filter(log => log.status === 'low').length;
    
    return { totalLogs, highRisk, mediumRisk, lowRisk };
  };

  // Export CSV mejorado con datos del hook
  const exportToCSV = () => {
    const currentLogs = displayActivities;
    const stats = getCurrentPeriodStats();
    
    const rows = [
      // Header con información del período
      [`Security Logs Export - ${getCurrentRangeLabel()}`],
      [`Generated: ${new Date().toLocaleString('es-MX')}`],
      [`Total Logs: ${stats.totalLogs} | High Risk: ${stats.highRisk} | Medium Risk: ${stats.mediumRisk} | Low Risk: ${stats.lowRisk}`],
      [''], // Línea vacía
      // Headers de columnas
      ['ID', 'Message', 'Device', 'Source IP', 'Destination IP', 'Service', 'Action', 'Protocol', 'Destination Country', 'Severity', 'Date/Time'],
      // Datos
      ...currentLogs.map(a => [
        a.id,
        a.message.replace(/\n/g, ' '),
        `${a.device_name || ''} ${a.device_type || ''}`.trim(),
        a.src_ip || '',
        a.dst_ip || '',
        a.service || '',
        a.action || '',
        a.protocol || '',
        a.dst_country || '',
        a.status || '',
        formatCDMXDate(a.timestamp)
      ])
    ];
    
    const csv = rows.map(r => r.map(field => `"${String(field).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `security-logs-${currentDateRange}-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    
    setToastMsg(`Exported ${currentLogs.length} logs from ${getCurrentRangeLabel()}`);
  };

  // ===================================================================
  // RENDER CONDICIONALES
  // ===================================================================

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-center h-64 bg-gray-800 rounded-lg border border-gray-700">
          <div className="text-center">
            <SpinIcon size={40} color="#3B82F6" animate={true} />
            <p className="text-gray-400 mt-4">Loading dashboard data...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div className="bg-red-900/20 border border-red-500 rounded-lg p-6">
          <div className="flex items-center">
            <AlertIcon size={24} color="#EF4444" />
            <h3 className="text-red-400 font-semibold ml-3">Connection Error</h3>
          </div>
          <p className="text-red-300 mt-2">{error}</p>
          <p className="text-gray-400 mt-2 text-sm">
            Please check if the backend service is running on http://192.168.101.4:5000
          </p>
        </div>
      </div>
    );
  }

  // ===================================================================
  // RENDER PRINCIPAL - ORGANIZADO Y LIMPIO
  // ===================================================================
  
  return (
    <div className="space-y-6">
      {toastMsg && <Toast message={toastMsg} onClose={() => setToastMsg(null)} />}
      
      {/* Advanced Search Bar */}
      <AdvancedSearchBar
          allActivities={allActivities}
          onFilteredResultsChange={onFilteredResults}
          onTimeRangeChange={onClearFilters}
      />

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-400">Threats Detected</p>
              <p className="text-2xl font-bold text-red-400">
                {stats.threats_detected || 0}
              </p>
            </div>
            <AlertIcon size={24} color="#EF4444" />
          </div>
        </div>

        <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-400">Network Status</p>
              <p className={`text-sm font-semibold ${getNetworkStatusColor(stats.network_status || 'Unknown')}`}>
                {stats.network_status || 'Unknown'}
              </p>
            </div>
            {getNetworkStatusIcon(stats.network_status || 'Unknown')}
          </div>
        </div>

        <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-400">Logs/Minute</p>
              <p className="text-2xl font-bold text-blue-400">
                {stats.logs_per_minute || 0}
              </p>
            </div>
            <DatabaseIcon size={24} color="#3B82F6" />
          </div>
        </div>

        <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-400">Last Update</p>
              <p className="text-xs text-gray-400">
                {stats.last_update ? formatCDMXDate(stats.last_update) : 'No data'}
              </p>
            </div>
            <ClockIcon size={24} color="#10B981" />
          </div>
        </div>
      </div>

      {/* Charts Section - ENHANCED */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Threat Trends Chart */}
        <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-white">Threat Trends (Last 6 Hours)</h3>
            <div className="text-xs text-gray-400">
              Based on {activityStats ? 'historical data' : 'live data'} • 
              {totalActivities} total logs
            </div>
          </div>
          <div className="h-64">
            {threatTrendData && threatTrendData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart 
                  data={threatTrendData}
                  margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis 
                    dataKey="time" 
                    stroke="#9CA3AF"
                    tick={{ fill: '#9CA3AF' }}
                  />
                  <YAxis 
                    stroke="#9CA3AF"
                    tick={{ fill: '#9CA3AF' }}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#1F2937',
                      border: '1px solid #374151',
                      borderRadius: '8px',
                      color: '#F9FAFB'
                    }}
                    formatter={(value, name) => [
                      `${value} events`,
                      name === 'threats' ? 'High/Medium Risk' : 'Low Risk'
                    ]}
                  />
                  <Legend />
                  <Line 
                    type="monotone" 
                    dataKey="threats" 
                    stroke="#EF4444" 
                    strokeWidth={2} 
                    name="Threats"
                    dot={{ fill: '#EF4444', r: 4 }}
                    activeDot={{ r: 6 }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="normal" 
                    stroke="#10B981" 
                    strokeWidth={2} 
                    name="Normal"
                    dot={{ fill: '#10B981', r: 4 }}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <SpinIcon size={32} color="#6B7280" animate={true} />
                  <p className="text-gray-400 mt-2">No data available</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Status Distribution Chart */}
        <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-white">Threat Distribution (7 Days)</h3>
            <div className="text-xs text-gray-400">
              Total: {statusDistribution.high + statusDistribution.medium + statusDistribution.low} events
            </div>
          </div>
          <div className="h-64">
            {statusDistributionData && statusDistributionData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={statusDistributionData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, value, count }) => count > 0 ? `${name}: ${count} (${value}%)` : ''}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {statusDistributionData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#1F2937',
                      border: '1px solid #374151',
                      borderRadius: '8px',
                      color: '#F9FAFB'
                    }}
                    formatter={(value, name, props) => [
                      `${props.payload.count || 0} events (${value}%)`,
                      `${name} Risk`
                    ]}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <SpinIcon size={32} color="#6B7280" animate={true} />
                  <p className="text-gray-400 mt-2">No data available</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Nueva gráfica: Weekly Trend */}
      <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-white">Weekly Activity Trend</h3>
          <div className="text-xs text-gray-400">
            Last 7 days • {totalActivities} total historical logs
          </div>
        </div>
        <div className="h-64">
          {weeklyTrendData && weeklyTrendData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart 
                data={weeklyTrendData}
                margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis 
                  dataKey="date" 
                  stroke="#9CA3AF"
                  tick={{ fill: '#9CA3AF' }}
                />
                <YAxis 
                  stroke="#9CA3AF"
                  tick={{ fill: '#9CA3AF' }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1F2937',
                    border: '1px solid #374151',
                    borderRadius: '8px',
                    color: '#F9FAFB'
                  }}
                  formatter={(value, name) => [
                    `${value} events`,
                    name === 'threats' ? 'High/Medium Risk' : name === 'normal' ? 'Low Risk' : 'Total'
                  ]}
                  labelFormatter={(label, payload) => {
                    if (payload && payload[0]) {
                      return `${label} (${payload[0].payload.fullDate})`;
                    }
                    return label;
                  }}
                />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="total" 
                  stroke="#3B82F6" 
                  strokeWidth={2} 
                  name="Total Events" 
                  strokeDasharray="5 5"
                  dot={{ fill: '#3B82F6', r: 3 }}
                />
                <Line 
                  type="monotone" 
                  dataKey="threats" 
                  stroke="#EF4444" 
                  strokeWidth={2} 
                  name="Threats"
                  dot={{ fill: '#EF4444', r: 4 }}
                  activeDot={{ r: 6 }}
                />
                <Line 
                  type="monotone" 
                  dataKey="normal" 
                  stroke="#10B981" 
                  strokeWidth={2} 
                  name="Normal"
                  dot={{ fill: '#10B981', r: 4 }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <SpinIcon size={32} color="#6B7280" animate={true} />
                <p className="text-gray-400 mt-2">No historical data available</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* System Metrics */}
      <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
        <h3 className="text-lg font-semibold text-white mb-4">System Metrics</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {systemMetrics.map((metric) => (
            <div key={metric.name} className="text-center">
              <p className="text-sm font-medium text-gray-400 mb-2">{metric.name}</p>
              <div className="relative w-16 h-16 mx-auto">
                <svg className="w-16 h-16 transform -rotate-90" viewBox="0 0 36 36">
                  <path
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeDasharray={`${metric.value}, 100`}
                    className="text-current"
                    style={{ color: metric.color }}
                  />
                  <path
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    className="text-gray-700"
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-sm font-semibold text-white">{metric.value}%</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Geographic Threat Visualization */}
      <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
        <h3 className="text-lg font-semibold text-white mb-4">Geographic Threat Map</h3>
        <WorldMap activities={activities} />
      </div>

      {/* Recent Activities - ENHANCED with Historical Navigation */}
      <div className="bg-gray-800 p-6 rounded-lg border border-gray-700 relative">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h3 className="text-lg font-semibold text-white flex items-center space-x-2">
              <span>Security Activities</span>
              {currentDateRange === 'live' && (
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" title="Live updates"></div>
              )}
              <span className="text-sm bg-gray-700 px-2 py-1 rounded text-gray-300">
                {getCurrentRangeLabel()}
              </span>
            </h3>
            <div className="flex items-center space-x-4 text-sm text-gray-400 mt-1">
              <span>
                {currentDateRange === 'live' 
                  ? `Live security events • Last updated: ${lastUpdateTime.toLocaleTimeString('es-MX')}`
                  : 'Historical security events'
                }
              </span>
              <div className="flex items-center space-x-2">
                {(() => {
                  const stats = getCurrentPeriodStats();
                  return (
                    <>
                      <span className="text-green-400">Low: {stats.lowRisk}</span>
                      <span className="text-yellow-400">Med: {stats.mediumRisk}</span>
                      <span className="text-red-400">High: {stats.highRisk}</span>
                      <span className="text-blue-400">Total: {stats.totalLogs}</span>
                    </>
                  );
                })()}
              </div>
            </div>
          </div>
          
          <div className="flex items-center space-x-3">
            {/* Simple refresh button para datos históricos */}
            <div className="flex items-center space-x-2">
              <button
                onClick={refreshHistorical}
                disabled={historicalLoading}
                className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white px-3 py-1 rounded-lg text-sm flex items-center space-x-1"
              >
                <span>{historicalLoading ? 'Loading...' : 'Refresh'}</span>
              </button>
            </div>

            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-400">Filter:</span>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="bg-gray-700 border border-gray-600 text-white text-sm rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">All Severities</option>
                <option value="low">Low Risk</option>
                <option value="medium">Medium Risk</option>
                <option value="high">High Risk</option>
              </select>
            </div>
            
            <button
              onClick={exportToCSV}
              disabled={historicalLoading}
              className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 disabled:from-gray-600 disabled:to-gray-700 text-white text-sm px-4 py-2 rounded-lg flex items-center space-x-2 transition-all duration-200 shadow-lg hover:shadow-xl"
            >
              <ReportIcon size={16} />
              <span>{historicalLoading ? 'Loading...' : 'Export CSV'}</span>
            </button>
          </div>
        </div>

        {/* Activity Cards - Modern Card Layout */}
        <div className="space-y-3">
          {paginatedActivities.length > 0 ? (
            paginatedActivities.map((activity) => (
              <div 
                key={activity.id} 
                className="bg-gray-700/50 hover:bg-gray-700 border border-gray-600 hover:border-gray-500 rounded-xl p-4 transition-all duration-200 hover:shadow-lg group"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 space-y-3">
                    {/* Header Row */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className={`w-3 h-3 rounded-full animate-pulse ${
                          activity.status === 'high' ? 'bg-red-500' :
                          activity.status === 'medium' ? 'bg-yellow-500' :
                          'bg-green-500'
                        }`}></div>
                        <span className="text-xs text-gray-400 font-mono">
                          {formatCDMXDate(activity.timestamp)}
                        </span>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          activity.status === 'high' ? 'bg-red-900/30 text-red-300 border border-red-800' :
                          activity.status === 'medium' ? 'bg-yellow-900/30 text-yellow-300 border border-yellow-800' :
                          'bg-green-900/30 text-green-300 border border-green-800'
                        }`}>
                          {activity.status === 'high' ? 'HIGH RISK' :
                           activity.status === 'medium' ? 'MEDIUM' :
                           'LOW RISK'}
                        </span>
                      </div>
                      <button
                        onClick={() => setModalActivity(activity)}
                        className="opacity-0 group-hover:opacity-100 bg-blue-600 hover:bg-blue-700 text-white p-2 rounded-lg transition-all duration-200"
                        title="View Details"
                      >
                        <SearchIcon size={14} />
                      </button>
                    </div>

                    {/* Message */}
                    <div className="bg-gray-800/50 rounded-lg p-3 border-l-4 border-l-blue-500">
                      <p className="text-gray-300 text-sm leading-relaxed">
                        {activity.message}
                      </p>
                    </div>

                    {/* Network Info Grid */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
                      <div className="bg-gray-800/30 rounded-lg p-3">
                        <div className="text-gray-400 mb-1">Source IP</div>
                        <div className="text-white font-mono font-medium">
                          {activity.src_ip || 'N/A'}
                        </div>
                      </div>
                      <div className="bg-gray-800/30 rounded-lg p-3">
                        <div className="text-gray-400 mb-1">Destination IP</div>
                        <div className="text-white font-mono font-medium">
                          {activity.dst_ip || 'N/A'}
                        </div>
                      </div>
                      <div className="bg-gray-800/30 rounded-lg p-3">
                        <div className="text-gray-400 mb-1">Country</div>
                        <div className="flex items-center">
                          <FlagSVG country={activity.dst_country} />
                          <span className="text-white font-medium">
                            {activity.dst_country || 'Local'}
                          </span>
                        </div>
                      </div>
                      <div className="bg-gray-800/30 rounded-lg p-3">
                        <div className="text-gray-400 mb-1">Protocol</div>
                        <div className="text-white font-mono font-medium">
                          {activity.protocol || 'N/A'}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-12">
              <NetworkIcon size={48} color="#6B7280" className="mx-auto mb-4" />
              <p className="text-gray-400 text-lg mb-2">No activities found</p>
              <p className="text-gray-500 text-sm">
                {currentDateRange === 'live' 
                  ? 'Waiting for network activity...' 
                  : 'No logs available for this date range'}
              </p>
            </div>
          )}
        </div>

        {/* Pagination Controls - USANDO DATOS DEL HOOK */}
        {totalPages > 1 && (
          <div className="flex justify-between items-center mt-6 border-t border-gray-700 pt-4">
            <div className="text-sm text-gray-400">
              Showing {((currentPage - 1) * 10) + 1} - {Math.min(currentPage * 10, totalActivities)} of {totalActivities} activities
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={prevPage}
                disabled={!hasPrevPage}
                className="px-3 py-1 text-sm bg-gray-700 hover:bg-gray-600 disabled:bg-gray-800 disabled:text-gray-500 text-white rounded-lg transition-colors"
              >
                Previous
              </button>
              <div className="flex items-center space-x-1">
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let pageNum: number;
                  if (totalPages <= 5) {
                    pageNum = i + 1;
                  } else if (currentPage <= 3) {
                    pageNum = i + 1;
                  } else if (currentPage >= totalPages - 2) {
                    pageNum = totalPages - 4 + i;
                  } else {
                    pageNum = currentPage - 2 + i;
                  }
                  
                  return (
                    <button
                      key={pageNum}
                      onClick={() => goToPage(pageNum)}
                      className={`w-8 h-8 text-sm rounded-lg transition-colors ${
                        currentPage === pageNum
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-700 hover:bg-gray-600 text-gray-300'
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                })}
              </div>
              <button
                onClick={nextPage}
                disabled={!hasNextPage}
                className="px-3 py-1 text-sm bg-gray-700 hover:bg-gray-600 disabled:bg-gray-800 disabled:text-gray-500 text-white rounded-lg transition-colors"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Activity Details Modal */}
      {modalActivity && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60 p-4">
          <div className="bg-gray-900 rounded-lg p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto relative border border-gray-700">
            <button 
              className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors"
              onClick={() => setModalActivity(null)}
            >
              <XIcon size={24} />
            </button>
            
            <h3 className="text-xl font-bold text-white mb-6">Activity Details</h3>
            
            <div className="space-y-6">
              {/* Status and Time */}
              <div className="flex items-center justify-between">
                <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                  modalActivity.status === 'high' ? 'bg-red-900/30 text-red-300 border border-red-800' :
                  modalActivity.status === 'medium' ? 'bg-yellow-900/30 text-yellow-300 border border-yellow-800' :
                  'bg-green-900/30 text-green-300 border border-green-800'
                }`}>
                  {modalActivity.status === 'high' ? 'HIGH RISK' :
                   modalActivity.status === 'medium' ? 'MEDIUM' :
                   'LOW RISK'}
                </span>
                <span className="text-gray-400 text-sm">
                  {formatCDMXDate(modalActivity.timestamp)}
                </span>
              </div>

              {/* Message */}
              <div className="bg-gray-800 rounded-lg p-4">
                <h4 className="text-sm font-medium text-gray-400 mb-2">Event Message</h4>
                <p className="text-white">{modalActivity.message}</p>
              </div>

              {/* Network Details Grid */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-800 rounded-lg p-4">
                  <h4 className="text-sm font-medium text-gray-400 mb-3">Source Information</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-500">IP Address:</span>
                      <span className="text-white font-mono">{modalActivity.src_ip || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Port:</span>
                      <span className="text-white font-mono">{modalActivity.src_port || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Country:</span>
                      <span className="text-white">{modalActivity.src_country || 'N/A'}</span>
                    </div>
                  </div>
                </div>

                <div className="bg-gray-800 rounded-lg p-4">
                  <h4 className="text-sm font-medium text-gray-400 mb-3">Destination Information</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-500">IP Address:</span>
                      <span className="text-white font-mono">{modalActivity.dst_ip || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Port:</span>
                      <span className="text-white font-mono">{modalActivity.dst_port || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Country:</span>
                      <span className="text-white flex items-center">
                        <FlagSVG country={modalActivity.dst_country} />
                        {modalActivity.dst_country || 'N/A'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Additional Details */}
              <div className="bg-gray-800 rounded-lg p-4">
                <h4 className="text-sm font-medium text-gray-400 mb-3">Additional Information</h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-gray-500">Protocol:</span>
                      <span className="text-white font-mono">{modalActivity.protocol || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Service:</span>
                      <span className="text-white">{modalActivity.service || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Action:</span>
                      <span className={`font-medium ${
                        modalActivity.action === 'allow' ? 'text-green-400' : 
                        modalActivity.action === 'deny' ? 'text-red-400' : 
                        'text-gray-400'
                      }`}>
                        {modalActivity.action || 'N/A'}
                      </span>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-gray-500">Device:</span>
                      <span className="text-white">{modalActivity.device_name || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Threat Score:</span>
                      <span className="text-white">{modalActivity.threat_score || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Event ID:</span>
                      <span className="text-white font-mono">#{modalActivity.id}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;