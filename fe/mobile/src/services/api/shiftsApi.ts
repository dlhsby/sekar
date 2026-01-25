/**
 * Shifts API Service
 * Clock-in/out related API calls
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
 * Clock in to start shift using Base64 encoded photo
 * @param areaId - Area UUID (string)
 * @param gpsLat - GPS latitude
 * @param gpsLng - GPS longitude
 * @param selfiePhotoBase64 - Base64 encoded selfie photo with data URI prefix
 * @returns Clock-in response with shift ID
 */
export async function clockIn(
  areaId: string,
  gpsLat: number,
  gpsLng: number,
  selfiePhotoBase64: string,
): Promise<ApiResponse<ClockInResponse>> {
  const payload = {
    area_id: areaId,
    gps_lat: gpsLat,
    gps_lng: gpsLng,
    selfie_photo: selfiePhotoBase64,
  };
  return post<ClockInResponse>('/shifts/clock-in', payload);
}

/**
 * Clock out to end shift
 * Backend automatically uses the current active shift for the authenticated user.
 *
 * @param gpsLat - GPS latitude
 * @param gpsLng - GPS longitude
 * @returns Clock-out response with total hours
 */
export async function clockOut(
  gpsLat: number,
  gpsLng: number,
): Promise<ApiResponse<ClockOutResponse>> {
  const payload: ClockOutRequest = {
    gps_lat: gpsLat,
    gps_lng: gpsLng,
  };
  return post<ClockOutResponse>('/shifts/clock-out', payload);
}

/**
 * Get current active shift
 * @returns Current shift data or null
 */
export async function getCurrentShift(): Promise<
  ApiResponse<CurrentShiftResponse | null>
> {
  return get<CurrentShiftResponse | null>('/shifts/current');
}

/**
 * Get worker's shift history
 * @returns Array of past shifts
 */
export async function getMyShifts(): Promise<ApiResponse<CurrentShiftResponse[]>> {
  return get<CurrentShiftResponse[]>('/shifts/my-shifts');
}

