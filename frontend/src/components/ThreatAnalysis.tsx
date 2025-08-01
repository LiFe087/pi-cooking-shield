// src/components/ThreatAnalysis.tsx - FIXED: No props required
import React, { useState, useEffect } from 'react';
import { 
  ThreatIcon, 
  SecurityIcon, 
  ScanIcon, 
  AlertIcon, 
  ShieldIcon,
  SpinIcon,
  PulseIcon 
} from './Icons';

const ThreatAnalysis: React.FC = () => {
  const [scanning, setScanning] = useState(false);
  const [threatLevel, setThreatLevel] = useState('LOW');
  const [lastScan, setLastScan] = useState<Date | null>(null);
  const [activities, setActivities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch real threat activities from backend
  useEffect(() => {
    fetch('/api/activity')
      .then(res => res.json())
      .then(data => {
        setActivities(data);
        setLoading(false);
      });
  }, []);

  // Simulate threat scanning (optional, keep for UI)
  const runThreatScan = async () => {
    setScanning(true);
    setTimeout(() => {
      const levels = ['LOW', 'MEDIUM', 'HIGH'];
      const randomLevel = levels[Math.floor(Math.random() * levels.length)];
      setThreatLevel(randomLevel);
      setLastScan(new Date());
      setScanning(false);
    }, 3000);
  };

  const getThreatColor = (level: string) => {
    switch (level) {
      case 'HIGH': return 'text-red-400';
      case 'MEDIUM': return 'text-yellow-400';
      case 'LOW': return 'text-green-400';
      default: return 'text-gray-400';
    }
  };

  const getThreatIcon = (level: string) => {
    switch (level) {
      case 'HIGH': return <AlertIcon size={32} color="#EF4444" />;
      case 'MEDIUM': return <ThreatIcon size={32} color="#F59E0B" />;
      case 'LOW': return <ShieldIcon size={32} color="#10B981" />;
      default: return <SecurityIcon size={32} color="#6B7280" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <ThreatIcon size={28} color="#3B82F6" />
            <h2 className="text-xl font-bold text-white">Threat Analysis</h2>
          </div>
          <button
            onClick={runThreatScan}
            disabled={scanning}
            className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white px-4 py-2 rounded-md transition-colors flex items-center space-x-2"
          >
            {scanning ? <SpinIcon size={16} animate={true} /> : <ScanIcon size={16} />}
            <span>{scanning ? 'Scanning...' : 'Run Scan'}</span>
          </button>
        </div>
      </div>

      {/* Current Threat Level */}
      <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
        <h3 className="text-lg font-semibold text-white mb-4">Current Threat Level</h3>
        <div className="flex items-center justify-center py-8">
          <div className="text-center">
            <div className="mb-4">
              {getThreatIcon(threatLevel)}
            </div>
            <div className={`text-3xl font-bold ${getThreatColor(threatLevel)} mb-2`}>
              {threatLevel}
            </div>
            <div className="text-gray-400 text-sm">
              {lastScan ? `Last scan: ${lastScan.toLocaleString()}` : 'No scan performed'}
            </div>
          </div>
        </div>
      </div>

      {/* Threat Categories */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-lg font-semibold text-white">Malware</h4>
            <div className="flex items-center">
              <PulseIcon size={8} color="#10B981" animate={true} />
              <span className="text-green-400 text-sm ml-2">Clean</span>
            </div>
          </div>
          <p className="text-gray-400 text-sm">No malware signatures detected in network traffic.</p>
        </div>

        <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-lg font-semibold text-white">Intrusion</h4>
            <div className="flex items-center">
              <PulseIcon size={8} color="#F59E0B" animate={true} />
              <span className="text-yellow-400 text-sm ml-2">Monitoring</span>
            </div>
          </div>
          <p className="text-gray-400 text-sm">Active monitoring for unauthorized access attempts.</p>
        </div>

        <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-lg font-semibold text-white">Anomalies</h4>
            <div className="flex items-center">
              <PulseIcon size={8} color="#10B981" animate={true} />
              <span className="text-green-400 text-sm ml-2">Normal</span>
            </div>
          </div>
          <p className="text-gray-400 text-sm">Network behavior within expected parameters.</p>
        </div>
      </div>

      {/* Scan Progress */}
      {scanning && (
        <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
          <h3 className="text-lg font-semibold text-white mb-4">Scanning in Progress</h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-gray-400">Network Traffic Analysis</span>
              <SpinIcon size={16} animate={true} />
            </div>
            <div className="w-full bg-gray-700 rounded-full h-2">
              <div className="bg-blue-600 h-2 rounded-full animate-pulse" style={{ width: '100%' }}></div>
            </div>
          </div>
        </div>
      )}

      {/* Recent Detections - Real Data Table */}
      <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
        <h3 className="text-lg font-semibold text-white mb-4">Recent Detections</h3>
        {loading ? (
          <div className="text-gray-400">Loading...</div>
        ) : activities.length === 0 ? (
          <div className="text-gray-400">No threat activity detected.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr>
                  <th className="px-2 py-1 text-left text-gray-400">Time</th>
                  <th className="px-2 py-1 text-left text-gray-400">Severity</th>
                  <th className="px-2 py-1 text-left text-gray-400">Message</th>
                  <th className="px-2 py-1 text-left text-gray-400">Country</th>
                  <th className="px-2 py-1 text-left text-gray-400">Service</th>
                  <th className="px-2 py-1 text-left text-gray-400">Protocol</th>
                  <th className="px-2 py-1 text-left text-gray-400">Device</th>
                </tr>
              </thead>
              <tbody>
                {activities.slice(0, 10).map(act => (
                  <tr key={act.id} className="border-b border-gray-700 hover:bg-gray-700">
                    <td className="px-2 py-1 text-gray-300">{new Date(act.timestamp).toLocaleString()}</td>
                    <td className="px-2 py-1 font-bold">
                      <span className={
                        act.status === 'high' ? 'text-red-400' :
                        act.status === 'medium' ? 'text-yellow-400' : 'text-green-400'
                      }>
                        {act.alert_level}
                      </span>
                    </td>
                    <td className="px-2 py-1 text-gray-200">{act.message}</td>
                    <td className="px-2 py-1 text-gray-200">{act.dst_country || '-'}</td>
                    <td className="px-2 py-1 text-gray-200">{act.service || '-'}</td>
                    <td className="px-2 py-1 text-gray-200">{act.protocol || '-'}</td>
                    <td className="px-2 py-1 text-gray-200">{act.src_name ? `${act.src_name} (${act.dev_type || ''})` : '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default ThreatAnalysis;