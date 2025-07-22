import React, { useState } from 'react';
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

// Interfaces definidas aquí
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

interface SearchFilter {
  field: string;
  operator: string;
  value: string;
}

const Dashboard: React.FC<DashboardProps> = ({ stats, activities }) => {
  const [filteredActivities, setFilteredActivities] = useState<Activity[]>(activities);
  const [searchQuery, setSearchQuery] = useState('');
  const [timeRange, setTimeRange] = useState('24h');
  const [selectedCard, setSelectedCard] = useState<string | null>(null);

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
      switch (filter.field) {
        case 'severity':
          filtered = filtered.filter((activity: Activity) => activity.status === filter.value);
          break;
        case 'source':
          filtered = filtered.filter((activity: Activity) => activity.source.includes(filter.value));
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

  // Sample data for charts with more realistic values
  const threatTrendData = [
    { time: '00:00', threats: 2, normal: 45 },
    { time: '04:00', threats: 1, normal: 32 },
    { time: '08:00', threats: 5, normal: 78 },
    { time: '12:00', threats: 3, normal: 95 },
    { time: '16:00', threats: 7, normal: 120 },
    { time: '20:00', threats: 4, normal: 87 },
  ];

  const statusDistribution = [
    { name: 'Low', value: 65, color: '#10B981' },
    { name: 'Medium', value: 25, color: '#F59E0B' },
    { name: 'High', value: 10, color: '#EF4444' },
  ];

  const systemMetrics = [
    { name: 'CPU', value: stats.cpu_usage || 0, color: '#3B82F6' },
    { name: 'Memory', value: stats.memory_usage || 0, color: '#10B981' },
    { name: 'Disk', value: stats.disk_usage || 0, color: '#F59E0B' },
  ];

  // Use filteredActivities when searching, otherwise use original activities
  const displayActivities = searchQuery ? filteredActivities : activities;

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'SECURE': return 'text-green-400';
      case 'WARNING': return 'text-yellow-400';
      case 'ALERT': return 'text-red-400';
      default: return 'text-gray-400';
    }
  };

  const getStatusBgColor = (status: string) => {
    switch (status) {
      case 'SECURE': return 'bg-green-900 border-green-700';
      case 'WARNING': return 'bg-yellow-900 border-yellow-700';
      case 'ALERT': return 'bg-red-900 border-red-700 threat-blink';
      default: return 'bg-gray-900 border-gray-700';
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Advanced Search Bar */}
      <AdvancedSearchBar 
        onSearch={handleSearch}
        onTimeRangeChange={handleTimeRangeChange}
      />

      {/* Search Results Info */}
      {searchQuery && (
        <div className="bg-gray-800 p-3 rounded-lg border border-gray-700 animate-slideIn">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <ActivityIcon size={16} color="#3B82F6" />
              <span className="text-sm text-gray-400">
                Search: "{searchQuery}" • {filteredActivities.length} results • Time range: {timeRange}
              </span>
            </div>
            <button
              onClick={() => {
                setSearchQuery('');
                setFilteredActivities(activities);
              }}
              className="text-blue-400 hover:text-blue-300 text-sm transition-colors duration-200 hover-lift"
            >
              Clear search
            </button>
          </div>
        </div>
      )}

      {/* Quick Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {/* Threats Card */}
        <div 
          className={`bg-gray-800 p-6 rounded-lg border border-gray-700 cursor-pointer transition-all duration-300 hover-lift hover-glow animate-fadeIn ${
            selectedCard === 'threats' ? 'ring-2 ring-red-500' : ''
          }`}
          style={{ animationDelay: '0.1s' }}
          onClick={() => setSelectedCard(selectedCard === 'threats' ? null : 'threats')}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm flex items-center space-x-2">
                <AlertIcon size={16} color="#9CA3AF" />
                <span>Threats Detected</span>
              </p>
              <p className="text-3xl font-bold text-red-400 mt-2">
                {stats.threats_detected}
              </p>
              <div className="flex items-center mt-2">
                <PulseIcon size={6} color="#EF4444" animate={stats.threats_detected > 0} />
                <span className="text-xs text-gray-500 ml-2">Last 24 hours</span>
              </div>
            </div>
            <div className="relative">
              <AlertIcon 
                size={48} 
                color={stats.threats_detected > 5 ? "#EF4444" : "#6B7280"} 
                className={`transition-colors duration-300 ${stats.threats_detected > 5 ? 'animate-pulse' : ''}`}
              />
              {stats.threats_detected > 5 && (
                <div className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center animate-pulse">
                  !
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Network Status Card */}
        <div 
          className={`p-6 rounded-lg border cursor-pointer transition-all duration-300 hover-lift hover-glow animate-fadeIn ${getStatusBgColor(stats.network_status)} ${
            selectedCard === 'network' ? 'ring-2 ring-blue-500' : ''
          }`}
          style={{ animationDelay: '0.2s' }}
          onClick={() => setSelectedCard(selectedCard === 'network' ? null : 'network')}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm flex items-center space-x-2">
                <ShieldIcon size={16} color="#9CA3AF" />
                <span>Network Status</span>
              </p>
              <p className={`text-2xl font-bold mt-2 ${getStatusColor(stats.network_status)}`}>
                {stats.network_status}
              </p>
              <div className="flex items-center mt-2">
                <PulseIcon 
                  size={6} 
                  color={stats.network_status === 'SECURE' ? '#10B981' : '#EF4444'} 
                  animate={true} 
                />
                <span className="text-xs text-gray-500 ml-2">Real-time monitoring</span>
              </div>
            </div>
            <div className="relative">
              <ShieldIcon 
                size={48} 
                color={stats.network_status === 'SECURE' ? '#10B981' : stats.network_status === 'WARNING' ? '#F59E0B' : '#EF4444'} 
                className="transition-colors duration-300"
              />
              {stats.network_status === 'SECURE' && (
                <div className="absolute inset-0 rounded-full bg-green-400 opacity-20 animate-ping"></div>
              )}
            </div>
          </div>
        </div>

        {/* Processing Card */}
        <div 
          className={`bg-gray-800 p-6 rounded-lg border border-gray-700 cursor-pointer transition-all duration-300 hover-lift hover-glow animate-fadeIn ${
            selectedCard === 'processing' ? 'ring-2 ring-blue-500' : ''
          }`}
          style={{ animationDelay: '0.3s' }}
          onClick={() => setSelectedCard(selectedCard === 'processing' ? null : 'processing')}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm flex items-center space-x-2">
                <ActivityIcon size={16} color="#9CA3AF" />
                <span>Processing</span>
              </p>
              <p className="text-3xl font-bold text-blue-400 mt-2">
                {stats.logs_per_minute}
              </p>
              <div className="flex items-center mt-2">
                <SpinIcon size={12} color="#3B82F6" animate={stats.logs_per_minute > 0} />
                <span className="text-xs text-gray-500 ml-2">Logs per minute</span>
              </div>
            </div>
            <div className="relative">
              <ActivityIcon 
                size={48} 
                color="#3B82F6" 
                className="transition-colors duration-300"
              />
              {stats.logs_per_minute > 10 && (
                <div className="absolute inset-0 rounded-full bg-blue-400 opacity-20 animate-ping"></div>
              )}
            </div>
          </div>
        </div>

        {/* System Health Card */}
        <div 
          className={`bg-gray-800 p-6 rounded-lg border border-gray-700 cursor-pointer transition-all duration-300 hover-lift hover-glow animate-fadeIn ${
            selectedCard === 'system' ? 'ring-2 ring-green-500' : ''
          }`}
          style={{ animationDelay: '0.4s' }}
          onClick={() => setSelectedCard(selectedCard === 'system' ? null : 'system')}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm flex items-center space-x-2">
                <CpuIcon size={16} color="#9CA3AF" />
                <span>CPU Usage</span>
              </p>
              <p className="text-3xl font-bold text-green-400 mt-2">
                {stats.cpu_usage}%
              </p>
              <div className="flex items-center mt-2">
                <div className="w-16 bg-gray-700 rounded-full h-2 mr-2">
                  <div 
                    className="bg-green-400 h-2 rounded-full transition-all duration-500"
                    style={{ width: `${stats.cpu_usage}%` }}
                  ></div>
                </div>
                <span className="text-xs text-gray-500">System load</span>
              </div>
            </div>
            <div className="relative">
              <CpuIcon 
                size={48} 
                color={(stats.cpu_usage || 0) > 80 ? "#EF4444" : (stats.cpu_usage || 0) > 60 ? "#F59E0B" : "#10B981"} 
                className="transition-colors duration-300"
              />
            </div>
          </div>
        </div>
      </div>

      {/* MAIN ATTRACTION: World Map Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* World Map - Takes 2 columns for maximum impact */}
        <div className="lg:col-span-2">
          <WorldMap 
            activities={displayActivities} 
            className="h-full"
          />
        </div>

        {/* Threat Summary Panel */}
        <div className="space-y-4">
          {/* Real-time Threat Stats */}
          <div className="bg-gray-800 p-6 rounded-lg border border-gray-700 hover-lift transition-all duration-300 animate-fadeIn">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white flex items-center space-x-2">
                <AlertIcon size={20} color="#EF4444" />
                <span>Live Threats</span>
              </h3>
              <div className="flex items-center space-x-2">
                <PulseIcon size={8} color="#EF4444" animate={true} />
                <span className="text-xs text-gray-400">Active</span>
              </div>
            </div>
            
            <div className="space-y-3">
              {displayActivities
                .filter(activity => activity.status === 'high')
                .slice(0, 3)
                .map((activity, index) => (
                  <div key={activity.id} className="bg-red-900 bg-opacity-50 p-3 rounded-lg border border-red-700">
                    <div className="flex items-center justify-between">
                      <span className="text-red-200 text-sm font-medium">{activity.country}</span>
                      <span className="text-red-400 text-xs">{activity.ip_address}</span>
                    </div>
                    <p className="text-gray-300 text-xs mt-1">{activity.message}</p>
                    <div className="flex items-center justify-between mt-2">
                      <span className="text-xs text-gray-400">
                        {new Date(activity.timestamp).toLocaleTimeString()}
                      </span>
                      <span className="text-red-400 text-xs font-bold">
                        Score: {activity.threat_score}
                      </span>
                    </div>
                  </div>
                ))}
              
              {displayActivities.filter(a => a.status === 'high').length === 0 && (
                <div className="text-center py-4">
                  <ShieldIcon size={32} color="#10B981" className="mx-auto mb-2" />
                  <p className="text-green-400 text-sm">No critical threats</p>
                  <p className="text-gray-500 text-xs">System secure</p>
                </div>
              )}
            </div>
          </div>

          {/* Geographic Distribution */}
          <div className="bg-gray-800 p-6 rounded-lg border border-gray-700 hover-lift transition-all duration-300 animate-fadeIn">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center space-x-2">
              <NetworkIcon size={20} color="#3B82F6" />
              <span>Geographic Intel</span>
            </h3>
            
            <div className="space-y-2">
              {Object.entries(
                displayActivities.reduce((acc: { [key: string]: number }, activity) => {
                  if (activity.country) {
                    acc[activity.country] = (acc[activity.country] || 0) + 1;
                  }
                  return acc;
                }, {})
              )
                .sort(([, a], [, b]) => b - a)
                .slice(0, 5)
                .map(([country, count], index) => (
                  <div key={country} className="flex items-center justify-between p-2 bg-gray-700 rounded">
                    <span className="text-white text-sm">{country}</span>
                    <div className="flex items-center space-x-2">
                      <div className="w-16 bg-gray-600 rounded-full h-2">
                        <div 
                          className="bg-blue-400 h-2 rounded-full transition-all duration-500"
                          style={{ width: `${(count / Math.max(...Object.values(displayActivities.reduce((acc: { [key: string]: number }, activity) => {
                            if (activity.country) {
                              acc[activity.country] = (acc[activity.country] || 0) + 1;
                            }
                            return acc;
                          }, {})))) * 100}%` }}
                        ></div>
                      </div>
                      <span className="text-blue-400 text-sm font-semibold">{count}</span>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Threat Trends Chart */}
        <div className="bg-gray-800 p-6 rounded-lg border border-gray-700 hover-lift transition-all duration-300 animate-fadeIn" style={{ animationDelay: '0.5s' }}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-white flex items-center space-x-2">
              <ActivityIcon size={20} color="#3B82F6" />
              <span>Threat Trends (24h)</span>
            </h3>
            <div className="flex items-center space-x-2">
              <PulseIcon size={8} color="#10B981" animate={true} />
              <span className="text-xs text-gray-400">Live</span>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={threatTrendData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis dataKey="time" stroke="#9CA3AF" fontSize={12} />
              <YAxis stroke="#9CA3AF" fontSize={12} />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: '#1F2937', 
                  border: '1px solid #374151',
                  borderRadius: '8px'
                }}
                labelStyle={{ color: '#F3F4F6' }}
              />
              <Line 
                type="monotone" 
                dataKey="threats" 
                stroke="#EF4444" 
                strokeWidth={3}
                dot={{ fill: '#EF4444', strokeWidth: 2, r: 4 }}
                activeDot={{ r: 6, stroke: '#EF4444', strokeWidth: 2 }}
              />
              <Line 
                type="monotone" 
                dataKey="normal" 
                stroke="#10B981" 
                strokeWidth={2}
                strokeDasharray="5 5"
                dot={{ fill: '#10B981', strokeWidth: 2, r: 3 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* System Metrics Chart */}
        <div className="bg-gray-800 p-6 rounded-lg border border-gray-700 hover-lift transition-all duration-300 animate-fadeIn" style={{ animationDelay: '0.6s' }}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-white flex items-center space-x-2">
              <CpuIcon size={20} color="#10B981" />
              <span>System Performance</span>
            </h3>
            <div className="flex items-center space-x-2">
              <SpinIcon size={16} color="#10B981" animate={true} />
              <span className="text-xs text-gray-400">Monitoring</span>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={systemMetrics}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis dataKey="name" stroke="#9CA3AF" fontSize={12} />
              <YAxis stroke="#9CA3AF" fontSize={12} />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: '#1F2937', 
                  border: '1px solid #374151',
                  borderRadius: '8px'
                }}
                labelStyle={{ color: '#F3F4F6' }}
              />
              <Bar 
                dataKey="value" 
                fill="#3B82F6"
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
      

      {/* Recent Activities */}
      <div className="bg-gray-800 p-6 rounded-lg border border-gray-700 hover-lift transition-all duration-300 animate-fadeIn" style={{ animationDelay: '0.7s' }}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-white flex items-center space-x-2">
            <NetworkIcon size={20} color="#F59E0B" />
            <span>Recent Security Events</span>
          </h3>
          <div className="flex items-center space-x-4">
            <span className="text-sm text-gray-400 flex items-center space-x-1">
              <ActivityIcon size={16} color="#9CA3AF" />
              <span>Showing {displayActivities.length} events</span>
            </span>
            <PulseIcon size={8} color="#F59E0B" animate={displayActivities.length > 0} />
          </div>
        </div>
        
        <div className="space-y-3 max-h-80 overflow-y-auto">
          {displayActivities.slice(0, 10).map((activity: Activity, index) => (
            <div 
              key={activity.id} 
              className="flex items-center justify-between p-4 bg-gray-700 rounded-lg hover:bg-gray-600 transition-all duration-200 cursor-pointer hover-lift animate-slideIn"
              style={{ animationDelay: `${0.1 * index}s` }}
            >
              <div className="flex-1">
                <div className="flex items-center space-x-3">
                  <div className={`w-3 h-3 rounded-full ${
                    activity.status === 'high' ? 'bg-red-400 animate-pulse' :
                    activity.status === 'medium' ? 'bg-yellow-400' :
                    'bg-green-400'
                  }`}></div>
                  <p className="text-white text-sm font-medium">{activity.message}</p>
                </div>
                <div className="flex items-center space-x-4 mt-2 ml-6">
                  <span className="text-xs text-gray-400 flex items-center space-x-1">
                    <ActivityIcon size={12} color="#9CA3AF" />
                    <span>{new Date(activity.timestamp).toLocaleTimeString()}</span>
                  </span>
                  <span className="text-xs text-gray-400">
                    Score: <span className={`font-semibold ${
                      activity.threat_score > 0.7 ? 'text-red-400' :
                      activity.threat_score > 0.4 ? 'text-yellow-400' :
                      'text-green-400'
                    }`}>{activity.threat_score}</span>
                  </span>
                  {activity.ip_address && (
                    <span className="text-xs text-gray-400 flex items-center space-x-1">
                      <NetworkIcon size={12} color="#9CA3AF" />
                      <span>{activity.ip_address}</span>
                    </span>
                  )}
                  {activity.country && (
                    <span className="text-xs text-blue-400">{activity.country}</span>
                  )}
                </div>
              </div>
              <div className="ml-4">
                <span className={`px-3 py-1 rounded-full text-xs font-semibold transition-all duration-200 ${
                  activity.status === 'high' ? 'bg-red-900 text-red-200 ring-1 ring-red-500' :
                  activity.status === 'medium' ? 'bg-yellow-900 text-yellow-200 ring-1 ring-yellow-500' :
                  'bg-green-900 text-green-200 ring-1 ring-green-500'
                }`}>
                  {activity.status.toUpperCase()}
                </span>
              </div>
            </div>
          ))}
          
          {displayActivities.length === 0 && searchQuery && (
            <div className="text-center py-12 animate-fadeIn">
              <AlertIcon size={48} color="#6B7280" className="mx-auto mb-4 opacity-50" />
              <p className="text-gray-400 text-lg">No events match your search criteria</p>
              <p className="text-gray-500 text-sm mt-2">Try adjusting your filters or search terms</p>
            </div>
          )}
          
          {displayActivities.length === 0 && !searchQuery && (
            <div className="text-center py-12 animate-fadeIn">
              <PulseIcon size={48} color="#10B981" animate={true} className="mx-auto mb-4" />
              <p className="text-gray-400 text-lg">System monitoring active</p>
              <p className="text-gray-500 text-sm mt-2">Waiting for security events...</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;