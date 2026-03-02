/**
 * Activities API Service (was reportsApi)
 * Phase 2C: ADR-010 terminology cleanup, activity approval support
 */

import { get, post, patch } from './apiClient';
import type {
  CreateActivityRequest,
  CreateActivityResponse,
  ActivitiesFilter,
  ActivitiesListResponse,
  ApiResponse,
  RejectActivityRequest,
} from '../../types/api.types';
import type { Activity } from '../../types/models.types';

export async function createActivity(
  data: CreateActivityRequest,
): Promise<ApiResponse<CreateActivityResponse>> {
  return post<CreateActivityResponse>('/activities', data);
}


/**
 * Get current user's own activities via paginated /activities endpoint.
 * The backend scopes results by the authenticated user's role automatically.
 * Switched from /activities/my (no pagination) to /activities (paginated, role-scoped).
 */
export async function getMyActivities(
  filters?: ActivitiesFilter,
): Promise<ApiResponse<ActivitiesListResponse>> {
  return get<ActivitiesListResponse>('/activities', filters ?? {});
}

export async function getActivities(
  filters?: ActivitiesFilter,
): Promise<ApiResponse<ActivitiesListResponse>> {
  return get<ActivitiesListResponse>('/activities', filters);
}

export async function getActivityById(
  id: string,
): Promise<ApiResponse<Activity>> {
  return get<Activity>(`/activities/${id}`);
}

export async function approveActivity(
  id: string,
): Promise<ApiResponse<Activity>> {
  return patch<Activity>(`/activities/${id}/approve`);
}

export async function rejectActivity(
  id: string,
  data: RejectActivityRequest,
): Promise<ApiResponse<Activity>> {
  return patch<Activity>(`/activities/${id}/reject`, data);
}

export default {
  createActivity,
  getMyActivities,
  getActivities,
  getActivityById,
  approveActivity,
  rejectActivity,
};
