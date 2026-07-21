/**
 * Regions API
 * Handles fetching region (Kawasan / area scope) data
 */

import { get } from './apiClient';
import type { ApiResponse } from '../../types/api.types';

/**
 * Region interface
 */
export interface Region {
  id: string;
  name: string;
  description?: string;
  district_id?: string;
  created_at: string;
  updated_at: string;
}

/**
 * Get all regions (optionally filtered by district_id)
 */
export async function getRegions(districtId?: string): Promise<ApiResponse<Region[]>> {
  const params = districtId ? { district_id: districtId } : undefined;
  return get<Region[]>('/regions', params);
}

/**
 * Get a single region by ID
 */
export async function getRegionById(id: string): Promise<ApiResponse<Region>> {
  return get<Region>(`/regions/${id}`);
}
