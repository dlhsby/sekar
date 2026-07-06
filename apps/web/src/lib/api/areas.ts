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
import { makeCrudHooks } from './crud-hooks';
import { collectAllPages } from './paginate';

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

/** Fetch one page of areas (or the full array when `page` is omitted). */
async function fetchAreasPage(
  filters: AreaFilters,
  page?: number,
): Promise<PaginatedResponse<Area>> {
  const params = new URLSearchParams();

  if (filters.search) params.append('search', filters.search);
  if (filters.rayon_id) params.append('rayon_id', filters.rayon_id);
  if (filters.area_type_id) params.append('area_type_id', filters.area_type_id);
  if (filters.include_inactive) params.append('include_inactive', 'true');
  // Only send page/limit for explicit pagination — omitting them makes the
  // backend return the FULL array (it caps `limit` at 100 when paginating).
  if (page) {
    params.append('page', page.toString());
    params.append('limit', (filters.limit ?? 100).toString());
  }

  const response = await apiClient.get(`/areas?${params.toString()}`);
  const responseData = response.data;

  // Backend returns plain Array<Area> (no page/limit) — wrap into PaginatedResponse.
  if (Array.isArray(responseData)) {
    return {
      data: responseData as Area[],
      meta: {
        total: responseData.length,
        page: page ?? 1,
        limit: responseData.length,
        totalPages: 1,
      },
    };
  }

  return responseData as PaginatedResponse<Area>;
}

/**
 * Fetch areas with filters.
 *
 * With no explicit `page` the caller wants EVERY area (tables/dropdowns pass a
 * high `limit` to "load all"). The backend caps `limit` at 100 and orders by
 * `id`, so a single capped request silently drops whole rayons (e.g. Rayon
 * Barat 2, ~35 areas that all sort past the first 100) — they then vanish from
 * the area table and can't be picked when assigning a user. So we fetch the full
 * array (page/limit omitted) and page through defensively if the API ever caps.
 */
async function fetchAreas(filters: AreaFilters = {}): Promise<PaginatedResponse<Area>> {
  if (filters.page) return fetchAreasPage(filters, filters.page);

  const first = await fetchAreasPage(filters);
  if ((first.meta?.totalPages ?? 1) <= 1) return first;
  return collectAllPages((page) => fetchAreasPage(filters, page));
}

/**
 * Fetch a single area by ID
 */
async function fetchArea(id: string): Promise<Area> {
  const response = await apiClient.get<Area>(`/areas/${id}`);
  return response.data;
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

// CRUD hooks via factory
const areaCrudHooks = makeCrudHooks<Area, CreateAreaDto, UpdateAreaDto>({
  resource: 'areas',
  listKey: areaKeys.lists(),
  detailKeyFn: (id) => areaKeys.detail(id),
});

/**
 * Hook to create a new area
 */
export const useCreateArea = areaCrudHooks.useCreate;

/** Deactivate an area (is_active=false) — distinct from delete; reversible. */
export function useDeactivateArea() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiClient.patch<Area>(`/areas/${id}/deactivate`).then((r) => r.data),
    onSuccess: (area) => {
      queryClient.invalidateQueries({ queryKey: areaKeys.lists() });
      queryClient.invalidateQueries({ queryKey: areaKeys.detail(area.id) });
    },
  });
}

/** Reactivate a deactivated area (is_active=true). */
export function useActivateArea() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiClient.patch<Area>(`/areas/${id}/activate`).then((r) => r.data),
    onSuccess: (area) => {
      queryClient.invalidateQueries({ queryKey: areaKeys.lists() });
      queryClient.invalidateQueries({ queryKey: areaKeys.detail(area.id) });
    },
  });
}

/**
 * Hook to update an existing area
 */
export const useUpdateArea = areaCrudHooks.useUpdate;

/**
 * Hook to delete an area
 */
export const useDeleteArea = areaCrudHooks.useDelete;

// ---------------------------------------------------------------------------
// Area Boundary (Phase 2D)
// ---------------------------------------------------------------------------

export interface AreaBoundaryPayload {
  boundary_polygon: GeoJSON.Polygon | null;
}

export interface AreaBoundaryResponse {
  area_id: string;
  name: string;
  boundary_polygon: GeoJSON.Polygon | null;
  gps_lat: number;
  gps_lng: number;
  radius_meters: number;
  coverage_area: number | null;
}

export const areaBoundaryKeys = {
  all: ['area-boundary'] as const,
  detail: (id: string) => [...areaBoundaryKeys.all, id] as const,
};

/**
 * Hook to fetch area boundary data
 */
export function useAreaBoundary(
  areaId: string,
  options?: Omit<UseQueryOptions<AreaBoundaryResponse>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: areaBoundaryKeys.detail(areaId),
    queryFn: async () => {
      const response = await apiClient.get<AreaBoundaryResponse>(`/areas/${areaId}/boundary`);
      return response.data;
    },
    enabled: !!areaId,
    ...options,
  });
}

/**
 * Hook to update area boundary polygon
 */
export function useUpdateAreaBoundary() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: AreaBoundaryPayload }) => {
      const response = await apiClient.put<AreaBoundaryResponse>(`/areas/${id}/boundary`, data);
      return response.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: areaBoundaryKeys.detail(variables.id) });
      queryClient.invalidateQueries({ queryKey: areaKeys.detail(variables.id) });
    },
  });
}
