/**
 * Activities API Service (was reportsApi)
 * Phase 2C: ADR-010 terminology cleanup
 */

import { get, post } from './apiClient';
import type {
  CreateActivityRequest,
  CreateActivityResponse,
  ActivitiesFilter,
  ApiResponse,
} from '../../types/api.types';
import type { Activity } from '../../types/models.types';

export async function createActivity(
  data: CreateActivityRequest,
): Promise<ApiResponse<CreateActivityResponse>> {
  return post<CreateActivityResponse>('/activities', data);
}

export async function getMyActivities(
  date?: string,
): Promise<ApiResponse<Activity[]>> {
  const params = date ? { date } : {};
  return get<Activity[]>('/activities/my', params);
}

export async function getActivities(
  filters?: ActivitiesFilter,
): Promise<ApiResponse<Activity[]>> {
  return get<Activity[]>('/activities', filters);
}

export async function getActivityById(
  id: string,
): Promise<ApiResponse<Activity>> {
  return get<Activity>(`/activities/${id}`);
}

export default {
  createActivity,
  getMyActivities,
  getActivities,
  getActivityById,
};
