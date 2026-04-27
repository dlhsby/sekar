/**
 * Pruning Requests API Service
 * Phase 3 sub-phase 3-10: kecamatan pruning request submission and listing
 */

import { get, post } from './apiClient';
import type { ApiResponse } from '../../types/api.types';
import type { PruningRequest } from '../../types/models.types';

/**
 * Submit a new pruning request
 * Only staff_kecamatan users can submit
 */
export async function submitPruningRequest(
  data: {
    address: string;
    lat: number;
    lng: number;
    detail_date: string; // ISO date string (YYYY-MM-DD)
    target_count: number;
    photo_keys: string[]; // Array of S3 keys from photo upload
    notes?: string;
    rayon_id?: string;
  },
): Promise<ApiResponse<PruningRequest>> {
  return post<PruningRequest>('/pruning-requests', data);
}

/**
 * Get pruning requests submitted by current user
 * Paginated list of own submissions, ordered by createdAt DESC
 */
export async function getMyPruningRequests(
  filters?: {
    limit?: number;
    offset?: number;
  },
): Promise<ApiResponse<PruningRequest[]>> {
  return get<PruningRequest[]>('/pruning-requests', {
    mine: true,
    ...filters,
  });
}

/**
 * Get a single pruning request by ID
 */
export async function getPruningRequestById(
  id: string,
): Promise<ApiResponse<PruningRequest>> {
  return get<PruningRequest>(`/pruning-requests/${id}`);
}

export default {
  submitPruningRequest,
  getMyPruningRequests,
  getPruningRequestById,
};
