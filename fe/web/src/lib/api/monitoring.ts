/**
 * Monitoring API Client (Phase 2C - terminology updated)
 * Interfaces match backend DTOs exactly:
 *  CityStatsDto, RayonStatsDto, AreaStatsDto, LiveUsersResponseDto
 */

import { useQuery } from '@tanstack/react-query';
import { apiClient } from './client';
import type { UserRole } from '@/types/models';

/**
 * City-Wide Statistics Interface — matches CityStatsDto
 */
export interface CityStats {
  total_rayons: number;
  total_areas: number;
  total_workers: number;
  workers_online: number;
  workers_offline: number;
  active_shifts: number;
  tasks_pending: number;
  tasks_in_progress: number;
  tasks_completed_today: number;
  activities_submitted_today: number;
  generated_at: string;
}

/**
 * Rayon Statistics Interface — matches RayonStatsDto
 */
export interface RayonMonitoringStats {
  id: string;
  name: string;
  code: string;
  total_areas: number;
  total_workers: number;
  workers_online: number;
  workers_offline: number;
  active_shifts: number;
  tasks_pending: number;
  tasks_in_progress: number;
  tasks_completed_today: number;
  activities_submitted_today: number;
  alerts: string[];
  generated_at: string;
}

/**
 * Area Statistics Interface — matches AreaStatsDto
 */
export interface AreaMonitoringStats {
  id: string;
  name: string;
  area_type: string;
  rayon_id: string;
  rayon_name: string;
  coverage_area: number | null;
  total_users_assigned: number;
  users_online: number;
  users_offline: number;
  is_fully_staffed: boolean;
  tasks_pending: number;
  tasks_in_progress: number;
  tasks_completed_today: number;
  activities_submitted_today: number;
  alerts: string[];
  generated_at: string;
}

/**
 * Live User Position Interface — matches LiveUserDto
 */
export interface LiveUser {
  id: string;
  full_name: string;
  role: UserRole;
  area_id: string | null;
  area_name: string;
  rayon_id: string | null;
  rayon_name: string | null;
  latitude: number;
  longitude: number;
  battery_level: number | null;
  last_update: string;
  is_within_area: boolean;
  outside_boundary: boolean;
  shift_id: string;
  shift_name: string;
  clock_in_time: string;
}

/**
 * Live Users Response — matches LiveUsersResponseDto
 */
export interface LiveUsersResponse {
  total_online: number;
  total_offline: number;
  users: LiveUser[];
  generated_at: string;
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
 * Fetch Live User Positions
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
