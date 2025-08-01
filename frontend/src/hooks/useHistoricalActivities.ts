import { useState, useEffect, useCallback, useMemo } from 'react';
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
  hourly_counts: Record<string, number>;
  daily_stats: Array<{
    date: string;
    high_threats: number;
    medium_threats: number;
    low_threats: number;
    total_logs: number;
  }>;
  // NUEVO: Agregar campos que envía el backend
  database_stats?: {
    total: number;
    high: number;
    medium: number;
    low: number;
  };
  memory_stats?: {
    total: number;
    by_status: {
      high: number;
      medium: number;
      low: number;
    };
  };
  last_sync?: number;
}

interface PaginatedActivities {
  data: Activity[];
  total: number;
  page: number;
  limit: number;
  pages: number;  // Este es el campo correcto que devuelve create_paginated_response
  source: string;
  timestamp: string;
  stats?: {       // Stats adicionales que agregamos
    high: number;
    medium: number;
    low: number;
  };
  days_range?: number;
}

interface UseHistoricalActivitiesOptions {
  days?: number;
  pageSize?: number;
  autoRefresh?: boolean;
  refreshInterval?: number;
}

interface UseHistoricalActivitiesReturn {
  // Datos paginados
  activities: Activity[];
  loading: boolean;
  error: string | null;
  
  // NUEVO: Todos los datos para gráficas (sin paginación)
  allActivities: Activity[];
  allActivitiesLoading: boolean;
  
  // Paginación
  currentPage: number;
  totalPages: number;
  totalActivities: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
  
  // Estadísticas
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

export function useHistoricalActivities(
  options: UseHistoricalActivitiesOptions = {}
): UseHistoricalActivitiesReturn {
  const {
    days = 7,
    pageSize = 10,
    autoRefresh = false,
    refreshInterval = 30000
  } = options;

  // Estados principales
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<ActivityStats | null>(null);
  
  // NUEVO: Estados para todos los datos (sin paginación)
  const [allActivities, setAllActivities] = useState<Activity[]>([]);
  const [allActivitiesLoading, setAllActivitiesLoading] = useState(true);
  
  // Estados de paginación
  const [currentPage, setCurrentPage] = useState(1);
  const [totalActivities, setTotalActivities] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  
  // Estados de filtros
  const [statusFilter, setStatusFilter] = useState('');
  const [sourceFilter, setSourceFilter] = useState('');

  // Función para obtener actividades paginadas
  const fetchActivities = useCallback(async (page: number = currentPage) => {
    try {
      setLoading(true);
      setError(null);

      // Construir parámetros de la consulta
      const params = new URLSearchParams({
        page: page.toString(),
        limit: pageSize.toString(),
        days: days.toString()
      });

      if (statusFilter) params.append('status', statusFilter);
      if (sourceFilter) params.append('source', sourceFilter);

      const url = `${API_ENDPOINTS.RECENT_ACTIVITY}?${params}`;
      console.log('🔍 Hook Debug - Fetching activities:', url);

      // Realizar la consulta
      const response = await fetch(url);
      
      console.log('🔍 Hook Debug - Response status:', response.status);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result: PaginatedActivities = await response.json();
      
      console.log('🔍 Hook Debug - API Result:', result);
      
      // Actualizar estados
      setActivities(result.data || []);
      setTotalActivities(result.total || 0);
      setTotalPages(result.pages || 1);
      setCurrentPage(page);

      console.log('🔍 Hook Debug - Updated states:', {
        activities: result.data?.length || 0,
        total: result.total || 0,
        pages: result.pages || 1,
        stats: result.stats
      });

    } catch (err) {
      console.error('❌ Hook Error fetching activities:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch activities');
      setActivities([]);
    } finally {
      setLoading(false);
    }
  }, [currentPage, pageSize, days, statusFilter, sourceFilter]);

  // Función para obtener estadísticas
  const fetchStats = useCallback(async () => {
    try {
      const params = new URLSearchParams({ days: days.toString() });
      const url = `${API_ENDPOINTS.ACTIVITIES_STATS}?${params}`;
      
      console.log('🔍 Hook Debug - Fetching stats:', url);
      
      const response = await fetch(url);
      
      console.log('🔍 Hook Debug - Stats response status:', response.status);
      
      if (response.ok) {
        const result = await response.json();
        console.log('🔍 Hook Debug - Stats result:', result);
        
        if (result.success && result.data) {
          setStats(result.data);
          console.log('🔍 Hook Debug - Stats updated:', result.data);
        } else {
          console.log('🔍 Hook Debug - Stats response not successful:', result);
        }
      } else {
        console.error('🔍 Hook Debug - Stats response not ok:', response.status, response.statusText);
      }
    } catch (err) {
      console.error('❌ Hook Error fetching stats:', err);
    }
  }, [days]);

  // NUEVO: Función para obtener TODOS los datos para gráficas (sin paginación)
  const fetchAllActivities = useCallback(async () => {
    try {
      setAllActivitiesLoading(true);

      // Usar un límite alto para obtener todos los datos
      const params = new URLSearchParams({
        page: '1',
        limit: '1000', // Obtener muchos más datos para las gráficas
        days: days.toString()
      });

      if (statusFilter) params.append('status', statusFilter);
      if (sourceFilter) params.append('source', sourceFilter);

      const url = `${API_ENDPOINTS.RECENT_ACTIVITY}?${params}`;
      console.log('🔍 Hook Debug - Fetching ALL activities for charts:', url);

      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result: PaginatedActivities = await response.json();
      
      console.log('🔍 Hook Debug - ALL Activities API Result:', {
        dataLength: result.data?.length || 0,
        total: result.total || 0,
        source: result.source
      });
      
      // Actualizar estado de todos los datos
      setAllActivities(result.data || []);

    } catch (err) {
      console.error('❌ Hook Error fetching all activities:', err);
      setAllActivities([]);
    } finally {
      setAllActivitiesLoading(false);
    }
  }, [days, statusFilter, sourceFilter]);

  // Función de refresh completo
  const refresh = useCallback(async () => {
    await Promise.all([
      fetchActivities(currentPage),
      fetchStats(),
      fetchAllActivities() // NUEVO: También refrescar todos los datos
    ]);
  }, [fetchActivities, fetchStats, fetchAllActivities, currentPage]);

  // Efectos
  useEffect(() => {
    refresh();
  }, [days, statusFilter, sourceFilter]); // Refresh cuando cambien los filtros

  useEffect(() => {
    fetchActivities(currentPage);
  }, [currentPage]); // Solo fetch activities cuando cambie la página

  // NUEVO: Efecto inicial para cargar todos los datos
  useEffect(() => {
    fetchAllActivities();
  }, [fetchAllActivities]);

  // Auto-refresh
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      // Solo refrescar si estamos en la primera página (datos más recientes)
      if (currentPage === 1) {
        refresh();
      }
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval, currentPage, refresh]);

  // Controles de paginación
  const goToPage = useCallback((page: number) => {
    if (page >= 1 && page <= totalPages && page !== currentPage) {
      setCurrentPage(page);
    }
  }, [totalPages, currentPage]);

  const nextPage = useCallback(() => {
    goToPage(currentPage + 1);
  }, [goToPage, currentPage]);

  const prevPage = useCallback(() => {
    goToPage(currentPage - 1);
  }, [goToPage, currentPage]);

  // Valores computados
  const hasNextPage = currentPage < totalPages;
  const hasPrevPage = currentPage > 1;

  const statusDistribution = useMemo(() => {
    if (stats?.status_distribution) {
      return stats.status_distribution;
    }
    return { high: 0, medium: 0, low: 0 };
  }, [stats]);

  return {
    // Datos paginados
    activities,
    loading,
    error,
    
    // NUEVO: Todos los datos para gráficas
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
