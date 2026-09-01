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

/** Minimal local-file reference for a multipart upload (subset of `Photo`). */
export interface UploadableFile {
  uri: string;
  name: string;
  type: string;
}

/**
 * Upload 1–3 activity photos to object storage and get back their URLs, to send
 * in `photo_urls`. Photos are no longer posted as inline base64 (F9) — the
 * backend rejects `data:` payloads and stores only the URL. Requires network;
 * offline submissions upload at sync time (see syncManager.syncActivity).
 */
export async function uploadActivityPhotos(
  files: UploadableFile[],
): Promise<ApiResponse<{ urls: string[] }>> {
  const formData = new FormData();
  for (const f of files) {
    // React Native FormData file part: { uri, name, type }.
    formData.append('files', { uri: f.uri, name: f.name, type: f.type } as unknown as Blob);
  }
  return post<{ urls: string[] }>('/activities/photos', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
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
