/**
 * Shifts API Service
 * Phase 2C: area_id optional (auto-detected from schedule)
 */

import { get, post } from './apiClient';
import type {
  ClockInResponse,
  ClockOutRequest,
  ClockOutResponse,
  CurrentShiftResponse,
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
    payload.area_id = areaId;
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
