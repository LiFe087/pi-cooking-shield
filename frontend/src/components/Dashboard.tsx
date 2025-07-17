// src/components/Dashboard.tsx
import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts';

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

interface DashboardProps {
  stats: SystemStats;
  activities: Activity[];
}

const Dashboard: React.FC<DashboardProps> = ({ stats, activities }) => {
  // Sample data for charts
  const threatTrendData = [
    { time: '00:00', threats: 2 },
    { time: '04:00', threats: 1 },
    { time: '08:00', threats: 5 },
    { time: '12:00', threats: 3 },
    { time: '16:00', threats: 7 },
    { time: '20:00', threats: 4 },
  ];

  const statusDistribution = [
    { name: 'Low', value: 65, color: '#10B981' },
    { name: 'Medium', value: 25, color: '#F59E0B' },
    { name: 'High', value: 10, color: '#EF4444' },
  ];

  return (
    <div className="space-y-6">
      {/* Quick Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm">Threats Detected</p>
              <p className="text-2xl font-bold text-red-400">{stats.threats_detected}</p>
            </div>
            <div className="text-3xl">🚨</div>
          </div>
        </div>

        <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm">Network Status</p>
              <p className={`text-lg font-semibold ${
                stats.network_status === 'SECURE' ? 'text-green-400' :
                stats.network_status === 'WARNING' ? 'text-yellow-400' : 'text-red-400'
              }`}>
                {stats.network_status}
              </p>
            </div>
            <div className="text-3xl">🛡️</div>
          </div>
        </div>

        <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm">Logs/Minute</p>
              <p className="text-2xl font-bold text-blue-400">{stats.logs_per_minute}</p>
            </div>
            <div className="text-3xl">⚡</div>
          </div>
        </div>

        <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm">CPU Usage</p>
              <p className="text-2xl font-bold text-green-400">{stats.cpu_usage}%</p>
            </div>
            <div className="text-3xl">💻</div>
          </div>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Threat Trends */}
        <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
          <h3 className="text-lg font-semibold mb-4 text-white">Threat Trends (24h)</h3>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={threatTrendData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis dataKey="time" stroke="#9CA3AF" />
              <YAxis stroke="#9CA3AF" />
              <Tooltip 
                contentStyle={{ backgroundColor: '#1F2937', border: '1px solid #374151' }}
                labelStyle={{ color: '#F3F4F6' }}
              />
              <Line type="monotone" dataKey="threats" stroke="#EF4444" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Threat Distribution */}
        <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
          <h3 className="text-lg font-semibold mb-4 text-white">Threat Distribution</h3>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie
                data={statusDistribution}
                cx="50%"
                cy="50%"
                innerRadius={40}
                outerRadius={80}
                paddingAngle={5}
                dataKey="value"
              >
                {statusDistribution.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Recent Activities */}
      <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
        <h3 className="text-lg font-semibold mb-4 text-white">Recent Security Events</h3>
        <div className="space-y-3 max-h-64 overflow-y-auto">
          {activities.slice(0, 5).map((activity) => (
            <div key={activity.id} className="flex items-center justify-between p-3 bg-gray-700 rounded-lg">
              <div className="flex-1">
                <p className="text-white text-sm">{activity.message}</p>
                <div className="flex items-center space-x-4 mt-1">
                  <span className="text-xs text-gray-400">
                    {new Date(activity.timestamp).toLocaleTimeString()}
                  </span>
                  <span className="text-xs text-gray-400">
                    Score: {activity.threat_score}
                  </span>
                  {activity.ip_address && (
                    <span className="text-xs text-gray-400">
                      IP: {activity.ip_address}
                    </span>
                  )}
                </div>
              </div>
              <span className={`px-2 py-1 rounded text-xs font-semibold ${
                activity.status === 'high' ? 'bg-red-900 text-red-200' :
                activity.status === 'medium' ? 'bg-yellow-900 text-yellow-200' :
                'bg-green-900 text-green-200'
              }`}>
                {activity.status.toUpperCase()}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;