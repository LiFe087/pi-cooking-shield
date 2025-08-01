// src/components/SecurityMonitor.tsx - Monitor de Seguridad Avanzado
import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell } from 'recharts';
import { 
  ShieldIcon, 
  AlertIcon, 
  NetworkIcon,
  PulseIcon,
  SpinIcon,
  WarningAlertIcon,
  CriticalIcon,
  FireIcon,
  GlobeIcon,
  ActivityIcon,
  RefreshIcon,
  ClockIcon,
  DenyIcon,
  AcceptIcon
} from './Icons';

// ===================================================================
// INTERFACES Y TIPOS
// ===================================================================

interface SecurityMetrics {
  suspicious_processes: SuspiciousProcess[];
  active_connections: NetworkConnection[];
  auth_attempts: AuthAttempt[];
  modified_files: ModifiedFile[];
  port_scans: PortScan[];
  failed_logins: number;
  suspicious_activity_score: number;
  last_scan: string;
  alerts_today: number;
  blocked_ips: string[];
  threat_level: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  // NUEVO: Datos de análisis de logs
  log_analysis?: {
    total_logs_today: number;
    total_logs_week: number;
    threat_distribution: { low: number; medium: number; high: number };
    protocol_analysis: Record<string, number>;
    denial_rate: number;
    top_threat_sources: Record<string, number>;
    hourly_trend: Array<{ hour: number; normal: number; threats: number; total: number }>;
    weekly_trend: Array<{ date: string; normal: number; threats: number; total: number }>;
    geographic_threats: Record<string, number>;
    threat_escalation: number;
  };
  real_time_stats?: {
    total_logs_today: number;
    total_logs_week: number;
    threat_distribution: { low: number; medium: number; high: number };
    denial_rate: number;
    threat_escalation: number;
  };
  chart_data?: {
    hourly_trend: Array<{ hour: number; normal: number; threats: number; total: number }>;
    weekly_trend: Array<{ date: string; normal: number; threats: number; total: number }>;
    threat_pie_chart: Array<{ name: string; value: number; color: string }>;
    geographic_data: Record<string, number>;
    protocol_distribution: Record<string, number>;
  };
}

interface SuspiciousProcess {
  pid: number;
  name: string;
  user: string;
  cpu_percent: number;
  memory_percent: number;
  command: string;
  risk_score: number;
  reason: string;
  started_at: string;
}

interface NetworkConnection {
  local_ip: string;
  local_port: number;
  remote_ip: string;
  remote_port: number;
  status: string;
  process: string;
  country: string;
  is_suspicious: boolean;
  risk_level: 'LOW' | 'MEDIUM' | 'HIGH';
}

interface AuthAttempt {
  timestamp: string;
  username: string;
  source_ip: string;
  success: boolean;
  method: string;
  country: string;
  is_suspicious: boolean;
}

interface ModifiedFile {
  path: string;
  timestamp: string;
  action: 'created' | 'modified' | 'deleted';
  user: string;
  is_critical: boolean;
  risk_score: number;
}

interface PortScan {
  source_ip: string;
  target_ports: number[];
  timestamp: string;
  country: string;
  intensity: 'LOW' | 'MEDIUM' | 'HIGH';
  blocked: boolean;
}

interface SecurityAlert {
  id: string;
  type: 'process' | 'network' | 'auth' | 'file' | 'scan';
  level: 'warning' | 'critical';
  title: string;
  message: string;
  details: any;
  timestamp: Date;
  source_ip?: string;
  country?: string;
}

// ===================================================================
// COMPONENTE DE ALERTA DE SEGURIDAD
// ===================================================================

const SecurityAlertToast: React.FC<{ alert: SecurityAlert; onClose: () => void }> = ({ alert, onClose }) => {
  useEffect(() => {
    const timer = setTimeout(onClose, 8000); // Mantener más tiempo las alertas de seguridad
    return () => clearTimeout(timer);
  }, [onClose]);

  const bgColor = alert.level === 'critical' ? 'bg-red-800' : 'bg-orange-700';
  const borderColor = alert.level === 'critical' ? 'border-red-500' : 'border-orange-500';
  const icon = alert.level === 'critical' ? <CriticalIcon size={20} color="#EF4444" /> : <WarningAlertIcon size={20} color="#F59E0B" />;

  return createPortal(
    <div className={`fixed top-6 right-6 z-50 ${bgColor} ${borderColor} border text-white px-6 py-4 rounded-lg shadow-xl animate-pulse max-w-md`}>
      <div className="flex items-start">
        <div className="mt-0.5 mr-3 flex-shrink-0">
          {icon}
        </div>
        <div className="flex-1">
          <div className="font-bold text-sm flex items-center mb-1">
            🛡️ ALERTA DE SEGURIDAD - {alert.level.toUpperCase()}
          </div>
          <div className="font-medium text-sm mb-1">{alert.title}</div>
          <div className="text-sm mb-2">{alert.message}</div>
          {alert.source_ip && (
            <div className="text-xs opacity-90">
              IP: {alert.source_ip} {alert.country && `(${alert.country})`}
            </div>
          )}
          <div className="text-xs opacity-80">
            {alert.timestamp.toLocaleTimeString('es-MX')}
          </div>
        </div>
        <button 
          onClick={onClose}
          className="ml-2 text-white hover:text-gray-300 text-lg font-bold"
        >
          ×
        </button>
      </div>
    </div>,
    document.body
  );
};

// ===================================================================
// COMPONENTE PRINCIPAL
// ===================================================================

interface SecurityMonitorProps {
  refreshInterval?: number;
}

const SecurityMonitor: React.FC<SecurityMonitorProps> = ({ 
  refreshInterval = 10000 // 10 segundos para datos de seguridad
}) => {
  const [securityMetrics, setSecurityMetrics] = useState<SecurityMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedTab, setSelectedTab] = useState<'overview' | 'analytics' | 'processes' | 'network' | 'auth' | 'files'>('overview');
  const [alerts, setAlerts] = useState<SecurityAlert[]>([]);
  const [alertHistory, setAlertHistory] = useState<SecurityAlert[]>([]);
  const [autoBlock, setAutoBlock] = useState(true);
  const [monitoringEnabled, setMonitoringEnabled] = useState(true);

  // Fetch security data
  const fetchSecurityData = async () => {
    try {
      const API_BASE_URL = process.env.NODE_ENV === 'development' 
        ? 'http://localhost:5000' 
        : 'http://192.168.101.4:5000';
      
      const response = await fetch(`${API_BASE_URL}/api/security/monitor`);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: Failed to fetch security data`);
      }
      const data = await response.json();
      
      setSecurityMetrics(data);
      
      // Analizar y generar alertas
      analyzeSecurityThreats(data);
      
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
      console.error('Failed to fetch security data:', err);
    } finally {
      setLoading(false);
    }
  };

  // Analizar amenazas y generar alertas
  const analyzeSecurityThreats = (data: SecurityMetrics) => {
    const newAlerts: SecurityAlert[] = [];

    // Procesos sospechosos
    data.suspicious_processes?.forEach(proc => {
      if (proc.risk_score > 7) {
        newAlerts.push({
          id: `proc-${proc.pid}-${Date.now()}`,
          type: 'process',
          level: proc.risk_score > 8.5 ? 'critical' : 'warning',
          title: 'Proceso Sospechoso Detectado',
          message: `${proc.name} (PID: ${proc.pid}) - ${proc.reason}`,
          details: proc,
          timestamp: new Date()
        });
      }
    });

    // Conexiones sospechosas
    data.active_connections?.forEach(conn => {
      if (conn.is_suspicious) {
        newAlerts.push({
          id: `conn-${conn.remote_ip}-${Date.now()}`,
          type: 'network',
          level: conn.risk_level === 'HIGH' ? 'critical' : 'warning',
          title: 'Conexión Sospechosa',
          message: `Conexión a ${conn.remote_ip}:${conn.remote_port} por ${conn.process}`,
          details: conn,
          timestamp: new Date(),
          source_ip: conn.remote_ip,
          country: conn.country
        });
      }
    });

    // Intentos de autenticación fallidos
    const recentFailedLogins = data.auth_attempts?.filter(attempt => 
      !attempt.success && 
      new Date().getTime() - new Date(attempt.timestamp).getTime() < 300000 // últimos 5 minutos
    ).length || 0;

    if (recentFailedLogins > 5) {
      newAlerts.push({
        id: `auth-${Date.now()}`,
        type: 'auth',
        level: recentFailedLogins > 10 ? 'critical' : 'warning',
        title: 'Ataques de Fuerza Bruta',
        message: `${recentFailedLogins} intentos de login fallidos en 5 minutos`,
        details: { failed_count: recentFailedLogins },
        timestamp: new Date()
      });
    }

    // Archivos críticos modificados
    data.modified_files?.forEach(file => {
      if (file.is_critical) {
        newAlerts.push({
          id: `file-${Date.now()}-${file.path}`,
          type: 'file',
          level: 'critical',
          title: 'Archivo Crítico Modificado',
          message: `${file.action}: ${file.path} por ${file.user}`,
          details: file,
          timestamp: new Date()
        });
      }
    });

    // Port scans
    data.port_scans?.forEach(scan => {
      if (scan.intensity !== 'LOW') {
        newAlerts.push({
          id: `scan-${scan.source_ip}-${Date.now()}`,
          type: 'scan',
          level: scan.intensity === 'HIGH' ? 'critical' : 'warning',
          title: 'Port Scan Detectado',
          message: `${scan.intensity} intensity scan desde ${scan.source_ip}`,
          details: scan,
          timestamp: new Date(),
          source_ip: scan.source_ip,
          country: scan.country
        });
      }
    });

    // Evitar alertas duplicadas recientes
    const recentAlerts = alertHistory.filter(alert => 
      Date.now() - alert.timestamp.getTime() < 300000 // últimos 5 minutos
    );
    
    const filteredNewAlerts = newAlerts.filter(newAlert => 
      !recentAlerts.some(recent => 
        recent.type === newAlert.type && 
        recent.source_ip === newAlert.source_ip &&
        recent.title === newAlert.title
      )
    );

    if (filteredNewAlerts.length > 0) {
      setAlerts(prev => [...prev, ...filteredNewAlerts]);
      setAlertHistory(prev => [...prev, ...filteredNewAlerts].slice(-100));
    }
  };

  // Eliminar alerta
  const dismissAlert = (alertId: string) => {
    setAlerts(prev => prev.filter(alert => alert.id !== alertId));
  };

  // Bloquear IP
  const blockIP = async (ip: string) => {
    try {
      const API_BASE_URL = process.env.NODE_ENV === 'development' 
        ? 'http://localhost:5000' 
        : 'http://192.168.101.4:5000';
      
      await fetch(`${API_BASE_URL}/api/security/block-ip`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ip, reason: 'Manual block from security monitor' })
      });
      
      // Actualizar datos
      fetchSecurityData();
    } catch (err) {
      console.error('Failed to block IP:', err);
    }
  };

  useEffect(() => {
    if (monitoringEnabled) {
      fetchSecurityData();
      const interval = setInterval(fetchSecurityData, refreshInterval);
      return () => clearInterval(interval);
    }
  }, [refreshInterval, monitoringEnabled]);

  // Funciones de utilidad
  const getThreatLevelColor = (level: string) => {
    switch (level) {
      case 'CRITICAL': return 'text-red-400 bg-red-900/30 border-red-500';
      case 'HIGH': return 'text-orange-400 bg-orange-900/30 border-orange-500';
      case 'MEDIUM': return 'text-yellow-400 bg-yellow-900/30 border-yellow-500';
      default: return 'text-green-400 bg-green-900/30 border-green-500';
    }
  };

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString('es-MX');
  };

  if (loading && !securityMetrics) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-center h-64 bg-gray-800 rounded-lg border border-gray-700">
          <div className="text-center">
            <SpinIcon size={40} color="#3B82F6" animate={true} />
            <p className="text-gray-400 mt-4">Loading security data...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error && !securityMetrics) {
    return (
      <div className="space-y-6">
        <div className="bg-red-900/20 border border-red-500 rounded-lg p-6">
          <div className="flex items-center">
            <AlertIcon size={24} color="#EF4444" />
            <h3 className="text-red-400 font-semibold ml-3">Security Monitor Error</h3>
          </div>
          <p className="text-red-300 mt-2">{error}</p>
          <p className="text-gray-400 mt-2 text-sm">
            Security monitoring endpoint may not be available.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header con controles */}
      <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center">
            <ShieldIcon size={32} color="#10B981" className="mr-3" />
            <div>
              <h2 className="text-2xl font-bold text-white">Security Monitor</h2>
              <p className="text-gray-400 text-sm">Real-time threat detection and analysis</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            <div className={`px-4 py-2 rounded-lg border ${getThreatLevelColor(securityMetrics?.threat_level || 'LOW')}`}>
              <div className="flex items-center">
                <PulseIcon size={12} animate={true} className="mr-2" />
                <span className="font-bold">{securityMetrics?.threat_level || 'UNKNOWN'}</span>
              </div>
            </div>
            
            <button
              onClick={() => setMonitoringEnabled(!monitoringEnabled)}
              className={`px-4 py-2 rounded-lg border transition ${
                monitoringEnabled 
                  ? 'bg-green-900 text-green-300 border-green-500' 
                  : 'bg-gray-700 text-gray-300 border-gray-600'
              }`}
            >
              {monitoringEnabled ? 'ACTIVE' : 'PAUSED'}
            </button>
          </div>
        </div>

        {/* Métricas rápidas basadas en logs reales */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="bg-gray-700 p-4 rounded-lg">
            <div className="text-2xl font-bold text-blue-400">
              {securityMetrics?.real_time_stats?.total_logs_today || 0}
            </div>
            <div className="text-sm text-gray-400">Logs Today</div>
          </div>
          
          <div className="bg-gray-700 p-4 rounded-lg">
            <div className="text-2xl font-bold text-green-400">
              {securityMetrics?.real_time_stats?.threat_distribution?.low || 0}
            </div>
            <div className="text-sm text-gray-400">Low Threats</div>
          </div>
          
          <div className="bg-gray-700 p-4 rounded-lg">
            <div className="text-2xl font-bold text-yellow-400">
              {securityMetrics?.real_time_stats?.threat_distribution?.medium || 0}
            </div>
            <div className="text-sm text-gray-400">Medium Threats</div>
          </div>
          
          <div className="bg-gray-700 p-4 rounded-lg">
            <div className="text-2xl font-bold text-red-400">
              {securityMetrics?.real_time_stats?.threat_distribution?.high || 0}
            </div>
            <div className="text-sm text-gray-400">High Threats</div>
          </div>
          
          <div className="bg-gray-700 p-4 rounded-lg">
            <div className="text-2xl font-bold text-purple-400">
              {securityMetrics?.real_time_stats?.total_logs_week || 0}
            </div>
            <div className="text-sm text-gray-400">Week Total</div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-gray-800 border border-gray-700 rounded-lg">
        <div className="flex border-b border-gray-700">
          {[
            { id: 'overview', label: 'Overview', icon: <ActivityIcon size={16} /> },
            { id: 'analytics', label: 'Analytics', icon: <RefreshIcon size={16} /> },
            { id: 'processes', label: 'Processes', icon: <FireIcon size={16} /> },
            { id: 'network', label: 'Network', icon: <NetworkIcon size={16} /> },
            { id: 'auth', label: 'Authentication', icon: <ShieldIcon size={16} /> },
            { id: 'files', label: 'File Changes', icon: <AlertIcon size={16} /> },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setSelectedTab(tab.id as any)}
              className={`flex items-center px-6 py-4 text-sm font-medium transition ${
                selectedTab === tab.id
                  ? 'text-blue-400 border-b-2 border-blue-400 bg-gray-700'
                  : 'text-gray-400 hover:text-gray-300'
              }`}
            >
              {tab.icon}
              <span className="ml-2">{tab.label}</span>
            </button>
          ))}
        </div>

        <div className="p-6">
          {selectedTab === 'overview' && (
            <div className="space-y-6">
              {/* Security Score */}
              <div className="bg-gray-700 p-6 rounded-lg">
                <h3 className="text-lg font-semibold text-white mb-4">Security Score</h3>
                <div className="flex items-center">
                  <div className="flex-1">
                    <div className="w-full bg-gray-600 rounded-full h-4">
                      <div 
                        className={`h-4 rounded-full transition-all duration-300 ${
                          (securityMetrics?.suspicious_activity_score || 0) > 7 ? 'bg-red-500' :
                          (securityMetrics?.suspicious_activity_score || 0) > 4 ? 'bg-yellow-500' :
                          'bg-green-500'
                        }`}
                        style={{ width: `${((securityMetrics?.suspicious_activity_score || 0) / 10) * 100}%` }}
                      ></div>
                    </div>
                  </div>
                  <div className="ml-4 text-2xl font-bold text-white">
                    {(securityMetrics?.suspicious_activity_score || 0).toFixed(1)}/10
                  </div>
                </div>
                <p className="text-sm text-gray-400 mt-2">
                  Higher scores indicate more suspicious activity
                </p>
              </div>

              {/* Recent Alerts */}
              <div className="bg-gray-700 p-6 rounded-lg">
                <h3 className="text-lg font-semibold text-white mb-4">Recent Security Events</h3>
                {alertHistory.slice(-5).reverse().map((alert, index) => (
                  <div key={index} className="flex items-center justify-between py-2 border-b border-gray-600 last:border-b-0">
                    <div className="flex items-center">
                      <div className={`w-3 h-3 rounded-full mr-3 ${
                        alert.level === 'critical' ? 'bg-red-500' : 'bg-yellow-500'
                      }`}></div>
                      <div>
                        <div className="text-white text-sm">{alert.title}</div>
                        <div className="text-gray-400 text-xs">{alert.message}</div>
                      </div>
                    </div>
                    <div className="text-gray-400 text-xs">
                      {alert.timestamp.toLocaleTimeString()}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {selectedTab === 'analytics' && (
            <div className="space-y-6">
              {/* Live Feed Stats */}
              <div className="bg-gray-700 p-6 rounded-lg">
                <h3 className="text-lg font-semibold text-white mb-4">
                  🔴 Live Security Feed
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-400">
                      {securityMetrics?.real_time_stats?.threat_distribution?.low || 0}
                    </div>
                    <div className="text-sm text-gray-400">Low</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-yellow-400">
                      {securityMetrics?.real_time_stats?.threat_distribution?.medium || 0}
                    </div>
                    <div className="text-sm text-gray-400">Med</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-red-400">
                      {securityMetrics?.real_time_stats?.threat_distribution?.high || 0}
                    </div>
                    <div className="text-sm text-gray-400">High</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-400">
                      {(securityMetrics?.real_time_stats?.threat_distribution?.low || 0) + 
                       (securityMetrics?.real_time_stats?.threat_distribution?.medium || 0) + 
                       (securityMetrics?.real_time_stats?.threat_distribution?.high || 0)}
                    </div>
                    <div className="text-sm text-gray-400">Total</div>
                  </div>
                </div>
                <p className="text-xs text-gray-400 text-center">
                  Live security events • Last updated: {new Date().toLocaleTimeString()}
                </p>
              </div>

              {/* Gráficas Corregidas */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                
                {/* Threat Distribution - Gráfico de Pastel CORREGIDO */}
                <div className="bg-gray-700 p-6 rounded-lg">
                  <h3 className="text-lg font-semibold text-white mb-4">Threat Distribution (7 Days)</h3>
                  {securityMetrics?.chart_data?.threat_pie_chart && securityMetrics.chart_data.threat_pie_chart.some(item => item.value > 0) ? (
                    <ResponsiveContainer width="100%" height={250}>
                      <PieChart>
                        <Pie
                          data={securityMetrics.chart_data.threat_pie_chart.filter(item => item.value > 0)}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={100}
                          paddingAngle={5}
                          dataKey="value"
                          label={({ name, value, percent }) => `${name}: ${value} (${(percent * 100).toFixed(0)}%)`}
                        >
                          {securityMetrics.chart_data.threat_pie_chart.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip 
                          formatter={(value, name) => [value, name]}
                          contentStyle={{ 
                            backgroundColor: '#1F2937', 
                            border: '1px solid #374151',
                            borderRadius: '8px',
                            color: 'white'
                          }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-64 flex items-center justify-center text-gray-400">
                      No threat data available
                    </div>
                  )}
                </div>

                {/* Threat Trends - Gráfico de Líneas CORREGIDO */}
                <div className="bg-gray-700 p-6 rounded-lg">
                  <h3 className="text-lg font-semibold text-white mb-4">Threat Trends (24 Hours)</h3>
                  {securityMetrics?.chart_data?.hourly_trend && securityMetrics.chart_data.hourly_trend.length > 0 ? (
                    <ResponsiveContainer width="100%" height={250}>
                      <LineChart data={securityMetrics.chart_data.hourly_trend}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                        <XAxis 
                          dataKey="hour" 
                          stroke="#9CA3AF"
                          tickFormatter={(value) => `${value}:00`}
                        />
                        <YAxis stroke="#9CA3AF" />
                        <Tooltip 
                          contentStyle={{ 
                            backgroundColor: '#1F2937', 
                            border: '1px solid #374151',
                            borderRadius: '8px'
                          }}
                          labelFormatter={(value) => `Hour: ${value}:00`}
                        />
                        <Line 
                          type="monotone" 
                          dataKey="threats" 
                          stroke="#EF4444" 
                          strokeWidth={3}
                          name="High Threats"
                          dot={{ r: 4 }}
                        />
                        <Line 
                          type="monotone" 
                          dataKey="total" 
                          stroke="#3B82F6" 
                          strokeWidth={2}
                          name="Total Events"
                          dot={{ r: 3 }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-64 flex items-center justify-center text-gray-400">
                      No hourly data available
                    </div>
                  )}
                </div>

                {/* Weekly Activity Trend - Gráfico de Barras CORREGIDO */}
                <div className="bg-gray-700 p-6 rounded-lg lg:col-span-2">
                  <h3 className="text-lg font-semibold text-white mb-4">Weekly Activity Trend</h3>
                  {securityMetrics?.chart_data?.weekly_trend && securityMetrics.chart_data.weekly_trend.length > 0 ? (
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={securityMetrics.chart_data.weekly_trend}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                        <XAxis dataKey="date" stroke="#9CA3AF" />
                        <YAxis stroke="#9CA3AF" />
                        <Tooltip 
                          contentStyle={{ 
                            backgroundColor: '#1F2937', 
                            border: '1px solid #374151',
                            borderRadius: '8px'
                          }}
                        />
                        <Legend />
                        <Bar dataKey="normal" stackId="a" fill="#10B981" name="Normal" />
                        <Bar dataKey="threats" stackId="a" fill="#EF4444" name="Threats" />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-80 flex items-center justify-center text-gray-400">
                      No weekly data available
                    </div>
                  )}
                </div>
              </div>

              {/* Protocol Analysis */}
              {securityMetrics?.chart_data?.protocol_distribution && Object.keys(securityMetrics.chart_data.protocol_distribution).length > 0 && (
                <div className="bg-gray-700 p-6 rounded-lg">
                  <h3 className="text-lg font-semibold text-white mb-4">Protocol Analysis</h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {Object.entries(securityMetrics.chart_data.protocol_distribution).map(([protocol, count]) => (
                      <div key={protocol} className="text-center">
                        <div className="text-2xl font-bold text-blue-400">{count}</div>
                        <div className="text-sm text-gray-400">{protocol.toUpperCase()}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Geographic Threats - CORREGIDO para mostrar países */}
              {securityMetrics?.chart_data?.geographic_data && Object.keys(securityMetrics.chart_data.geographic_data).length > 0 && (
                <div className="bg-gray-700 p-6 rounded-lg">
                  <h3 className="text-lg font-semibold text-white mb-4">🌍 Global Threats Map</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {Object.entries(securityMetrics.chart_data.geographic_data)
                      .sort(([,a], [,b]) => b - a)
                      .slice(0, 6)
                      .map(([country, count]) => (
                        <div key={country} className="flex items-center p-3 bg-gray-800 rounded-lg">
                          <div className="text-2xl mr-3">
                            {getCountryFlag(country)}
                          </div>
                          <div className="flex-1">
                            <div className="text-white font-medium">{country}</div>
                            <div className="text-red-400 font-bold">{count} threats</div>
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              )}

              {/* Real-time Statistics */}
              <div className="bg-gray-700 p-6 rounded-lg">
                <h3 className="text-lg font-semibold text-white mb-4">📊 Real-time Statistics</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-red-400">
                      {securityMetrics?.real_time_stats?.denial_rate?.toFixed(1) || 0}%
                    </div>
                    <div className="text-sm text-gray-400">Denial Rate</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-orange-400">
                      {securityMetrics?.real_time_stats?.threat_escalation?.toFixed(1) || 0}%
                    </div>
                    <div className="text-sm text-gray-400">Threat Escalation</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-yellow-400">
                      {securityMetrics?.real_time_stats?.total_logs_today || 0}
                    </div>
                    <div className="text-sm text-gray-400">Today's Events</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-400">
                      {securityMetrics?.real_time_stats?.total_logs_week || 0}
                    </div>
                    <div className="text-sm text-gray-400">Week's Events</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {selectedTab === 'processes' && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-white">Suspicious Processes</h3>
              {securityMetrics?.suspicious_processes?.map((proc, index) => (
                <div key={index} className="bg-gray-700 p-4 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center">
                      <div className={`w-3 h-3 rounded-full mr-3 ${
                        proc.risk_score > 8 ? 'bg-red-500' : 
                        proc.risk_score > 6 ? 'bg-yellow-500' : 'bg-green-500'
                      }`}></div>
                      <div>
                        <div className="text-white font-medium">{proc.name} (PID: {proc.pid})</div>
                        <div className="text-gray-400 text-sm">{proc.reason}</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-red-400 font-bold">Risk: {proc.risk_score.toFixed(1)}</div>
                      <div className="text-gray-400 text-sm">CPU: {proc.cpu_percent}%</div>
                    </div>
                  </div>
                  <div className="text-gray-400 text-sm">
                    Command: <code className="bg-gray-800 px-2 py-1 rounded">{proc.command}</code>
                  </div>
                </div>
              )) || <p className="text-gray-400">No suspicious processes detected</p>}
            </div>
          )}

          {selectedTab === 'network' && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-white">Network Connections</h3>
              {securityMetrics?.active_connections?.filter(conn => conn.is_suspicious).map((conn, index) => (
                <div key={index} className="bg-gray-700 p-4 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-white font-medium">
                        {conn.remote_ip}:{conn.remote_port} ({conn.country})
                      </div>
                      <div className="text-gray-400 text-sm">
                        Process: {conn.process} | Status: {conn.status}
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className={`px-2 py-1 rounded text-xs ${
                        conn.risk_level === 'HIGH' ? 'bg-red-900 text-red-300' :
                        conn.risk_level === 'MEDIUM' ? 'bg-yellow-900 text-yellow-300' :
                        'bg-green-900 text-green-300'
                      }`}>
                        {conn.risk_level}
                      </span>
                      <button
                        onClick={() => blockIP(conn.remote_ip)}
                        className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded text-xs"
                      >
                        Block IP
                      </button>
                    </div>
                  </div>
                </div>
              )) || <p className="text-gray-400">No suspicious connections detected</p>}
            </div>
          )}

          {selectedTab === 'auth' && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-white">Authentication Attempts</h3>
              {securityMetrics?.auth_attempts?.slice(-10).map((attempt, index) => (
                <div key={index} className="bg-gray-700 p-4 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      {attempt.success ? (
                        <AcceptIcon size={16} color="#10B981" className="mr-3" />
                      ) : (
                        <DenyIcon size={16} color="#EF4444" className="mr-3" />
                      )}
                      <div>
                        <div className="text-white">
                          {attempt.username} from {attempt.source_ip} ({attempt.country})
                        </div>
                        <div className="text-gray-400 text-sm">
                          Method: {attempt.method} | {formatTimestamp(attempt.timestamp)}
                        </div>
                      </div>
                    </div>
                    {attempt.is_suspicious && (
                      <div className="bg-orange-900 text-orange-300 px-2 py-1 rounded text-xs">
                        SUSPICIOUS
                      </div>
                    )}
                  </div>
                </div>
              )) || <p className="text-gray-400">No recent authentication attempts</p>}
            </div>
          )}

          {selectedTab === 'files' && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-white">File System Changes</h3>
              {securityMetrics?.modified_files?.map((file, index) => (
                <div key={index} className="bg-gray-700 p-4 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-white font-medium">{file.path}</div>
                      <div className="text-gray-400 text-sm">
                        {file.action} by {file.user} | {formatTimestamp(file.timestamp)}
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      {file.is_critical && (
                        <div className="bg-red-900 text-red-300 px-2 py-1 rounded text-xs">
                          CRITICAL
                        </div>
                      )}
                      <div className="text-gray-400 text-sm">
                        Risk: {file.risk_score.toFixed(1)}
                      </div>
                    </div>
                  </div>
                </div>
              )) || <p className="text-gray-400">No recent file changes detected</p>}
            </div>
          )}
        </div>
      </div>

      {/* Footer con última actualización */}
      <div className="bg-gray-900 p-4 rounded-lg border border-gray-700">
        <div className="flex items-center justify-between">
          <span className="text-gray-400 text-sm">
            Last scan: {securityMetrics?.last_scan ? formatTimestamp(securityMetrics.last_scan) : 'Never'}
          </span>
          <div className="flex items-center">
            <PulseIcon size={8} color="#10B981" animate={monitoringEnabled} />
            <span className="text-green-400 text-sm ml-2">
              {monitoringEnabled ? `Monitoring active (${refreshInterval / 1000}s)` : 'Monitoring paused'}
            </span>
          </div>
        </div>
      </div>

      {/* Renderizar alertas activas */}
      {alerts.map(alert => (
        <SecurityAlertToast 
          key={alert.id} 
          alert={alert} 
          onClose={() => dismissAlert(alert.id)} 
        />
      ))}
    </div>
  );
};

export default SecurityMonitor;
