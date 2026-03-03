/**
 * Monitoring API Client (Phase 2C - terminology updated)
 */

import { useQuery } from '@tanstack/react-query';
import { apiClient } from './client';
import type { UserRole } from '@/types/models';

/**
 * City-Wide Statistics Interface (Phase 2C)
 */
export interface CityStats {
  timestamp: string;
  summary: {
    total_rayons: number;
    total_areas: number;
    total_users: number;
    total_linmas: number;
    users_online: number;
    linmas_online: number;
    active_shifts: number;
    activities_today: number;
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
    total_users: number;
    total_linmas: number;
    users_online: number;
    linmas_online: number;
    active_shifts: number;
    activities_today: number;
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
    required_users: number;
    required_linmas: number;
    assigned_users: number;
    assigned_linmas: number;
    active_users: number;
    active_linmas: number;
  };
}

/**
 * Live User Position Interface (Phase 2C - renamed from LiveWorker)
 */
export interface LiveUser {
  user_id: string;
  full_name: string;
  role: UserRole;
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
 * Live Users Response
 */
export interface LiveUsersResponse {
  timestamp: string;
  users: LiveUser[];
  total: number;
}

/**
 * Live Users Filters
 */
export interface LiveUsersFilters {
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
  liveUsers: (filters?: LiveUsersFilters) =>
    [...monitoringKeys.all, 'live-users', filters] as const,
};

/**
 * Fetch City-Wide Statistics
 */
export function useCityStats(enabled = true) {
  return useQuery({
    queryKey: monitoringKeys.city(),
    queryFn: async () => {
      const response = await apiClient.get<CityStats>('/monitoring/city');
      return response.data;
    },
    staleTime: 30 * 1000,
    refetchInterval: 30 * 1000,
    enabled,
  });
}

/**
 * Fetch Rayon Statistics
 */
export function useRayonMonitoring(rayonId: string, enabled = true) {
  return useQuery({
    queryKey: monitoringKeys.rayon(rayonId),
    queryFn: async () => {
      const response = await apiClient.get<RayonMonitoringStats>(`/monitoring/rayon/${rayonId}`);
      return response.data;
    },
    staleTime: 30 * 1000,
    refetchInterval: 30 * 1000,
    enabled: enabled && !!rayonId,
  });
}

/**
 * Fetch Area Statistics
 */
export function useAreaMonitoring(areaId: string, enabled = true) {
  return useQuery({
    queryKey: monitoringKeys.area(areaId),
    queryFn: async () => {
      const response = await apiClient.get<AreaMonitoringStats>(`/monitoring/area/${areaId}`);
      return response.data;
    },
    staleTime: 30 * 1000,
    refetchInterval: 30 * 1000,
    enabled: enabled && !!areaId,
  });
}

/**
 * Fetch Live User Positions (Phase 2C - renamed from useLiveWorkers)
 */
export function useLiveUsers(filters?: LiveUsersFilters) {
  return useQuery({
    queryKey: monitoringKeys.liveUsers(filters),
    queryFn: async () => {
      const response = await apiClient.get<LiveUsersResponse>('/monitoring/live-users', {
        params: filters,
      });
      return response.data;
    },
    staleTime: 15 * 1000,
    refetchInterval: 15 * 1000,
  });
}
