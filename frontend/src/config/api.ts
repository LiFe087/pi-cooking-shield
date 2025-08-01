// ===================================================================
// CONFIGURACIÓN UNIFICADA DE API - OPTIMIZADA v5.0
// ===================================================================

// Configuración dinámica que detecta el entorno
const getBaseUrl = () => {
  // Detectar entorno de desarrollo
  const isDevelopment = process.env.NODE_ENV === 'development' || 
                       window.location.hostname === 'localhost' ||
                       window.location.hostname === '127.0.0.1';
  
  if (isDevelopment) {
    console.log('🔧 DEVELOPMENT MODE: Using localhost');
    return 'http://localhost:5000';
  }
  
  // En producción, usar la IP fija del Pi
  console.log('🚀 PRODUCTION MODE: Using Pi IP');
  return 'http://192.168.101.4:5000';
};

export const API_CONFIG = {
  BASE_URL: getBaseUrl(),
  SOCKET_URL: getBaseUrl(),
  TIMEOUT: 10000, // 10 segundos de timeout
  RETRY_ATTEMPTS: 3,
  RETRY_DELAY: 1000,
  DEBUG: process.env.NODE_ENV === 'development'
};

// ENDPOINTS LIMPIO - SIN DUPLICACIONES
export const API_ENDPOINTS = {
  // === ENDPOINTS OPTIMIZADOS PRINCIPALES ===
  SYSTEM_HEALTH: `${API_CONFIG.BASE_URL}/api/system/health`,
  ACTIVITIES: `${API_CONFIG.BASE_URL}/api/activities`,
  HISTORICAL_ACTIVITIES: `${API_CONFIG.BASE_URL}/api/activities/historical`,
  HISTORICAL_STATS: `${API_CONFIG.BASE_URL}/api/activities/stats`, 
  ACTIVITIES_STATS: `${API_CONFIG.BASE_URL}/api/activities/stats`,
  LIVE_ACTIVITIES: `${API_CONFIG.BASE_URL}/api/activities/live`,
  SYSTEM_STATS: `${API_CONFIG.BASE_URL}/api/system/stats`,
  
  // === ENDPOINTS LEGACY (COMPATIBILIDAD) ===
  HEALTH: `${API_CONFIG.BASE_URL}/api/health`,
  STATS: `${API_CONFIG.BASE_URL}/api/stats`,
  DASHBOARD: `${API_CONFIG.BASE_URL}/api/dashboard`,
  THREATS: `${API_CONFIG.BASE_URL}/api/threats`,
  RECENT_ACTIVITY: `${API_CONFIG.BASE_URL}/api/recent-activity`,
  
  // === ENDPOINTS DE LOGS ===
  LOGS: `${API_CONFIG.BASE_URL}/api/logs`,
  LOG_FILES: `${API_CONFIG.BASE_URL}/api/log-files`,
  REAL_TIME_LOGS: `${API_CONFIG.BASE_URL}/api/real-time-logs`,
  
  // === ENDPOINTS DE MONITOREO ===
  SYSTEM_MONITOR: `${API_CONFIG.BASE_URL}/api/system-monitor`,
  NETWORK_MONITOR: `${API_CONFIG.BASE_URL}/api/network-monitor`,
  NETWORK_STATS: `${API_CONFIG.BASE_URL}/api/network-stats`,
  SECURITY_EVENTS: `${API_CONFIG.BASE_URL}/api/security-events`,
  
  // === ENDPOINTS DE ESTADÍSTICAS ===
  ATTACK_STATS: `${API_CONFIG.BASE_URL}/api/attack-stats`,
  DAILY_STATISTICS: `${API_CONFIG.BASE_URL}/api/daily-statistics`,
  ACTIVITY_SUMMARY: `${API_CONFIG.BASE_URL}/api/activity-summary`,
  ACTIVITIES_COUNT: `${API_CONFIG.BASE_URL}/api/activities/count`,
  
  // === ENDPOINTS DE TESTING ===
  TEST_THREAT: `${API_CONFIG.BASE_URL}/api/test-threat`,
  TEST_ATTACK: `${API_CONFIG.BASE_URL}/api/test-attack`,
  REFRESH: `${API_CONFIG.BASE_URL}/api/refresh`,
  
  // === ENDPOINTS DE DEBUG (solo desarrollo) ===
  DEBUG_INFO: `${API_CONFIG.BASE_URL}/api/debug/info`,
  DEBUG_LOGS: `${API_CONFIG.BASE_URL}/api/debug/logs`,
  DEBUG_WEBSOCKET: `${API_CONFIG.BASE_URL}/api/debug/test-websocket`,
  SERVER_STATUS: `${API_CONFIG.BASE_URL}/api/server-status`
};

// Configuración de WebSocket optimizada
export const WEBSOCKET_CONFIG = {
  URL: `ws://${getBaseUrl().replace('http://', '').replace('https://', '')}`,
  RECONNECT_ATTEMPTS: 5,
  RECONNECT_DELAY: 2000,
  HEARTBEAT_INTERVAL: 30000,
  DEBUG: API_CONFIG.DEBUG
};

// Utilidades de API
export const API_UTILS = {
  // Función para hacer requests con retry automático
  async fetchWithRetry(url: string, options: RequestInit = {}, retries: number = API_CONFIG.RETRY_ATTEMPTS): Promise<Response> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), API_CONFIG.TIMEOUT);
    
    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          ...options.headers
        }
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok && retries > 0) {
        await new Promise(resolve => setTimeout(resolve, API_CONFIG.RETRY_DELAY));
        return this.fetchWithRetry(url, options, retries - 1);
      }
      
      return response;
    } catch (error) {
      clearTimeout(timeoutId);
      
      if (retries > 0) {
        await new Promise(resolve => setTimeout(resolve, API_CONFIG.RETRY_DELAY));
        return this.fetchWithRetry(url, options, retries - 1);
      }
      
      throw error;
    }
  },

  // Función para hacer requests GET con cache
  async get(endpoint: string, params?: Record<string, string>): Promise<any> {
    const url = new URL(endpoint);
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        url.searchParams.append(key, value);
      });
    }
    
    const response = await this.fetchWithRetry(url.toString());
    return response.json();
  },

  // Función para hacer requests POST
  async post(endpoint: string, data?: any): Promise<any> {
    const response = await this.fetchWithRetry(endpoint, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined
    });
    return response.json();
  }
};

// Logging para debugging
if (API_CONFIG.DEBUG) {
  console.log('🔧 API Configuration:');
  console.log('  Base URL:', API_CONFIG.BASE_URL);
  console.log('  WebSocket URL:', WEBSOCKET_CONFIG.URL);
  console.log('  Debug Mode:', API_CONFIG.DEBUG);
  console.log('  Total Endpoints:', Object.keys(API_ENDPOINTS).length);
}

export default API_CONFIG;
