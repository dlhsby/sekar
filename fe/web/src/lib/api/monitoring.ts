/**
 * Monitoring API Client
 * Real-time worker tracking and area monitoring
 */

import { useQuery } from '@tanstack/react-query';
import { apiClient } from './client';

/**
 * City-Wide Statistics Interface
 */
export interface CityStats {
  timestamp: string;
  summary: {
    total_rayons: number;
    total_areas: number;
    total_workers: number;
    total_linmas: number;
    workers_online: number;
    linmas_online: number;
    active_shifts: number;
    reports_today: number;
    tasks_pending: number;
    tasks_in_progress: number;
  };
}

/**
 * Rayon Statistics Interface
 */
export interface RayonMonitoringStats {
  timestamp: string;
  rayon: {
    id: string;
    name: string;
  };
  summary: {
    total_areas: number;
    total_workers: number;
    total_linmas: number;
    workers_online: number;
    linmas_online: number;
    active_shifts: number;
    reports_today: number;
    understaffed_areas: number;
  };
}

/**
 * Area Statistics Interface
 */
export interface AreaMonitoringStats {
  timestamp: string;
  area: {
    id: string;
    name: string;
    rayon: string;
    coverage_area: number;
  };
  current_shift: {
    definition: {
      id: string;
      name: string;
      start_time: string;
      end_time: string;
    };
    required_workers: number;
    required_linmas: number;
    assigned_workers: number;
    assigned_linmas: number;
    active_workers: number;
    active_linmas: number;
  };
}

/**
 * Live Worker Position Interface
 */
export interface LiveWorker {
  user_id: string;
  full_name: string;
  role: 'worker' | 'linmas';
  area_id: string;
  area_name: string;
  shift_id: string;
  gps_lat: number;
  gps_lng: number;
  location_timestamp: string;
  battery_level: number;
  status: 'online' | 'offline';
}

/**
 * Live Workers Response Interface
 */
export interface LiveWorkersResponse {
  timestamp: string;
  workers: LiveWorker[];
  total: number;
}

/**
 * Live Workers Filters
 */
export interface LiveWorkersFilters {
  rayon_id?: string;
  area_id?: string;
}

/**
 * Query Key Factory
 */
export const monitoringKeys = {
  all: ['monitoring'] as const,
  city: () => [...monitoringKeys.all, 'city'] as const,
  rayon: (id: string) => [...monitoringKeys.all, 'rayon', id] as const,
  area: (id: string) => [...monitoringKeys.all, 'area', id] as const,
  liveWorkers: (filters?: LiveWorkersFilters) =>
    [...monitoringKeys.all, 'live-workers', filters] as const,
};

/**
 * Fetch City-Wide Statistics
 * Access: Admin + TopManagement
 */
export function useCityStats() {
  return useQuery({
    queryKey: monitoringKeys.city(),
    queryFn: async () => {
      const response = await apiClient.get<CityStats>('/monitoring/city');
      return response.data;
    },
    staleTime: 30 * 1000, // 30 seconds (real-time data)
    refetchInterval: 30 * 1000, // Auto-refresh every 30s
  });
}

/**
 * Fetch Rayon Statistics
 * Access: Admin + TopManagement + KepalaRayon
 */
export function useRayonMonitoring(rayonId: string) {
  return useQuery({
    queryKey: monitoringKeys.rayon(rayonId),
    queryFn: async () => {
      const response = await apiClient.get<RayonMonitoringStats>(`/monitoring/rayon/${rayonId}`);
      return response.data;
    },
    staleTime: 30 * 1000, // 30 seconds
    refetchInterval: 30 * 1000, // Auto-refresh every 30s
    enabled: !!rayonId,
  });
}

/**
 * Fetch Area Statistics
 * Access: Admin + TopManagement + KepalaRayon + KoordinatorLapangan
 */
export function useAreaMonitoring(areaId: string) {
  return useQuery({
    queryKey: monitoringKeys.area(areaId),
    queryFn: async () => {
      const response = await apiClient.get<AreaMonitoringStats>(`/monitoring/area/${areaId}`);
      return response.data;
    },
    staleTime: 30 * 1000, // 30 seconds
    refetchInterval: 30 * 1000, // Auto-refresh every 30s
    enabled: !!areaId,
  });
}

/**
 * Fetch Live Worker Positions
 * Access: Admin + TopManagement + KepalaRayon + KoordinatorLapangan
 */
export function useLiveWorkers(filters?: LiveWorkersFilters) {
  return useQuery({
    queryKey: monitoringKeys.liveWorkers(filters),
    queryFn: async () => {
      const response = await apiClient.get<LiveWorkersResponse>('/monitoring/live-workers', {
        params: filters,
      });
      return response.data;
    },
    staleTime: 15 * 1000, // 15 seconds (very fresh data)
    refetchInterval: 15 * 1000, // Auto-refresh every 15s for live tracking
  });
}
