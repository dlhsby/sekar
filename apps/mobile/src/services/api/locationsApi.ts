/**
 * Locations API
 * Handles fetching location (work location, formerly "area") data.
 * Canonical route is `/locations`; the backend still serves `/areas` as an alias.
 */

import { get } from './apiClient';
import type { Area } from '../../types/models.types';
import type { ApiResponse } from '../../types/api.types';

/**
 * Get all locations
 * Optional filter by location type code
 */
export async function getAreas(areaType?: string): Promise<ApiResponse<Area[]>> {
  const params = areaType ? { area_type: areaType } : undefined;
  return get<Area[]>('/locations', params);
}

/**
 * Get a single location by ID
 */
export async function getAreaById(id: string): Promise<ApiResponse<Area>> {
  return get<Area>(`/locations/${id}`);
}
