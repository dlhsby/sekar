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
 * Create Activity (admin only)
 */
export function useCreateActivity() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: { activity_type_id: string; description: string; photo_urls: string[] }) => {
      const response = await apiClient.post<Activity>('/activities', data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: activitiesKeys.lists() });
      queryClient.invalidateQueries({ queryKey: activitiesKeys.details() });
    },
  });
}

/**
 * Update Activity (admin only)
 */
export function useUpdateActivity() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: string;
      data: { description?: string; photo_urls?: string[] };
    }) => {
      const response = await apiClient.patch<Activity>(`/activities/${id}`, data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: activitiesKeys.lists() });
      queryClient.invalidateQueries({ queryKey: activitiesKeys.details() });
    },
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

/**
 * Approve Activity (korlap, kepala_rayon)
 */
export function useApproveActivity() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await apiClient.patch<Activity>(`/activities/${id}/approve`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: activitiesKeys.lists() });
      queryClient.invalidateQueries({ queryKey: activitiesKeys.details() });
    },
  });
}

/**
 * Reject Activity (korlap, kepala_rayon)
 */
export function useRejectActivity() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason: string }) => {
      const response = await apiClient.patch<Activity>(`/activities/${id}/reject`, {
        reason,
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: activitiesKeys.lists() });
      queryClient.invalidateQueries({ queryKey: activitiesKeys.details() });
    },
  });
}
