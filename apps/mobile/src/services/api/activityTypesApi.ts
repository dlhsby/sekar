/**
 * Activity Types API Service
 *
 * Handles activity type-related API calls for Phase 2.
 * Activity types are role-specific work categories (e.g., Watering, Pruning, Security Patrol).
 */

import { get } from './apiClient';
import type { ApiResponse, ActivityTypesFilter, ActivityTypesListResponse } from '../../types/api.types';
import type { ActivityType } from '../../types/models.types';

/**
 * Get list of activity types
 * Filtered by role when applicable
 */
export async function getActivityTypes(
  filters?: ActivityTypesFilter,
): Promise<ApiResponse<ActivityTypesListResponse>> {
  return get<ActivityTypesListResponse>('/activity-types', filters);
}

/**
 * Get activity types for current user's role
 */
export async function getMyActivityTypes(): Promise<
  ApiResponse<ActivityTypesListResponse>
> {
  return get<ActivityTypesListResponse>('/activity-types/my-types');
}

/**
 * Get activity type by ID
 */
export async function getActivityTypeById(
  id: string,
): Promise<ApiResponse<ActivityType>> {
  return get<ActivityType>(`/activity-types/${id}`);
}

export default {
  getActivityTypes,
  getMyActivityTypes,
  getActivityTypeById,
};
