/**
 * Areas API Client
 * Handles communication with /areas endpoints
 */

import { useQuery, useMutation, useQueryClient, type UseQueryOptions } from '@tanstack/react-query';
import { apiClient } from './client';
import type {
  Area,
  AreaFilters,
  CreateAreaDto,
  UpdateAreaDto,
  PaginatedResponse,
} from '@/types/models';

/**
 * Query keys factory for areas
 */
export const areaKeys = {
  all: ['areas'] as const,
  lists: () => [...areaKeys.all, 'list'] as const,
  list: (filters: AreaFilters = {}) => [...areaKeys.lists(), filters] as const,
  details: () => [...areaKeys.all, 'detail'] as const,
  detail: (id: string) => [...areaKeys.details(), id] as const,
};

/**
 * Fetch areas with filters
 */
async function fetchAreas(filters: AreaFilters = {}): Promise<PaginatedResponse<Area>> {
  const params = new URLSearchParams();

  if (filters.search) params.append('search', filters.search);
  if (filters.rayon_id) params.append('rayon_id', filters.rayon_id);
  if (filters.area_type_id) params.append('area_type_id', filters.area_type_id);
  if (filters.page) params.append('page', filters.page.toString());
  if (filters.limit) params.append('limit', filters.limit.toString());

  const response = await apiClient.get(`/areas?${params.toString()}`);
  const responseData = response.data;

  // Backend returns plain Array<Area>, wrap into PaginatedResponse
  if (Array.isArray(responseData)) {
    return {
      data: responseData as Area[],
      meta: {
        total: responseData.length,
        page: filters.page || 1,
        limit: filters.limit || responseData.length,
        totalPages: 1,
      },
    };
  }

  return responseData as PaginatedResponse<Area>;
}

/**
 * Fetch a single area by ID
 */
async function fetchArea(id: string): Promise<Area> {
  const response = await apiClient.get<Area>(`/areas/${id}`);
  return response.data;
}

/**
 * Create a new area
 */
async function createArea(data: CreateAreaDto): Promise<Area> {
  const response = await apiClient.post<Area>('/areas', data);
  return response.data;
}

/**
 * Update an existing area
 */
async function updateArea(id: string, data: UpdateAreaDto): Promise<Area> {
  const response = await apiClient.patch<Area>(`/areas/${id}`, data);
  return response.data;
}

/**
 * Delete an area (soft delete)
 */
async function deleteArea(id: string): Promise<void> {
  await apiClient.delete(`/areas/${id}`);
}

/**
 * Hook to fetch areas with filters
 */
export function useAreas(
  filters: AreaFilters = {},
  options?: Omit<UseQueryOptions<PaginatedResponse<Area>>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: areaKeys.list(filters),
    queryFn: () => fetchAreas(filters),
    ...options,
  });
}

/**
 * Hook to fetch a single area
 */
export function useArea(id: string, options?: Omit<UseQueryOptions<Area>, 'queryKey' | 'queryFn'>) {
  return useQuery({
    queryKey: areaKeys.detail(id),
    queryFn: () => fetchArea(id),
    enabled: !!id,
    ...options,
  });
}

/**
 * Hook to create a new area
 */
export function useCreateArea() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createArea,
    onSuccess: () => {
      // Invalidate all area lists
      queryClient.invalidateQueries({ queryKey: areaKeys.lists() });
    },
  });
}

/**
 * Hook to update an existing area
 */
export function useUpdateArea() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateAreaDto }) => updateArea(id, data),
    onSuccess: (_, variables) => {
      // Invalidate the specific area and all lists
      queryClient.invalidateQueries({ queryKey: areaKeys.detail(variables.id) });
      queryClient.invalidateQueries({ queryKey: areaKeys.lists() });
    },
  });
}

/**
 * Hook to delete an area
 */
export function useDeleteArea() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteArea,
    onSuccess: () => {
      // Invalidate all area lists
      queryClient.invalidateQueries({ queryKey: areaKeys.lists() });
    },
  });
}
