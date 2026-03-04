/**
 * Monitoring API Service
 * Phase 2D: consolidated monitoring + supervisor endpoints + new Phase 2D endpoints
 */

import { get } from './apiClient';
import type {
  ActivitiesFilter,
  AttendanceFilter,
  AttendanceResponse,
  ApiResponse,
  ActiveUserData,
  CityMonitoringResponse,
  RayonMonitoringResponse,
  AreaMonitoringResponse,
  LiveUsersResponse,
  LiveUsersFilter,
  MonitoringFilter,
  StaffingSummaryResponse,
} from '../../types/api.types';
import type {
  Activity,
  UserDaySummary,
  LocationHistory,
  StaffingSummaryItem,
} from '../../types/models.types';

export async function getCityMonitoring(
  filters?: MonitoringFilter,
): Promise<ApiResponse<CityMonitoringResponse>> {
  return get<CityMonitoringResponse>('/monitoring/city', filters);
}

export async function getRayonMonitoring(
  rayonId: string,
  filters?: MonitoringFilter,
): Promise<ApiResponse<RayonMonitoringResponse>> {
  return get<RayonMonitoringResponse>(
    `/monitoring/rayon/${rayonId}`,
    filters,
  );
}

export async function getAreaMonitoring(
  areaId: string,
  filters?: MonitoringFilter,
): Promise<ApiResponse<AreaMonitoringResponse>> {
  return get<AreaMonitoringResponse>(`/monitoring/area/${areaId}`, filters);
}

export async function getLiveUsers(
  filters?: LiveUsersFilter,
): Promise<ApiResponse<LiveUsersResponse>> {
  return get<LiveUsersResponse>('/monitoring/live-users', filters);
}

export async function getActiveUsers(): Promise<
  ApiResponse<{ users: ActiveUserData[] }>
> {
  return get('/supervisor/active-users');
}

export async function getAllActivities(
  filters: ActivitiesFilter = {},
): Promise<ApiResponse<Activity[]>> {
  return get<Activity[]>('/activities', filters);
}

export async function getActivityDetails(
  activityId: string,
): Promise<ApiResponse<Activity>> {
  return get<Activity>(`/activities/${activityId}`);
}

export async function getAttendance(
  filters: AttendanceFilter = {},
): Promise<ApiResponse<AttendanceResponse>> {
  return get<AttendanceResponse>('/supervisor/attendance', filters);
}

// ─── Phase 2D New Endpoints ────────────────────────────────────────────────────

export async function getUserDaySummary(
  userId: string,
): Promise<ApiResponse<UserDaySummary>> {
  return get<UserDaySummary>(`/monitoring/users/${userId}/day-summary`);
}

export async function getUserLocationHistory(
  userId: string,
  date: string,
  shiftId?: string,
): Promise<ApiResponse<LocationHistory>> {
  const params: Record<string, string> = { date };
  if (shiftId) {
    params.shift_id = shiftId;
  }
  return get<LocationHistory>(
    `/monitoring/users/${userId}/location-history`,
    params,
  );
}

export async function getStaffingSummary(
  filters?: { rayon_id?: string; area_id?: string },
): Promise<ApiResponse<StaffingSummaryResponse>> {
  return get<StaffingSummaryResponse>('/monitoring/staffing-summary', filters);
}

export default {
  getCityMonitoring,
  getRayonMonitoring,
  getAreaMonitoring,
  getLiveUsers,
  getActiveUsers,
  getAllActivities,
  getActivityDetails,
  getAttendance,
  getUserDaySummary,
  getUserLocationHistory,
  getStaffingSummary,
};
