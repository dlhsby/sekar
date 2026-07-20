/**
 * Unit Tests: Districts API
 * Tests district data fetching, stats, and areas
 */

import MockAdapter from 'axios-mock-adapter';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { apiClient } from '../client';
import { districtKeys, useDistricts, useDistrict, useDistrictStats, useDistrictAreas } from '../districts';
import type { Location } from '@/types/models';
import { ReactNode } from 'react';

describe('Districts API', () => {
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

  const mockDistricts: District[] = [
    {
      id: '1',
      name: 'Rayon 1',
      description: 'Rayon description',
      // eslint-disable-next-line sekar-design/no-inline-hex-colors -- mock API color fixture
      color: '#4CAF50',
      created_at: '2026-01-01T00:00:00Z',
    },
    {
      id: '2',
      name: 'Rayon 2',
      description: 'Rayon description',
      // eslint-disable-next-line sekar-design/no-inline-hex-colors -- mock API color fixture
      color: '#2196F3',
      created_at: '2026-01-01T00:00:00Z',
    },
  ];

  const mockDistrictStats: DistrictStats = {
    district_id: '1',
    total_areas: 15,
    total_workers: 25,
    total_area_m2: 50000,
    active_shifts_today: 3,
  };

  const mockAreas: PaginatedResponse<Location> = {
    data: [
      {
        id: '1',
        name: 'Taman Bungkul',
        location_type_id: 'type-1',
        district_id: '1',
        boundary: {
          type: 'Polygon',
          coordinates: [
            [
              [112.739, -7.289],
              [112.74, -7.289],
              [112.739, -7.289],
            ],
          ],
        },
        centroid_lat: -7.2885,
        centroid_lng: 112.7395,
        area_m2: 10000,
        created_at: '2026-01-01T00:00:00Z',
      },
    ],
    meta: { total: 1, page: 1, limit: 10, totalPages: 1 },
  };

  beforeEach(() => {
    mockAxios = new MockAdapter(apiClient);
  });

  afterEach(() => {
    mockAxios.restore();
    queryClient?.clear();
  });

  describe('districtKeys', () => {
    it('should generate correct query keys', () => {
      expect(districtKeys.all).toEqual(['districts']);
      expect(districtKeys.lists()).toEqual(['districts', 'list']);
      // The list key carries the include-inactive flag: the admin grid and the
      // pickers must not share one cache entry.
      expect(districtKeys.list()).toEqual(['districts', 'list', { includeInactive: false }]);
      expect(districtKeys.list(true)).toEqual(['districts', 'list', { includeInactive: true }]);
      expect(districtKeys.details()).toEqual(['districts', 'detail']);
      expect(districtKeys.detail('1')).toEqual(['districts', 'detail', '1']);
      expect(districtKeys.stats('1')).toEqual(['districts', 'detail', '1', 'stats']);
      expect(districtKeys.areas('1', { search: 'test' })).toEqual([
        'districts',
        'detail',
        '1',
        'areas',
        { search: 'test' },
      ]);
    });
  });

  describe('useDistricts', () => {
    it('should fetch all districts', async () => {
      mockAxios.onGet('/districts').reply(200, mockDistricts);

      const { result } = renderHook(() => useDistricts(), { wrapper: createWrapper() });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(result.current.data).toHaveLength(2);
      expect(result.current.data?.[0].name).toBe('Rayon 1');
      expect(result.current.data?.[1].name).toBe('Rayon 2');
    });

    it('should handle fetch error', async () => {
      mockAxios.onGet('/districts').reply(500, {
        statusCode: 500,
        message: 'Internal server error',
      });

      const { result } = renderHook(() => useDistricts(), { wrapper: createWrapper() });

      await waitFor(() => expect(result.current.isError).toBe(true));

      expect(result.current.error).toBeTruthy();
    });
  });

  describe('useDistrict', () => {
    const mockDistrict = mockDistricts[0];

    it('should fetch single district by ID', async () => {
      mockAxios.onGet('/districts/1').reply(200, mockDistrict);

      const { result } = renderHook(() => useDistrict('1'), { wrapper: createWrapper() });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(result.current.data?.name).toBe('Rayon 1');
      // eslint-disable-next-line sekar-design/no-inline-hex-colors -- mock API color fixture
      expect(result.current.data?.color).toBe('#4CAF50');
    });

    it('should handle district not found', async () => {
      mockAxios.onGet('/districts/999').reply(404, {
        statusCode: 404,
        message: 'Rayon not found',
      });

      const { result } = renderHook(() => useDistrict('999'), { wrapper: createWrapper() });

      await waitFor(() => expect(result.current.isError).toBe(true));

      expect(result.current.error).toBeTruthy();
    });

    it('should not fetch when id is empty', () => {
      const { result } = renderHook(() => useDistrict(''), { wrapper: createWrapper() });

      expect(result.current.isFetching).toBe(false);
      expect(result.current.data).toBeUndefined();
    });
  });

  describe('useDistrictStats', () => {
    it('should fetch district statistics', async () => {
      mockAxios.onGet('/districts/1/stats').reply(200, mockDistrictStats);

      const { result } = renderHook(() => useDistrictStats('1'), { wrapper: createWrapper() });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(result.current.data?.district_id).toBe('1');
      expect(result.current.data?.total_areas).toBe(15);
      expect(result.current.data?.total_workers).toBe(25);
      expect(result.current.data?.total_area_m2).toBe(50000);
    });

    it('should handle stats fetch error', async () => {
      mockAxios.onGet('/districts/1/stats').reply(500, {
        statusCode: 500,
        message: 'Internal server error',
      });

      const { result } = renderHook(() => useDistrictStats('1'), { wrapper: createWrapper() });

      await waitFor(() => expect(result.current.isError).toBe(true));

      expect(result.current.error).toBeTruthy();
    });

    it('should not fetch when id is empty', () => {
      const { result } = renderHook(() => useDistrictStats(''), { wrapper: createWrapper() });

      expect(result.current.isFetching).toBe(false);
      expect(result.current.data).toBeUndefined();
    });
  });

  describe('useDistrictAreas', () => {
    it('should fetch district areas without filters', async () => {
      mockAxios.onGet('/districts/1/areas').reply(200, mockAreas);

      const { result } = renderHook(() => useDistrictAreas('1'), { wrapper: createWrapper() });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(result.current.data?.data).toHaveLength(1);
      expect(result.current.data?.data[0].name).toBe('Taman Bungkul');
    });

    it('should fetch district areas with filters', async () => {
      mockAxios.onGet('/districts/1/areas').reply(200, mockAreas);

      const { result } = renderHook(() => useDistrictAreas('1', { search: 'Bungkul' }), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(result.current.data?.data[0].name).toBe('Taman Bungkul');
    });

    it('should handle areas fetch error', async () => {
      mockAxios.onGet('/districts/1/areas').reply(500, {
        statusCode: 500,
        message: 'Internal server error',
      });

      const { result } = renderHook(() => useDistrictAreas('1'), { wrapper: createWrapper() });

      await waitFor(() => expect(result.current.isError).toBe(true));

      expect(result.current.error).toBeTruthy();
    });

    it('should not fetch when id is empty', () => {
      const { result } = renderHook(() => useDistrictAreas(''), { wrapper: createWrapper() });

      expect(result.current.isFetching).toBe(false);
      expect(result.current.data).toBeUndefined();
    });
  });
});
