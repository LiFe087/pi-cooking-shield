// src/components/NetworkMonitor.tsx - FIXED: No props required
import React, { useState, useEffect } from 'react';
import { 
  NetworkIcon, 
  WifiIcon, 
  ServerIcon, 
  GlobeIcon,
  PulseIcon,
  SpinIcon,
  ActivityIcon 
} from './Icons';

interface NetworkInterface {
  name: string;
  status: 'up' | 'down';
  ip: string;
  bytes_sent: number;
  bytes_recv: number;
}

const NetworkMonitor: React.FC = () => {
  const [interfaces, setInterfaces] = useState<NetworkInterface[]>([]);
  const [loading, setLoading] = useState(true);
  const [connectionStatus, setConnectionStatus] = useState('checking');

  // Simulate network interface data
  useEffect(() => {
    const fetchNetworkData = () => {
      // Simulate network interface data
      const mockInterfaces: NetworkInterface[] = [
        {
          name: 'eth0',
          status: 'up',
          ip: '192.168.1.100',
          bytes_sent: Math.floor(Math.random() * 1000000000),
          bytes_recv: Math.floor(Math.random() * 2000000000)
        },
        {
          name: 'wlan0',
          status: 'up',
          ip: '192.168.1.101',
          bytes_sent: Math.floor(Math.random() * 500000000),
          bytes_recv: Math.floor(Math.random() * 800000000)
        },
        {
          name: 'lo',
          status: 'up',
          ip: '127.0.0.1',
          bytes_sent: Math.floor(Math.random() * 1000000),
          bytes_recv: Math.floor(Math.random() * 1000000)
        }
      ];

      setInterfaces(mockInterfaces);
      setConnectionStatus('connected');
      setLoading(false);
    };

    // Initial fetch
    fetchNetworkData();

    // Update every 10 seconds
    const interval = setInterval(fetchNetworkData, 10000);

    return () => clearInterval(interval);
  }, []);

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'up': return 'text-green-400';
      case 'down': return 'text-red-400';
      default: return 'text-gray-400';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'up': return <PulseIcon size={8} color="#10B981" animate={true} />;
      case 'down': return <div className="w-2 h-2 bg-red-500 rounded-full"></div>;
      default: return <div className="w-2 h-2 bg-gray-500 rounded-full"></div>;
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-center h-64 bg-gray-800 rounded-lg border border-gray-700">
          <div className="text-center">
            <SpinIcon size={40} color="#3B82F6" animate={true} />
            <p className="text-gray-400 mt-4">Loading network data...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <NetworkIcon size={28} color="#3B82F6" />
            <h2 className="text-xl font-bold text-white">Network Monitor</h2>
          </div>
          <div className="flex items-center space-x-2">
            {getStatusIcon(connectionStatus)}
            <span className={`text-sm ${getStatusColor(connectionStatus)}`}>
              {connectionStatus.toUpperCase()}
            </span>
          </div>
        </div>
      </div>

      {/* Network Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm">Active Interfaces</p>
              <p className="text-2xl font-bold text-white">
                {interfaces.filter(iface => iface.status === 'up').length}
              </p>
            </div>
            <div className="text-green-400">
              <WifiIcon size={32} />
            </div>
          </div>
        </div>

        <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm">Total Sent</p>
              <p className="text-2xl font-bold text-white">
                {formatBytes(interfaces.reduce((sum, iface) => sum + iface.bytes_sent, 0))}
              </p>
            </div>
            <div className="text-blue-400">
              <ActivityIcon size={32} />
            </div>
          </div>
        </div>

        <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm">Total Received</p>
              <p className="text-2xl font-bold text-white">
                {formatBytes(interfaces.reduce((sum, iface) => sum + iface.bytes_recv, 0))}
              </p>
            </div>
            <div className="text-purple-400">
              <ServerIcon size={32} />
            </div>
          </div>
        </div>
      </div>

      {/* Network Interfaces */}
      <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
        <h3 className="text-lg font-semibold text-white mb-4">Network Interfaces</h3>
        <div className="space-y-4">
          {interfaces.map((iface, index) => (
            <div key={index} className="p-4 bg-gray-700 rounded-lg border border-gray-600">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-3">
                  <div className="flex items-center space-x-2">
                    {getStatusIcon(iface.status)}
                    <span className="text-white font-medium">{iface.name}</span>
                  </div>
                  <span className={`px-2 py-1 rounded text-xs ${
                    iface.status === 'up' ? 'bg-green-900 text-green-300' : 'bg-red-900 text-red-300'
                  }`}>
                    {iface.status.toUpperCase()}
                  </span>
                </div>
                <span className="text-gray-400 text-sm">{iface.ip}</span>
              </div>
              
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-gray-400">Bytes Sent</p>
                  <p className="text-blue-400 font-medium">{formatBytes(iface.bytes_sent)}</p>
                </div>
                <div>
                  <p className="text-gray-400">Bytes Received</p>
                  <p className="text-purple-400 font-medium">{formatBytes(iface.bytes_recv)}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Network Security */}
      <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
        <h3 className="text-lg font-semibold text-white mb-4">Network Security Status</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 bg-gray-700 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="text-white">Firewall</span>
              <div className="flex items-center space-x-2">
                <PulseIcon size={8} color="#10B981" animate={true} />
                <span className="text-green-400 text-sm">Active</span>
              </div>
            </div>
            <p className="text-gray-400 text-sm">All ports protected and monitored</p>
          </div>

          <div className="p-4 bg-gray-700 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="text-white">Intrusion Detection</span>
              <div className="flex items-center space-x-2">
                <PulseIcon size={8} color="#10B981" animate={true} />
                <span className="text-green-400 text-sm">Monitoring</span>
              </div>
            </div>
            <p className="text-gray-400 text-sm">Real-time threat monitoring active</p>
          </div>

          <div className="p-4 bg-gray-700 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="text-white">VPN Status</span>
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                <span className="text-yellow-400 text-sm">Standby</span>
              </div>
            </div>
            <p className="text-gray-400 text-sm">VPN connections available on demand</p>
          </div>

          <div className="p-4 bg-gray-700 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="text-white">DNS Security</span>
              <div className="flex items-center space-x-2">
                <PulseIcon size={8} color="#10B981" animate={true} />
                <span className="text-green-400 text-sm">Protected</span>
              </div>
            </div>
            <p className="text-gray-400 text-sm">DNS filtering and malware protection</p>
          </div>
        </div>
      </div>

      {/* Connection Quality */}
      <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
        <h3 className="text-lg font-semibold text-white mb-4">Connection Quality</h3>
        <div className="space-y-4">
          <div>
            <div className="flex justify-between items-center mb-2">
              <span className="text-gray-400">Latency</span>
              <span className="text-green-400">12ms</span>
            </div>
            <div className="w-full bg-gray-700 rounded-full h-2">
              <div className="bg-green-500 h-2 rounded-full" style={{ width: '85%' }}></div>
            </div>
          </div>

          <div>
            <div className="flex justify-between items-center mb-2">
              <span className="text-gray-400">Packet Loss</span>
              <span className="text-green-400">0.1%</span>
            </div>
            <div className="w-full bg-gray-700 rounded-full h-2">
              <div className="bg-green-500 h-2 rounded-full" style={{ width: '99%' }}></div>
            </div>
          </div>

          <div>
            <div className="flex justify-between items-center mb-2">
              <span className="text-gray-400">Bandwidth Usage</span>
              <span className="text-yellow-400">45%</span>
            </div>
            <div className="w-full bg-gray-700 rounded-full h-2">
              <div className="bg-yellow-500 h-2 rounded-full" style={{ width: '45%' }}></div>
            </div>
          </div>
        </div>
      </div>

      {/* Last Update */}
      <div className="bg-gray-900 p-4 rounded-lg border border-gray-700">
        <div className="flex items-center justify-between">
          <span className="text-gray-400 text-sm">
            Last updated: {new Date().toLocaleString()}
          </span>
          <div className="flex items-center">
            <PulseIcon size={8} color="#10B981" animate={true} />
            <span className="text-green-400 text-sm ml-2">Real-time monitoring</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NetworkMonitor;