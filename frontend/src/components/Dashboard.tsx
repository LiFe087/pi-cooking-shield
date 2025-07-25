// src/components/Dashboard.tsx - ACTUALIZADO: Integración Real con Backend
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
      <span className="font-bold">Alert!</span> {message}
    </div>,
    document.body
  );
};

  // Interfaces defined here
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
  
  // Threat fields
  threat_score: number;
  status: string;
  alert_level: string;
  
  // Source device information
  device_name?: string;
  device_type?: string;
  os_name?: string;
  device_category?: string;
  src_mac?: string;
  
  // IPs and countries
  src_ip?: string;
  dst_ip?: string;
  src_country?: string;
  dst_country?: string;
  
  // Ports and service
  src_port?: string;
  dst_port?: string;
  service?: string;
  
  // Protocol and action
  protocol?: string;
  action?: string;
  
  // Interfaces and policy
  src_interface?: string;
  dst_interface?: string;
  src_interface_role?: string;
  dst_interface_role?: string;
  policy_id?: string;
  policy_type?: string;
  
  // Traffic statistics
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
  // State for real-time recent activities
  const [liveActivities, setLiveActivities] = useState<Activity[]>(activities.slice(0, 5));
  // Fallback to know if fetch was already attempted
  const [fetchTried, setFetchTried] = useState(false);
  // State for toast notifications
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  // State for details modal
  const [modalActivity, setModalActivity] = useState<Activity | null>(null);
  // State for quick severity filter
  const [severityFilter, setSeverityFilter] = useState<string>('');
  // State for pagination
  const [page, setPage] = useState(1);
  const pageSize = 5;
  // State for WebSocket
  const [wsConnected, setWsConnected] = useState(false);

  // WebSocket for recent activities (with polling fallback)
  useEffect(() => {
    let lastHighId = liveActivities.length > 0 ? liveActivities[0].id : null;
    let ws: WebSocket | null = null;
    let pollingInterval: NodeJS.Timeout | null = null;
    let closedByUser = false;

    function handleNewActivities(data: Activity[]) {
      setLiveActivities(data);
      // Notification if there's a new high threat
      const high = data.find((a: Activity) => a.status === 'high');
      if (high && high.id !== lastHighId) {
        setToastMsg(`New high threat detected: ${high.message}`);
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
    // Fallback initial if no ws
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

  // Effect to update lastUpdate (every second)
  useEffect(() => {
    const interval = setInterval(() => {
      setLastUpdate(new Date());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Update filtered activities when original activities change
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

  // Helper to get CDMX local time
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

  // Quick severity filter
  const filteredBySeverity = severityFilter
    ? (liveActivities || []).filter(a => a.status === severityFilter)
    : liveActivities;
  // Pagination
  const totalPages = Math.ceil(filteredBySeverity.length / pageSize) || 1;
  const paginatedActivities = filteredBySeverity.slice((page - 1) * pageSize, page * pageSize);
  // Use paginatedActivities to show real-time table (fallback if empty and fetch was already attempted)
  const displayActivities = (paginatedActivities && paginatedActivities.length > 0)
    ? paginatedActivities
    : (!fetchTried ? activities.slice(0, pageSize) : []);

  // Export to CSV
  const exportToCSV = () => {
    const rows = [
      [
        'ID', 'Message', 'Device', 'Source IP', 'Destination IP', 'Service', 'Action', 'Protocol', 'Destination Country', 'Policy', 'Bytes Tx', 'Bytes Rx', 'Severity', 'Date/Time'
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

  // Function to convert technical logs into friendly messages
  const getReadableMessage = (activity: Activity) => {
    const message = activity.message.toLowerCase();
    let readableMsg = '';

    // Extract relevant information using regex
    const srcIp = message.match(/srcip=([^\s]+)/)?.[1] || '';
    const dstIp = message.match(/dstip=([^\s]+)/)?.[1] || '';
    const action = message.match(/action="([^"]+)/)?.[1] || '';
    const service = message.match(/service="([^"]+)/)?.[1] || '';
    const proto = message.match(/proto=([^\s]+)/)?.[1] || '';
    const type = message.match(/type="([^"]+)/)?.[1] || '';

    // Build friendly message based on log type
    if (type === 'traffic') {
      readableMsg = `${action === 'accept' ? 'Allowed' : 'Blocked'} ${service ? `${service} service` : 'traffic'} 
        from ${srcIp} to ${dstIp}${proto ? ` using ${proto.toUpperCase()}` : ''}`;
    } else if (type === 'attack') {
      readableMsg = `Attack attempt detected from ${srcIp}`;
    } else if (type === 'virus') {
      readableMsg = `Virus detected in communication between ${srcIp} and ${dstIp}`;
    } else if (type === 'webfilter') {
      readableMsg = `Web access ${action === 'accept' ? 'allowed' : 'blocked'} from ${srcIp}`;
    } else {
      // If none of the above types, use a generic message
      readableMsg = `Network activity ${action} between ${srcIp} and ${dstIp}`;
    }

    return readableMsg;
  };

  // Helper to show date/time in CDMX with 24-hour format
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
          <h3 className="text-lg font-semibold text-white">Recent Activity</h3>
      <div className="flex items-center space-x-4">
        {/* Filtro rápido por severidad */}
        <select
          className="bg-gray-900 text-gray-200 px-2 py-1 rounded border border-gray-700 text-xs"
          value={severityFilter}
          onChange={e => { setSeverityFilter(e.target.value); setPage(1); }}
        >
          <option value="">All</option>
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </select>
        {/* Exportar a CSV */}
        <button
          className="bg-blue-700 hover:bg-blue-800 text-white px-3 py-1 rounded text-xs border border-blue-900"
          onClick={exportToCSV}
        >Export CSV</button>
        {/* Estado de conexión */}
        <span className={wsConnected ? 'text-green-400 text-xs' : 'text-yellow-400 text-xs'}>
          {wsConnected ? 'WebSocket active' : 'Polling mode'}
        </span>
        <PulseIcon size={8} color="#10B981" animate={true} />
        <span className="text-green-400 text-sm ml-2">Live monitoring</span>
      </div>
        </div>
        {displayActivities.length === 0 ? (
          <div className="text-center py-8">
            <NetworkIcon size={48} color="#6B7280" className="mx-auto mb-4" />
            <p className="text-gray-400">No recent activity</p>
            <p className="text-gray-500 text-sm mt-2">
              Activities will appear here when network traffic is detected
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-700">
              <thead>
                <tr>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Date / Time</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Source Device</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Source IP</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Service</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Action</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Protocol</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Destination Country</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Policy</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Bytes Tx/Rx</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Severity</th>
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
            {/* Pagination */}
            <div className="flex justify-end items-center mt-4 space-x-2">
              <button
                className="px-2 py-1 rounded bg-gray-700 text-gray-200 text-xs disabled:opacity-50"
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
              >Previous</button>
              <span className="text-gray-400 text-xs">Page {page} of {totalPages}</span>
              <button
                className="px-2 py-1 rounded bg-gray-700 text-gray-200 text-xs disabled:opacity-50"
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
              >Next</button>
            </div>
          </div>
        )}
      </div>

      {/* Activity details modal */}
      {modalActivity && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60">
          <div className="bg-gray-900 rounded-lg p-8 max-w-lg w-full relative border border-gray-700">
            <button className="absolute top-2 right-2 text-gray-400 hover:text-white" onClick={() => setModalActivity(null)}>&times;</button>
            <h4 className="text-xl font-bold text-white mb-4">Activity Details</h4>
            <div className="space-y-2 text-gray-200 text-sm">
              <div><b>Message:</b> {modalActivity.message}</div>
              <div><b>Device:</b> {modalActivity.device_name || 'Unknown'} {modalActivity.device_type ? `(${modalActivity.device_type})` : ''}</div>
              <div><b>Source IP:</b> {modalActivity.src_ip}</div>
              <div><b>Destination IP:</b> {modalActivity.dst_ip}</div>
              <div><b>Service:</b> {modalActivity.service}</div>
              <div><b>Action:</b> {modalActivity.action}</div>
              <div><b>Protocol:</b> {modalActivity.protocol}</div>
              <div><b>Destination Country:</b> {modalActivity.dst_country}</div>
              <div><b>Policy:</b> {modalActivity.policy_id}</div>
              <div><b>Bytes Tx/Rx:</b> {modalActivity.bytes_sent} / {modalActivity.bytes_received}</div>
              <div><b>Severity:</b> {modalActivity.status}</div>
              <div><b>Date/Time:</b> {formatCDMXDate(modalActivity.timestamp)}</div>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* High alert toast */}
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