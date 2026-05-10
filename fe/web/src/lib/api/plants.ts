/**
 * Plants & Pruning API Hooks (Phase 3)
 * Read hooks consumed by AreaDetailDrawer to show plant + pruning context
 * for an area.
 */

import { useQuery } from '@tanstack/react-query';
import { apiClient } from './client';

// ---------------------------------------------------------------------------
// Types — mirror the backend entities (be/src/modules/plants/entities/* and
// be/src/modules/pruning-requests/entities/pruning-request.entity.ts)
// ---------------------------------------------------------------------------

export type AreaPlantStatus = 'ok' | 'due_soon' | 'overdue' | 'unknown';

export interface AreaPlantRow {
  id: string;
  areaId: string;
  speciesId: string;
  count: number;
  lastPrunedAt: string | null;
  nextDueAt: string | null;
  status: AreaPlantStatus;
  overrideCycleDays: number | null;
  species?: {
    id: string;
    nameId: string;
    category: string;
  } | null;
}

export interface NotablePlantRow {
  id: string;
  areaId: string;
  speciesId: string;
  gpsLat: number;
  gpsLng: number;
  label: string | null;
  heritage: boolean;
  photoUrls: string[];
  notes: string | null;
  species?: {
    id: string;
    nameId: string;
    category: string;
  } | null;
}

export type PruningRequestStatus =
  | 'submitted'
  | 'under_review'
  | 'approved'
  | 'rejected'
  | 'assigned'
  | 'in_progress'
  | 'done'
  | 'cancelled';

export interface PruningRequestRow {
  id: string;
  reference_code: string;
  submitted_by: string;
  kecamatan_name: string;
  address: string;
  expected_date: string | null;
  estimated_plant_count: number | null;
  tree_count: number | null;
  requester_name: string | null;
  status: PruningRequestStatus;
  rayon_id: string | null;
  created_at: string;
}

export interface PruningRequestListResponse {
  data: PruningRequestRow[];
  total: number;
  page: number;
  limit: number;
}

// ---------------------------------------------------------------------------
// Query keys
// ---------------------------------------------------------------------------

export const plantsKeys = {
  areaPlants: (areaId: string) => ['areaPlants', areaId] as const,
  notablePlants: (areaId: string) => ['notablePlants', areaId] as const,
  pruningByRayon: (rayonId: string) => ['pruningByRayon', rayonId] as const,
};

// ---------------------------------------------------------------------------
// Plant aggregate counters derived from area_plants rows
// ---------------------------------------------------------------------------

export interface PlantStatusSummary {
  ok: number;
  due_soon: number;
  overdue: number;
  total_species: number;
  total_count: number;
}

export function summarizePlantStatuses(
  rows: AreaPlantRow[] | undefined,
): PlantStatusSummary {
  const summary: PlantStatusSummary = {
    ok: 0,
    due_soon: 0,
    overdue: 0,
    total_species: 0,
    total_count: 0,
  };
  if (!rows) return summary;
  for (const r of rows) {
    summary.total_species += 1;
    summary.total_count += r.count;
    if (r.status === 'ok') summary.ok += 1;
    else if (r.status === 'due_soon') summary.due_soon += 1;
    else if (r.status === 'overdue') summary.overdue += 1;
  }
  return summary;
}

// ---------------------------------------------------------------------------
// Hooks
// ---------------------------------------------------------------------------

export function useAreaPlants(areaId: string | null | undefined) {
  return useQuery({
    queryKey: areaId ? plantsKeys.areaPlants(areaId) : ['areaPlants', 'null'],
    queryFn: async (): Promise<AreaPlantRow[]> => {
      const { data } = await apiClient.get(`/areas/${areaId}/plants`);
      return Array.isArray(data) ? data : (data?.data ?? []);
    },
    enabled: !!areaId,
    staleTime: 30_000,
  });
}

export function useNotablePlants(areaId: string | null | undefined) {
  return useQuery({
    queryKey: areaId ? plantsKeys.notablePlants(areaId) : ['notablePlants', 'null'],
    queryFn: async (): Promise<NotablePlantRow[]> => {
      const { data } = await apiClient.get(`/areas/${areaId}/notable-plants`);
      return Array.isArray(data) ? data : (data?.data ?? []);
    },
    enabled: !!areaId,
    staleTime: 60_000,
  });
}

/**
 * Pruning requests are filterable by `rayonId`, not `area_id` (the entity
 * has no FK to areas — it carries `kecamatan_name` + `rayon_id` only).
 * The drawer fetches the rayon-wide list and the caller can narrow it down
 * for display.
 */
export function usePruningByRayon(
  rayonId: string | null | undefined,
  options?: { limit?: number; status?: PruningRequestStatus },
) {
  const { limit = 10, status } = options ?? {};
  return useQuery({
    queryKey: rayonId
      ? [...plantsKeys.pruningByRayon(rayonId), limit, status ?? 'any']
      : ['pruningByRayon', 'null'],
    queryFn: async (): Promise<PruningRequestRow[]> => {
      const params: Record<string, string | number> = {
        rayonId: rayonId!,
        limit,
        page: 1,
      };
      if (status) params.status = status;
      const { data } = await apiClient.get('/pruning-requests', { params });
      // Controller returns either an array (legacy mine-style) or { data, total, page, limit }.
      if (Array.isArray(data)) return data as PruningRequestRow[];
      return (data?.data as PruningRequestRow[] | undefined) ?? [];
    },
    enabled: !!rayonId,
    staleTime: 30_000,
  });
}
