// src/App.tsx - Professional Multi-Tab Dashboard
import React, { useState, useEffect } from 'react';
import axios from 'axios';

// Components we'll create
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import ThreatAnalysis from './components/ThreatAnalysis';
import NetworkMonitor from './components/NetworkMonitor';
import SystemHealth from './components/SystemHealth';
import Settings from './components/Settings';

interface SystemStats {
  threats_detected: number;
  network_status: string;
  logs_per_minute: number;
  last_update: string;
  cpu_usage?: number;
  memory_usage?: number;
  disk_usage?: number;
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

function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [stats, setStats] = useState<SystemStats>({
    threats_detected: 0,
    network_status: 'CONNECTING',
    logs_per_minute: 0,
    last_update: '',
    cpu_usage: 0,
    memory_usage: 0,
    disk_usage: 0
  });
  const [activities, setActivities] = useState<Activity[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [loading, setLoading] = useState(true);

  const menuItems = [
    { id: 'dashboard', name: 'Dashboard', icon: '📊' },
    { id: 'threats', name: 'Threat Analysis', icon: '🛡️' },
    { id: 'network', name: 'Network Monitor', icon: '🌐' },
    { id: 'health', name: 'System Health', icon: '⚡' },
    { id: 'settings', name: 'Settings', icon: '⚙️' }
  ];

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        
        // Fetch stats with simulated additional metrics
        const statsResponse = await axios.get('http://localhost:5000/api/stats');
        const enhancedStats = {
          ...statsResponse.data,
          cpu_usage: Math.floor(Math.random() * 30) + 20, // 20-50%
          memory_usage: Math.floor(Math.random() * 40) + 30, // 30-70%
          disk_usage: Math.floor(Math.random() * 20) + 45 // 45-65%
        };
        setStats(enhancedStats);
        
        // Fetch activities
        const activitiesResponse = await axios.get('http://localhost:5000/api/activity');
        const enhancedActivities = activitiesResponse.data.map((activity: Activity) => ({
          ...activity,
          ip_address: `192.168.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`,
          country: ['USA', 'China', 'Russia', 'Germany', 'Brazil'][Math.floor(Math.random() * 5)]
        }));
        setActivities(enhancedActivities);
        
        setIsConnected(true);
      } catch (error) {
        console.error('Error fetching data:', error);
        setIsConnected(false);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 5000);
    return () => clearInterval(interval);
  }, []);

  const renderContent = () => {
    if (loading) {
      return <LoadingScreen />;
    }

    switch (activeTab) {
      case 'dashboard':
        return <Dashboard stats={stats} activities={activities} />;
      case 'threats':
        return <ThreatAnalysis activities={activities} stats={stats} />;
      case 'network':
        return <NetworkMonitor stats={stats} />;
      case 'health':
        return <SystemHealth stats={stats} />;
      case 'settings':
        return <Settings />;
      default:
        return <Dashboard stats={stats} activities={activities} />;
    }
  };

  return (
    <div className="flex h-screen bg-gray-900 text-white">
      {/* Sidebar */}
      <div className="w-64 bg-gray-800 shadow-lg">
        <div className="p-6 border-b border-gray-700">
          <h1 className="text-xl font-bold text-blue-400">PI-Cooking-Shield</h1>
          <p className="text-sm text-gray-400 mt-1">Cybersecurity Operations Center</p>
        </div>
        
        <nav className="mt-6">
          {menuItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full text-left px-6 py-3 flex items-center space-x-3 hover:bg-gray-700 transition-colors ${
                activeTab === item.id ? 'bg-gray-700 border-r-2 border-blue-400' : ''
              }`}
            >
              <span className="text-lg">{item.icon}</span>
              <span>{item.name}</span>
            </button>
          ))}
        </nav>
        
        {/* Connection Status */}
        <div className="absolute bottom-4 left-4 right-4">
          <div className={`flex items-center space-x-2 p-3 rounded-lg ${
            isConnected ? 'bg-green-900' : 'bg-red-900'
          }`}>
            <div className={`w-2 h-2 rounded-full ${
              isConnected ? 'bg-green-400' : 'bg-red-400'
            }`}></div>
            <span className="text-sm">
              {isConnected ? 'Connected' : 'Disconnected'}
            </span>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Bar */}
        <header className="bg-gray-800 shadow-sm border-b border-gray-700 p-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-semibold capitalize">{activeTab}</h2>
              <p className="text-gray-400 text-sm">
                Last updated: {stats.last_update ? new Date(stats.last_update).toLocaleString() : 'Never'}
              </p>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className={`px-3 py-1 rounded-full text-xs font-semibold ${
                stats.network_status === 'SECURE' ? 'bg-green-900 text-green-200' :
                stats.network_status === 'WARNING' ? 'bg-yellow-900 text-yellow-200' :
                'bg-red-900 text-red-200'
              }`}>
                {stats.network_status}
              </div>
              
              <button className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg text-sm transition-colors">
                Export Report
              </button>
            </div>
          </div>
        </header>

        {/* Content Area */}
        <main className="flex-1 overflow-auto p-6">
          {renderContent()}
        </main>
      </div>
    </div>
  );
}

// Loading Screen Component
const LoadingScreen = () => (
  <div className="flex items-center justify-center h-full">
    <div className="text-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-400 mx-auto"></div>
      <p className="mt-4 text-gray-400">Loading security data...</p>
    </div>
  </div>
);

export default App;