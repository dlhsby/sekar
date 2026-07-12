/**
 * Areas API
 * Handles fetching area (work location) data
 */

import { get } from './apiClient';
import type { Area } from '../../types/models.types';
import type { ApiResponse } from '../../types/api.types';

/**
 * Get all areas
 * Optional filter by area type code
 */
export async function getAreas(areaType?: string): Promise<ApiResponse<Area[]>> {
  const params = areaType ? { area_type: areaType } : undefined;
  return get<Area[]>('/areas', params);
}

/**
 * Get a single area by ID
 */
export async function getAreaById(id: string): Promise<ApiResponse<Area>> {
  return get<Area>(`/areas/${id}`);
}
