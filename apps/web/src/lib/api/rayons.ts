/**
 * Rayons API Client
 * TanStack Query hooks for rayon data fetching, creation, updating, and deletion
 */

import { useQuery, useQueries } from '@tanstack/react-query';
import { apiClient } from './client';
import { Rayon, RayonStats, Location, LocationFilters, PaginatedResponse } from '@/types/models';
import { makeCrudHooks } from './crud-hooks';

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
  areas: (id: string, filters?: LocationFilters) =>
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
export function useRayonAreas(id: string, filters?: LocationFilters) {
  return useQuery({
    queryKey: rayonKeys.areas(id, filters),
    queryFn: async () => {
      const response = await apiClient.get<PaginatedResponse<Location>>(`/rayons/${id}/areas`, {
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
  color?: string | null;
  description?: string | null;
  center_lat?: number | null;
  center_lng?: number | null;
  /** Official KMZ outline (Polygon or MultiPolygon). Update-only — not on create. */
  boundary_polygon?: GeoJSON.Polygon | GeoJSON.MultiPolygon | null;
}

/**
 * Live rayon-name availability check (names are unique). `excludeId` skips the
 * rayon's own name when editing.
 */
export const checkRayonName = async (name: string, excludeId?: string): Promise<boolean> => {
  const params = new URLSearchParams({ name });
  if (excludeId) params.set('excludeId', excludeId);
  const response = await apiClient.get<{ available: boolean }>(
    `/rayons/check-name?${params.toString()}`,
  );
  return response.data.available;
};

// ---------------------------------------------------------------------------
// CRUD Hooks (via Factory)
// ---------------------------------------------------------------------------

const rayonCrudHooks = makeCrudHooks<Rayon, CreateRayonDto, UpdateRayonDto>({
  resource: 'rayons',
  listKey: rayonKeys.lists(),
  detailKeyFn: (id) => rayonKeys.detail(id),
});

/**
 * Hook to create a new rayon
 */
export const useCreateRayon = rayonCrudHooks.useCreate;

/**
 * Hook to update an existing rayon
 */
export const useUpdateRayon = rayonCrudHooks.useUpdate;

/**
 * Hook to delete a rayon
 */
export const useDeleteRayon = rayonCrudHooks.useDelete;
