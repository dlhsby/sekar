/**
 * Locations API Client
 * Handles communication with /locations endpoints
 */

import { useQuery, useMutation, useQueryClient, type UseQueryOptions } from '@tanstack/react-query';
import { apiClient } from './client';
import type {
  Location,
  LocationFilters,
  CreateLocationDto,
  UpdateLocationDto,
  PaginatedResponse,
} from '@/types/models';
import { makeCrudHooks } from './crud-hooks';
import { collectAllPages } from './paginate';

/**
 * Query keys factory for locations
 */
export const locationKeys = {
  all: ['locations'] as const,
  lists: () => [...locationKeys.all, 'list'] as const,
  list: (filters: LocationFilters = {}) => [...locationKeys.lists(), filters] as const,
  details: () => [...locationKeys.all, 'detail'] as const,
  detail: (id: string) => [...locationKeys.details(), id] as const,
};

/** Fetch one page of locations (or the full array when `page` is omitted). */
async function fetchLocationsPage(
  filters: LocationFilters,
  page?: number,
): Promise<PaginatedResponse<Location>> {
  const params = new URLSearchParams();

  if (filters.search) params.append('search', filters.search);
  if (filters.rayon_id) params.append('rayon_id', filters.rayon_id);
  if (filters.location_type_id) params.append('location_type_id', filters.location_type_id);
  if (filters.include_inactive) params.append('include_inactive', 'true');
  // Only send page/limit for explicit pagination — omitting them makes the
  // backend return the FULL array (it caps `limit` at 100 when paginating).
  if (page) {
    params.append('page', page.toString());
    params.append('limit', (filters.limit ?? 100).toString());
  }

  const response = await apiClient.get(`/locations?${params.toString()}`);
  const responseData = response.data;

  // Backend returns plain Array<Location> (no page/limit) — wrap into PaginatedResponse.
  if (Array.isArray(responseData)) {
    return {
      data: responseData as Location[],
      meta: {
        total: responseData.length,
        page: page ?? 1,
        limit: responseData.length,
        totalPages: 1,
      },
    };
  }

  return responseData as PaginatedResponse<Location>;
}

/**
 * Fetch locations with filters.
 *
 * With no explicit `page` the caller wants EVERY location (tables/dropdowns pass a
 * high `limit` to "load all"). The backend caps `limit` at 100 and orders by
 * `id`, so a single capped request silently drops whole rayons (e.g. Rayon
 * Barat 2, ~35 locations that all sort past the first 100) — they then vanish from
 * the location table and can't be picked when assigning a user. So we fetch the full
 * array (page/limit omitted) and page through defensively if the API ever caps.
 */
async function fetchLocations(filters: LocationFilters = {}): Promise<PaginatedResponse<Location>> {
  if (filters.page) return fetchLocationsPage(filters, filters.page);

  const first = await fetchLocationsPage(filters);
  if ((first.meta?.totalPages ?? 1) <= 1) return first;
  return collectAllPages((page) => fetchLocationsPage(filters, page));
}

/**
 * Fetch a single location by ID
 */
async function fetchLocation(id: string): Promise<Location> {
  const response = await apiClient.get<Location>(`/locations/${id}`);
  return response.data;
}


/**
 * Hook to fetch locations with filters
 */
export function useLocations(
  filters: LocationFilters = {},
  options?: Omit<UseQueryOptions<PaginatedResponse<Location>>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: locationKeys.list(filters),
    queryFn: () => fetchLocations(filters),
    ...options,
  });
}

/**
 * Hook to fetch a single location
 */
export function useLocation(id: string, options?: Omit<UseQueryOptions<Location>, 'queryKey' | 'queryFn'>) {
  return useQuery({
    queryKey: locationKeys.detail(id),
    queryFn: () => fetchLocation(id),
    enabled: !!id,
    ...options,
  });
}

// CRUD hooks via factory
const areaCrudHooks = makeCrudHooks<Location, CreateLocationDto, UpdateLocationDto>({
  resource: 'locations',
  listKey: locationKeys.lists(),
  detailKeyFn: (id) => locationKeys.detail(id),
});

/**
 * Hook to create a new location
 */
export const useCreateLocation = areaCrudHooks.useCreate;

/** Deactivate a location (is_active=false) — distinct from delete; reversible. */
export function useDeactivateLocation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiClient.patch<Location>(`/locations/${id}/deactivate`).then((r) => r.data),
    onSuccess: (area) => {
      queryClient.invalidateQueries({ queryKey: locationKeys.lists() });
      queryClient.invalidateQueries({ queryKey: locationKeys.detail(area.id) });
    },
  });
}

/** Reactivate a deactivated location (is_active=true). */
export function useActivateLocation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiClient.patch<Location>(`/locations/${id}/activate`).then((r) => r.data),
    onSuccess: (area) => {
      queryClient.invalidateQueries({ queryKey: locationKeys.lists() });
      queryClient.invalidateQueries({ queryKey: locationKeys.detail(area.id) });
    },
  });
}

/**
 * Hook to update an existing location
 */
export const useUpdateLocation = areaCrudHooks.useUpdate;

/**
 * Hook to delete a location
 */
export const useDeleteLocation = areaCrudHooks.useDelete;

// ---------------------------------------------------------------------------
// Location Boundary (Phase 2D)
// ---------------------------------------------------------------------------

export interface LocationBoundaryPayload {
  boundary_polygon: GeoJSON.Polygon | null;
}

export interface LocationBoundaryResponse {
  location_id: string;
  name: string;
  boundary_polygon: GeoJSON.Polygon | null;
  gps_lat: number;
  gps_lng: number;
  radius_meters: number;
  coverage_area: number | null;
}

export const locationBoundaryKeys = {
  all: ['area-boundary'] as const,
  detail: (id: string) => [...locationBoundaryKeys.all, id] as const,
};

/**
 * Hook to fetch location boundary data
 */
export function useLocationBoundary(
  locationId: string,
  options?: Omit<UseQueryOptions<LocationBoundaryResponse>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: locationBoundaryKeys.detail(locationId),
    queryFn: async () => {
      const response = await apiClient.get<LocationBoundaryResponse>(`/locations/${locationId}/boundary`);
      return response.data;
    },
    enabled: !!locationId,
    ...options,
  });
}

/**
 * Hook to update location boundary polygon
 */
export function useUpdateLocationBoundary() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: LocationBoundaryPayload }) => {
      const response = await apiClient.put<LocationBoundaryResponse>(`/locations/${id}/boundary`, data);
      return response.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: locationBoundaryKeys.detail(variables.id) });
      queryClient.invalidateQueries({ queryKey: locationKeys.detail(variables.id) });
    },
  });
}
