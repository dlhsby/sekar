/**
 * Activity Types API Client (Phase 2C)
 */

import { useQuery } from '@tanstack/react-query';
import { apiClient } from './client';
import type { ActivityType, UserRole } from '@/types/models';

/**
 * Query Key Factory
 */
export const activityTypeKeys = {
  all: ['activity-types'] as const,
  list: (role?: UserRole) => [...activityTypeKeys.all, 'list', role] as const,
};

/**
 * Fetch Activity Types (optionally filtered by role)
 */
export function useActivityTypes(role?: UserRole) {
  return useQuery({
    queryKey: activityTypeKeys.list(role),
    queryFn: async () => {
      const params = role ? { role } : {};
      const response = await apiClient.get<ActivityType[]>('/activity-types', { params });
      return response.data;
    },
    staleTime: 10 * 60 * 1000,
  });
}
