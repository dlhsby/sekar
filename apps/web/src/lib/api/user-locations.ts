/**
 * User-Areas API Client (ADR-013 multi-area assignment).
 *
 * Wraps the existing backend endpoints that link workers to areas:
 *   GET    /locations/:areaId/users        — roster for an area
 *   POST   /users/:userId/locations        — assign (permanent) areas to a worker
 *   DELETE /users/:userId/locations/:areaId — remove a permanent assignment
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from './client';
import type { User } from '@/types/models';

export const userLocationKeys = {
  all: ['user-areas'] as const,
  areaUsers: (areaId: string) => [...userLocationKeys.all, 'area', areaId] as const,
  userAreas: (userId: string) => [...userLocationKeys.all, 'user', userId] as const,
};

/** A user's assigned areas (effective: permanent + task-based). */
export function useUserAreas(userId: string | undefined) {
  return useQuery({
    queryKey: userLocationKeys.userAreas(userId ?? ''),
    queryFn: async () => {
      const response = await apiClient.get<import('@/types/models').Location[]>(
        `/users/${userId}/locations`,
      );
      return response.data;
    },
    enabled: !!userId,
    staleTime: 60 * 1000,
  });
}

/** Workers assigned to an area (permanent + task-based effective membership). */
export function useAreaUsers(areaId: string) {
  return useQuery({
    queryKey: userLocationKeys.areaUsers(areaId),
    queryFn: async () => {
      const response = await apiClient.get<User[]>(`/locations/${areaId}/users`);
      return response.data;
    },
    enabled: !!areaId,
    staleTime: 60 * 1000,
  });
}

/** Assign one or more areas (permanent) to a worker. */
export function useAssignLocations() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ userId, areaIds }: { userId: string; areaIds: string[] }) => {
      const response = await apiClient.post(`/users/${userId}/locations`, { location_ids: areaIds });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: userLocationKeys.all });
    },
  });
}

/** Remove a worker's permanent assignment to an area. */
export function useRemoveAssignment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ userId, areaId }: { userId: string; areaId: string }) => {
      await apiClient.delete(`/users/${userId}/locations/${areaId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: userLocationKeys.all });
    },
  });
}
