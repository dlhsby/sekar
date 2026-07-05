/**
 * Area Types API Client
 * Handles communication with /area-types endpoints
 */

import { useQuery } from '@tanstack/react-query';
import { apiClient } from './client';
import type { AreaType } from '@/types/models';

/**
 * Fetch all area types
 */
async function fetchAreaTypes(): Promise<AreaType[]> {
  const response = await apiClient.get<AreaType[]>('/area-types');
  return response.data;
}

/**
 * Hook to fetch area types
 * Used for dropdowns and filters
 */
export function useAreaTypes() {
  return useQuery({
    queryKey: ['area-types'],
    queryFn: fetchAreaTypes,
    staleTime: 5 * 60 * 1000, // 5 minutes - area types don't change often
  });
}
