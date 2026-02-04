/**
 * Unit Tests: Monitoring API
 * Tests real-time monitoring and statistics
 */

import MockAdapter from 'axios-mock-adapter';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { apiClient } from '../client';
import {
  monitoringKeys,
  useCityStats,
  useRayonMonitoring,
  useAreaMonitoring,
  useLiveWorkers,
  type CityStats,
  type RayonMonitoringStats,
  type AreaMonitoringStats,
  type LiveWorkersResponse,
} from '../monitoring';
import { ReactNode } from 'react';

describe('Monitoring API', () => {
  let mockAxios: MockAdapter;
  let queryClient: QueryClient;

  const createWrapper = () => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });

    return ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
  };

  const mockCityStats: CityStats = {
    timestamp: '2026-02-04T10:00:00Z',
    summary: {
      total_rayons: 7,
      total_areas: 75,
      total_workers: 150,
      total_linmas: 30,
      workers_online: 120,
      linmas_online: 25,
      active_shifts: 45,
      reports_today: 25,
      tasks_pending: 12,
      tasks_in_progress: 8,
    },
  };

  const mockRayonStats: RayonMonitoringStats = {
    timestamp: '2026-02-04T10:00:00Z',
    rayon: {
      id: '1',
      name: 'Rayon 1',
    },
    summary: {
      total_areas: 10,
      total_workers: 20,
      total_linmas: 5,
      workers_online: 18,
      linmas_online: 4,
      active_shifts: 15,
      reports_today: 8,
      understaffed_areas: 2,
    },
  };

  const mockAreaStats: AreaMonitoringStats = {
    timestamp: '2026-02-04T10:00:00Z',
    area: {
      id: '1',
      name: 'Taman Bungkul',
      rayon: 'Rayon 1',
      coverage_area: 10000,
    },
    current_shift: {
      definition: {
        id: 'shift-1',
        name: 'Pagi',
        start_time: '06:00',
        end_time: '14:00',
      },
      required_workers: 5,
      required_linmas: 1,
      assigned_workers: 5,
      assigned_linmas: 1,
      active_workers: 4,
      active_linmas: 1,
    },
  };

  const mockLiveWorkers: LiveWorkersResponse = {
    timestamp: '2026-02-04T10:00:00Z',
    workers: [
      {
        user_id: 'worker-1',
        full_name: 'Worker One',
        role: 'worker',
        area_id: 'area-1',
        area_name: 'Taman Bungkul',
        shift_id: 'shift-1',
        gps_lat: -7.2885,
        gps_lng: 112.7395,
        location_timestamp: '2026-02-04T09:55:00Z',
        battery_level: 85,
        status: 'online',
      },
    ],
    total: 1,
  };

  beforeEach(() => {
    mockAxios = new MockAdapter(apiClient);
  });

  afterEach(() => {
    mockAxios.restore();
    queryClient?.clear();
  });

  describe('monitoringKeys', () => {
    it('should generate correct query keys', () => {
      expect(monitoringKeys.all).toEqual(['monitoring']);
      expect(monitoringKeys.city()).toEqual(['monitoring', 'city']);
      expect(monitoringKeys.rayon('1')).toEqual(['monitoring', 'rayon', '1']);
      expect(monitoringKeys.area('1')).toEqual(['monitoring', 'area', '1']);
      expect(monitoringKeys.liveWorkers({ rayon_id: '1' })).toEqual([
        'monitoring',
        'live-workers',
        { rayon_id: '1' },
      ]);
    });
  });

  describe('useCityStats', () => {
    it('should fetch city-wide statistics', async () => {
      mockAxios.onGet('/monitoring/city').reply(200, mockCityStats);

      const { result } = renderHook(() => useCityStats(), { wrapper: createWrapper() });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(result.current.data?.summary.total_rayons).toBe(7);
      expect(result.current.data?.summary.workers_online).toBe(120);
      expect(result.current.data?.summary.reports_today).toBe(25);
    });

    it('should handle fetch error', async () => {
      mockAxios.onGet('/monitoring/city').reply(500);

      const { result } = renderHook(() => useCityStats(), { wrapper: createWrapper() });

      await waitFor(() => expect(result.current.isError).toBe(true));
    });
  });

  describe('useRayonMonitoring', () => {
    it('should fetch rayon monitoring statistics', async () => {
      mockAxios.onGet('/monitoring/rayon/1').reply(200, mockRayonStats);

      const { result } = renderHook(() => useRayonMonitoring('1'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(result.current.data?.rayon.name).toBe('Rayon 1');
      expect(result.current.data?.summary.workers_online).toBe(18);
      expect(result.current.data?.summary.understaffed_areas).toBe(2);
    });

    it('should not fetch when id is empty', () => {
      const { result } = renderHook(() => useRayonMonitoring(''), {
        wrapper: createWrapper(),
      });

      expect(result.current.isFetching).toBe(false);
    });

    it('should handle fetch error', async () => {
      mockAxios.onGet('/monitoring/rayon/1').reply(500);

      const { result } = renderHook(() => useRayonMonitoring('1'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isError).toBe(true));
    });
  });

  describe('useAreaMonitoring', () => {
    it('should fetch area monitoring statistics', async () => {
      mockAxios.onGet('/monitoring/area/1').reply(200, mockAreaStats);

      const { result } = renderHook(() => useAreaMonitoring('1'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(result.current.data?.area.name).toBe('Taman Bungkul');
      expect(result.current.data?.current_shift.active_workers).toBe(4);
    });

    it('should not fetch when id is empty', () => {
      const { result } = renderHook(() => useAreaMonitoring(''), { wrapper: createWrapper() });

      expect(result.current.isFetching).toBe(false);
    });

    it('should handle fetch error', async () => {
      mockAxios.onGet('/monitoring/area/1').reply(500);

      const { result } = renderHook(() => useAreaMonitoring('1'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isError).toBe(true));
    });
  });

  describe('useLiveWorkers', () => {
    it('should fetch live workers without filters', async () => {
      mockAxios.onGet('/monitoring/live-workers').reply(200, mockLiveWorkers);

      const { result } = renderHook(() => useLiveWorkers(), { wrapper: createWrapper() });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(result.current.data?.workers).toHaveLength(1);
      expect(result.current.data?.workers[0].full_name).toBe('Worker One');
      expect(result.current.data?.total).toBe(1);
    });

    it('should fetch live workers with rayon filter', async () => {
      mockAxios.onGet('/monitoring/live-workers').reply(200, mockLiveWorkers);

      const { result } = renderHook(() => useLiveWorkers({ rayon_id: '1' }), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(result.current.data?.workers).toHaveLength(1);
    });

    it('should handle fetch error', async () => {
      mockAxios.onGet('/monitoring/live-workers').reply(500);

      const { result } = renderHook(() => useLiveWorkers(), { wrapper: createWrapper() });

      await waitFor(() => expect(result.current.isError).toBe(true));
    });
  });
});
