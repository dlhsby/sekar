/**
 * Overtime API Client (Phase 2C)
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from './client';
import type { Overtime, OvertimeFilters, PaginatedResponse } from '@/types/models';

/**
 * Query Key Factory
 */
export const overtimeKeys = {
  all: ['overtime'] as const,
  lists: () => [...overtimeKeys.all, 'list'] as const,
  list: (filters?: OvertimeFilters) => [...overtimeKeys.lists(), filters] as const,
  details: () => [...overtimeKeys.all, 'detail'] as const,
  detail: (id: string) => [...overtimeKeys.details(), id] as const,
};

/**
 * Fetch Overtime records with filters
 */
export function useOvertimes(filters?: OvertimeFilters) {
  return useQuery({
    queryKey: overtimeKeys.list(filters),
    queryFn: async () => {
      const response = await apiClient.get<PaginatedResponse<Overtime>>('/overtime', {
        params: filters,
      });
      return response.data;
    },
    staleTime: 2 * 60 * 1000,
  });
}

/**
 * Fetch Single Overtime
 */
export function useOvertime(id: string) {
  return useQuery({
    queryKey: overtimeKeys.detail(id),
    queryFn: async () => {
      const response = await apiClient.get<Overtime>(`/overtime/${id}`);
      return response.data;
    },
    staleTime: 5 * 60 * 1000,
    enabled: !!id,
  });
}

/**
 * Approve Overtime (korlap only)
 */
export function useApproveOvertime() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await apiClient.patch<Overtime>(`/overtime/${id}/approve`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: overtimeKeys.lists() });
      queryClient.invalidateQueries({ queryKey: overtimeKeys.details() });
    },
  });
}

/**
 * Reject Overtime (korlap only)
 */
export function useRejectOvertime() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason: string }) => {
      const response = await apiClient.patch<Overtime>(`/overtime/${id}/reject`, {
        reason,
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: overtimeKeys.lists() });
      queryClient.invalidateQueries({ queryKey: overtimeKeys.details() });
    },
  });
}

/**
 * Create Overtime (admin only)
 */
export function useCreateOvertime() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: any) => {
      const response = await apiClient.post<Overtime>('/overtime', data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: overtimeKeys.lists() });
    },
  });
}

/**
 * Update Overtime (admin only)
 */
export function useUpdateOvertime() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const response = await apiClient.patch<Overtime>(`/overtime/${id}`, data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: overtimeKeys.lists() });
      queryClient.invalidateQueries({ queryKey: overtimeKeys.details() });
    },
  });
}

/**
 * Delete Overtime (admin only)
 */
export function useDeleteOvertime() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      await apiClient.delete(`/overtime/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: overtimeKeys.lists() });
      queryClient.invalidateQueries({ queryKey: overtimeKeys.details() });
    },
  });
}
