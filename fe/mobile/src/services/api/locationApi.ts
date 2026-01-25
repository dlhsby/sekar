/**
 * Location API Service
 * Location tracking related API calls
 */

import { post } from './apiClient';
import type {
  LocationBatchRequest,
  LocationBatchResponse,
  LocationPoint,
  ApiResponse,
} from '../../types/api.types';

/**
 * Location ping from tracker (internal format)
 */
export interface TrackerLocationPing {
  latitude: number;
  longitude: number;
  accuracy: number;
  timestamp: string; // ISO format
  shift_id: string;
  battery_level?: number; // 0-100 percentage
}

/**
 * Upload batch of location pings
 * Converts internal tracker format to backend API format
 *
 * @param shiftId - The active shift ID
 * @param locations - Array of location points
 * @returns Batch upload response with count
 */
export async function uploadLocationBatch(
  shiftId: string,
  locations: LocationPoint[],
): Promise<ApiResponse<LocationBatchResponse>> {
  const payload: LocationBatchRequest = {
    shift_id: shiftId,
    locations,
  };
  return post<LocationBatchResponse>('/location/batch', payload);
}

/**
 * Convert tracker pings to API location points
 * Helper for locationTracker to convert internal format
 *
 * @param pings - Array of tracker location pings
 * @returns Array of API-compatible location points
 */
export function convertPingsToLocations(pings: TrackerLocationPing[]): LocationPoint[] {
  return pings.map(ping => ({
    gps_lat: ping.latitude,
    gps_lng: ping.longitude,
    accuracy_meters: ping.accuracy,
    battery_level: ping.battery_level,
    logged_at: ping.timestamp,
  }));
}
