/**
 * Plants & Pruning API Hooks (Phase 3)
 * Read hooks consumed by AreaDetailDrawer to show plant + pruning context
 * for an area.
 */

import { useQuery } from '@tanstack/react-query';
import { apiClient } from './client';
import { makeCrudHooks } from './crud-hooks';

// ---------------------------------------------------------------------------
// Types — mirror the backend entities (apps/be/src/modules/plants/entities/* and
// apps/be/src/modules/pruning-requests/entities/pruning-request.entity.ts)
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

export type CreatePlantSpeciesDto = {
  nameId: string;
  nameLatin?: string | null;
  category?: 'tree' | 'shrub' | 'groundcover' | 'flower';
  defaultPruningCycleDays?: number | null;
  notes?: string | null;
};

export type UpdatePlantSpeciesDto = Partial<CreatePlantSpeciesDto>;

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
  all: ['plants'] as const,
  speciesLists: () => [...plantsKeys.all, 'species-list'] as const,
  speciesDetails: () => [...plantsKeys.all, 'species-detail'] as const,
  speciesDetail: (id: string) => [...plantsKeys.speciesDetails(), id] as const,
  areaPlants: (areaId: string) => ['areaPlants', areaId] as const,
  notablePlants: (areaId: string) => ['notablePlants', areaId] as const,
  pruningByRayon: (rayonId: string) => ['pruningByRayon', rayonId] as const,
  speciesCatalog: (page: number, q: string) => ['speciesCatalog', page, q] as const,
};

// ---------------------------------------------------------------------------
// Species catalog (Phase 3-8 web pages)
// ---------------------------------------------------------------------------

export interface PlantSpeciesRow {
  id: string;
  nameId: string;
  nameLatin: string | null;
  category: 'tree' | 'shrub' | 'groundcover' | 'flower';
  defaultPruningCycleDays: number | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface SpeciesCatalogResult {
  data: PlantSpeciesRow[];
  total: number;
}

/**
 * Species catalog with optional search. The backend exposes two endpoints:
 * `GET /plant-species` (paginated `{ data, total }`) and
 * `GET /plant-species/search` (plain array, ILIKE on name_id/name_latin) —
 * this hook unifies them behind one shape.
 */
export function useSpeciesCatalog(page: number = 1, q: string = '', limit: number = 20) {
  return useQuery({
    queryKey: plantsKeys.speciesCatalog(page, q),
    queryFn: async (): Promise<SpeciesCatalogResult> => {
      if (q.trim()) {
        const { data } = await apiClient.get('/plant-species/search', {
          params: { q: q.trim(), limit: 50 },
        });
        const rows: PlantSpeciesRow[] = Array.isArray(data) ? data : (data?.data ?? []);
        return { data: rows, total: rows.length };
      }
      const { data } = await apiClient.get('/plant-species', {
        params: { limit, offset: (page - 1) * limit },
      });
      return { data: data?.data ?? [], total: data?.total ?? 0 };
    },
    staleTime: 60_000,
  });
}

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
// Plant-status rollup (Phase 3-8 close-out — dashboard widget + map toggle)
// ---------------------------------------------------------------------------

export interface RayonPlantStatusSummary {
  rayon_id: string | null;
  rayon_name: string | null;
  ok: number;
  due_soon: number;
  overdue: number;
  unknown: number;
  overdue_areas: { area_id: string; area_name: string; overdue: number }[];
}

export interface PlantStatusSummaryResponse {
  generated_at: string;
  rayons: RayonPlantStatusSummary[];
}

/** Per-rayon ok/due/overdue rollup. City roles get all rayons; rayon-scoped
 * roles are server-side forced to their own rayon. */
export function usePlantStatusSummary(enabled: boolean = true) {
  return useQuery({
    queryKey: ['plantStatusSummary'],
    queryFn: async (): Promise<PlantStatusSummaryResponse> => {
      const { data } = await apiClient.get('/monitoring/plant-status/summary');
      return data;
    },
    enabled,
    staleTime: 5 * 60_000, // status flips at most daily — generous cache
  });
}

// ---------------------------------------------------------------------------
// Hooks
// ---------------------------------------------------------------------------

export function useAreaPlants(areaId: string | null | undefined) {
  return useQuery({
    queryKey: areaId ? plantsKeys.areaPlants(areaId) : ['areaPlants', 'null'],
    queryFn: async (): Promise<AreaPlantRow[]> => {
      const { data } = await apiClient.get(`/locations/${areaId}/plants`);
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
      const { data } = await apiClient.get(`/locations/${areaId}/notable-plants`);
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

// ---------------------------------------------------------------------------
// Plant Species CRUD Hooks
// ---------------------------------------------------------------------------

const plantSpeciesCrudHooks = makeCrudHooks<PlantSpeciesRow, CreatePlantSpeciesDto, UpdatePlantSpeciesDto>(
  {
    resource: 'plant-species',
    listKey: plantsKeys.speciesLists(),
    detailKeyFn: (id) => plantsKeys.speciesDetail(id),
  }
);

/**
 * Hook to create a new plant species
 */
export const useCreatePlantSpecies = plantSpeciesCrudHooks.useCreate;

/**
 * Hook to update an existing plant species
 */
export const useUpdatePlantSpecies = plantSpeciesCrudHooks.useUpdate;

/**
 * Hook to delete a plant species (soft delete)
 * Note: Will return a 409 conflict if the species is referenced by area plants or notable plants.
 */
export const useDeletePlantSpecies = plantSpeciesCrudHooks.useDelete;
