/**
 * Plants API Service
 * Phase 3 3-7: Plant species catalog, area inventory, notable plants
 */

import { get, post } from './apiClient';
import type { ApiResponse } from '../../types/api.types';
import type { PlantSpecies, AreaPlant, NotablePlant } from '../../types/models.types';

/**
 * List all plant species (paginated)
 */
export async function listSpecies(
  limit: number = 20,
  offset: number = 0,
): Promise<ApiResponse<{ data: PlantSpecies[]; total: number }>> {
  return get<{ data: PlantSpecies[]; total: number }>('/plant-species', {
    limit,
    offset,
  });
}

/**
 * Search plant species by Indonesian or scientific name
 */
export async function searchSpecies(
  q: string,
  limit: number = 20,
): Promise<ApiResponse<PlantSpecies[]>> {
  return get<PlantSpecies[]>('/plant-species/search', {
    q,
    limit,
  });
}

/**
 * Get all plants in a location with species details
 */
export async function listLocationPlants(locationId: string): Promise<ApiResponse<AreaPlant[]>> {
  return get<AreaPlant[]>(`/locations/${locationId}/plants`);
}

/**
 * Get notable plants (heritage trees) in a location
 */
export async function listNotablePlants(locationId: string): Promise<ApiResponse<NotablePlant[]>> {
  return get<NotablePlant[]>(`/locations/${locationId}/notable-plants`);
}

/**
 * Create a notable plant (heritage tree)
 * Restricted to admin_data, kepala_rayon, superadmin
 */
export async function createNotablePlant(
  locationId: string,
  dto: {
    species_id: string;
    label?: string;
    last_pruned_at?: string;
    notes?: string;
  },
): Promise<ApiResponse<NotablePlant>> {
  return post<NotablePlant>(`/locations/${locationId}/notable-plants`, dto);
}
