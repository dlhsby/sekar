/**
 * Shifts API Service
 * Phase 2C: location_id optional (auto-detected from schedule)
 */

import { get, post } from './apiClient';
import type {
  ClockInResponse,
  ClockOutRequest,
  ClockOutResponse,
  CurrentShiftResponse,
  AttendanceListResponse,
  AttendanceDayDetail,
  AttendanceFilter,
  ApiResponse,
} from '../../types/api.types';

/**
 * Clock in to start shift
 * Phase 2C: areaId is optional (auto-detected from schedule)
 */
export async function clockIn(
  gpsLat: number,
  gpsLng: number,
  selfiePhotoBase64?: string,
  areaId?: string,
): Promise<ApiResponse<ClockInResponse>> {
  const payload: Record<string, unknown> = {
    gps_lat: gpsLat,
    gps_lng: gpsLng,
  };
  if (selfiePhotoBase64) {
    payload.selfie_photo = selfiePhotoBase64;
  }
  if (areaId) {
    payload.location_id = areaId;
  }
  return post<ClockInResponse>('/shifts/clock-in', payload);
}

/**
 * Clock out to end shift
 * Backend uses the authenticated user's current active shift
 */
export async function clockOut(
  gpsLat: number,
  gpsLng: number,
  selfieBase64?: string,
): Promise<ApiResponse<ClockOutResponse>> {
  const payload: ClockOutRequest = {
    gps_lat: gpsLat,
    gps_lng: gpsLng,
    ...(selfieBase64 ? { selfie_photo: selfieBase64 } : {}),
  };
  return post<ClockOutResponse>('/shifts/clock-out', payload);
}

export async function getCurrentShift(): Promise<
  ApiResponse<CurrentShiftResponse | null>
> {
  return get<CurrentShiftResponse | null>('/shifts/current');
}

export async function getMyShifts(): Promise<
  ApiResponse<CurrentShiftResponse[]>
> {
  return get<CurrentShiftResponse[]>('/shifts/my-shifts');
}

/**
 * Attendance history grouped by WIB calendar day (regular shifts only),
 * paginated by day (newest first).
 */
export async function getAttendanceDays(
  filter: AttendanceFilter = {},
): Promise<ApiResponse<AttendanceListResponse>> {
  const params: Record<string, string | number> = {};
  if (filter.page) { params.page = filter.page; }
  if (filter.limit) { params.limit = filter.limit; }
  if (filter.from_date) { params.from_date = filter.from_date; }
  if (filter.to_date) { params.to_date = filter.to_date; }
  if (filter.status) { params.status = filter.status; }
  if (filter.sort_dir) { params.sort_dir = filter.sort_dir; }
  return get<AttendanceListResponse>('/shifts/attendance', params);
}

/**
 * All of the user's regular shifts on a single WIB calendar day (YYYY-MM-DD).
 */
export async function getAttendanceForDate(
  date: string,
): Promise<ApiResponse<AttendanceDayDetail>> {
  return get<AttendanceDayDetail>(`/shifts/attendance/${date}`);
}
