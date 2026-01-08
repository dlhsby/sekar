/**
 * Location API Service
 * Location tracking related API calls
 */

import { post } from './apiClient';
import type {
  LocationBatchRequest,
  LocationBatchResponse,
  ApiResponse,
} from '../../types/api.types';
import type { LocationPing } from '../../types/models.types';

/**
 * Upload batch of location pings
 * @param pings - Array of location pings
 * @returns Batch upload response with count
 */
export async function uploadLocationBatch(
  pings: LocationPing[],
): Promise<ApiResponse<LocationBatchResponse>> {
  const payload: LocationBatchRequest = { pings };
  return post<LocationBatchResponse>('/api/location/batch', payload);
}

