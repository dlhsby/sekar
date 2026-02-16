/**
 * Activities API Client (Phase 2C - replaces Reports)
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from './client';
import type { Activity, ActivityFilters, PaginatedResponse } from '@/types/models';

/**
 * Query Key Factory
 */
export const activitiesKeys = {
  all: ['activities'] as const,
  lists: () => [...activitiesKeys.all, 'list'] as const,
  list: (filters?: ActivityFilters) => [...activitiesKeys.lists(), filters] as const,
  details: () => [...activitiesKeys.all, 'detail'] as const,
  detail: (id: string) => [...activitiesKeys.details(), id] as const,
};

/**
 * Fetch Activities with filters
 */
export function useActivities(filters?: ActivityFilters) {
  return useQuery({
    queryKey: activitiesKeys.list(filters),
    queryFn: async () => {
      const response = await apiClient.get<PaginatedResponse<Activity>>('/activities', {
        params: filters,
      });
      return response.data;
    },
    staleTime: 2 * 60 * 1000,
  });
}

/**
 * Fetch Single Activity
 */
export function useActivity(id: string) {
  return useQuery({
    queryKey: activitiesKeys.detail(id),
    queryFn: async () => {
      const response = await apiClient.get<Activity>(`/activities/${id}`);
      return response.data;
    },
    staleTime: 5 * 60 * 1000,
    enabled: !!id,
  });
}

/**
 * Delete Activity
 */
export function useDeleteActivity() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      await apiClient.delete(`/activities/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: activitiesKeys.lists() });
    },
  });
}
