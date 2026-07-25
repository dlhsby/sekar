/**
 * Shift Definitions API Client
 * TanStack Query hooks for shift definition data fetching
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from './client';
import { ShiftDefinition } from '@/types/models';

/** Payload for creating/updating a shift definition (ADR-055 configurable shifts). */
export interface ShiftDefinitionInput {
  name: string;
  /** Internal code — auto-generated server-side from the name when omitted. */
  code?: string;
  start_time: string; // HH:MM[:SS]
  end_time: string;
  crosses_midnight?: boolean;
  early_window_min?: number;
  cutoff_grace_min?: number;
  is_active?: boolean;
}

/**
 * Query key factory for shift definitions
 */
export const shiftDefinitionKeys = {
  all: ['shift-definitions'] as const,
  lists: () => [...shiftDefinitionKeys.all, 'list'] as const,
  list: () => [...shiftDefinitionKeys.lists()] as const,
  details: () => [...shiftDefinitionKeys.all, 'detail'] as const,
  detail: (id: string) => [...shiftDefinitionKeys.details(), id] as const,
};

/**
 * Fetch all shift definitions
 * Returns 3 fixed shifts with time ranges
 */
export function useShiftDefinitions() {
  return useQuery({
    queryKey: shiftDefinitionKeys.list(),
    queryFn: async () => {
      const response = await apiClient.get<ShiftDefinition[]>('/shift-definitions');
      return response.data;
    },
    staleTime: 30 * 60 * 1000, // 30 minutes - shifts rarely change
  });
}

/**
 * Fetch single shift definition by ID
 */
export function useShiftDefinition(id: string) {
  return useQuery({
    queryKey: shiftDefinitionKeys.detail(id),
    queryFn: async () => {
      const response = await apiClient.get<ShiftDefinition>(`/shift-definitions/${id}`);
      return response.data;
    },
    enabled: !!id,
    staleTime: 30 * 60 * 1000,
  });
}

/** Create a shift definition (system managers). */
export function useCreateShiftDefinition() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: ShiftDefinitionInput) => {
      const response = await apiClient.post<ShiftDefinition>('/shift-definitions', input);
      return response.data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: shiftDefinitionKeys.all }),
  });
}

/** Update a shift definition (system managers). */
export function useUpdateShiftDefinition() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, input }: { id: string; input: Partial<ShiftDefinitionInput> }) => {
      const response = await apiClient.patch<ShiftDefinition>(`/shift-definitions/${id}`, input);
      return response.data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: shiftDefinitionKeys.all }),
  });
}

/** Soft-delete a shift definition (system managers). */
export function useDeleteShiftDefinition() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await apiClient.delete(`/shift-definitions/${id}`);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: shiftDefinitionKeys.all }),
  });
}
