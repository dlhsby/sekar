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
 * Get all plants in an area with species details
 */
export async function listAreaPlants(areaId: string): Promise<ApiResponse<AreaPlant[]>> {
  return get<AreaPlant[]>(`/areas/${areaId}/plants`);
}

/**
 * Get notable plants (heritage trees) in an area
 */
export async function listNotablePlants(areaId: string): Promise<ApiResponse<NotablePlant[]>> {
  return get<NotablePlant[]>(`/areas/${areaId}/notable-plants`);
}

/**
 * Create a notable plant (heritage tree)
 * Restricted to admin_data, kepala_rayon, superadmin
 */
export async function createNotablePlant(
  areaId: string,
  dto: {
    species_id: string;
    label?: string;
    last_pruned_at?: string;
    notes?: string;
  },
): Promise<ApiResponse<NotablePlant>> {
  return post<NotablePlant>(`/areas/${areaId}/notable-plants`, dto);
}
