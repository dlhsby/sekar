/**
 * Rayons API Client
 * TanStack Query hooks for rayon data fetching, creation, updating, and deletion
 */

import { useQuery, useQueries, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from './client';
import { Rayon, RayonStats, Area, AreaFilters, PaginatedResponse } from '@/types/models';

/**
 * Query key factory for rayons
 * Ensures consistent cache keys across the app
 */
export const rayonKeys = {
  all: ['rayons'] as const,
  lists: () => [...rayonKeys.all, 'list'] as const,
  list: () => [...rayonKeys.lists()] as const,
  details: () => [...rayonKeys.all, 'detail'] as const,
  detail: (id: string) => [...rayonKeys.details(), id] as const,
  stats: (id: string) => [...rayonKeys.detail(id), 'stats'] as const,
  areas: (id: string, filters?: AreaFilters) =>
    [...rayonKeys.detail(id), 'areas', filters] as const,
};

/**
 * Fetch all rayons
 * Returns list of 7 rayons with basic info
 */
export function useRayons() {
  return useQuery({
    queryKey: rayonKeys.list(),
    queryFn: async () => {
      const response = await apiClient.get<Rayon[]>('/rayons');
      return response.data;
    },
    staleTime: 10 * 60 * 1000, // 10 minutes - rayons rarely change
  });
}

/**
 * Fetch single rayon by ID
 * Includes basic rayon information
 */
export function useRayon(id: string) {
  return useQuery({
    queryKey: rayonKeys.detail(id),
    queryFn: async () => {
      const response = await apiClient.get<Rayon>(`/rayons/${id}`);
      return response.data;
    },
    enabled: !!id,
    staleTime: 10 * 60 * 1000,
  });
}

/**
 * Fetch rayon statistics
 * Returns aggregated stats (area count, worker count, coverage area)
 */
export function useRayonStats(id: string) {
  return useQuery({
    queryKey: rayonKeys.stats(id),
    queryFn: async () => {
      const response = await apiClient.get<RayonStats>(`/rayons/${id}/stats`);
      return response.data;
    },
    enabled: !!id,
    staleTime: 5 * 60 * 1000, // 5 minutes - stats change more frequently
  });
}

/**
 * Fetch all areas in a rayon
 * Supports filtering and pagination
 */
export function useRayonAreas(id: string, filters?: AreaFilters) {
  return useQuery({
    queryKey: rayonKeys.areas(id, filters),
    queryFn: async () => {
      const response = await apiClient.get<PaginatedResponse<Area>>(`/rayons/${id}/areas`, {
        params: filters,
      });
      return response.data;
    },
    enabled: !!id,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}

/**
 * Batch fetch statistics for multiple rayons
 * Useful for the list page showing all rayons with stats
 */
export function useRayonsWithStats() {
  const { data: rayons, isLoading: rayonsLoading } = useRayons();

  // Fetch stats for each rayon in parallel using useQueries
  const statsQueries = useQueries({
    queries: (rayons || []).map((rayon) => ({
      queryKey: rayonKeys.stats(rayon.id),
      queryFn: async () => {
        const response = await apiClient.get<RayonStats>(`/rayons/${rayon.id}/stats`);
        return response.data;
      },
      enabled: !!rayon.id,
      staleTime: 5 * 60 * 1000, // 5 minutes - stats change more frequently
    })),
  });

  return {
    rayons: rayons || [],
    stats: statsQueries.map((q) => q.data).filter(Boolean) as RayonStats[],
    isLoading: rayonsLoading || statsQueries.some((q) => q.isLoading),
    isError: statsQueries.some((q) => q.isError),
  };
}

// ---------------------------------------------------------------------------
// Create/Update/Delete Rayon DTOs
// ---------------------------------------------------------------------------

/**
 * DTO for creating a rayon
 */
export interface CreateRayonDto {
  name: string;
  code: string;
  color?: string | null;
  description?: string | null;
  center_lat?: number | null;
  center_lng?: number | null;
}

/**
 * DTO for updating a rayon
 */
export interface UpdateRayonDto {
  name?: string;
  code?: string;
  color?: string | null;
  description?: string | null;
  center_lat?: number | null;
  center_lng?: number | null;
}

// ---------------------------------------------------------------------------
// Mutation Functions
// ---------------------------------------------------------------------------

/**
 * Create a new rayon
 */
async function createRayon(data: CreateRayonDto): Promise<Rayon> {
  const response = await apiClient.post<Rayon>('/rayons', data);
  return response.data;
}

/**
 * Update an existing rayon
 */
async function updateRayon(id: string, data: UpdateRayonDto): Promise<Rayon> {
  const response = await apiClient.patch<Rayon>(`/rayons/${id}`, data);
  return response.data;
}

/**
 * Delete a rayon
 */
async function deleteRayon(id: string): Promise<void> {
  await apiClient.delete(`/rayons/${id}`);
}

// ---------------------------------------------------------------------------
// Mutation Hooks
// ---------------------------------------------------------------------------

/**
 * Hook to create a new rayon
 */
export function useCreateRayon() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createRayon,
    onSuccess: () => {
      // Invalidate all rayon lists
      queryClient.invalidateQueries({ queryKey: rayonKeys.lists() });
    },
  });
}

/**
 * Hook to update an existing rayon
 */
export function useUpdateRayon() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateRayonDto }) => updateRayon(id, data),
    onSuccess: (_, variables) => {
      // Invalidate the specific rayon and all lists
      queryClient.invalidateQueries({ queryKey: rayonKeys.detail(variables.id) });
      queryClient.invalidateQueries({ queryKey: rayonKeys.lists() });
    },
  });
}

/**
 * Hook to delete a rayon
 */
export function useDeleteRayon() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteRayon,
    onSuccess: () => {
      // Invalidate all rayon lists
      queryClient.invalidateQueries({ queryKey: rayonKeys.lists() });
    },
  });
}
