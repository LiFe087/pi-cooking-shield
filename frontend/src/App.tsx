// src/App.tsx - UPDATED: Real Backend Integration with Error Handling
import React, { useState, useEffect } from 'react';
import axios from 'axios';

// Components
import Dashboard from './components/Dashboard';
import ThreatAnalysis from './components/ThreatAnalysis';
import NetworkMonitor from './components/NetworkMonitor';
import SystemHealth from './components/SystemHealth';
import SecurityMonitor from './components/SecurityMonitor';
import Settings from './components/Settings';
import { 
  AlertIcon, 
  ShieldIcon, 
  ActivityIcon, 
  CpuIcon, 
  NetworkIcon,
  PulseIcon,
  SpinIcon 
} from './components/Icons';

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
  threat_score: number;
  status: string;
  alert_level: string;
  timestamp: string;
  source: string;
  ip_address?: string;
  country?: string;
}

const API_BASE_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
  ? 'http://localhost:5000' 
  : 'http://192.168.101.4:5000';

function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [stats, setStats] = useState<SystemStats>({
    threats_detected: 0,
    network_status: 'CONNECTING',
    logs_per_minute: 0,
    last_update: '',
    cpu_usage: 0,
    memory_usage: 0,
    disk_usage: 0,
    logs_processed: 0,
    system_load: 0,
    uptime: 'Unknown',
    temperature: 0
  });
  const [activities, setActivities] = useState<Activity[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Auto-refresh control
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [refreshInterval, setRefreshInterval] = useState(5000); // 5 seconds default
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);

  const menuItems = [
    { id: 'dashboard', name: 'Overview', icon: <ShieldIcon size={20} /> },
    { id: 'threats', name: 'Threats', icon: <AlertIcon size={20} /> },
    { id: 'security', name: 'Security', icon: <ShieldIcon size={20} /> },
    { id: 'network', name: 'Network', icon: <NetworkIcon size={20} /> },
    { id: 'health', name: 'System', icon: <CpuIcon size={20} /> },
    { id: 'settings', name: 'Settings', icon: <ActivityIcon size={20} /> }
  ];

  // Test backend connection
  const testConnection = async () => {
    try {
      console.log('🔗 Attempting connection to:', `${API_BASE_URL}/api/system/health`);
      const response = await axios.get(`${API_BASE_URL}/api/system/health`, { 
        timeout: 5000,
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      });
      console.log('✅ Connection successful:', response.status, response.data);
      setIsConnected(true);
      setError(null);
      return true;
    } catch (err) {
      console.error('❌ Connection failed:', err);
      setIsConnected(false);
      if (axios.isAxiosError(err)) {
        if (err.code === 'ECONNREFUSED' || err.code === 'ERR_NETWORK') {
          setError('Backend service not running. Please start the Flask server.');
        } else if (err.code === 'ECONNABORTED') {
          setError('Connection timeout. Backend service may be slow to respond.');
        } else {
          setError(`Connection error: ${err.message}`);
        }
      } else {
        setError('Unknown connection error occurred.');
      }
      return false;
    }
  };

  // Fetch data from backend
  const fetchData = async () => {
    if (!isConnected) {
      const connected = await testConnection();
      if (!connected) {
        setLoading(false);
        return;
      }
    }

    try {
      setLoading(true);
      
      // Fetch stats and activities in parallel
      const [statsResponse, activityResponse] = await Promise.all([
        axios.get(`${API_BASE_URL}/api/system/health`),
        axios.get(`${API_BASE_URL}/api/activities/live`)
      ]);
      
      // Update stats - merge with backend data
      const backendStats = statsResponse.data;
      setStats(prevStats => ({
        ...prevStats,
        ...backendStats,
        // Add any missing fields with defaults
        cpu_usage: backendStats.cpu_usage ?? prevStats.cpu_usage ?? 0,
        memory_usage: backendStats.memory_usage ?? prevStats.memory_usage ?? 0,
        disk_usage: backendStats.disk_usage ?? prevStats.disk_usage ?? 0,
        system_load: backendStats.system_load ?? prevStats.system_load ?? 0,
        temperature: backendStats.temperature ?? prevStats.temperature ?? 0,
      }));
      
      // Update activities
      const backendActivities = activityResponse.data;
      if (backendActivities && Array.isArray(backendActivities.data)) {
        // Mapear campos del backend al formato esperado por el frontend
        const mappedActivities = backendActivities.data.map((activity: any) => ({
          ...activity,
          country: activity.dst_country || activity.src_country || 'Unknown',
          ip_address: activity.dst_ip || activity.src_ip || 'Unknown'
        }));
        setActivities(mappedActivities);
      } else if (Array.isArray(backendActivities)) {
        setActivities(backendActivities);
      } else {
        console.warn('Backend returned non-array activities:', backendActivities);
        setActivities([]);
      }
      
      setLastRefresh(new Date());
      setError(null);
      setIsConnected(true);
      
    } catch (err) {
      console.error('Failed to fetch data:', err);
      
      if (axios.isAxiosError(err)) {
        if (err.response?.status === 404) {
          setError('Backend endpoints not found. Please check API routes.');
        } else if (err.response && err.response.status >= 500) {
          setError('Backend server error. Please check server logs.');
        } else {
          setError(`API Error: ${err.message}`);
        }
      } else {
        setError('Failed to fetch data from backend');
      }
      
      setIsConnected(false);
    } finally {
      setLoading(false);
    }
  };

  // Manual refresh function
  const handleManualRefresh = async () => {
    await fetchData();
  };

  // Setup auto-refresh
  useEffect(() => {
    // Initial fetch
    fetchData();
    
    // Setup auto-refresh if enabled
    let interval: NodeJS.Timeout | null = null;
    if (autoRefresh) {
      interval = setInterval(fetchData, refreshInterval);
    }
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [autoRefresh, refreshInterval]);

  // Generate test data when backend is not available
  const generateTestActivity = () => {
    if (!isConnected) return;
    
    const testMessages = [
      'Suspicious login attempt detected',
      'Port scan activity from external IP',
      'Malware signature found in network traffic',
      'Normal user authentication successful',
      'DNS query resolved successfully',
      'Failed authentication attempt blocked'
    ];
    
    // TODO: Implementar endpoint de test en backend optimizado
    // axios.post(`${API_BASE_URL}/api/test-threat`)
    //   .then(() => fetchData())
    //   .catch(err => console.error('Failed to generate test threat:', err));
    console.log('Test threat feature not available in optimized backend');
  };

  const renderActiveComponent = () => {
    const commonProps = {
      loading,
      error: error && !isConnected ? error : undefined
    };

    const systemHealthProps = {
      externalLoading: loading,
      externalError: error && !isConnected ? error : undefined
    };

    switch (activeTab) {
      case 'dashboard':
        return <Dashboard stats={stats} activities={activities} {...commonProps} />;
      case 'threats':
        return <ThreatAnalysis />;
      case 'security':
        return <SecurityMonitor refreshInterval={refreshInterval} />;
      case 'network':
        return <NetworkMonitor />;
      case 'health':
        return <SystemHealth stats={stats} refreshInterval={refreshInterval} {...systemHealthProps} />;
      case 'settings':
        return <Settings />;
      default:
        return <Dashboard stats={stats} activities={activities} {...commonProps} />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header */}
      <header className="bg-gray-800 border-b border-gray-700 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="flex items-center">
              <ShieldIcon size={32} color="#3B82F6" />
              <h1 className="text-xl font-bold ml-3">PI-Cooking-Shield</h1>
            </div>
            
            {/* Connection Status */}
            <div className="flex items-center space-x-2">
              <div className={`w-2 h-2 rounded-full ${
                isConnected ? 'bg-green-500' : 'bg-red-500'
              }`}></div>
              <span className={`text-sm ${
                isConnected ? 'text-green-400' : 'text-red-400'
              }`}>
                {isConnected ? 'Connected' : 'Disconnected'}
              </span>
            </div>
          </div>

          <div className="flex items-center space-x-4">
            {/* Auto-refresh Toggle */}
            <div className="flex items-center space-x-2">
              <label className="text-sm text-gray-400">Auto-refresh:</label>
              <button
                onClick={() => setAutoRefresh(!autoRefresh)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  autoRefresh ? 'bg-blue-600' : 'bg-gray-600'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    autoRefresh ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            {/* Refresh Interval Selector */}
            <select
              value={refreshInterval}
              onChange={(e) => setRefreshInterval(Number(e.target.value))}
              className="bg-gray-700 border border-gray-600 rounded px-2 py-1 text-sm"
              disabled={!autoRefresh}
            >
              <option value={1000}>1s</option>
              <option value={5000}>5s</option>
              <option value={10000}>10s</option>
              <option value={30000}>30s</option>
            </select>

            {/* Manual Refresh Button */}
            <button
              onClick={handleManualRefresh}
              disabled={loading}
              className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 px-3 py-1 rounded text-sm transition-colors flex items-center space-x-2"
            >
              {loading ? (
                <SpinIcon size={16} animate={true} />
              ) : (
                <ActivityIcon size={16} />
              )}
              <span>Refresh</span>
            </button>

            {/* Test Data Button (only when connected) */}
            {isConnected && (
              <button
                onClick={generateTestActivity}
                className="bg-yellow-600 hover:bg-yellow-700 px-3 py-1 rounded text-sm transition-colors"
              >
                Test Alert
              </button>
            )}

            {/* Last Update Info */}
            {lastRefresh && (
              <span className="text-xs text-gray-400">
                Updated: {lastRefresh.toLocaleTimeString()}
              </span>
            )}
          </div>
        </div>

        {/* Navigation Tabs */}
        <nav className="flex space-x-1 mt-4">
          {menuItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`flex items-center px-4 py-2 rounded-lg transition-all duration-200 ${
                activeTab === item.id
                  ? 'bg-blue-600 text-white shadow-lg'
                  : 'text-gray-400 hover:text-white hover:bg-gray-700'
              }`}
            >
              {item.icon}
              <span className="ml-2">{item.name}</span>
            </button>
          ))}
        </nav>
      </header>

      {/* Main Content */}
      <main className="p-6">
        {/* Global Error Banner */}
        {error && !isConnected && (
          <div className="mb-6 bg-red-900/20 border border-red-500 rounded-lg p-4">
            <div className="flex items-center">
              <AlertIcon size={20} color="#EF4444" />
              <div className="ml-3">
                <h3 className="text-red-400 font-semibold">Connection Error</h3>
                <p className="text-red-300 text-sm mt-1">{error}</p>
                <div className="mt-2 flex space-x-2">
                  <button
                    onClick={handleManualRefresh}
                    className="text-xs bg-red-600 hover:bg-red-700 px-2 py-1 rounded"
                  >
                    Retry Connection
                  </button>
                  <span className="text-xs text-gray-400">
                    Make sure the backend is running on {API_BASE_URL}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Global Loading State */}
        {loading && !stats.last_update && (
          <div className="mb-6 bg-gray-800 rounded-lg p-8">
            <div className="flex items-center justify-center">
              <SpinIcon size={32} color="#3B82F6" animate={true} />
              <span className="ml-3 text-gray-400">Connecting to PI-Cooking-Shield backend...</span>
            </div>
          </div>
        )}

        {/* Component Content */}
        <div className="animate-fadeIn">
          {renderActiveComponent()}
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-gray-800 border-t border-gray-700 px-6 py-4 mt-8">
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-400">
            <span>PI-Cooking-Shield v4.0</span>
            <span className="mx-2">•</span>
            <span>Universidad Politécnica de Querétaro</span>
            <span className="mx-2">•</span>
            <span>Grupo IRT191</span>
          </div>
          
          <div className="flex items-center space-x-4 text-sm text-gray-400">
            {/* System Stats Summary */}
            <div className="flex items-center space-x-2">
              <span>Threats: {stats.threats_detected}</span>
              <span>•</span>
              <span>Logs/min: {stats.logs_per_minute}</span>
              {stats.cpu_usage !== undefined && (
                <>
                  <span>•</span>
                  <span>CPU: {stats.cpu_usage.toFixed(1)}%</span>
                </>
              )}
              {stats.temperature !== undefined && stats.temperature > 0 && (
                <>
                  <span>•</span>
                  <span>Temp: {stats.temperature.toFixed(1)}°C</span>
                </>
              )}
            </div>
            
            {/* Live Indicator */}
            {isConnected && autoRefresh && (
              <div className="flex items-center">
                <PulseIcon size={8} color="#10B981" animate={true} />
                <span className="ml-2">Live</span>
              </div>
            )}
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;