/**
 * Districts API Client
 * TanStack Query hooks for district data fetching, creation, updating, and deletion
 */

import { useQuery, useQueries, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from './client';
import {
  District,  DistrictStats,
  Location,
  LocationFilters,
  PaginatedResponse,
  MapStyleFieldsDto,
  StaffingLevel,
} from '@/types/models';
import { makeCrudHooks } from './crud-hooks';

/**
 * Query key factory for districts
 * Ensures consistent cache keys across the app
 */
export const districtKeys = {
  all: ['districts'] as const,
  lists: () => [...districtKeys.all, 'list'] as const,
  list: (includeInactive = false) => [...districtKeys.lists(), { includeInactive }] as const,
  details: () => [...districtKeys.all, 'detail'] as const,
  detail: (id: string) => [...districtKeys.details(), id] as const,
  stats: (id: string) => [...districtKeys.detail(id), 'stats'] as const,
  areas: (id: string, filters?: LocationFilters) =>
    [...districtKeys.detail(id), 'areas', filters] as const,
};

/**
 * Fetch districts.
 *
 * Active-only by default so a deactivated district never reaches a picker or
 * filter; the admin management grid opts in to keep it visible and
 * reactivatable.
 */
export function useDistricts(includeInactive = false) {
  return useQuery({
    queryKey: districtKeys.list(includeInactive),
    queryFn: async () => {
      const response = await apiClient.get<District[]>('/districts', {
        params: includeInactive ? { include_inactive: 'true' } : undefined,
      });
      return response.data;
    },
    staleTime: 10 * 60 * 1000, // 10 minutes - districts rarely change
  });
}

/**
 * Fetch single district by ID
 * Includes basic district information
 */
export function useDistrict(id: string) {
  return useQuery({
    queryKey: districtKeys.detail(id),
    queryFn: async () => {
      const response = await apiClient.get<District>(`/districts/${id}`);
      return response.data;
    },
    enabled: !!id,
    staleTime: 10 * 60 * 1000,
  });
}

/**
 * Fetch district statistics
 * Returns aggregated stats (area count, worker count, coverage area)
 */
export function useDistrictStats(id: string) {
  return useQuery({
    queryKey: districtKeys.stats(id),
    queryFn: async () => {
      const response = await apiClient.get<DistrictStats>(`/districts/${id}/stats`);
      return response.data;
    },
    enabled: !!id,
    staleTime: 5 * 60 * 1000, // 5 minutes - stats change more frequently
  });
}

/**
 * Fetch all areas in a district
 * Supports filtering and pagination
 */
export function useDistrictAreas(id: string, filters?: LocationFilters) {
  return useQuery({
    queryKey: districtKeys.areas(id, filters),
    queryFn: async () => {
      const response = await apiClient.get<PaginatedResponse<Location>>(`/districts/${id}/areas`, {
        params: filters,
      });
      return response.data;
    },
    enabled: !!id,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}

/**
 * Batch fetch statistics for multiple districts
 * Useful for the list page showing all districts with stats
 */
export function useRayonsWithStats() {
  const { data: districts, isLoading: districtsLoading } = useDistricts();

  // Fetch stats for each district in parallel using useQueries
  const statsQueries = useQueries({
    queries: (districts || []).map((district) => ({
      queryKey: districtKeys.stats(district.id),
      queryFn: async () => {
        const response = await apiClient.get<DistrictStats>(`/districts/${district.id}/stats`);
        return response.data;
      },
      enabled: !!district.id,
      staleTime: 5 * 60 * 1000, // 5 minutes - stats change more frequently
    })),
  });

  return {
    districts: districts || [],
    stats: statsQueries.map((q) => q.data).filter(Boolean) as DistrictStats[],
    isLoading: districtsLoading || statsQueries.some((q) => q.isLoading),
    isError: statsQueries.some((q) => q.isError),
  };
}

// ---------------------------------------------------------------------------
// Create/Update/Delete Rayon DTOs
// ---------------------------------------------------------------------------

/**
 * DTO for creating a district
 */
export interface CreateDistrictDto extends MapStyleFieldsDto {
  name: string;
  description?: string | null;
  center_lat?: number | null;
  center_lng?: number | null;
  staffing_level?: StaffingLevel;
}

/**
 * DTO for updating a district
 */
export interface UpdateDistrictDto extends MapStyleFieldsDto {
  name?: string;
  description?: string | null;
  center_lat?: number | null;
  center_lng?: number | null;
  staffing_level?: StaffingLevel;
  /** Official KMZ outline (Polygon or MultiPolygon). Update-only — not on create. */
  boundary_polygon?: GeoJSON.Polygon | GeoJSON.MultiPolygon | null;
}

/**
 * Live district-name availability check (names are unique). `excludeId` skips the
 * district's own name when editing.
 */
export const checkDistrictName = async (name: string, excludeId?: string): Promise<boolean> => {
  const params = new URLSearchParams({ name });
  if (excludeId) params.set('excludeId', excludeId);
  const response = await apiClient.get<{ available: boolean }>(
    `/districts/check-name?${params.toString()}`,
  );
  return response.data.available;
};

// ---------------------------------------------------------------------------
// CRUD Hooks (via Factory)
// ---------------------------------------------------------------------------

const districtCrudHooks = makeCrudHooks<District, CreateDistrictDto, UpdateDistrictDto>({
  resource: 'districts',
  listKey: districtKeys.lists(),
  detailKeyFn: (id) => districtKeys.detail(id),
});

/** Deactivate a district (is_active=false) — 409s while children/users still reference it. */
export function useDeactivateDistrict() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiClient.patch<District>(`/districts/${id}/deactivate`).then((r) => r.data),
    onSuccess: (district) => {
      queryClient.invalidateQueries({ queryKey: districtKeys.lists() });
      queryClient.invalidateQueries({ queryKey: districtKeys.detail(district.id) });
    },
  });
}

/** Reactivate a deactivated district (is_active=true). */
export function useActivateDistrict() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiClient.patch<District>(`/districts/${id}/activate`).then((r) => r.data),
    onSuccess: (district) => {
      queryClient.invalidateQueries({ queryKey: districtKeys.lists() });
      queryClient.invalidateQueries({ queryKey: districtKeys.detail(district.id) });
    },
  });
}

/**
 * Hook to create a new district
 */
export const useCreateDistrict = districtCrudHooks.useCreate;

/**
 * Hook to update an existing district
 */
export const useUpdateDistrict = districtCrudHooks.useUpdate;

/**
 * Hook to delete a district
 */
export const useDeleteDistrict = districtCrudHooks.useDelete;
