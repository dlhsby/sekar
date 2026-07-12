/**
 * Unit Tests: Monitoring v2 API (Phase 3 sub-phase 3-4)
 *
 * Audit H6 (2026-05-23): `monitoring-v2.ts` was at 0 % coverage. These tests
 * lock the snapshot fetch contract + query-key shape that the WS patcher
 * layer depends on.
 */

import MockAdapter from 'axios-mock-adapter';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactNode } from 'react';
import { apiClient } from '../client';
import {
  snapshotKeys,
  useMonitoringSnapshot,
  type MonitoringSnapshotResponse,
  type SnapshotWorker,
  type SnapshotAreaSummary,
  type StatusV2Event,
} from '../monitoring-v2';

describe('Monitoring v2 API', () => {
  let mockAxios: MockAdapter;
  let queryClient: QueryClient;

  const createWrapper = () => {
    queryClient = new QueryClient({
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

  const mockWorker: SnapshotWorker = {
    user_id: 'u-1',
    full_name: 'Satgas One',
    role: 'satgas',
    lat: -7.29,
    lng: 112.74,
    status: 'active',
    location_id: 'a-1',
    area_name: 'Taman Bungkul',
    rayon_id: 'r-1',
    rayon_name: 'Rayon Pusat',
    last_update: '2026-05-23T08:00:00Z',
    is_within_area: true,
    battery_level: 78,
  };

  const mockArea: SnapshotAreaSummary = {
    location_id: 'a-1',
    area_name: 'Taman Bungkul',
    rayon_id: 'r-1',
    rayon_name: 'Rayon Pusat',
    active_count: 3,
    required_count: 4,
    is_understaffed: true,
  };

  const mockResponse: MonitoringSnapshotResponse = {
    success: true,
    data: {
      workers: [mockWorker],
      area_summaries: [mockArea],
      total_active: 1,
      total_inactive: 0,
      total_outside_area: 0,
      total_missing: 0,
      total_offline: 0,
      generated_at: '2026-05-23T08:00:00Z',
    },
  };

  beforeEach(() => {
    mockAxios = new MockAdapter(apiClient);
  });

  afterEach(() => {
    mockAxios.restore();
  });

  describe('snapshotKeys', () => {
    it('exposes a stable base key', () => {
      expect(snapshotKeys.all).toEqual(['monitoring', 'snapshot']);
    });

    it('byScope appends scope + id deterministically', () => {
      expect(snapshotKeys.byScope('city')).toEqual([
        'monitoring',
        'snapshot',
        'city',
        undefined,
      ]);
      expect(snapshotKeys.byScope('rayon', 'r-1')).toEqual([
        'monitoring',
        'snapshot',
        'rayon',
        'r-1',
      ]);
      expect(snapshotKeys.byScope('area', 'a-1')).toEqual([
        'monitoring',
        'snapshot',
        'area',
        'a-1',
      ]);
    });
  });

  describe('useMonitoringSnapshot', () => {
    it('fetches the unified snapshot at city scope by default', async () => {
      mockAxios.onGet('/monitoring/snapshot').reply((config) => {
        expect(config.params).toEqual({ scope: 'city' });
        return [200, mockResponse];
      });

      const { result } = renderHook(() => useMonitoringSnapshot(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(result.current.data?.data.workers).toHaveLength(1);
      expect(result.current.data?.data.area_summaries[0].is_understaffed).toBe(true);
    });

    it('passes scope + id query params when rayon-scoped', async () => {
      mockAxios.onGet('/monitoring/snapshot').reply((config) => {
        expect(config.params).toEqual({ scope: 'rayon', id: 'r-1' });
        return [200, mockResponse];
      });

      const { result } = renderHook(
        () => useMonitoringSnapshot('rayon', 'r-1'),
        { wrapper: createWrapper() },
      );

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
    });

    it('passes scope + id when area-scoped', async () => {
      mockAxios.onGet('/monitoring/snapshot').reply((config) => {
        expect(config.params).toEqual({ scope: 'area', id: 'a-1' });
        return [200, mockResponse];
      });

      const { result } = renderHook(
        () => useMonitoringSnapshot('area', 'a-1'),
        { wrapper: createWrapper() },
      );

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
    });

    it('surfaces fetch errors to the caller', async () => {
      mockAxios.onGet('/monitoring/snapshot').reply(500, {
        success: false,
        error: 'projector stalled',
      });

      const { result } = renderHook(() => useMonitoringSnapshot(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isError).toBe(true));
    });
  });

  describe('StatusV2Event shape', () => {
    it('accepts optional lat/lng fields', () => {
      const withCoords: StatusV2Event = {
        user_id: 'u-1',
        prev: 'active',
        next: 'inactive',
        lat: -7.29,
        lng: 112.74,
        timestamp: '2026-05-23T08:00:00Z',
      };
      const withoutCoords: StatusV2Event = {
        user_id: 'u-1',
        prev: 'inactive',
        next: 'missing',
        timestamp: '2026-05-23T08:05:00Z',
      };
      // Compile-time check; runtime assertion just confirms shape.
      expect(withCoords.lat).toBe(-7.29);
      expect(withoutCoords.lat).toBeUndefined();
    });
  });
});
