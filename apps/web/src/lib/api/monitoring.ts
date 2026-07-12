/**
 * Monitoring API Client (Phase 2D - Enhanced monitoring)
 * Types are defined in monitoring-types.ts; this file exports hooks only.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from './client';

// Re-export all types from monitoring-types for consumer convenience
export type {
  TrackingStatus,
  CityStats,
  RayonMonitoringStats,
  AreaMonitoringStats,
  LiveUser,
  LiveUsersResponse,
  LiveUsersFilters,
  UserDaySummary,
  LocationHistoryPoint,
  LocationHistory,
  StaffingRoleBreakdown,
  StaffingSummaryItem,
  StaffingSummaryResponse,
  StaffingFilters,
  MonitoringConfigItem,
  MonitoringConfigResponse,
  UserStatusChangedEvent,
  UserAreaEvent,
  RoleStaffingItem,
  LocationBoundary,
  RayonBoundary,
  BoundariesResponse,
  ReassignWorkerPayload,
  ReassignWorkerResponse,
  DayType,
} from './monitoring-types';

import type {
  CityStats,
  RayonMonitoringStats,
  AreaMonitoringStats,
  LiveUser,
  LiveUsersResponse,
  LiveUsersFilters,
  UserDaySummary,
  LocationHistory,
  StaffingSummaryResponse,
  StaffingFilters,
  MonitoringConfigItem,
  MonitoringConfigResponse,
  BoundariesResponse,
  ReassignWorkerPayload,
  ReassignWorkerResponse,
} from './monitoring-types';

// ---------------------------------------------------------------------------
// Query Key Factory
// ---------------------------------------------------------------------------

export const monitoringKeys = {
  all: ['monitoring'] as const,
  city: () => [...monitoringKeys.all, 'city'] as const,
  rayon: (id: string) => [...monitoringKeys.all, 'rayon', id] as const,
  area: (id: string) => [...monitoringKeys.all, 'area', id] as const,
  liveUsers: (filters?: LiveUsersFilters) =>
    [...monitoringKeys.all, 'live-users', filters] as const,
  userDaySummary: (userId: string) => [...monitoringKeys.all, 'user-day-summary', userId] as const,
  locationHistory: (userId: string, date: string) =>
    [...monitoringKeys.all, 'location-history', userId, date] as const,
  staffingSummary: (filters?: StaffingFilters) =>
    [...monitoringKeys.all, 'staffing-summary', filters] as const,
  config: () => [...monitoringKeys.all, 'config'] as const,
  boundaries: (level?: 'rayon' | 'area', rayonId?: string) =>
    [...monitoringKeys.all, 'boundaries', level ?? 'area', rayonId ?? null] as const,
};

// ---------------------------------------------------------------------------
// City / Rayon / Area Hooks (Phase 2C - unchanged)
// ---------------------------------------------------------------------------

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

export function useAreaMonitoring(areaId: string, enabled = true) {
  return useQuery({
    queryKey: monitoringKeys.area(areaId),
    queryFn: async () => {
      const response = await apiClient.get<AreaMonitoringStats>(`/monitoring/location/${areaId}`);
      return response.data;
    },
    staleTime: 30 * 1000,
    refetchInterval: 30 * 1000,
    enabled: enabled && !!areaId,
  });
}

// ---------------------------------------------------------------------------
// Live Users Hook (Phase 2D - enhanced)
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// User Day Summary Hook (Phase 2D - new)
// ---------------------------------------------------------------------------

export function useUserDaySummary(userId: string | null) {
  return useQuery({
    queryKey: monitoringKeys.userDaySummary(userId ?? ''),
    queryFn: async () => {
      const response = await apiClient.get<UserDaySummary>(
        `/monitoring/users/${userId}/day-summary`
      );
      return response.data;
    },
    enabled: !!userId,
    staleTime: 30 * 1000,
    refetchInterval: 30 * 1000,
  });
}

// ---------------------------------------------------------------------------
// Location History Hook (Phase 2D - new)
// ---------------------------------------------------------------------------

export function useLocationHistory(userId: string | null, date: string) {
  return useQuery({
    queryKey: monitoringKeys.locationHistory(userId ?? '', date),
    queryFn: async () => {
      const response = await apiClient.get<LocationHistory>(
        `/monitoring/users/${userId}/location-history`,
        { params: { date } }
      );
      return response.data;
    },
    enabled: !!userId && !!date,
    staleTime: 60 * 1000,
  });
}

// ---------------------------------------------------------------------------
// Staffing Summary Hook (Phase 2D - new)
// ---------------------------------------------------------------------------

export function useStaffingSummary(filters?: StaffingFilters) {
  return useQuery({
    queryKey: monitoringKeys.staffingSummary(filters),
    queryFn: async () => {
      const response = await apiClient.get<StaffingSummaryResponse>(
        '/monitoring/staffing-summary',
        { params: filters }
      );
      return response.data;
    },
    staleTime: 30 * 1000,
    refetchInterval: 30 * 1000,
  });
}

// ---------------------------------------------------------------------------
// Monitoring Config Hooks (Phase 2D - admin only)
// ---------------------------------------------------------------------------

export function useMonitoringConfig() {
  return useQuery({
    queryKey: monitoringKeys.config(),
    queryFn: async () => {
      const response = await apiClient.get<MonitoringConfigResponse>('/monitoring/config');
      return response.data;
    },
    staleTime: 5 * 60 * 1000,
  });
}

export function useUpdateMonitoringConfig() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ key, value }: { key: string; value: Record<string, unknown> }) => {
      const response = await apiClient.patch<MonitoringConfigItem>(`/monitoring/config/${key}`, {
        value,
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: monitoringKeys.config() });
    },
  });
}

// ---------------------------------------------------------------------------
// Boundaries Hook (Phase 2D-10 Gap Fix #9)
// ---------------------------------------------------------------------------

/**
 * useBoundaries — rayon/area polygons for the map.
 *
 * `level='rayon'` returns outlines only (no per-area geometry) — the light
 * payload for the city view. Drilling into a rayon requests `level='area'`
 * with `rayonId` so only that rayon's areas load. Geometry is server-simplified
 * (Douglas–Peucker) and changes rarely, so it caches for 5 minutes.
 */
export function useBoundaries(
  enabled = true,
  level?: 'rayon' | 'area',
  rayonId?: string
) {
  return useQuery({
    queryKey: monitoringKeys.boundaries(level, rayonId),
    queryFn: async () => {
      const params: Record<string, string> = {};
      if (level) params.level = level;
      if (rayonId) params.rayon_id = rayonId;
      const response = await apiClient.get<BoundariesResponse>('/monitoring/boundaries', {
        params,
      });
      return response.data;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    enabled,
  });
}

// ---------------------------------------------------------------------------
// Reassign Worker Hook (Phase 2D-10 Gap Fix #10)
// ---------------------------------------------------------------------------

export function useReassignWorker() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: ReassignWorkerPayload) => {
      const response = await apiClient.post<ReassignWorkerResponse>('/monitoring/reassign', data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: monitoringKeys.all });
    },
  });
}
