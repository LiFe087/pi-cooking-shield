/**
 * Custom hook para gestionar datos históricos de actividades
 * Reemplaza el uso de localStorage con datos del backend
 */
import { useState, useEffect, useCallback, useRef } from 'react';
import { API_ENDPOINTS } from '../config/api';
import { Activity } from '../types';

interface HistoricalData {
  activities: Activity[];
  isLoading: boolean;
  error: string | null;
  lastUpdated: Date | null;
}

interface UseHistoricalActivitiesOptions {
  days?: number;
  limit?: number;
  statusFilter?: string;
  autoRefresh?: boolean;
  refreshInterval?: number;
}

export const useHistoricalActivities = (options: UseHistoricalActivitiesOptions = {}) => {
  const {
    days = 7,
    limit = 200,
    statusFilter,
    autoRefresh = false,
    refreshInterval = 300000 // 5 minutos
  } = options;

  const [data, setData] = useState<HistoricalData>({
    activities: [],
    isLoading: true,
    error: null,
    lastUpdated: null
  });

  const abortControllerRef = useRef<AbortController | null>(null);
  const refreshTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const fetchHistoricalActivities = useCallback(async (forceRefresh = false) => {
    // Cancelar request anterior si existe
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Crear nuevo AbortController
    abortControllerRef.current = new AbortController();

    try {
      if (forceRefresh) {
        setData(prev => ({ ...prev, isLoading: true, error: null }));
      }

      // Construir URL con parámetros
      const params = new URLSearchParams({
        days: days.toString(),
        limit: limit.toString()
      });

      if (statusFilter) {
        params.append('status', statusFilter);
      }

      const response = await fetch(
        `${API_ENDPOINTS.HISTORICAL_ACTIVITIES}?${params}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
          signal: abortControllerRef.current.signal
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();

      if (result.status === 'success' && result.data) {
        setData({
          activities: result.data.activities || [],
          isLoading: false,
          error: null,
          lastUpdated: new Date()
        });
      } else {
        throw new Error(result.message || 'Failed to fetch historical activities');
      }

    } catch (error: any) {
      if (error.name === 'AbortError') {
        console.log('Request was aborted');
        return;
      }

      console.error('Error fetching historical activities:', error);
      setData(prev => ({
        ...prev,
        isLoading: false,
        error: error.message || 'Failed to fetch historical activities'
      }));
    }
  }, [days, limit, statusFilter]);

  // Efecto para cargar datos iniciales
  useEffect(() => {
    fetchHistoricalActivities(true);
  }, [fetchHistoricalActivities]);

  // Efecto para auto-refresh
  useEffect(() => {
    if (!autoRefresh) return;

    const scheduleRefresh = () => {
      refreshTimeoutRef.current = setTimeout(() => {
        fetchHistoricalActivities(false);
        scheduleRefresh();
      }, refreshInterval);
    };

    scheduleRefresh();

    return () => {
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current);
      }
    };
  }, [autoRefresh, refreshInterval, fetchHistoricalActivities]);

  // Cleanup al desmontar
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

  const refresh = useCallback(() => {
    fetchHistoricalActivities(true);
  }, [fetchHistoricalActivities]);

  return {
    ...data,
    refresh
  };
};

// Hook para estadísticas diarias
export const useDailyStatistics = (days: number = 30) => {
  const [data, setData] = useState<{
    statistics: any[];
    isLoading: boolean;
    error: string | null;
    lastUpdated: Date | null;
  }>({
    statistics: [],
    isLoading: true,
    error: null,
    lastUpdated: null
  });

  const abortControllerRef = useRef<AbortController | null>(null);

  const fetchDailyStatistics = useCallback(async () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    abortControllerRef.current = new AbortController();

    try {
      setData(prev => ({ ...prev, isLoading: true, error: null }));

      const response = await fetch(
        `${API_ENDPOINTS.DAILY_STATISTICS}?days=${days}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
          signal: abortControllerRef.current.signal
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();

      if (result.status === 'success' && result.data) {
        setData({
          statistics: result.data.daily_statistics || [],
          isLoading: false,
          error: null,
          lastUpdated: new Date()
        });
      } else {
        throw new Error(result.message || 'Failed to fetch daily statistics');
      }

    } catch (error: any) {
      if (error.name === 'AbortError') return;

      console.error('Error fetching daily statistics:', error);
      setData(prev => ({
        ...prev,
        isLoading: false,
        error: error.message || 'Failed to fetch daily statistics'
      }));
    }
  }, [days]);

  useEffect(() => {
    fetchDailyStatistics();
  }, [fetchDailyStatistics]);

  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  return {
    ...data,
    refresh: fetchDailyStatistics
  };
};

// Hook para resumen de actividades
export const useActivitySummary = () => {
  const [data, setData] = useState<{
    summary: any;
    isLoading: boolean;
    error: string | null;
    lastUpdated: Date | null;
  }>({
    summary: null,
    isLoading: true,
    error: null,
    lastUpdated: null
  });

  const abortControllerRef = useRef<AbortController | null>(null);

  const fetchActivitySummary = useCallback(async () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    abortControllerRef.current = new AbortController();

    try {
      setData(prev => ({ ...prev, isLoading: true, error: null }));

      const response = await fetch(API_ENDPOINTS.ACTIVITY_SUMMARY, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        signal: abortControllerRef.current.signal
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();

      if (result.status === 'success' && result.data) {
        setData({
          summary: result.data.summary || {},
          isLoading: false,
          error: null,
          lastUpdated: new Date()
        });
      } else {
        throw new Error(result.message || 'Failed to fetch activity summary');
      }

    } catch (error: any) {
      if (error.name === 'AbortError') return;

      console.error('Error fetching activity summary:', error);
      setData(prev => ({
        ...prev,
        isLoading: false,
        error: error.message || 'Failed to fetch activity summary'
      }));
    }
  }, []);

  useEffect(() => {
    fetchActivitySummary();
  }, [fetchActivitySummary]);

  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  return {
    ...data,
    refresh: fetchActivitySummary
  };
};

// Utilidad para obtener actividades de un día específico
export const useActivitiesByDate = (targetDate: Date) => {
  const startOfDay = new Date(targetDate);
  startOfDay.setHours(0, 0, 0, 0);
  
  const endOfDay = new Date(targetDate);
  endOfDay.setHours(23, 59, 59, 999);
  
  const daysDiff = Math.ceil((new Date().getTime() - targetDate.getTime()) / (1000 * 60 * 60 * 24));
  
  const { activities, isLoading, error, refresh } = useHistoricalActivities({
    days: Math.max(1, daysDiff + 1),
    limit: 500
  });

  const filteredActivities = activities.filter(activity => {
    const activityDate = new Date(activity.timestamp);
    return activityDate >= startOfDay && activityDate <= endOfDay;
  });

  return {
    activities: filteredActivities,
    isLoading,
    error,
    refresh,
    targetDate
  };
};
