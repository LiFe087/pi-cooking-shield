import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { API_ENDPOINTS } from '../config/api';
import { Activity } from '../types';

interface ActivityStats {
  total_activities: number;
  status_distribution: {
    high: number;
    medium: number;
    low: number;
  };
  days_range: number;
  daily_stats: Array<{
    date: string;
    high_threats: number;
    medium_threats: number;
    low_threats: number;
    total_logs: number;
  }>;
  database_stats?: {
    total: number;
    high: number;
    medium: number;
    low: number;
  };
  last_sync?: number;
}

interface PaginatedResponse {
  data: Activity[];
  total: number;
  page: number;
  limit: number;
  pages: number;
  source: string;
  timestamp: string;
  stats?: {
    high: number;
    medium: number;
    low: number;
  };
}

interface UseOptimizedHistoricalDataOptions {
  days?: number;
  pageSize?: number;
  autoRefresh?: boolean;
  refreshInterval?: number;
  statusFilter?: string;
  sourceFilter?: string;
}

interface UseOptimizedHistoricalDataReturn {
  // Datos paginados para tabla
  activities: Activity[];
  loading: boolean;
  error: string | null;
  
  // Todos los datos para gráficas (cacheados)
  allActivities: Activity[];
  allActivitiesLoading: boolean;
  
  // Paginación
  currentPage: number;
  totalPages: number;
  totalActivities: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
  
  // Estadísticas para gráficas
  stats: ActivityStats | null;
  statusDistribution: { high: number; medium: number; low: number };
  
  // Controles
  goToPage: (page: number) => void;
  nextPage: () => void;
  prevPage: () => void;
  refresh: () => Promise<void>;
  
  // Filtros
  statusFilter: string;
  setStatusFilter: (status: string) => void;
  sourceFilter: string;
  setSourceFilter: (source: string) => void;
}

export function useOptimizedHistoricalData(
  options: UseOptimizedHistoricalDataOptions = {}
): UseOptimizedHistoricalDataReturn {
  const {
    days = 7,
    pageSize = 10,
    autoRefresh = true,
    refreshInterval = 30000,
    statusFilter: initialStatusFilter = '',
    sourceFilter: initialSourceFilter = ''
  } = options;

  // Estados principales
  const [activities, setActivities] = useState<Activity[]>([]);
  const [allActivities, setAllActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(false);
  const [allActivitiesLoading, setAllActivitiesLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<ActivityStats | null>(null);
  
  // Estados de paginación
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [totalActivities, setTotalActivities] = useState(0);
  
  // Estados de filtros
  const [statusFilter, setStatusFilter] = useState(initialStatusFilter);
  const [sourceFilter, setSourceFilter] = useState(initialSourceFilter);
  
  // Cache para optimización
  const cacheRef = useRef<Map<string, { data: Activity[]; timestamp: number }>>(new Map());
  const abortControllerRef = useRef<AbortController | null>(null);
  const refreshTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Función para obtener datos paginados (para tabla)
  const fetchPaginatedActivities = useCallback(async (
    page: number = 1,
    filters: { status?: string; source?: string } = {}
  ) => {
    // Cancelar petición anterior
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    
    abortControllerRef.current = new AbortController();
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        days: days.toString(),
        page: page.toString(),
        limit: pageSize.toString(),
        ...(filters.status && { status: filters.status }),
        ...(filters.source && { source: filters.source })
      });

      const response = await fetch(`${API_ENDPOINTS.HISTORICAL_ACTIVITIES}?${params}`, {
        signal: abortControllerRef.current.signal,
        headers: {
          'Accept': 'application/json',
          'Cache-Control': 'no-cache'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data: PaginatedResponse = await response.json();
      
      setActivities(data.data || []);
      setCurrentPage(data.page || 1);
      setTotalPages(data.pages || 0);
      setTotalActivities(data.total || 0);
      
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        console.error('Error fetching paginated activities:', err);
        setError(err.message || 'Failed to load activities');
        setActivities([]);
      }
    } finally {
      setLoading(false);
    }
  }, [days, pageSize]);

  // Función para obtener TODOS los datos (para gráficas) con cache
  const fetchAllActivities = useCallback(async () => {
    const cacheKey = `all-${days}-${statusFilter}-${sourceFilter}`;
    const cached = cacheRef.current.get(cacheKey);
    
    // Usar cache si es reciente (30 segundos)
    if (cached && Date.now() - cached.timestamp < 30000) {
      setAllActivities(cached.data);
      return;
    }

    setAllActivitiesLoading(true);

    try {
      const params = new URLSearchParams({
        days: days.toString(),
        limit: '1000', // Límite alto para gráficas
        ...(statusFilter && { status: statusFilter }),
        ...(sourceFilter && { source: sourceFilter })
      });

      const response = await fetch(`${API_ENDPOINTS.HISTORICAL_ACTIVITIES}?${params}`, {
        headers: {
          'Accept': 'application/json',
          'Cache-Control': 'max-age=30'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data: PaginatedResponse = await response.json();
      const allData = data.data || [];
      
      // Guardar en cache
      cacheRef.current.set(cacheKey, {
        data: allData,
        timestamp: Date.now()
      });
      
      setAllActivities(allData);
      
    } catch (err: any) {
      console.error('Error fetching all activities:', err);
      setAllActivities([]);
    } finally {
      setAllActivitiesLoading(false);
    }
  }, [days, statusFilter, sourceFilter]);

  // Función para obtener estadísticas
  const fetchStats = useCallback(async () => {
    try {
      const response = await fetch(`${API_ENDPOINTS.HISTORICAL_STATS}?days=${days}`, {
        headers: {
          'Accept': 'application/json',
          'Cache-Control': 'max-age=60'
        }
      });

      if (response.ok) {
        const statsData = await response.json();
        setStats(statsData);
      }
    } catch (err) {
      console.error('Error fetching stats:', err);
    }
  }, [days]);

  // Función principal de refresh
  const refresh = useCallback(async () => {
    // Limpiar cache
    cacheRef.current.clear();
    
    // Cargar datos en paralelo
    await Promise.all([
      fetchPaginatedActivities(currentPage, { status: statusFilter, source: sourceFilter }),
      fetchAllActivities(),
      fetchStats()
    ]);
  }, [fetchPaginatedActivities, fetchAllActivities, fetchStats, currentPage, statusFilter, sourceFilter]);

  // Controles de paginación
  const goToPage = useCallback((page: number) => {
    if (page >= 1 && page <= totalPages && page !== currentPage) {
      setCurrentPage(page);
    }
  }, [currentPage, totalPages]);

  const nextPage = useCallback(() => {
    if (currentPage < totalPages) {
      goToPage(currentPage + 1);
    }
  }, [currentPage, totalPages, goToPage]);

  const prevPage = useCallback(() => {
    if (currentPage > 1) {
      goToPage(currentPage - 1);
    }
  }, [currentPage, goToPage]);

  // Computados optimizados
  const statusDistribution = useMemo(() => {
    if (stats?.status_distribution) {
      return stats.status_distribution;
    }
    
    // Fallback usando allActivities
    const distribution = { high: 0, medium: 0, low: 0 };
    allActivities.forEach(activity => {
      if (activity.status in distribution) {
        distribution[activity.status as keyof typeof distribution]++;
      }
    });
    
    return distribution;
  }, [stats, allActivities]);

  const hasNextPage = useMemo(() => currentPage < totalPages, [currentPage, totalPages]);
  const hasPrevPage = useMemo(() => currentPage > 1, [currentPage]);

  // Efectos
  useEffect(() => {
    fetchPaginatedActivities(currentPage, { status: statusFilter, source: sourceFilter });
  }, [fetchPaginatedActivities, currentPage, statusFilter, sourceFilter]);

  useEffect(() => {
    fetchAllActivities();
    fetchStats();
  }, [fetchAllActivities, fetchStats]);

  // Auto-refresh
  useEffect(() => {
    if (!autoRefresh) return;

    const setupAutoRefresh = () => {
      refreshTimeoutRef.current = setTimeout(() => {
        if (document.visibilityState === 'visible') {
          refresh();
        }
        setupAutoRefresh();
      }, refreshInterval);
    };

    setupAutoRefresh();

    return () => {
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current);
      }
    };
  }, [autoRefresh, refreshInterval, refresh]);

  // Cleanup
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current);
      }
    };
  }, []);

  return {
    // Datos paginados
    activities,
    loading,
    error,
    
    // Todos los datos para gráficas
    allActivities,
    allActivitiesLoading,
    
    // Paginación
    currentPage,
    totalPages,
    totalActivities,
    hasNextPage,
    hasPrevPage,
    
    // Estadísticas
    stats,
    statusDistribution,
    
    // Controles
    goToPage,
    nextPage,
    prevPage,
    refresh,
    
    // Filtros
    statusFilter,
    setStatusFilter,
    sourceFilter,
    setSourceFilter
  };
}
