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
  /**
   * Whether the OS reported this fix as coming from a mock provider.
   *
   * Optional here (not in `LocationPing`) because a buffer persisted to
   * AsyncStorage by an older build predates the field. Those pings are
   * forwarded as `false` — see `convertPingsToLocations`.
   */
  mocked?: boolean;
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
    // A ping buffered by an older build carries no verdict. Send `false` rather
    // than omitting the field: the server must be able to tell "checked, clean"
    // from "field absent", and treating an unknown as mocked would mass-flag
    // every queued ping the first time a worker updates the app.
    is_mocked: ping.mocked ?? false,
  }));
}
