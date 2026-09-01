/**
 * Monitoring API Service
 * Phase 2D: consolidated monitoring + supervisor endpoints + new Phase 2D endpoints
 */

import { get, post } from './apiClient';
import type {
  ActivitiesFilter,
  AttendanceFilter,
  AttendanceResponse,
  UserAttendanceDetail,
  ApiResponse,
  ActiveUserData,
  CityMonitoringResponse,
  DistrictMonitoringResponse,
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
  BoundariesResponse,
  MonitoringAggregateResponse,
  ReassignWorkerPayload,
  ReassignWorkerResponse,
  AreaPlantStatusResponse,
  ReassignmentHistory,
} from '../../types/models.types';
import type { LiveUser } from '../../types/monitoring.types';
import { snapshotWorkerToLiveUser, type SnapshotWorker } from '../../utils/monitoringScope';

export async function getCityMonitoring(
  filters?: MonitoringFilter,
): Promise<ApiResponse<CityMonitoringResponse>> {
  return get<CityMonitoringResponse>('/monitoring/city', filters);
}

export async function getDistrictMonitoring(
  districtId: string,
  filters?: MonitoringFilter,
): Promise<ApiResponse<DistrictMonitoringResponse>> {
  return get<DistrictMonitoringResponse>(
    `/monitoring/district/${districtId}`,
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

/**
 * Fetch a monitoring snapshot and adapt it to `LiveUser[]`. Unlike `/live-users`,
 * the snapshot carries `display_scope`/`display_scope_id`, so the map can render
 * workers at their own drill tier (city/district/region/location) via `scopeMatches`.
 * The snapshot endpoint scope enum is `city|district|location` (no `region`) — the
 * caller fetches a region tier via its district snapshot, then filters by scope.
 */
export async function getSnapshotWorkers(
  scope: 'city' | 'district' | 'location',
  id?: string,
): Promise<ApiResponse<LiveUser[]>> {
  const res = await get<{ workers?: SnapshotWorker[] }>(
    '/monitoring/snapshot',
    id ? { scope, id } : { scope },
  );
  const workers = (res.data?.workers ?? []).map(snapshotWorkerToLiveUser);
  return { ...res, data: workers };
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

/**
 * Attendance for a WIB service-day.
 *
 * Moved off `/supervisor/attendance`: that module is superseded by monitoring,
 * and its version had a satgas-only roster (linmas invisible), server-local day
 * bounds (a UTC container reported the PREVIOUS day between 00:00-07:00 WIB),
 * matched `clock_in_time` instead of `service_day` (night shifts landed on the
 * wrong day), and emitted one row per SHIFT so a double clock-in counted twice.
 * The list response shape is unchanged, so this is a URL swap.
 */
export async function getAttendance(
  filters: AttendanceFilter = {},
): Promise<ApiResponse<AttendanceResponse>> {
  return get<AttendanceResponse>('/monitoring/attendance', filters);
}

export async function getUserAttendanceDetail(
  userId: string,
  date?: string,
): Promise<ApiResponse<UserAttendanceDetail>> {
  return get<UserAttendanceDetail>(
    `/monitoring/attendance/${userId}`,
    date ? { date } : {},
  );
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
  filters?: { district_id?: string; location_id?: string },
): Promise<ApiResponse<StaffingSummaryResponse>> {
  return get<StaffingSummaryResponse>('/monitoring/staffing-summary', filters);
}

// Phase 2D Gap: Boundaries endpoint.
// `level='district'` returns district outlines only (lightest payload for the city
// view); `level='area'` (+ districtId) returns that district's area geometry.
export async function getBoundaries(
  districtId?: string,
  level?: 'district' | 'area',
  /**
   * Viewport mode (ADR-060): `minLng,minLat,maxLng,maxLat`. The server returns
   * only geometry intersecting the box — the whole point of the mode, since
   * mobile otherwise pulls every lokasi polygon in the city at every zoom.
   */
  bbox?: string | null,
): Promise<ApiResponse<BoundariesResponse>> {
  const params: Record<string, string> = {};
  if (districtId) {
    params.district_id = districtId;
  }
  if (level) {
    params.level = level;
  }
  if (bbox) {
    params.bbox = bbox;
  }
  return get<BoundariesResponse>('/monitoring/boundaries', params);
}

// Aggregate ("Ringkasan") rollup — district nodes (scope=city), kawasan nodes
// (scope=region, id=districtId) or lokasi nodes (scope=district) with grouped
// status/role counts and centers, no worker coords.
export async function getMonitoringAggregate(
  scope: 'city' | 'district' | 'region' = 'city',
  id?: string,
): Promise<ApiResponse<MonitoringAggregateResponse>> {
  const params: Record<string, string> = { scope };
  if (id) {
    params.id = id;
  }
  return get<MonitoringAggregateResponse>('/monitoring/aggregate', params);
}

// Server-side monitoring search (5.7a) — workers clocked in with a fix in the last
// 24h whose name/lokasi matches, scope-filtered by the caller's role (surfaces
// off-screen + monitorable-but-unscheduled clock-ins the loaded snapshot omits).
export async function searchMonitoring(
  query: string,
): Promise<ApiResponse<LiveUsersResponse>> {
  return get<LiveUsersResponse>('/monitoring/search', { q: query });
}

// Phase 2D Gap: Reassign worker endpoint
export async function reassignWorker(
  payload: ReassignWorkerPayload,
): Promise<ApiResponse<ReassignWorkerResponse>> {
  return post<ReassignWorkerResponse>('/monitoring/reassign', payload);
}

// Phase 2D Gap: Monitoring config endpoint (admin only)
export async function getMonitoringConfig(): Promise<
  ApiResponse<Record<string, unknown>[]>
> {
  return get<Record<string, unknown>[]>('/monitoring/config');
}

// Phase 3 3-8: Plant due-date forecast
export async function getAreaPlantStatus(
  areaId: string,
): Promise<ApiResponse<AreaPlantStatusResponse>> {
  return get<AreaPlantStatusResponse>(`/monitoring/area/${areaId}/plant-status`);
}

// Phase 4-4 A4: Reassignment history audit trail
export async function getReassignmentHistory(
  userId: string,
): Promise<ApiResponse<ReassignmentHistory>> {
  return get<ReassignmentHistory>(`/monitoring/users/${userId}/reassignment-history`);
}

export default {
  getCityMonitoring,
  getDistrictMonitoring,
  getAreaMonitoring,
  getLiveUsers,
  getAllActivities,
  getActivityDetails,
  getAttendance,
  getUserAttendanceDetail,
  getUserDaySummary,
  getUserLocationHistory,
  getStaffingSummary,
  getBoundaries,
  getMonitoringAggregate,
  reassignWorker,
  getMonitoringConfig,
  getAreaPlantStatus,
  getReassignmentHistory,
};
