/**
 * Shifts API Service
 * Clock-in/out related API calls
 */

import { get, post } from './apiClient';
import type {
  ClockInRequest,
  ClockInResponse,
  ClockOutRequest,
  ClockOutResponse,
  CurrentShiftResponse,
  ApiResponse,
} from '../../types/api.types';

/**
 * Clock in to start shift
 * @param areaId - Area ID
 * @param gpsLat - GPS latitude
 * @param gpsLng - GPS longitude
 * @param selfiePhoto - Base64 encoded selfie photo
 * @returns Clock-in response with shift ID
 */
export async function clockIn(
  areaId: number,
  gpsLat: number,
  gpsLng: number,
  selfiePhoto: string,
): Promise<ApiResponse<ClockInResponse>> {
  const payload: ClockInRequest = {
    area_id: areaId,
    gps_lat: gpsLat,
    gps_lng: gpsLng,
    selfie_photo: selfiePhoto,
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

