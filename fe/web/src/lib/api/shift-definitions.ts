/**
 * Shift Definitions API Client
 * TanStack Query hooks for shift definition data fetching
 */

import { useQuery } from '@tanstack/react-query';
import { apiClient } from './client';
import { ShiftDefinition } from '@/types/models';

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
