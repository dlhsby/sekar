/**
 * Location Types API Client
 * Handles communication with /location-types endpoints
 */

import { useQuery } from '@tanstack/react-query';
import { apiClient } from './client';
import type { LocationType } from '@/types/models';

/**
 * Fetch all area types
 */
async function fetchLocationTypes(): Promise<LocationType[]> {
  const response = await apiClient.get<LocationType[]>('/location-types');
  return response.data;
}

/**
 * Hook to fetch area types
 * Used for dropdowns and filters
 */
export function useLocationTypes() {
  return useQuery({
    queryKey: ['area-types'],
    queryFn: fetchLocationTypes,
    staleTime: 5 * 60 * 1000, // 5 minutes - area types don't change often
  });
}
