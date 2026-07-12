/**
 * Locations API
 * Handles fetching location (work location) data
 */

import { get } from './apiClient';
import type { Location } from '../../types/models.types';
import type { ApiResponse } from '../../types/api.types';

/**
 * Get all locations
 * Optional filter by location type code
 */
export async function getLocations(locationType?: string): Promise<ApiResponse<Location[]>> {
  const params = locationType ? { location_type: locationType } : undefined;
  return get<Location[]>('/locations', params);
}

/**
 * Get a single location by ID
 */
export async function getLocationById(id: string): Promise<ApiResponse<Location>> {
  return get<Location>(`/locations/${id}`);
}
