/**
 * Unit Tests: Monitoring React Query Hooks
 * Tests Phase 2D hooks with correct flat data shapes
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
  useLiveUsers,
  type CityStats,
  type RayonMonitoringStats,
  type AreaMonitoringStats,
  type LiveUsersResponse,
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

    const Wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
    Wrapper.displayName = 'TestWrapper';
    return Wrapper;
  };

  // -------------------------------------------------------------------------
  // Phase 2D flat mock data (no nested summary/rayon/area/current_shift)
  // -------------------------------------------------------------------------

  const mockCityStats: CityStats = {
    total_rayons: 7,
    total_locations: 75,
    total_workers: 150,
    workers_online: 120,
    workers_offline: 30,
    active_shifts: 45,
    tasks_pending: 12,
    tasks_in_progress: 8,
    tasks_completed_today: 25,
    activities_submitted_today: 40,
    generated_at: '2026-03-05T08:00:00Z',
  };

  const mockRayonStats: RayonMonitoringStats = {
    id: 'rayon-1',
    name: 'Rayon Selatan',
    code: 'RS',
    total_locations: 15,
    total_workers: 40,
    workers_online: 30,
    workers_offline: 10,
    active_shifts: 12,
    tasks_pending: 5,
    tasks_in_progress: 3,
    tasks_completed_today: 10,
    activities_submitted_today: 18,
    alerts: ['2 understaffed areas'],
    generated_at: '2026-03-05T08:00:00Z',
  };

  const mockAreaStats: AreaMonitoringStats = {
    id: 'area-1',
    name: 'Taman Bungkul',
    location_type: 'taman',
    rayon_id: 'rayon-1',
    rayon_name: 'Rayon Selatan',
    coverage_area: 12500,
    total_users_assigned: 5,
    users_online: 4,
    users_offline: 1,
    is_fully_staffed: true,
    tasks_pending: 2,
    tasks_in_progress: 1,
    tasks_completed_today: 3,
    activities_submitted_today: 5,
    alerts: [],
    generated_at: '2026-03-05T08:00:00Z',
  };

  const mockLiveUsers: LiveUsersResponse = {
    total_active: 10,
    total_inactive: 5,
    total_outside_area: 3,
    total_missing: 1,
    total_offline: 6,
    users: [
      {
        id: 'user-1',
        full_name: 'Satgas Satu',
        role: 'satgas',
        phone: '+6281234567890',
        status: 'active',
        location_id: 'area-1',
        area_name: 'Taman Bungkul',
        rayon_id: 'rayon-1',
        rayon_name: 'Rayon Selatan',
        latitude: -7.289659,
        longitude: 112.739208,
        accuracy: 5,
        battery_level: 85,
        last_update: '2026-03-05T08:30:00Z',
        is_within_area: true,
        outside_boundary: false,
        shift_id: 'shift-1',
        shift_name: 'Pagi',
        clock_in_time: '2026-03-05T06:05:00Z',
        current_task_status: 'in_progress',
        current_task_title: 'Penyiraman Tanaman',
      },
    ],
    generated_at: '2026-03-05T08:30:00Z',
  };

  beforeEach(() => {
    mockAxios = new MockAdapter(apiClient);
  });

  afterEach(() => {
    mockAxios.restore();
    queryClient?.clear();
  });

  // -------------------------------------------------------------------------
  // monitoringKeys
  // -------------------------------------------------------------------------

  describe('monitoringKeys', () => {
    it('should generate correct query keys', () => {
      expect(monitoringKeys.all).toEqual(['monitoring']);
      expect(monitoringKeys.city()).toEqual(['monitoring', 'city']);
      expect(monitoringKeys.rayon('1')).toEqual(['monitoring', 'rayon', '1']);
      expect(monitoringKeys.area('1')).toEqual(['monitoring', 'area', '1']);
      expect(monitoringKeys.liveUsers({ rayon_id: '1' })).toEqual([
        'monitoring',
        'live-users',
        { rayon_id: '1' },
      ]);
    });
  });

  // -------------------------------------------------------------------------
  // useCityStats
  // -------------------------------------------------------------------------

  describe('useCityStats', () => {
    it('should fetch city-wide statistics with flat shape', async () => {
      mockAxios.onGet('/monitoring/city').reply(200, mockCityStats);

      const { result } = renderHook(() => useCityStats(), { wrapper: createWrapper() });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(result.current.data?.total_rayons).toBe(7);
      expect(result.current.data?.total_locations).toBe(75);
      expect(result.current.data?.total_workers).toBe(150);
      expect(result.current.data?.workers_online).toBe(120);
      expect(result.current.data?.workers_offline).toBe(30);
      expect(result.current.data?.active_shifts).toBe(45);
      expect(result.current.data?.tasks_pending).toBe(12);
      expect(result.current.data?.tasks_in_progress).toBe(8);
      expect(result.current.data?.tasks_completed_today).toBe(25);
      expect(result.current.data?.activities_submitted_today).toBe(40);
    });

    it('should handle fetch error', async () => {
      mockAxios.onGet('/monitoring/city').reply(500);

      const { result } = renderHook(() => useCityStats(), { wrapper: createWrapper() });

      await waitFor(() => expect(result.current.isError).toBe(true));
    });
  });

  // -------------------------------------------------------------------------
  // useRayonMonitoring
  // -------------------------------------------------------------------------

  describe('useRayonMonitoring', () => {
    it('should fetch rayon monitoring statistics with flat shape', async () => {
      mockAxios.onGet('/monitoring/rayon/rayon-1').reply(200, mockRayonStats);

      const { result } = renderHook(() => useRayonMonitoring('rayon-1'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(result.current.data?.id).toBe('rayon-1');
      expect(result.current.data?.name).toBe('Rayon Selatan');
      expect(result.current.data?.code).toBe('RS');
      expect(result.current.data?.total_locations).toBe(15);
      expect(result.current.data?.total_workers).toBe(40);
      expect(result.current.data?.workers_online).toBe(30);
      expect(result.current.data?.workers_offline).toBe(10);
      expect(result.current.data?.alerts).toHaveLength(1);
    });

    it('should not fetch when id is empty', () => {
      const { result } = renderHook(() => useRayonMonitoring(''), {
        wrapper: createWrapper(),
      });

      expect(result.current.isFetching).toBe(false);
    });

    it('should handle fetch error', async () => {
      mockAxios.onGet('/monitoring/rayon/rayon-1').reply(500);

      const { result } = renderHook(() => useRayonMonitoring('rayon-1'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isError).toBe(true));
    });
  });

  // -------------------------------------------------------------------------
  // useAreaMonitoring
  // -------------------------------------------------------------------------

  describe('useAreaMonitoring', () => {
    it('should fetch area monitoring statistics with flat shape', async () => {
      mockAxios.onGet('/monitoring/location/area-1').reply(200, mockAreaStats);

      const { result } = renderHook(() => useAreaMonitoring('area-1'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(result.current.data?.id).toBe('area-1');
      expect(result.current.data?.name).toBe('Taman Bungkul');
      expect(result.current.data?.location_type).toBe('taman');
      expect(result.current.data?.rayon_id).toBe('rayon-1');
      expect(result.current.data?.rayon_name).toBe('Rayon Selatan');
      expect(result.current.data?.coverage_area).toBe(12500);
      expect(result.current.data?.total_users_assigned).toBe(5);
      expect(result.current.data?.users_online).toBe(4);
      expect(result.current.data?.users_offline).toBe(1);
      expect(result.current.data?.is_fully_staffed).toBe(true);
    });

    it('should not fetch when id is empty', () => {
      const { result } = renderHook(() => useAreaMonitoring(''), { wrapper: createWrapper() });

      expect(result.current.isFetching).toBe(false);
    });

    it('should handle fetch error', async () => {
      mockAxios.onGet('/monitoring/location/area-1').reply(500);

      const { result } = renderHook(() => useAreaMonitoring('area-1'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isError).toBe(true));
    });
  });

  // -------------------------------------------------------------------------
  // useLiveUsers
  // -------------------------------------------------------------------------

  describe('useLiveUsers', () => {
    it('should fetch live users with Phase 2D LiveUsersResponse shape', async () => {
      mockAxios.onGet('/monitoring/live-users').reply(200, mockLiveUsers);

      const { result } = renderHook(() => useLiveUsers(), { wrapper: createWrapper() });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(result.current.data?.total_active).toBe(10);
      expect(result.current.data?.total_inactive).toBe(5);
      expect(result.current.data?.total_outside_area).toBe(3);
      expect(result.current.data?.total_missing).toBe(1);
      expect(result.current.data?.total_offline).toBe(6);
      expect(result.current.data?.users).toHaveLength(1);
      expect(result.current.data?.generated_at).toBe('2026-03-05T08:30:00Z');
    });

    it('should return a LiveUser with all Phase 2D fields', async () => {
      mockAxios.onGet('/monitoring/live-users').reply(200, mockLiveUsers);

      const { result } = renderHook(() => useLiveUsers(), { wrapper: createWrapper() });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      const user = result.current.data?.users[0];
      expect(user?.id).toBe('user-1');
      expect(user?.full_name).toBe('Satgas Satu');
      expect(user?.role).toBe('satgas');
      expect(user?.phone).toBe('+6281234567890');
      expect(user?.status).toBe('active');
      expect(user?.area_name).toBe('Taman Bungkul');
      expect(user?.rayon_name).toBe('Rayon Selatan');
      expect(user?.is_within_area).toBe(true);
      expect(user?.outside_boundary).toBe(false);
      expect(user?.shift_name).toBe('Pagi');
      expect(user?.current_task_status).toBe('in_progress');
      expect(user?.current_task_title).toBe('Penyiraman Tanaman');
    });

    it('should fetch live users with rayon_id filter', async () => {
      const filteredResponse: LiveUsersResponse = {
        total_active: 3,
        total_inactive: 1,
        total_outside_area: 0,
        total_missing: 0,
        total_offline: 2,
        users: [],
        generated_at: '2026-03-05T08:30:00Z',
      };

      mockAxios.onGet('/monitoring/live-users').reply(200, filteredResponse);

      const { result } = renderHook(() => useLiveUsers({ rayon_id: 'rayon-1' }), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(result.current.data?.total_active).toBe(3);
      expect(result.current.data?.users).toHaveLength(0);
    });

    it('should handle fetch error', async () => {
      mockAxios.onGet('/monitoring/live-users').reply(500);

      const { result } = renderHook(() => useLiveUsers(), { wrapper: createWrapper() });

      await waitFor(() => expect(result.current.isError).toBe(true));
    });
  });
});
