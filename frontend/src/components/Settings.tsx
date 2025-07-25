// src/components/Settings.tsx - FIXED: No props required
import React, { useState } from 'react';
import { 
  SettingsIcon, 
  SecurityIcon, 
  NetworkIcon, 
  AlertIcon,
  CheckIcon,
  InfoIcon 
} from './Icons';

const Settings: React.FC = () => {
  const [notifications, setNotifications] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [darkMode, setDarkMode] = useState(true);
  const [threatAlerts, setThreatAlerts] = useState(true);
  const [logLevel, setLogLevel] = useState('INFO');
  const [refreshInterval, setRefreshInterval] = useState(5000);

  const handleSave = () => {
    // Simulate saving settings
    alert('Settings saved successfully!');
  };

  const handleReset = () => {
    // Reset to defaults
    setNotifications(true);
    setAutoRefresh(true);
    setDarkMode(true);
    setThreatAlerts(true);
    setLogLevel('INFO');
    setRefreshInterval(5000);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
        <div className="flex items-center space-x-3">
          <SettingsIcon size={28} color="#3B82F6" />
          <h2 className="text-xl font-bold text-white">System Settings</h2>
        </div>
      </div>

      {/* General Settings */}
      <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
          <InfoIcon size={20} className="mr-2" />
          General Settings
        </h3>
        
        <div className="space-y-4">
          {/* Auto Refresh */}
          <div className="flex items-center justify-between">
            <div>
              <label className="text-white font-medium">Auto Refresh</label>
              <p className="text-gray-400 text-sm">Automatically update dashboard data</p>
            </div>
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

          {/* Refresh Interval */}
          <div className="flex items-center justify-between">
            <div>
              <label className="text-white font-medium">Refresh Interval</label>
              <p className="text-gray-400 text-sm">How often to update data</p>
            </div>
            <select
              value={refreshInterval}
              onChange={(e) => setRefreshInterval(Number(e.target.value))}
              className="bg-gray-700 border border-gray-600 text-white rounded px-3 py-1"
            >
              <option value={1000}>1 second</option>
              <option value={5000}>5 seconds</option>
              <option value={10000}>10 seconds</option>
              <option value={30000}>30 seconds</option>
              <option value={60000}>1 minute</option>
            </select>
          </div>

          {/* Dark Mode */}
          <div className="flex items-center justify-between">
            <div>
              <label className="text-white font-medium">Dark Mode</label>
              <p className="text-gray-400 text-sm">Use dark theme interface</p>
            </div>
            <button
              onClick={() => setDarkMode(!darkMode)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                darkMode ? 'bg-blue-600' : 'bg-gray-600'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  darkMode ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
        </div>
      </div>

      {/* Security Settings */}
      <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
          <SecurityIcon size={20} className="mr-2" />
          Security Settings
        </h3>
        
        <div className="space-y-4">
          {/* Threat Alerts */}
          <div className="flex items-center justify-between">
            <div>
              <label className="text-white font-medium">Threat Alerts</label>
              <p className="text-gray-400 text-sm">Enable real-time threat notifications</p>
            </div>
            <button
              onClick={() => setThreatAlerts(!threatAlerts)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                threatAlerts ? 'bg-blue-600' : 'bg-gray-600'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  threatAlerts ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          {/* Log Level */}
          <div className="flex items-center justify-between">
            <div>
              <label className="text-white font-medium">Log Level</label>
              <p className="text-gray-400 text-sm">Minimum level for log collection</p>
            </div>
            <select
              value={logLevel}
              onChange={(e) => setLogLevel(e.target.value)}
              className="bg-gray-700 border border-gray-600 text-white rounded px-3 py-1"
            >
              <option value="DEBUG">Debug</option>
              <option value="INFO">Info</option>
              <option value="WARNING">Warning</option>
              <option value="ERROR">Error</option>
              <option value="CRITICAL">Critical</option>
            </select>
          </div>

          {/* Notifications */}
          <div className="flex items-center justify-between">
            <div>
              <label className="text-white font-medium">Push Notifications</label>
              <p className="text-gray-400 text-sm">Browser notifications for alerts</p>
            </div>
            <button
              onClick={() => setNotifications(!notifications)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                notifications ? 'bg-blue-600' : 'bg-gray-600'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  notifications ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
        </div>
      </div>

      {/* Network Settings */}
      <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
          <NetworkIcon size={20} className="mr-2" />
          Network Settings
        </h3>
        
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-white font-medium mb-2">API Endpoint</label>
              <input
                type="text"
                value="http://localhost:5000"
                className="w-full bg-gray-700 border border-gray-600 text-white rounded px-3 py-2"
                readOnly
              />
            </div>
            
            <div>
              <label className="block text-white font-medium mb-2">Connection Timeout</label>
              <select className="w-full bg-gray-700 border border-gray-600 text-white rounded px-3 py-2">
                <option>5 seconds</option>
                <option>10 seconds</option>
                <option>30 seconds</option>
                <option>60 seconds</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* System Information */}
      <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
        <h3 className="text-lg font-semibold text-white mb-4">System Information</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-gray-400">Version:</span>
              <span className="text-white">PI-Cooking-Shield v4.0.1</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Universidad:</span>
              <span className="text-white">UPQ - IRT191</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Frontend:</span>
              <span className="text-white">React 18 + TypeScript</span>
            </div>
          </div>
          
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-gray-400">Backend:</span>
              <span className="text-white">Flask + Python</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Build Date:</span>
              <span className="text-white">{new Date().toLocaleDateString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">License:</span>
              <span className="text-white">MIT</span>
            </div>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex justify-end space-x-4">
        <button
          onClick={handleReset}
          className="bg-gray-600 hover:bg-gray-700 text-white px-6 py-2 rounded-md transition-colors"
        >
          Reset to Defaults
        </button>
        <button
          onClick={handleSave}
          className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-md transition-colors flex items-center space-x-2"
        >
          <CheckIcon size={16} />
          <span>Save Settings</span>
        </button>
      </div>
    </div>
  );
};

export default Settings;