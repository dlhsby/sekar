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
    // Phase 3 Apr 27 — `detail_date` and `target_count` are optional in the
    // redesigned form; admin sets the date during convert-to-task.
    detail_date?: string;
    target_count?: number;
    photo_keys: string[]; // Array of S3 keys from photo upload (min 1, max 5)
    notes?: string;
    rayon_id?: string;
    // Phase 3 Apr 27 — staff_kecamatan redesign fields
    tree_count?: number;
    tree_height_estimate?: string;
    tree_diameter_estimate?: string;
    requester_name?: string;
    requester_phone?: string;
    rt_leader_name?: string;
    rt_leader_phone?: string;
  },
): Promise<ApiResponse<PruningRequest>> {
  const response = await post<PruningRequest>('/pruning-requests', data);

  // Validate response shape
  if (response.data && typeof response.data === 'object' && 'id' in response.data) {
    return response;
  }

  if (response.error) {
    return response;
  }

  // Invalid response shape
  return {
    error: 'Invalid response shape from server',
    success: false,
  };
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

/**
 * Get pruning requests for admin review (unscoped list)
 * Accepts filters for status, rayon, date range, and pagination
 */
export async function getAdminPruningRequests(
  filters?: {
    status?: string;
    rayonId?: string;
    from?: string; // ISO date string
    to?: string; // ISO date string
    page?: number;
    limit?: number;
  },
): Promise<ApiResponse<PruningRequest[]>> {
  return get<PruningRequest[]>('/pruning-requests', filters);
}

/**
 * Review a pruning request (approve or reject)
 */
export async function reviewPruningRequest(
  id: string,
  data: {
    decision: 'approve' | 'reject';
    reviewNotes?: string;
  },
): Promise<ApiResponse<PruningRequest>> {
  const response = await post<PruningRequest>(
    `/pruning-requests/${id}/review`,
    data,
  );

  if (response.data && typeof response.data === 'object' && 'id' in response.data) {
    return response;
  }

  if (response.error) {
    return response;
  }

  return {
    error: 'Invalid response shape from server',
    success: false,
  };
}

/**
 * Convert a pruning request to a task
 */
export async function convertPruningRequestToTask(
  id: string,
  data: {
    areaId: string;
    assignedTo: string;
    scheduledDate: string; // YYYY-MM-DD
    caseType: 'GT' | 'PT' | 'PS' | 'PD' | 'PK';
    pruningAction: 'PM' | 'PB' | 'PC';
    units?: number;
  },
): Promise<ApiResponse<{ request: PruningRequest; task: any }>> {
  const response = await post<{ request: PruningRequest; task: any }>(
    `/pruning-requests/${id}/convert-to-task`,
    data,
  );

  if (
    response.data &&
    typeof response.data === 'object' &&
    'request' in response.data &&
    'task' in response.data
  ) {
    return response;
  }

  if (response.error) {
    return response;
  }

  return {
    error: 'Invalid response shape from server',
    success: false,
  };
}

export default {
  submitPruningRequest,
  getMyPruningRequests,
  getPruningRequestById,
  getAdminPruningRequests,
  reviewPruningRequest,
  convertPruningRequestToTask,
};
