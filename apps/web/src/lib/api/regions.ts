import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from './client';
import { makeCrudHooks } from './crud-hooks';

/** Per-level map styling (ADR-045) — shared by region/district/area. */
export interface MapStyle {
  border_color?: string | null;
  fill_color?: string | null;
  border_opacity?: number | null;
  fill_opacity?: number | null;
  marker_icon?: string | null;
}

export interface Region extends MapStyle {
  id: string;
  name: string;
  district_id: string;
  description?: string | null;
  boundary_polygon?: GeoJSON.Polygon | GeoJSON.MultiPolygon | null;
  center_lat?: number | null;
  center_lng?: number | null;
  /** Reversible soft-retire: hidden from pickers/filters, kept and reactivatable. */
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateRegionDto extends MapStyle {
  name: string;
  district_id: string;
  description?: string | null;
  center_lat?: number | null;
  center_lng?: number | null;
}

export interface UpdateRegionDto extends Partial<CreateRegionDto> {
  boundary_polygon?: GeoJSON.Polygon | GeoJSON.MultiPolygon | null;
}

export const regionKeys = {
  all: ['regions'] as const,
  lists: () => [...regionKeys.all, 'list'] as const,
  list: (districtId?: string, includeInactive = false) =>
    [...regionKeys.lists(), districtId ?? 'all', { includeInactive }] as const,
  detail: (id: string) => [...regionKeys.all, 'detail', id] as const,
};

/**
 * List regions, optionally filtered by district (for cascade selects).
 *
 * Active-only by default so a deactivated kawasan never reaches a picker; the
 * admin management grid opts in to keep it visible and reactivatable.
 */
export function useRegions(districtId?: string, includeInactive = false) {
  return useQuery({
    queryKey: regionKeys.list(districtId, includeInactive),
    queryFn: async () =>
      (
        await apiClient.get<Region[]>('/regions', {
          params: {
            ...(districtId ? { district_id: districtId } : {}),
            ...(includeInactive ? { include_inactive: 'true' } : {}),
          },
        })
      ).data,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * One region, fetched on demand. `enabled` lets a caller defer the request until
 * it is actually needed — the day board's map button uses it so ~130 kawasan
 * boundaries never ride along with the board itself.
 */
export function useRegion(id: string, enabled = true) {
  return useQuery({
    queryKey: regionKeys.detail(id),
    queryFn: async () => (await apiClient.get<Region>(`/regions/${id}`)).data,
    enabled: enabled && !!id,
    staleTime: 10 * 60 * 1000,
  });
}

/** Deactivate a region (is_active=false) — 409s while it still has active locations. */
export function useDeactivateRegion() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiClient.patch<Region>(`/regions/${id}/deactivate`).then((r) => r.data),
    onSuccess: (region) => {
      queryClient.invalidateQueries({ queryKey: regionKeys.lists() });
      queryClient.invalidateQueries({ queryKey: regionKeys.detail(region.id) });
    },
  });
}

/** Reactivate a deactivated region (is_active=true). */
export function useActivateRegion() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiClient.patch<Region>(`/regions/${id}/activate`).then((r) => r.data),
    onSuccess: (region) => {
      queryClient.invalidateQueries({ queryKey: regionKeys.lists() });
      queryClient.invalidateQueries({ queryKey: regionKeys.detail(region.id) });
    },
  });
}

const regionCrudHooks = makeCrudHooks<Region, CreateRegionDto, UpdateRegionDto>({
  resource: 'regions',
  listKey: regionKeys.lists(),
  detailKeyFn: (id) => regionKeys.detail(id),
});

export const useCreateRegion = regionCrudHooks.useCreate;
export const useUpdateRegion = regionCrudHooks.useUpdate;
export const useDeleteRegion = regionCrudHooks.useDelete;

/** Re-parent areas into a region (all must share the region's district). */
export function useAssignRegionAreas() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, locationIds }: { id: string; locationIds: string[] }) =>
      (await apiClient.patch<{ updated: number }>(`/regions/${id}/areas`, { locationIds })).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: regionKeys.all });
      // Locations carry region_id — their list cache is keyed 'locations'.
      qc.invalidateQueries({ queryKey: ['locations'] });
    },
  });
}
