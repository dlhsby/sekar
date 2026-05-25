/**
 * Unit Tests: Plants & Pruning read hooks (Phase 3 sub-phase 3-4)
 *
 * Audit H6 (2026-05-23): the `plants` API client was below the 80 % gate.
 * Covers the pure helper + all three hooks (city/rayon/area scopes) + the
 * disabled / empty-response branches.
 */

import MockAdapter from 'axios-mock-adapter';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactNode } from 'react';
import { apiClient } from '../client';
import {
  plantsKeys,
  summarizePlantStatuses,
  useAreaPlants,
  useNotablePlants,
  usePruningByRayon,
  type AreaPlantRow,
  type NotablePlantRow,
  type PruningRequestRow,
} from '../plants';

describe('Plants API', () => {
  let mockAxios: MockAdapter;

  const createWrapper = () => {
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false, gcTime: 0 },
        mutations: { retry: false },
      },
    });
    const Wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
    Wrapper.displayName = 'TestWrapper';
    return Wrapper;
  };

  beforeEach(() => {
    mockAxios = new MockAdapter(apiClient);
  });

  afterEach(() => {
    mockAxios.restore();
  });

  describe('plantsKeys', () => {
    it('produces stable, scope-specific tuples', () => {
      expect(plantsKeys.areaPlants('a-1')).toEqual(['areaPlants', 'a-1']);
      expect(plantsKeys.notablePlants('a-1')).toEqual(['notablePlants', 'a-1']);
      expect(plantsKeys.pruningByRayon('r-1')).toEqual(['pruningByRayon', 'r-1']);
    });
  });

  describe('summarizePlantStatuses', () => {
    it('returns the empty summary when input is undefined', () => {
      expect(summarizePlantStatuses(undefined)).toEqual({
        ok: 0,
        due_soon: 0,
        overdue: 0,
        total_species: 0,
        total_count: 0,
      });
    });

    it('returns the empty summary for an empty array', () => {
      expect(summarizePlantStatuses([])).toEqual({
        ok: 0,
        due_soon: 0,
        overdue: 0,
        total_species: 0,
        total_count: 0,
      });
    });

    it('tallies each status correctly and sums counts', () => {
      const rows: AreaPlantRow[] = [
        row({ status: 'ok', count: 5 }),
        row({ status: 'due_soon', count: 3 }),
        row({ status: 'overdue', count: 2 }),
        row({ status: 'overdue', count: 1 }),
        row({ status: 'unknown', count: 4 }), // ignored by tally but counted
      ];

      expect(summarizePlantStatuses(rows)).toEqual({
        ok: 1,
        due_soon: 1,
        overdue: 2,
        total_species: 5,
        total_count: 15,
      });
    });
  });

  describe('useAreaPlants', () => {
    it('is disabled when areaId is null', () => {
      const { result } = renderHook(() => useAreaPlants(null), {
        wrapper: createWrapper(),
      });
      expect(result.current.fetchStatus).toBe('idle');
    });

    it('returns the array shape unchanged', async () => {
      const rows = [row({ status: 'ok' })];
      mockAxios.onGet('/areas/a-1/plants').reply(200, rows);

      const { result } = renderHook(() => useAreaPlants('a-1'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(result.current.data).toHaveLength(1);
    });

    it('unwraps the {data: …} envelope when the controller wraps responses', async () => {
      const rows = [row({ status: 'overdue' })];
      mockAxios.onGet('/areas/a-1/plants').reply(200, { data: rows });

      const { result } = renderHook(() => useAreaPlants('a-1'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(result.current.data).toEqual(rows);
    });

    it('falls back to an empty array when the response is malformed', async () => {
      mockAxios.onGet('/areas/a-1/plants').reply(200, { foo: 'bar' });

      const { result } = renderHook(() => useAreaPlants('a-1'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(result.current.data).toEqual([]);
    });
  });

  describe('useNotablePlants', () => {
    it('is disabled when areaId is undefined', () => {
      const { result } = renderHook(() => useNotablePlants(undefined), {
        wrapper: createWrapper(),
      });
      expect(result.current.fetchStatus).toBe('idle');
    });

    it('fetches and returns notable plants', async () => {
      const notable: NotablePlantRow[] = [
        {
          id: 'n-1',
          areaId: 'a-1',
          speciesId: 's-1',
          gpsLat: -7.29,
          gpsLng: 112.74,
          label: 'Trembesi Heritage',
          heritage: true,
          photoUrls: ['photo.jpg'],
          notes: null,
        },
      ];
      mockAxios.onGet('/areas/a-1/notable-plants').reply(200, notable);

      const { result } = renderHook(() => useNotablePlants('a-1'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(result.current.data).toEqual(notable);
    });
  });

  describe('usePruningByRayon', () => {
    const sample: PruningRequestRow = {
      id: 'pr-1',
      reference_code: '25PR000001',
      submitted_by: 'u-1',
      kecamatan_name: 'Wiyung',
      address: 'Jl. Test',
      expected_date: null,
      estimated_plant_count: 3,
      tree_count: 3,
      requester_name: 'Pak Budi',
      status: 'submitted',
      rayon_id: 'r-1',
      created_at: '2026-05-23T08:00:00Z',
    };

    it('is disabled when rayonId is null', () => {
      const { result } = renderHook(() => usePruningByRayon(null), {
        wrapper: createWrapper(),
      });
      expect(result.current.fetchStatus).toBe('idle');
    });

    it('passes default paging (limit=10, page=1) and rayonId', async () => {
      mockAxios.onGet('/pruning-requests').reply((config) => {
        expect(config.params).toMatchObject({
          rayonId: 'r-1',
          limit: 10,
          page: 1,
        });
        expect(config.params.status).toBeUndefined();
        return [200, { data: [sample] }];
      });

      const { result } = renderHook(() => usePruningByRayon('r-1'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(result.current.data).toEqual([sample]);
    });

    it('forwards custom limit + status filter', async () => {
      mockAxios.onGet('/pruning-requests').reply((config) => {
        expect(config.params).toMatchObject({
          rayonId: 'r-1',
          limit: 5,
          page: 1,
          status: 'approved',
        });
        return [200, { data: [sample] }];
      });

      const { result } = renderHook(
        () => usePruningByRayon('r-1', { limit: 5, status: 'approved' }),
        { wrapper: createWrapper() },
      );

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
    });

    it('accepts a raw array response (legacy mine-style)', async () => {
      mockAxios.onGet('/pruning-requests').reply(200, [sample]);

      const { result } = renderHook(() => usePruningByRayon('r-1'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(result.current.data).toEqual([sample]);
    });

    it('returns [] when the envelope has no data', async () => {
      mockAxios.onGet('/pruning-requests').reply(200, { foo: 'bar' });

      const { result } = renderHook(() => usePruningByRayon('r-1'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(result.current.data).toEqual([]);
    });
  });
});

// ---------------------------------------------------------------------------
// helpers
// ---------------------------------------------------------------------------

function row(overrides: Partial<AreaPlantRow>): AreaPlantRow {
  return {
    id: 'ap-1',
    areaId: 'a-1',
    speciesId: 's-1',
    count: 1,
    lastPrunedAt: null,
    nextDueAt: null,
    status: 'ok',
    overrideCycleDays: null,
    ...overrides,
  };
}
