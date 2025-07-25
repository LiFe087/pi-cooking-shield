// src/components/Dashboard.tsx - UPDATED: Real Backend Integration
import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts';
import AdvancedSearchBar from './AdvancedSearchBar';
import WorldMap from './WorldMap';
import { 
  AlertIcon, 
  ShieldIcon, 
  ActivityIcon, 
  CpuIcon, 
  NetworkIcon,
  PulseIcon,
  SpinIcon 
} from './Icons';

// Toast Notification Component
const Toast: React.FC<{ message: string; onClose: () => void }> = ({ message, onClose }) => {
  useEffect(() => {
    const timer = setTimeout(onClose, 4000);
    return () => clearTimeout(timer);
  }, [onClose]);
  return createPortal(
    <div className="fixed top-6 right-6 z-50 bg-red-700 text-white px-6 py-3 rounded shadow-lg animate-bounce">
      <span className="font-bold">¡Alerta!</span> {message}
    </div>,
    document.body
  );
};

// Interfaces definidas aquí
interface SystemStats {
  threats_detected: number;
  network_status: string;
  logs_per_minute: number;
  last_update: string;
  cpu_usage?: number;
  memory_usage?: number;
  disk_usage?: number;
  logs_processed?: number;
  system_load?: number;
  uptime?: string;
  temperature?: number;
}

interface Activity {
  id: number;
  message: string;
  timestamp: string;
  source: string;
  
  // Campos de amenaza
  threat_score: number;
  status: string;
  alert_level: string;
  
  // Información de dispositivo origen
  device_name?: string;
  device_type?: string;
  os_name?: string;
  device_category?: string;
  src_mac?: string;
  
  // IPs y países
  src_ip?: string;
  dst_ip?: string;
  src_country?: string;
  dst_country?: string;
  
  // Puertos y servicio
  src_port?: string;
  dst_port?: string;
  service?: string;
  
  // Protocolo y acción
  protocol?: string;
  action?: string;
  
  // Interfaces y política
  src_interface?: string;
  dst_interface?: string;
  src_interface_role?: string;
  dst_interface_role?: string;
  policy_id?: string;
  policy_type?: string;
  
  // Estadísticas de tráfico
  bytes_sent?: string;
  bytes_received?: string;
  packets_sent?: string;
  packets_received?: string;
  session_duration?: string;
  translation_type?: string;
}

interface SearchFilter {
  field: string;
  operator: string;
  value: string;
}

interface DashboardProps {
  stats: SystemStats;
  activities: Activity[];
  loading?: boolean;
  error?: string;
}

interface SearchFilter {
  field: string;
  operator: string;
  value: string;
}

const Dashboard: React.FC<DashboardProps> = ({ stats, activities, loading = false, error = null }) => {
  const [filteredActivities, setFilteredActivities] = useState<Activity[]>(activities);
  const [searchQuery, setSearchQuery] = useState('');
  const [timeRange, setTimeRange] = useState('24h');
  const [selectedCard, setSelectedCard] = useState<string | null>(null);
  const [filters, setFilters] = useState<SearchFilter[]>([]);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  // Estado para actividades recientes en tiempo real
  const [liveActivities, setLiveActivities] = useState<Activity[]>(activities.slice(0, 5));
  // Fallback para saber si ya se intentó fetch
  const [fetchTried, setFetchTried] = useState(false);
  // Estado para notificaciones toast
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  // Estado para modal de detalles
  const [modalActivity, setModalActivity] = useState<Activity | null>(null);
  // Estado para filtro rápido de severidad
  const [severityFilter, setSeverityFilter] = useState<string>('');
  // Estado para paginación
  const [page, setPage] = useState(1);
  const pageSize = 5;
  // Estado para WebSocket
  const [wsConnected, setWsConnected] = useState(false);

  // WebSocket para actividades recientes (con fallback a polling)
  useEffect(() => {
    let lastHighId = liveActivities.length > 0 ? liveActivities[0].id : null;
    let ws: WebSocket | null = null;
    let pollingInterval: NodeJS.Timeout | null = null;
    let closedByUser = false;

    function handleNewActivities(data: Activity[]) {
      setLiveActivities(data);
      // Notificación si hay amenaza alta nueva
      const high = data.find((a: Activity) => a.status === 'high');
      if (high && high.id !== lastHighId) {
        setToastMsg(`Nueva amenaza alta detectada: ${high.message}`);
        lastHighId = high.id;
      }
    }

    function startPolling() {
      pollingInterval = setInterval(() => {
        fetch(`/api/activities?limit=${pageSize}`)
          .then(res => res.ok ? res.json() : null)
          .then(data => {
            setFetchTried(true);
            if (Array.isArray(data) && data.length > 0) {
              handleNewActivities(data);
            } else if (Array.isArray(data) && data.length === 0) {
              setLiveActivities(activities.slice(0, pageSize));
            }
          })
          .catch(() => {
            setFetchTried(true);
            setLiveActivities(activities.slice(0, pageSize));
          });
      }, 10000);
    }

    try {
      ws = new window.WebSocket('ws://localhost:5000/ws/activities');
      ws.onopen = () => setWsConnected(true);
      ws.onclose = () => {
        setWsConnected(false);
        if (!closedByUser) startPolling();
      };
      ws.onerror = () => {
        setWsConnected(false);
        if (!pollingInterval) startPolling();
      };
      ws.onmessage = (event) => {
        setFetchTried(true);
        try {
          const data = JSON.parse(event.data);
          if (Array.isArray(data)) handleNewActivities(data);
        } catch {}
      };
    } catch {
      startPolling();
    }
    // Fallback inicial si no hay ws
    setTimeout(() => {
      if (!wsConnected && !pollingInterval) startPolling();
    }, 2000);

    return () => {
      closedByUser = true;
      if (ws) ws.close();
      if (pollingInterval) clearInterval(pollingInterval);
    };
    // eslint-disable-next-line
  }, [activities, pageSize]);

  // Efecto para actualizar lastUpdate (cada segundo)
  useEffect(() => {
    const interval = setInterval(() => {
      setLastUpdate(new Date());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Actualizar actividades filtradas cuando cambian las actividades originales
  useEffect(() => {
    if (!searchQuery && !filters.length) {
      setFilteredActivities(activities);
    }
  }, [activities, searchQuery, filters]);

  // Handle search functionality
  const handleSearch = (query: string, filters: SearchFilter[]) => {
    setSearchQuery(query);
    
    let filtered: Activity[] = activities;
    
    // Apply text search
    if (query.trim()) {
      const searchTerms = query.toLowerCase().split(' ');
      filtered = filtered.filter((activity: Activity) => 
        searchTerms.some(term => 
          activity.message.toLowerCase().includes(term) ||
          activity.source.toLowerCase().includes(term) ||
          activity.status.toLowerCase().includes(term)
        )
      );
    }
    
    // Apply filters
    filters.forEach(filter => {
      const searchValue = filter.value.toLowerCase();
      switch (filter.field) {
        case 'severity':
          filtered = filtered.filter((activity: Activity) => activity.status === searchValue);
          break;
        case 'source':
          filtered = filtered.filter((activity: Activity) => activity.source.toLowerCase().includes(searchValue));
          break;
        case 'type':
          filtered = filtered.filter((activity: Activity) => activity.message.toLowerCase().includes(`type="${searchValue}"`));
          break;
        case 'subtype':
          filtered = filtered.filter((activity: Activity) => activity.message.toLowerCase().includes(`subtype="${searchValue}"`));
          break;
        case 'action':
          filtered = filtered.filter((activity: Activity) => activity.message.toLowerCase().includes(`action="${searchValue}"`));
          break;
        case 'service':
          filtered = filtered.filter((activity: Activity) => activity.message.toLowerCase().includes(`service="${searchValue}"`));
          break;
        case 'srcip':
          filtered = filtered.filter((activity: Activity) => activity.message.toLowerCase().includes(`srcip=${searchValue}`));
          break;
        case 'dstip':
          filtered = filtered.filter((activity: Activity) => activity.message.toLowerCase().includes(`dstip=${searchValue}`));
          break;
        case 'srcport':
          filtered = filtered.filter((activity: Activity) => activity.message.toLowerCase().includes(`srcport=${searchValue}`));
          break;
        case 'dstport':
          filtered = filtered.filter((activity: Activity) => activity.message.toLowerCase().includes(`dstport=${searchValue}`));
          break;
        case 'proto':
          filtered = filtered.filter((activity: Activity) => activity.message.toLowerCase().includes(`proto=${searchValue}`));
          break;
        case 'srcintf':
          filtered = filtered.filter((activity: Activity) => activity.message.toLowerCase().includes(`srcintf="${searchValue}"`));
          break;
        case 'dstintf':
          filtered = filtered.filter((activity: Activity) => activity.message.toLowerCase().includes(`dstintf="${searchValue}"`));
          break;
        case 'devtype':
          filtered = filtered.filter((activity: Activity) => activity.message.toLowerCase().includes(`devtype="${searchValue}"`));
          break;
        case 'osname':
          filtered = filtered.filter((activity: Activity) => activity.message.toLowerCase().includes(`osname="${searchValue}"`));
          break;
        case 'time':
          const now = new Date();
          const timeLimit = new Date(now.getTime() - (parseInt(filter.value) * 60 * 60 * 1000));
          filtered = filtered.filter((activity: Activity) => 
            new Date(activity.timestamp) > timeLimit
          );
          break;
      }
    });
    
    setFilteredActivities(filtered);
  };

  const handleTimeRangeChange = (range: string) => {
    setTimeRange(range);
  };

  // Helper para obtener la hora local CDMX
  const getCDMXHour = (date: Date) => {
    return date.toLocaleTimeString('es-MX', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
      timeZone: 'America/Mexico_City'
    });
  };

  // Generate chart data from real activities or show "No Data" state
  const generateThreatTrendData = () => {
    if (!activities || activities.length === 0) {
      return [
        { time: '00:00', threats: 0, normal: 0 },
        { time: '04:00', threats: 0, normal: 0 },
        { time: '08:00', threats: 0, normal: 0 },
        { time: '12:00', threats: 0, normal: 0 },
        { time: '16:00', threats: 0, normal: 0 },
        { time: '20:00', threats: 0, normal: 0 },
      ];
    }

    // Group activities by hour for the last 24 hours (CDMX)
    const now = new Date();
    const hourlyData: { [key: string]: { threats: number; normal: number } } = {};
    for (let i = 23; i >= 0; i--) {
      const hour = new Date(now.getTime() - (i * 60 * 60 * 1000));
      const timeKey = getCDMXHour(hour);
      hourlyData[timeKey] = { threats: 0, normal: 0 };
    }

    activities.forEach(activity => {
      const activityTime = new Date(activity.timestamp);
      const hourKey = getCDMXHour(activityTime);
      if (hourlyData[hourKey]) {
        if (activity.status === 'high' || activity.status === 'medium') {
          hourlyData[hourKey].threats++;
        } else {
          hourlyData[hourKey].normal++;
        }
      }
    });

    return Object.entries(hourlyData)
      .slice(-6)
      .map(([time, data]) => ({
        time,
        threats: data.threats,
        normal: data.normal
      }));
  };

  const generateStatusDistribution = () => {
    if (!activities || activities.length === 0) {
      return [
        { name: 'No Data', value: 100, color: '#6B7280' }
      ];
    }

    const statusCounts = { low: 0, medium: 0, high: 0 };
    activities.forEach(activity => {
      if (statusCounts.hasOwnProperty(activity.status)) {
        statusCounts[activity.status as keyof typeof statusCounts]++;
      }
    });

    const total = Object.values(statusCounts).reduce((sum, count) => sum + count, 0);
    
    if (total === 0) {
      return [{ name: 'No Data', value: 100, color: '#6B7280' }];
    }

    return [
      { name: 'Low', value: Math.round((statusCounts.low / total) * 100), color: '#10B981' },
      { name: 'Medium', value: Math.round((statusCounts.medium / total) * 100), color: '#F59E0B' },
      { name: 'High', value: Math.round((statusCounts.high / total) * 100), color: '#EF4444' },
    ].filter(item => item.value > 0);
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

  // Filtro rápido por severidad
  const filteredBySeverity = severityFilter
    ? (liveActivities || []).filter(a => a.status === severityFilter)
    : liveActivities;
  // Paginación
  const totalPages = Math.ceil(filteredBySeverity.length / pageSize) || 1;
  const paginatedActivities = filteredBySeverity.slice((page - 1) * pageSize, page * pageSize);
  // Use paginatedActivities para mostrar la tabla en tiempo real (fallback si está vacío y ya se intentó fetch)
  const displayActivities = (paginatedActivities && paginatedActivities.length > 0)
    ? paginatedActivities
    : (!fetchTried ? activities.slice(0, pageSize) : []);

  // Exportar a CSV
  const exportToCSV = () => {
    const rows = [
      [
        'ID', 'Mensaje', 'Dispositivo', 'IP Origen', 'IP Destino', 'Servicio', 'Acción', 'Protocolo', 'País Destino', 'Política', 'Bytes Tx', 'Bytes Rx', 'Severidad', 'Fecha/Hora'
      ],
      ...filteredBySeverity.map(a => [
        a.id,
        a.message.replace(/\n/g, ' '),
        `${a.device_name || ''} ${a.device_type || ''}`.trim(),
        a.src_ip || '',
        a.dst_ip || '',
        a.service || '',
        a.action || '',
        a.protocol || '',
        a.dst_country || '',
        a.policy_id || '',
        a.bytes_sent || '',
        a.bytes_received || '',
        a.status || '',
        formatCDMXDate(a.timestamp)
      ])
    ];
    const csv = rows.map(r => r.map(field => `"${String(field).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'logs.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  // Función para convertir logs técnicos en mensajes amigables
  const getReadableMessage = (activity: Activity) => {
    const message = activity.message.toLowerCase();
    let readableMsg = '';

    // Extraer información relevante usando regex
    const srcIp = message.match(/srcip=([^\s]+)/)?.[1] || '';
    const dstIp = message.match(/dstip=([^\s]+)/)?.[1] || '';
    const action = message.match(/action="([^"]+)/)?.[1] || '';
    const service = message.match(/service="([^"]+)/)?.[1] || '';
    const proto = message.match(/proto=([^\s]+)/)?.[1] || '';
    const type = message.match(/type="([^"]+)/)?.[1] || '';

    // Construir mensaje amigable basado en el tipo de log
    if (type === 'traffic') {
      readableMsg = `${action === 'accept' ? 'Se permitió' : 'Se bloqueó'} ${service ? `el servicio ${service}` : 'el tráfico'} 
        desde ${srcIp} hacia ${dstIp}${proto ? ` usando ${proto.toUpperCase()}` : ''}`;
    } else if (type === 'attack') {
      readableMsg = `Se detectó un intento de ataque desde ${srcIp}`;
    } else if (type === 'virus') {
      readableMsg = `Se detectó un virus en la comunicación entre ${srcIp} y ${dstIp}`;
    } else if (type === 'webfilter') {
      readableMsg = `Se ${action === 'accept' ? 'permitió' : 'bloqueó'} el acceso web desde ${srcIp}`;
    } else {
      // Si no es ninguno de los tipos anteriores, usar un mensaje genérico
      readableMsg = `Actividad de red ${action} entre ${srcIp} y ${dstIp}`;
    }

    return readableMsg;
  };

  // Helper para mostrar fecha/hora en CDMX con formato de 24 horas
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

  const threatTrendData = generateThreatTrendData();
  const statusDistribution = generateStatusDistribution();

  const systemMetrics = [
    { name: 'CPU', value: stats.cpu_usage || 0, color: '#3B82F6' },
    { name: 'Memory', value: stats.memory_usage || 0, color: '#10B981' },
    { name: 'Disk', value: stats.disk_usage || 0, color: '#F59E0B' },
  ];

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
            Please check if the backend service is running on http://localhost:5000
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Advanced Search Bar */}
      <AdvancedSearchBar 
        allActivities={activities}
        onFilteredResultsChange={setFilteredActivities}
        onTimeRangeChange={handleTimeRangeChange}
      />

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Threats Detected */}
        <div 
          className={`bg-gray-800 p-6 rounded-lg border transition-all duration-200 cursor-pointer ${
            selectedCard === 'threats' 
              ? 'border-red-500 shadow-lg shadow-red-500/20' 
              : 'border-gray-700 hover:border-red-400'
          }`}
          onClick={() => setSelectedCard(selectedCard === 'threats' ? null : 'threats')}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm">Threats Detected</p>
              <p className="text-2xl font-bold text-white">
                {stats.threats_detected || 0}
              </p>
            </div>
            <div className="text-red-400">
              <AlertIcon size={32} />
            </div>
          </div>
          {stats.threats_detected > 0 && (
            <div className="mt-2 flex items-center">
              <PulseIcon size={8} color="#EF4444" animate={true} />
              <span className="text-red-400 text-xs ml-2">Active threats</span>
            </div>
          )}
        </div>

        {/* Network Status */}
        <div 
          className={`bg-gray-800 p-6 rounded-lg border transition-all duration-200 cursor-pointer ${
            selectedCard === 'network' 
              ? 'border-green-500 shadow-lg shadow-green-500/20' 
              : 'border-gray-700 hover:border-green-400'
          }`}
          onClick={() => setSelectedCard(selectedCard === 'network' ? null : 'network')}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm">Network Status</p>
              <p className={`text-lg font-semibold ${getNetworkStatusColor(stats.network_status)}`}>
                {stats.network_status || 'UNKNOWN'}
              </p>
            </div>
            <div>
              {getNetworkStatusIcon(stats.network_status)}
            </div>
          </div>
          {stats.uptime && (
            <div className="mt-2">
              <span className="text-gray-400 text-xs">Uptime: {stats.uptime}</span>
            </div>
          )}
        </div>

        {/* Logs Processed */}
        <div 
          className={`bg-gray-800 p-6 rounded-lg border transition-all duration-200 cursor-pointer ${
            selectedCard === 'logs' 
              ? 'border-blue-500 shadow-lg shadow-blue-500/20' 
              : 'border-gray-700 hover:border-blue-400'
          }`}
          onClick={() => setSelectedCard(selectedCard === 'logs' ? null : 'logs')}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm">Logs/Min</p>
              <p className="text-2xl font-bold text-white">
                {stats.logs_per_minute || 0}
              </p>
            </div>
            <div className="text-blue-400">
              <ActivityIcon size={32} />
            </div>
          </div>
          {stats.logs_processed && (
            <div className="mt-2">
              <span className="text-gray-400 text-xs">Total: {stats.logs_processed}</span>
            </div>
          )}
        </div>

        {/* System Health */}
        <div 
          className={`bg-gray-800 p-6 rounded-lg border transition-all duration-200 cursor-pointer ${
            selectedCard === 'cpu' 
              ? 'border-purple-500 shadow-lg shadow-purple-500/20' 
              : 'border-gray-700 hover:border-purple-400'
          }`}
          onClick={() => setSelectedCard(selectedCard === 'cpu' ? null : 'cpu')}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm">CPU Usage</p>
              <p className="text-2xl font-bold text-white">
                {stats.cpu_usage ? `${stats.cpu_usage}%` : 'N/A'}
              </p>
            </div>
            <div className="text-purple-400">
              <CpuIcon size={32} />
            </div>
          </div>
          {stats.temperature && (
            <div className="mt-2">
              <span className="text-gray-400 text-xs">Temp: {stats.temperature}°C</span>
            </div>
          )}
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Threat Trends */}
        <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
          <h3 className="text-lg font-semibold text-white mb-4">Threat Trends (24h)</h3>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={threatTrendData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis dataKey="time" stroke="#9CA3AF" />
              <YAxis stroke="#9CA3AF" />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: '#1F2937', 
                  border: '1px solid #374151',
                  borderRadius: '8px'
                }}
              />
              <Line type="monotone" dataKey="threats" stroke="#EF4444" strokeWidth={2} />
              <Line type="monotone" dataKey="normal" stroke="#10B981" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
          {activities.length === 0 && (
            <div className="absolute inset-0 flex items-center justify-center">
              <p className="text-gray-500">No data available</p>
            </div>
          )}
        </div>

        {/* Status Distribution */}
        <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
          <h3 className="text-lg font-semibold text-white mb-4">Alert Distribution</h3>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie
                data={statusDistribution}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={100}
                paddingAngle={5}
                dataKey="value"
              >
                {statusDistribution.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: '#1F2937', 
                  border: '1px solid #374151',
                  borderRadius: '8px'
                }}
              />
            </PieChart>
          </ResponsiveContainer>
          <div className="mt-4 flex justify-center space-x-4">
            {statusDistribution.map((entry, index) => (
              <div key={index} className="flex items-center">
                <div 
                  className="w-3 h-3 rounded-full mr-2" 
                  style={{ backgroundColor: entry.color }}
                ></div>
                <span className="text-gray-400 text-sm">{entry.name}: {entry.value}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* System Metrics */}
      <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
        <h3 className="text-lg font-semibold text-white mb-4">System Performance</h3>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={systemMetrics}>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis dataKey="name" stroke="#9CA3AF" />
            <YAxis stroke="#9CA3AF" domain={[0, 100]} />
            <Tooltip 
              contentStyle={{ 
                backgroundColor: '#1F2937', 
                border: '1px solid #374151',
                borderRadius: '8px'
              }}
              formatter={(value) => [`${value}%`, 'Usage']}
            />
            <Bar dataKey="value" fill="#3B82F6" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
        {(!stats.cpu_usage && !stats.memory_usage && !stats.disk_usage) && (
          <div className="absolute inset-0 flex items-center justify-center">
            <p className="text-gray-500">System metrics not available</p>
          </div>
        )}
      </div>

      {/* Recent Activities */}
      <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-white">Actividad Reciente</h3>
      <div className="flex items-center space-x-4">
        {/* Filtro rápido por severidad */}
        <select
          className="bg-gray-900 text-gray-200 px-2 py-1 rounded border border-gray-700 text-xs"
          value={severityFilter}
          onChange={e => { setSeverityFilter(e.target.value); setPage(1); }}
        >
          <option value="">Todas</option>
          <option value="high">Alta</option>
          <option value="medium">Media</option>
          <option value="low">Baja</option>
        </select>
        {/* Exportar a CSV */}
        <button
          className="bg-blue-700 hover:bg-blue-800 text-white px-3 py-1 rounded text-xs border border-blue-900"
          onClick={exportToCSV}
        >Exportar CSV</button>
        {/* Estado de conexión */}
        <span className={wsConnected ? 'text-green-400 text-xs' : 'text-yellow-400 text-xs'}>
          {wsConnected ? 'WebSocket activo' : 'Modo polling'}
        </span>
        <PulseIcon size={8} color="#10B981" animate={true} />
        <span className="text-green-400 text-sm ml-2">Monitoreo en vivo</span>
      </div>
        </div>
        {displayActivities.length === 0 ? (
          <div className="text-center py-8">
            <NetworkIcon size={48} color="#6B7280" className="mx-auto mb-4" />
            <p className="text-gray-400">Sin actividad reciente</p>
            <p className="text-gray-500 text-sm mt-2">
              Las actividades aparecerán aquí cuando se detecte tráfico en la red
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-700">
              <thead>
                <tr>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Fecha / Hora</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Dispositivo Origen</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">IP Origen</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Servicio</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Acción</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Protocolo</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">País Destino</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Política</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Bytes Tx/Rx</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Severidad</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700">
                {displayActivities.map((activity) => {
                  const deviceName = activity.device_name || 'Unknown';
                  const deviceType = activity.device_type ? `(${activity.device_type})` : '';
                  const srcIp = activity.src_ip || '';
                  const service = activity.service || activity.dst_port || '';
                  const action = activity.action || '';
                  const proto = activity.protocol || '';
                  const dstCountry = activity.dst_country || 'Local';
                  const policy = activity.src_interface || activity.policy_id || '';
                  const bytesSent = activity.bytes_sent || '0';
                  const bytesReceived = activity.bytes_received || '0';

                  const getProtoName = (proto: string) => {
                    switch (proto) {
                      case '1': return 'ICMP (1)';
                      case '6': return 'TCP (6)';
                      case '17': return 'UDP (17)';
                      case '47': return 'GRE (47)';
                      case '50': return 'ESP (50)';
                      case '51': return 'AH (51)';
                      case '89': return 'OSPF (89)';
                      default: return proto ? `PROTO (${proto})` : 'Unknown';
                    }
                  };

                  return (
                    <tr 
                      key={activity.id}
                      className="hover:bg-gray-700/50 transition-colors cursor-pointer"
                      onClick={() => setModalActivity(activity)}
                    >
                      <td className="px-3 py-2 text-sm text-gray-300">{formatCDMXDate(activity.timestamp)}</td>
                      <td className="px-3 py-2 text-sm text-gray-300">{`${deviceName} ${deviceType}`}</td>
                      <td className="px-3 py-2 text-sm text-gray-300">{srcIp}</td>
                      <td className="px-3 py-2 text-sm text-gray-300">{service.toUpperCase()}</td>
                      <td className="px-3 py-2 text-sm">
                        <span className={action === 'accept' ? 'text-green-400' : 'text-red-400'}>
                          {action.toUpperCase()}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-sm text-gray-300">{getProtoName(proto)}</td>
                      <td className="px-3 py-2 text-sm text-gray-300">{dstCountry}</td>
                      <td className="px-3 py-2 text-sm text-gray-300">{policy}</td>
                      <td className="px-3 py-2 text-sm text-gray-300">{`${bytesSent} / ${bytesReceived}`}</td>
                      <td className="px-3 py-2 text-sm">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          activity.status === 'high' ? 'bg-red-900 text-red-300' :
                          activity.status === 'medium' ? 'bg-yellow-900 text-yellow-300' : 'bg-green-900 text-green-300'
                        }`}>
                          {activity.status.toUpperCase()}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {/* Paginación */}
            <div className="flex justify-end items-center mt-4 space-x-2">
              <button
                className="px-2 py-1 rounded bg-gray-700 text-gray-200 text-xs disabled:opacity-50"
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
              >Anterior</button>
              <span className="text-gray-400 text-xs">Página {page} de {totalPages}</span>
              <button
                className="px-2 py-1 rounded bg-gray-700 text-gray-200 text-xs disabled:opacity-50"
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
              >Siguiente</button>
            </div>
          </div>
        )}
      </div>

      {/* Modal de detalles de actividad */}
      {modalActivity && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60">
          <div className="bg-gray-900 rounded-lg p-8 max-w-lg w-full relative border border-gray-700">
            <button className="absolute top-2 right-2 text-gray-400 hover:text-white" onClick={() => setModalActivity(null)}>&times;</button>
            <h4 className="text-xl font-bold text-white mb-4">Detalle de Actividad</h4>
            <div className="space-y-2 text-gray-200 text-sm">
              <div><b>Mensaje:</b> {modalActivity.message}</div>
              <div><b>Dispositivo:</b> {modalActivity.device_name || 'Unknown'} {modalActivity.device_type ? `(${modalActivity.device_type})` : ''}</div>
              <div><b>IP Origen:</b> {modalActivity.src_ip}</div>
              <div><b>IP Destino:</b> {modalActivity.dst_ip}</div>
              <div><b>Servicio:</b> {modalActivity.service}</div>
              <div><b>Acción:</b> {modalActivity.action}</div>
              <div><b>Protocolo:</b> {modalActivity.protocol}</div>
              <div><b>País Destino:</b> {modalActivity.dst_country}</div>
              <div><b>Política:</b> {modalActivity.policy_id}</div>
              <div><b>Bytes Tx/Rx:</b> {modalActivity.bytes_sent} / {modalActivity.bytes_received}</div>
              <div><b>Severidad:</b> {modalActivity.status}</div>
              <div><b>Fecha/Hora:</b> {formatCDMXDate(modalActivity.timestamp)}</div>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Toast de alerta alta */}
      {toastMsg && <Toast message={toastMsg} onClose={() => setToastMsg(null)} />}

      {/* Network Geography - World Map */}
      <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
        <h3 className="text-lg font-semibold text-white mb-4">Global Threat Map</h3>
        <WorldMap activities={activities} />
      </div>

      {/* Last Update Info */}
      <div className="bg-gray-900 p-4 rounded-lg border border-gray-700">
        <div className="flex items-center justify-between">
          <span className="text-gray-400 text-sm">
            Last updated: {stats.last_update ? formatCDMXDate(stats.last_update) : 'Never'}
          </span>
          <div className="flex items-center">
            <PulseIcon size={8} color="#10B981" animate={true} />
            <span className="text-green-400 text-sm ml-2">Live monitoring active</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;