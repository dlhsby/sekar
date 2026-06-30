/**
 * Unit Tests: Areas API
 * Tests area CRUD operations, polygon handling, and TanStack Query hooks
 */

import MockAdapter from 'axios-mock-adapter';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { apiClient } from '../client';
import { areaKeys, useAreas, useArea, useCreateArea, useUpdateArea, useDeleteArea } from '../areas';
import type { Area, PaginatedResponse, CreateAreaDto, UpdateAreaDto } from '@/types/models';
import { ReactNode } from 'react';

const mockAreaType = {
  id: 'type-1',
  name: 'Taman',
  code: 'TAMAN',
  category: 'ACTIVE' as const,
  created_at: '2026-01-01',
  updated_at: '2026-01-01',
};

describe('Areas API', () => {
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

  beforeEach(() => {
    mockAxios = new MockAdapter(apiClient);
  });

  afterEach(() => {
    mockAxios.restore();
    queryClient?.clear();
  });

  describe('areaKeys', () => {
    it('should generate correct query keys', () => {
      expect(areaKeys.all).toEqual(['areas']);
      expect(areaKeys.lists()).toEqual(['areas', 'list']);
      expect(areaKeys.list({ rayon_id: 'rayon-1' })).toEqual([
        'areas',
        'list',
        { rayon_id: 'rayon-1' },
      ]);
      expect(areaKeys.details()).toEqual(['areas', 'detail']);
      expect(areaKeys.detail('1')).toEqual(['areas', 'detail', '1']);
    });
  });

  describe('useAreas', () => {
    const mockResponse: PaginatedResponse<Area> = {
      data: [
        {
          id: '1',
          name: 'Taman Bungkul',
          code: 'TB',
          area_type_id: 'type-1',
          areaType: mockAreaType,
          rayon_id: 'rayon-1',
          boundary_polygon: {
            type: 'Polygon',
            coordinates: [
              [
                [112.739, -7.289],
                [112.74, -7.289],
                [112.74, -7.288],
                [112.739, -7.288],
                [112.739, -7.289],
              ],
            ],
          },
          gps_lat: -7.2885,
          gps_lng: 112.7395,
          coverage_area: 10000,
          created_at: '2026-01-01T00:00:00Z',
          updated_at: '2026-01-01T00:00:00Z',
        },
      ],
      meta: {
        total: 1,
        page: 1,
        limit: 10,
        totalPages: 1,
      },
    };

    it('should fetch areas without filters', async () => {
      mockAxios.onGet('/areas?').reply(200, mockResponse);

      const { result } = renderHook(() => useAreas(), { wrapper: createWrapper() });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(result.current.data?.data).toHaveLength(1);
      expect(result.current.data?.data[0].name).toBe('Taman Bungkul');
      expect(result.current.data?.meta.total).toBe(1);
    });

    it('should fetch areas with search filter', async () => {
      mockAxios.onGet('/areas?search=Bungkul').reply(200, mockResponse);

      const { result } = renderHook(() => useAreas({ search: 'Bungkul' }), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(result.current.data?.data[0].name).toBe('Taman Bungkul');
    });

    it('should fetch areas with rayon_id filter', async () => {
      mockAxios.onGet('/areas?rayon_id=rayon-1').reply(200, mockResponse);

      const { result } = renderHook(() => useAreas({ rayon_id: 'rayon-1' }), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(result.current.data?.data).toHaveLength(1);
    });

    it('should fetch areas with area_type_id filter', async () => {
      mockAxios.onGet('/areas?area_type_id=type-1').reply(200, mockResponse);

      const { result } = renderHook(() => useAreas({ area_type_id: 'type-1' }), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(result.current.data?.data[0].area_type_id).toBe('type-1');
    });

    it('should fetch areas with pagination', async () => {
      mockAxios.onGet('/areas?page=2&limit=20').reply(200, {
        data: [],
        meta: { total: 0, page: 2, limit: 20, totalPages: 0 },
      });

      const { result } = renderHook(() => useAreas({ page: 2, limit: 20 }), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(result.current.data?.meta.page).toBe(2);
      expect(result.current.data?.meta.limit).toBe(20);
    });

    it('should handle fetch error', async () => {
      mockAxios.onGet('/areas?').reply(500, {
        statusCode: 500,
        message: 'Internal server error',
      });

      const { result } = renderHook(() => useAreas(), { wrapper: createWrapper() });

      await waitFor(() => expect(result.current.isError).toBe(true));

      expect(result.current.error).toBeTruthy();
    });
  });

  describe('useArea', () => {
    const mockArea: Area = {
      id: '1',
      name: 'Taman Bungkul',
      code: 'TB',
      area_type_id: 'type-1',
      areaType: mockAreaType,
      rayon_id: 'rayon-1',
      boundary_polygon: {
        type: 'Polygon',
        coordinates: [
          [
            [112.739, -7.289],
            [112.74, -7.289],
            [112.74, -7.288],
            [112.739, -7.288],
            [112.739, -7.289],
          ],
        ],
      },
      gps_lat: -7.2885,
      gps_lng: 112.7395,
      coverage_area: 10000,
      created_at: '2026-01-01T00:00:00Z',
      updated_at: '2026-01-01T00:00:00Z',
    };

    it('should fetch single area by ID', async () => {
      mockAxios.onGet('/areas/1').reply(200, mockArea);

      const { result } = renderHook(() => useArea('1'), { wrapper: createWrapper() });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(result.current.data?.name).toBe('Taman Bungkul');
      expect(result.current.data?.boundary_polygon?.type).toBe('Polygon');
      expect(result.current.data?.coverage_area).toBe(10000);
    });

    it('should handle area not found', async () => {
      mockAxios.onGet('/areas/999').reply(404, {
        statusCode: 404,
        message: 'Area not found',
        error: 'NotFound',
      });

      const { result } = renderHook(() => useArea('999'), { wrapper: createWrapper() });

      await waitFor(() => expect(result.current.isError).toBe(true));

      expect(result.current.error).toBeTruthy();
    });

    it('should not fetch when id is empty', () => {
      const { result } = renderHook(() => useArea(''), { wrapper: createWrapper() });

      expect(result.current.isFetching).toBe(false);
      expect(result.current.data).toBeUndefined();
    });
  });

  describe('useCreateArea', () => {
    it('should create new area', async () => {
      const newArea: CreateAreaDto = {
        name: 'New Park',
        area_type_id: 'type-1',
        rayon_id: 'rayon-1',
        gps_lat: -7.2885,
        gps_lng: 112.7395,
        boundary_polygon: {
          type: 'Polygon',
          coordinates: [
            [
              [112.739, -7.289],
              [112.74, -7.289],
              [112.74, -7.288],
              [112.739, -7.288],
              [112.739, -7.289],
            ],
          ],
        },
      };

      const createdArea: Area = {
        ...newArea,
        id: '10',
        areaType: mockAreaType,
        gps_lat: -7.2885,
        gps_lng: 112.7395,
        coverage_area: 10000,
        created_at: '2026-02-04T00:00:00Z',
        updated_at: '2026-02-04T00:00:00Z',
      };

      mockAxios.onPost('/areas', newArea).reply(201, createdArea);

      const { result } = renderHook(() => useCreateArea(), { wrapper: createWrapper() });

      result.current.mutate(newArea);

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(result.current.data?.name).toBe('New Park');
      expect(result.current.data?.id).toBe('10');
    });

    it('should handle validation errors', async () => {
      mockAxios.onPost('/areas').reply(400, {
        statusCode: 400,
        message: 'Validation failed',
        errors: {
          name: 'Name is required',
          boundary_polygon: 'Boundary must have at least 4 points',
        },
      });

      const { result } = renderHook(() => useCreateArea(), { wrapper: createWrapper() });

      result.current.mutate({} as CreateAreaDto);

      await waitFor(() => expect(result.current.isError).toBe(true));

      expect(result.current.error).toBeTruthy();
    });

    it('should invalidate queries on success', async () => {
      const newArea: CreateAreaDto = {
        name: 'New Park',
        area_type_id: 'type-1',
        rayon_id: 'rayon-1',
        gps_lat: -7.2885,
        gps_lng: 112.7395,
        boundary_polygon: {
          type: 'Polygon',
          coordinates: [
            [
              [112.739, -7.289],
              [112.74, -7.289],
              [112.74, -7.288],
              [112.739, -7.289],
            ],
          ],
        },
      };

      mockAxios
        .onPost('/areas')
        .reply(201, { ...newArea, id: '10', created_at: '2026-02-04', updated_at: '2026-02-04' });

      const { result } = renderHook(() => useCreateArea(), { wrapper: createWrapper() });

      const invalidateSpy = jest.spyOn(queryClient, 'invalidateQueries');

      result.current.mutate(newArea);

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: areaKeys.lists() });
    });
  });

  describe('useUpdateArea', () => {
    it('should update existing area', async () => {
      const updateData: UpdateAreaDto = {
        name: 'Updated Park Name',
      };

      const updatedArea: Area = {
        id: '1',
        name: 'Updated Park Name',
        code: 'TB',
        area_type_id: 'type-1',
        areaType: mockAreaType,
        rayon_id: 'rayon-1',
        boundary_polygon: {
          type: 'Polygon',
          coordinates: [
            [
              [112.739, -7.289],
              [112.74, -7.289],
              [112.739, -7.289],
            ],
          ],
        },
        gps_lat: -7.2885,
        gps_lng: 112.7395,
        coverage_area: 10000,
        created_at: '2026-01-01T00:00:00Z',
        updated_at: '2026-01-01T00:00:00Z',
      };

      mockAxios.onPatch('/areas/1', updateData).reply(200, updatedArea);

      const { result } = renderHook(() => useUpdateArea(), { wrapper: createWrapper() });

      result.current.mutate({ id: '1', data: updateData });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(result.current.data?.name).toBe('Updated Park Name');
    });

    it('should handle update error', async () => {
      mockAxios.onPatch('/areas/1').reply(404, {
        statusCode: 404,
        message: 'Area not found',
      });

      const { result } = renderHook(() => useUpdateArea(), { wrapper: createWrapper() });

      result.current.mutate({ id: '1', data: { name: 'New Name' } });

      await waitFor(() => expect(result.current.isError).toBe(true));

      expect(result.current.error).toBeTruthy();
    });

    it('should invalidate queries on success', async () => {
      mockAxios.onPatch('/areas/1').reply(200, { id: '1', name: 'Updated' });

      const { result } = renderHook(() => useUpdateArea(), { wrapper: createWrapper() });

      const invalidateSpy = jest.spyOn(queryClient, 'invalidateQueries');

      result.current.mutate({ id: '1', data: { name: 'Updated' } });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: areaKeys.detail('1') });
      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: areaKeys.lists() });
    });
  });

  describe('useDeleteArea', () => {
    it('should delete area', async () => {
      mockAxios.onDelete('/areas/1').reply(204);

      const { result } = renderHook(() => useDeleteArea(), { wrapper: createWrapper() });

      result.current.mutate('1');

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
    });

    it('should handle delete error', async () => {
      mockAxios.onDelete('/areas/1').reply(404, {
        statusCode: 404,
        message: 'Area not found',
        error: 'NotFound',
      });

      const { result } = renderHook(() => useDeleteArea(), { wrapper: createWrapper() });

      result.current.mutate('1');

      await waitFor(() => expect(result.current.isError).toBe(true));

      expect(result.current.error).toBeTruthy();
    });

    it('should invalidate queries on success', async () => {
      mockAxios.onDelete('/areas/1').reply(204);

      const { result } = renderHook(() => useDeleteArea(), { wrapper: createWrapper() });

      const invalidateSpy = jest.spyOn(queryClient, 'invalidateQueries');

      result.current.mutate('1');

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: areaKeys.lists() });
    });
  });
});
