/**
 * Monitoring API Service
 * Phase 2C: consolidated monitoring + supervisor endpoints
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
} from '../../types/api.types';
import type { Activity } from '../../types/models.types';

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

export default {
  getCityMonitoring,
  getRayonMonitoring,
  getAreaMonitoring,
  getLiveUsers,
  getActiveUsers,
  getAllActivities,
  getActivityDetails,
  getAttendance,
};
