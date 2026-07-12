/**
 * Rayons API
 * Handles fetching rayon (sector) data
 */

import { get } from './apiClient';
import type { Rayon } from '../../types/models.types';
import type { ApiResponse } from '../../types/api.types';

/**
 * Get all rayons
 */
export async function getRayons(): Promise<ApiResponse<Rayon[]>> {
  return get<Rayon[]>('/rayons');
}

/**
 * Get a single rayon by ID
 */
export async function getRayonById(id: string): Promise<ApiResponse<Rayon>> {
  return get<Rayon>(`/rayons/${id}`);
}

/**
 * Get all locations in a rayon
 */
export async function getLocationsByRayonId(rayonId: string): Promise<ApiResponse<any[]>> {
  return get<any[]>(`/rayons/${rayonId}/locations`);
}
