import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from './client';
import { makeCrudHooks } from './crud-hooks';

/** Per-level map styling (ADR-045) — shared by region/rayon/area. */
export interface MapStyle {
  border_color?: string | null;
  fill_color?: string | null;
  border_opacity?: number | null;
  fill_opacity?: number | null;
  marker_icon?: string | null;
  marker_image_url?: string | null;
}

export interface Region extends MapStyle {
  id: string;
  name: string;
  rayon_id: string;
  description?: string | null;
  boundary_polygon?: GeoJSON.Polygon | GeoJSON.MultiPolygon | null;
  center_lat?: number | null;
  center_lng?: number | null;
  created_at: string;
  updated_at: string;
}

export interface CreateRegionDto extends MapStyle {
  name: string;
  rayon_id: string;
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
  list: (rayonId?: string) => [...regionKeys.lists(), rayonId ?? 'all'] as const,
  detail: (id: string) => [...regionKeys.all, 'detail', id] as const,
};

/** List regions, optionally filtered by rayon (for cascade selects). */
export function useRegions(rayonId?: string) {
  return useQuery({
    queryKey: regionKeys.list(rayonId),
    queryFn: async () =>
      (
        await apiClient.get<Region[]>('/regions', {
          params: rayonId ? { rayon_id: rayonId } : undefined,
        })
      ).data,
    staleTime: 5 * 60 * 1000,
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

/** Re-parent areas into a region (all must share the region's rayon). */
export function useAssignRegionAreas() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, locationIds }: { id: string; locationIds: string[] }) =>
      (await apiClient.patch<{ updated: number }>(`/regions/${id}/areas`, { locationIds })).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: regionKeys.all });
      qc.invalidateQueries({ queryKey: ['areas'] });
    },
  });
}
