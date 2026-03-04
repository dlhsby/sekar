/**
 * Monitoring API Client (Phase 2D - Enhanced monitoring)
 * Interfaces match backend DTOs exactly:
 *  CityStatsDto, RayonStatsDto, AreaStatsDto, LiveUsersResponseDto
 *  UserDaySummaryDto, LocationHistoryDto, StaffingSummaryDto
 *  MonitoringConfigDto, AreaBoundaryDto
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from './client';
import type { UserRole } from '@/types/models';

// ---------------------------------------------------------------------------
// Status Types
// ---------------------------------------------------------------------------

export type TrackingStatus = 'active' | 'inactive' | 'outside_area' | 'missing' | 'offline';

// ---------------------------------------------------------------------------
// City / Rayon / Area Stats (Phase 2C - unchanged)
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Live Users (Phase 2D - enhanced)
// ---------------------------------------------------------------------------

export interface LiveUser {
  id: string;
  full_name: string;
  role: UserRole;
  phone: string | null;
  status: TrackingStatus;
  area_id: string | null;
  area_name: string;
  rayon_id: string | null;
  rayon_name: string | null;
  latitude: number;
  longitude: number;
  accuracy: number | null;
  battery_level: number | null;
  last_update: string;
  is_within_area: boolean;
  outside_boundary: boolean;
  shift_id: string;
  shift_name: string;
  clock_in_time: string;
  current_task_status: string | null;
  current_task_title: string | null;
}

export interface LiveUsersResponse {
  total_active: number;
  total_inactive: number;
  total_outside_area: number;
  total_missing: number;
  total_offline: number;
  users: LiveUser[];
  generated_at: string;
}

export interface LiveUsersFilters {
  rayon_id?: string;
  area_id?: string;
  role?: string;
  status?: TrackingStatus;
  search?: string;
}

// ---------------------------------------------------------------------------
// User Day Summary (Phase 2D - new)
// ---------------------------------------------------------------------------

export interface UserDaySummary {
  user_id: string;
  full_name: string;
  username: string;
  role: string;
  phone: string | null;
  status: TrackingStatus;
  area_id: string | null;
  area_name: string | null;
  rayon_id: string | null;
  rayon_name: string | null;
  shift: {
    id: string;
    name: string;
    clock_in_time: string;
    clock_out_time: string | null;
    duration_minutes: number;
    outside_boundary: boolean;
  } | null;
  last_location: {
    latitude: number;
    longitude: number;
    accuracy: number | null;
    battery_level: number | null;
    logged_at: string;
    is_within_area: boolean;
  } | null;
  activities_today: {
    id: string;
    title: string;
    activity_type: string;
    created_at: string;
    photo_url: string | null;
  }[];
  tasks_today: {
    id: string;
    title: string;
    status: string;
    priority: string;
  }[];
  whatsapp_links: { chat: string; call: string } | null;
}

// ---------------------------------------------------------------------------
// Location History (Phase 2D - new)
// ---------------------------------------------------------------------------

export interface LocationHistoryPoint {
  latitude: number;
  longitude: number;
  accuracy: number | null;
  battery_level: number | null;
  logged_at: string;
  is_within_area: boolean;
}

export interface LocationHistory {
  user_id: string;
  user_name: string;
  role: string;
  date: string;
  shift_id: string | null;
  shift_name: string | null;
  area_id: string | null;
  area_name: string | null;
  clock_in_time: string | null;
  clock_out_time: string | null;
  points: LocationHistoryPoint[];
  total_points: number;
  total_distance_meters: number;
  time_inside_area_minutes: number;
  time_outside_area_minutes: number;
  generated_at: string;
}

// ---------------------------------------------------------------------------
// Staffing Summary (Phase 2D - new)
// ---------------------------------------------------------------------------

export interface StaffingRoleBreakdown {
  role: string;
  active: number;
  idle: number;
  outside_area: number;
  missing: number;
  offline: number;
  total_assigned: number;
  total_required: number;
}

export interface StaffingSummaryItem {
  id: string;
  name: string;
  type: 'rayon' | 'area';
  roles: StaffingRoleBreakdown[];
  total_active: number;
  total_idle: number;
  total_outside_area: number;
  total_missing: number;
  total_offline: number;
  is_fully_staffed: boolean;
}

export interface StaffingSummaryResponse {
  items: StaffingSummaryItem[];
  generated_at: string;
}

export interface StaffingFilters {
  rayon_id?: string;
  area_id?: string;
}

// ---------------------------------------------------------------------------
// Monitoring Config (Phase 2D - new)
// ---------------------------------------------------------------------------

export interface MonitoringConfigItem {
  key: string;
  value: Record<string, unknown>;
  description: string;
  updated_at: string;
}

export interface MonitoringConfigResponse {
  configs: MonitoringConfigItem[];
}

// ---------------------------------------------------------------------------
// Area Boundary (Phase 2D - new)
// ---------------------------------------------------------------------------

export interface AreaBoundaryResponse {
  area_id: string;
  name: string;
  boundary_polygon: { type: 'Polygon'; coordinates: number[][][] } | null;
  gps_lat: number;
  gps_lng: number;
  radius_meters: number;
  coverage_area: number | null;
}

// ---------------------------------------------------------------------------
// WebSocket Event Types (Phase 2D - new)
// ---------------------------------------------------------------------------

export interface UserStatusChangedEvent {
  user_id: string;
  user_name: string;
  role: string;
  area_id: string | null;
  area_name: string | null;
  rayon_id: string | null;
  previous_status: TrackingStatus;
  new_status: TrackingStatus;
  latitude: number | null;
  longitude: number | null;
  timestamp: string;
}

export interface UserAreaEvent {
  user_id: string;
  user_name: string;
  role: string;
  area_id: string;
  area_name: string;
  rayon_id: string | null;
  latitude: number;
  longitude: number;
  timestamp: string;
}

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
  userDaySummary: (userId: string) =>
    [...monitoringKeys.all, 'user-day-summary', userId] as const,
  locationHistory: (userId: string, date: string) =>
    [...monitoringKeys.all, 'location-history', userId, date] as const,
  staffingSummary: (filters?: StaffingFilters) =>
    [...monitoringKeys.all, 'staffing-summary', filters] as const,
  config: () => [...monitoringKeys.all, 'config'] as const,
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
      const response = await apiClient.get<RayonMonitoringStats>(
        `/monitoring/rayon/${rayonId}`
      );
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
      const response = await apiClient.get<AreaMonitoringStats>(
        `/monitoring/area/${areaId}`
      );
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
    mutationFn: async ({
      key,
      value,
    }: {
      key: string;
      value: Record<string, unknown>;
    }) => {
      const response = await apiClient.patch<MonitoringConfigItem>(
        `/monitoring/config/${key}`,
        { value }
      );
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: monitoringKeys.config() });
    },
  });
}
