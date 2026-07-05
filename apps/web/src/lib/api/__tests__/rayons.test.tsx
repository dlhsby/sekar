/**
 * Unit Tests: Rayons API
 * Tests rayon data fetching, stats, and areas
 */

import MockAdapter from 'axios-mock-adapter';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { apiClient } from '../client';
import { rayonKeys, useRayons, useRayon, useRayonStats, useRayonAreas } from '../rayons';
import type { Rayon, RayonStats, Area, PaginatedResponse } from '@/types/models';
import { ReactNode } from 'react';

describe('Rayons API', () => {
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

  const mockRayons: Rayon[] = [
    {
      id: '1',
      name: 'Rayon 1',
      description: 'Rayon description',
      color: '#4CAF50',
      created_at: '2026-01-01T00:00:00Z',
    },
    {
      id: '2',
      name: 'Rayon 2',
      description: 'Rayon description',
      color: '#2196F3',
      created_at: '2026-01-01T00:00:00Z',
    },
  ];

  const mockRayonStats: RayonStats = {
    rayon_id: '1',
    total_areas: 15,
    total_workers: 25,
    total_area_m2: 50000,
    active_shifts_today: 3,
  };

  const mockAreas: PaginatedResponse<Area> = {
    data: [
      {
        id: '1',
        name: 'Taman Bungkul',
        area_type_id: 'type-1',
        rayon_id: '1',
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

  describe('rayonKeys', () => {
    it('should generate correct query keys', () => {
      expect(rayonKeys.all).toEqual(['rayons']);
      expect(rayonKeys.lists()).toEqual(['rayons', 'list']);
      expect(rayonKeys.list()).toEqual(['rayons', 'list']);
      expect(rayonKeys.details()).toEqual(['rayons', 'detail']);
      expect(rayonKeys.detail('1')).toEqual(['rayons', 'detail', '1']);
      expect(rayonKeys.stats('1')).toEqual(['rayons', 'detail', '1', 'stats']);
      expect(rayonKeys.areas('1', { search: 'test' })).toEqual([
        'rayons',
        'detail',
        '1',
        'areas',
        { search: 'test' },
      ]);
    });
  });

  describe('useRayons', () => {
    it('should fetch all rayons', async () => {
      mockAxios.onGet('/rayons').reply(200, mockRayons);

      const { result } = renderHook(() => useRayons(), { wrapper: createWrapper() });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(result.current.data).toHaveLength(2);
      expect(result.current.data?.[0].name).toBe('Rayon 1');
      expect(result.current.data?.[1].name).toBe('Rayon 2');
    });

    it('should handle fetch error', async () => {
      mockAxios.onGet('/rayons').reply(500, {
        statusCode: 500,
        message: 'Internal server error',
      });

      const { result } = renderHook(() => useRayons(), { wrapper: createWrapper() });

      await waitFor(() => expect(result.current.isError).toBe(true));

      expect(result.current.error).toBeTruthy();
    });
  });

  describe('useRayon', () => {
    const mockRayon = mockRayons[0];

    it('should fetch single rayon by ID', async () => {
      mockAxios.onGet('/rayons/1').reply(200, mockRayon);

      const { result } = renderHook(() => useRayon('1'), { wrapper: createWrapper() });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(result.current.data?.name).toBe('Rayon 1');
      expect(result.current.data?.color).toBe('#4CAF50');
    });

    it('should handle rayon not found', async () => {
      mockAxios.onGet('/rayons/999').reply(404, {
        statusCode: 404,
        message: 'Rayon not found',
      });

      const { result } = renderHook(() => useRayon('999'), { wrapper: createWrapper() });

      await waitFor(() => expect(result.current.isError).toBe(true));

      expect(result.current.error).toBeTruthy();
    });

    it('should not fetch when id is empty', () => {
      const { result } = renderHook(() => useRayon(''), { wrapper: createWrapper() });

      expect(result.current.isFetching).toBe(false);
      expect(result.current.data).toBeUndefined();
    });
  });

  describe('useRayonStats', () => {
    it('should fetch rayon statistics', async () => {
      mockAxios.onGet('/rayons/1/stats').reply(200, mockRayonStats);

      const { result } = renderHook(() => useRayonStats('1'), { wrapper: createWrapper() });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(result.current.data?.rayon_id).toBe('1');
      expect(result.current.data?.total_areas).toBe(15);
      expect(result.current.data?.total_workers).toBe(25);
      expect(result.current.data?.total_area_m2).toBe(50000);
    });

    it('should handle stats fetch error', async () => {
      mockAxios.onGet('/rayons/1/stats').reply(500, {
        statusCode: 500,
        message: 'Internal server error',
      });

      const { result } = renderHook(() => useRayonStats('1'), { wrapper: createWrapper() });

      await waitFor(() => expect(result.current.isError).toBe(true));

      expect(result.current.error).toBeTruthy();
    });

    it('should not fetch when id is empty', () => {
      const { result } = renderHook(() => useRayonStats(''), { wrapper: createWrapper() });

      expect(result.current.isFetching).toBe(false);
      expect(result.current.data).toBeUndefined();
    });
  });

  describe('useRayonAreas', () => {
    it('should fetch rayon areas without filters', async () => {
      mockAxios.onGet('/rayons/1/areas').reply(200, mockAreas);

      const { result } = renderHook(() => useRayonAreas('1'), { wrapper: createWrapper() });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(result.current.data?.data).toHaveLength(1);
      expect(result.current.data?.data[0].name).toBe('Taman Bungkul');
    });

    it('should fetch rayon areas with filters', async () => {
      mockAxios.onGet('/rayons/1/areas').reply(200, mockAreas);

      const { result } = renderHook(() => useRayonAreas('1', { search: 'Bungkul' }), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(result.current.data?.data[0].name).toBe('Taman Bungkul');
    });

    it('should handle areas fetch error', async () => {
      mockAxios.onGet('/rayons/1/areas').reply(500, {
        statusCode: 500,
        message: 'Internal server error',
      });

      const { result } = renderHook(() => useRayonAreas('1'), { wrapper: createWrapper() });

      await waitFor(() => expect(result.current.isError).toBe(true));

      expect(result.current.error).toBeTruthy();
    });

    it('should not fetch when id is empty', () => {
      const { result } = renderHook(() => useRayonAreas(''), { wrapper: createWrapper() });

      expect(result.current.isFetching).toBe(false);
      expect(result.current.data).toBeUndefined();
    });
  });
});
