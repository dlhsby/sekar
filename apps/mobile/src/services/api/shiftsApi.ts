/**
 * Shifts API Service
 * Phase 2C: location_id optional (auto-detected from schedule)
 */

import { get, post } from './apiClient';
import type {
  ClockInResponse,
  ClockOutResponse,
  CurrentShiftResponse,
  ShiftCurrentStateResponse,
  AttendanceListResponse,
  AttendanceDayDetail,
  AttendanceFilter,
  ApiResponse,
} from '../../types/api.types';

/**
 * ADR-055 punch options carried on a clock-in/out. `clientUuid` is the punch's
 * idempotency key — a retried (offline-synced) punch with the same id is a no-op
 * server-side. `shiftDefinitionId` + `serviceDay` carry the picker's explicit
 * shift choice (near midnight / dangling).
 */
export interface ClockPunchOptions {
  clientUuid?: string;
  accuracyM?: number;
  shiftDefinitionId?: string;
  serviceDay?: string;
}

function applyPunchOptions(payload: Record<string, unknown>, opts?: ClockPunchOptions): void {
  if (!opts) return;
  if (opts.clientUuid) payload.client_uuid = opts.clientUuid;
  if (opts.accuracyM != null) payload.accuracy_m = opts.accuracyM;
  if (opts.shiftDefinitionId) payload.shift_definition_id = opts.shiftDefinitionId;
  if (opts.serviceDay) payload.service_day = opts.serviceDay;
}

/**
 * Clock in to start shift
 * Phase 2C: areaId is optional (auto-detected from schedule)
 * ADR-055: opts carries the idempotency uuid + explicit picker shift.
 */
export async function clockIn(
  gpsLat: number,
  gpsLng: number,
  selfiePhotoBase64?: string,
  areaId?: string,
  opts?: ClockPunchOptions,
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
  applyPunchOptions(payload, opts);
  return post<ClockInResponse>('/shifts/clock-in', payload);
}

/**
 * Clock out to end shift
 * Backend uses the authenticated user's current active shift
 * ADR-055: opts carries the idempotency uuid.
 */
export async function clockOut(
  gpsLat: number,
  gpsLng: number,
  selfieBase64?: string,
  opts?: ClockPunchOptions,
): Promise<ApiResponse<ClockOutResponse>> {
  const payload: Record<string, unknown> = {
    gps_lat: gpsLat,
    gps_lng: gpsLng,
    ...(selfieBase64 ? { selfie_photo: selfieBase64 } : {}),
  };
  applyPunchOptions(payload, opts);
  return post<ClockOutResponse>('/shifts/clock-out', payload);
}

/**
 * ADR-055 Phase 3: the worker's live attendance state — the open session (or
 * null) + the ranked shift options a clock-in could target now. Drives the
 * Rekam Waktu shift picker and the Clock-Out gate.
 */
export async function getCurrentState(): Promise<ApiResponse<ShiftCurrentStateResponse>> {
  return get<ShiftCurrentStateResponse>('/shifts/current-state');
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
