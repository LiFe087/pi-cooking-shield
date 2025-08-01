// ===================================================================
// TIPOS UNIFICADOS PARA PI-COOKING-SHIELD
// Elimina duplicación y inconsistencias entre componentes
// ===================================================================

export interface SystemStats {
  threats_detected: number;
  network_status: string; // Más flexible para datos del backend
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

export interface Activity {
  // Campos obligatorios
  id: number;
  message: string;
  timestamp: string;
  source: string;
  threat_score: number;
  status: string; // Más flexible para datos del backend
  alert_level: string; // Más flexible para datos del backend
  
  // Información de dispositivo (opcional)
  device_name?: string;
  device_type?: string;
  os_name?: string;
  device_category?: string;
  src_mac?: string;
  
  // IPs y países (opcional)
  src_ip?: string;
  dst_ip?: string;
  src_country?: string;
  dst_country?: string;
  
  // Puertos y servicios (opcional)
  src_port?: string;
  dst_port?: string;
  service?: string;
  
  // Protocol y acción (opcional)
  protocol?: string;
  action?: string;
  
  // Interfaces de red (opcional)
  src_interface?: string;
  dst_interface?: string;
  src_interface_role?: string;
  dst_interface_role?: string;
  policy_id?: string;
  policy_type?: string;
  
  // Estadísticas de tráfico (opcional)
  bytes_sent?: string;
  bytes_received?: string;
  packets_sent?: string;
  packets_received?: string;
  session_duration?: string;
  translation_type?: string;
}

export interface SearchFilter {
  field: string;
  operator: 'equals' | 'contains' | 'starts_with' | 'ends_with' | 'greater_than' | 'less_than';
  value: string;
}

export interface DashboardProps {
  stats: SystemStats;
  activities: Activity[];
  loading?: boolean;
  error?: string;
}

export interface NetworkInterface {
  name: string;
  is_up: boolean;
  bytes_sent: number;
  bytes_recv: number;
  packets_sent: number;
  packets_recv: number;
  // CAMPOS AÑADIDOS para compatibilidad con backend
  ip_address?: string;
  errors_in?: number;
  errors_out?: number;
  drops_in?: number;
  drops_out?: number;
  speed?: number;
  mtu?: number;
  addresses?: string[];
}

export interface NetworkStats {
  interfaces: NetworkInterface[];
  summary: {
    active_interfaces: number;
    total_interfaces: number;
    total_bytes_sent: number;
    total_bytes_recv: number;
    active_connections: number;
    listening_ports: number;
  };
  timestamp: string;
}

// Tipos para gráficas
export interface ChartDataPoint {
  time: string;
  threats: number;
  normal: number;
}

export interface StatusDistribution {
  name: string;
  value: number;
  color: string;
}

export interface SystemMetric {
  name: string;
  value: number;
  color: string;
}

// Estados de la aplicación
export interface AppState {
  isConnected: boolean;
  loading: boolean;
  error: string | null;
  stats: SystemStats;
  activities: Activity[];
  autoRefresh: boolean;
  refreshInterval: number;
}

// API Response tipos
export interface ApiResponse<T> {
  status: 'success' | 'error';
  data?: T;
  message?: string;
  timestamp: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  pages: number;
  source: string;
}
