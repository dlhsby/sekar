/**
 * Districts API
 * Handles fetching district (sector) data
 */

import { get } from './apiClient';
import type { District } from '../../types/models.types';
import type { ApiResponse } from '../../types/api.types';

/**
 * Get all districts
 */
export async function getDistricts(): Promise<ApiResponse<District[]>> {
  return get<District[]>('/districts');
}

/**
 * Get a single district by ID
 */
export async function getDistrictById(id: string): Promise<ApiResponse<District>> {
  return get<District>(`/districts/${id}`);
}

/**
 * Get all areas in a district
 */
export async function getAreasByDistrictId(districtId: string): Promise<ApiResponse<any[]>> {
  return get<any[]>(`/districts/${districtId}/areas`);
}
