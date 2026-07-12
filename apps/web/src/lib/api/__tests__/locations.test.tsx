/**
 * Unit Tests: Areas API
 * Tests area CRUD operations, polygon handling, and TanStack Query hooks
 */

import MockAdapter from 'axios-mock-adapter';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { apiClient } from '../client';
import { locationKeys, useLocations, useLocation, useCreateLocation, useUpdateLocation, useDeleteLocation } from '../locations';
import type { Location, PaginatedResponse, CreateLocationDto, UpdateLocationDto } from '@/types/models';
import { ReactNode } from 'react';

const mockLocationType = {
  id: 'type-1',
  name: 'Taman',
  code: 'TAMAN',
  category: 'ACTIVE' as const,
  created_at: '2026-01-01',
  updated_at: '2026-01-01',
};

describe('Locations API', () => {
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

  describe('locationKeys', () => {
    it('should generate correct query keys', () => {
      expect(locationKeys.all).toEqual(['locations']);
      expect(locationKeys.lists()).toEqual(['locations', 'list']);
      expect(locationKeys.list({ rayon_id: 'rayon-1' })).toEqual([
        'locations',
        'list',
        { rayon_id: 'rayon-1' },
      ]);
      expect(locationKeys.details()).toEqual(['locations', 'detail']);
      expect(locationKeys.detail('1')).toEqual(['locations', 'detail', '1']);
    });
  });

  describe('useLocations', () => {
    const mockResponse: PaginatedResponse<Location> = {
      data: [
        {
          id: '1',
          name: 'Taman Bungkul',
          code: 'TB',
          location_type_id: 'type-1',
          locationType: mockLocationType,
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

    it('should fetch locations without filters', async () => {
      mockAxios.onGet('/locations?').reply(200, mockResponse);

      const { result } = renderHook(() => useLocations(), { wrapper: createWrapper() });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(result.current.data?.data).toHaveLength(1);
      expect(result.current.data?.data[0].name).toBe('Taman Bungkul');
      expect(result.current.data?.meta.total).toBe(1);
    });

    it('should fetch locations with search filter', async () => {
      mockAxios.onGet('/locations?search=Bungkul').reply(200, mockResponse);

      const { result } = renderHook(() => useLocations({ search: 'Bungkul' }), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(result.current.data?.data[0].name).toBe('Taman Bungkul');
    });

    it('should fetch locations with rayon_id filter', async () => {
      mockAxios.onGet('/locations?rayon_id=rayon-1').reply(200, mockResponse);

      const { result } = renderHook(() => useLocations({ rayon_id: 'rayon-1' }), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(result.current.data?.data).toHaveLength(1);
    });

    it('should fetch locations with location_type_id filter', async () => {
      mockAxios.onGet('/locations?location_type_id=type-1').reply(200, mockResponse);

      const { result } = renderHook(() => useLocations({ location_type_id: 'type-1' }), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(result.current.data?.data[0].location_type_id).toBe('type-1');
    });

    it('should fetch locations with pagination', async () => {
      mockAxios.onGet('/locations?page=2&limit=20').reply(200, {
        data: [],
        meta: { total: 0, page: 2, limit: 20, totalPages: 0 },
      });

      const { result } = renderHook(() => useLocations({ page: 2, limit: 20 }), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(result.current.data?.meta.page).toBe(2);
      expect(result.current.data?.meta.limit).toBe(20);
    });

    it('returns every location from a full-array response without a limit (no cap)', async () => {
      // Backend returns a plain array (all locations) when page/limit are omitted.
      const barat2Area = { ...mockResponse.data[0], id: '2', name: 'Taman Barat 2', rayon_id: 'rayon-b2' };
      mockAxios.onGet('/locations?').reply(200, [mockResponse.data[0], barat2Area]);

      const { result } = renderHook(() => useLocations({ limit: 1000 }), { wrapper: createWrapper() });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(result.current.data?.data).toHaveLength(2);
      expect(result.current.data?.data.map((a) => a.name)).toContain('Taman Barat 2');
    });

    it('walks every page when the backend caps the list (Rayon Barat 2 regression)', async () => {
      // Regression: 937 areas ordered by id, backend caps limit at 100 → a single
      // request drops Rayon Barat 2 (ids past the first 100). If the "all" call is
      // ever served paginated, the hook must walk all pages and concatenate.
      const pageOne: PaginatedResponse<Location> = {
        data: [{ ...mockResponse.data[0], id: '1', name: 'Pusat Location' }],
        meta: { total: 2, page: 1, limit: 1, totalPages: 2 },
      };
      const pageTwo: PaginatedResponse<Location> = {
        data: [{ ...mockResponse.data[0], id: '2', name: 'Barat 2 Location', rayon_id: 'rayon-b2' }],
        meta: { total: 2, page: 2, limit: 1, totalPages: 2 },
      };
      mockAxios.onGet('/locations?').reply(200, pageOne); // no-page probe → paginated
      mockAxios.onGet('/locations?page=1&limit=1000').reply(200, pageOne);
      mockAxios.onGet('/locations?page=2&limit=1000').reply(200, pageTwo);

      const { result } = renderHook(() => useLocations({ limit: 1000 }), { wrapper: createWrapper() });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(result.current.data?.data).toHaveLength(2);
      expect(result.current.data?.data.map((a) => a.name)).toEqual(['Pusat Location', 'Barat 2 Location']);
    });

    it('should handle fetch error', async () => {
      mockAxios.onGet('/locations?').reply(500, {
        statusCode: 500,
        message: 'Internal server error',
      });

      const { result } = renderHook(() => useLocations(), { wrapper: createWrapper() });

      await waitFor(() => expect(result.current.isError).toBe(true));

      expect(result.current.error).toBeTruthy();
    });
  });

  describe('useLocation', () => {
    const mockArea: Location = {
      id: '1',
      name: 'Taman Bungkul',
      code: 'TB',
      location_type_id: 'type-1',
      locationType: mockLocationType,
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

    it('should fetch single location by ID', async () => {
      mockAxios.onGet('/locations/1').reply(200, mockArea);

      const { result } = renderHook(() => useLocation('1'), { wrapper: createWrapper() });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(result.current.data?.name).toBe('Taman Bungkul');
      expect(result.current.data?.boundary_polygon?.type).toBe('Polygon');
      expect(result.current.data?.coverage_area).toBe(10000);
    });

    it('should handle location not found', async () => {
      mockAxios.onGet('/locations/999').reply(404, {
        statusCode: 404,
        message: 'Location not found',
        error: 'NotFound',
      });

      const { result } = renderHook(() => useLocation('999'), { wrapper: createWrapper() });

      await waitFor(() => expect(result.current.isError).toBe(true));

      expect(result.current.error).toBeTruthy();
    });

    it('should not fetch when id is empty', () => {
      const { result } = renderHook(() => useLocation(''), { wrapper: createWrapper() });

      expect(result.current.isFetching).toBe(false);
      expect(result.current.data).toBeUndefined();
    });
  });

  describe('useCreateLocation', () => {
    it('should create new location', async () => {
      const newArea: CreateLocationDto = {
        name: 'New Park',
        location_type_id: 'type-1',
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

      const createdArea: Location = {
        ...newArea,
        id: '10',
        locationType: mockLocationType,
        gps_lat: -7.2885,
        gps_lng: 112.7395,
        coverage_area: 10000,
        created_at: '2026-02-04T00:00:00Z',
        updated_at: '2026-02-04T00:00:00Z',
      };

      mockAxios.onPost('/locations', newArea).reply(201, createdArea);

      const { result } = renderHook(() => useCreateLocation(), { wrapper: createWrapper() });

      result.current.mutate(newArea);

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(result.current.data?.name).toBe('New Park');
      expect(result.current.data?.id).toBe('10');
    });

    it('should handle validation errors', async () => {
      mockAxios.onPost('/locations').reply(400, {
        statusCode: 400,
        message: 'Validation failed',
        errors: {
          name: 'Name is required',
          boundary_polygon: 'Boundary must have at least 4 points',
        },
      });

      const { result } = renderHook(() => useCreateLocation(), { wrapper: createWrapper() });

      result.current.mutate({} as CreateLocationDto);

      await waitFor(() => expect(result.current.isError).toBe(true));

      expect(result.current.error).toBeTruthy();
    });

    it('should invalidate queries on success', async () => {
      const newArea: CreateLocationDto = {
        name: 'New Park',
        location_type_id: 'type-1',
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
        .onPost('/locations')
        .reply(201, { ...newArea, id: '10', created_at: '2026-02-04', updated_at: '2026-02-04' });

      const { result } = renderHook(() => useCreateLocation(), { wrapper: createWrapper() });

      const invalidateSpy = jest.spyOn(queryClient, 'invalidateQueries');

      result.current.mutate(newArea);

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: locationKeys.lists() });
    });
  });

  describe('useUpdateLocation', () => {
    it('should update existing location', async () => {
      const updateData: UpdateLocationDto = {
        name: 'Updated Park Name',
      };

      const updatedArea: Location = {
        id: '1',
        name: 'Updated Park Name',
        code: 'TB',
        location_type_id: 'type-1',
        locationType: mockLocationType,
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

      mockAxios.onPatch('/locations/1', updateData).reply(200, updatedArea);

      const { result } = renderHook(() => useUpdateLocation(), { wrapper: createWrapper() });

      result.current.mutate({ id: '1', data: updateData });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(result.current.data?.name).toBe('Updated Park Name');
    });

    it('should handle update error', async () => {
      mockAxios.onPatch('/locations/1').reply(404, {
        statusCode: 404,
        message: 'Location not found',
      });

      const { result } = renderHook(() => useUpdateLocation(), { wrapper: createWrapper() });

      result.current.mutate({ id: '1', data: { name: 'New Name' } });

      await waitFor(() => expect(result.current.isError).toBe(true));

      expect(result.current.error).toBeTruthy();
    });

    it('should invalidate queries on success', async () => {
      mockAxios.onPatch('/locations/1').reply(200, { id: '1', name: 'Updated' });

      const { result } = renderHook(() => useUpdateLocation(), { wrapper: createWrapper() });

      const invalidateSpy = jest.spyOn(queryClient, 'invalidateQueries');

      result.current.mutate({ id: '1', data: { name: 'Updated' } });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: locationKeys.detail('1') });
      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: locationKeys.lists() });
    });
  });

  describe('useDeleteLocation', () => {
    it('should delete location', async () => {
      mockAxios.onDelete('/locations/1').reply(204);

      const { result } = renderHook(() => useDeleteLocation(), { wrapper: createWrapper() });

      result.current.mutate('1');

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
    });

    it('should handle delete error', async () => {
      mockAxios.onDelete('/locations/1').reply(404, {
        statusCode: 404,
        message: 'Location not found',
        error: 'NotFound',
      });

      const { result } = renderHook(() => useDeleteLocation(), { wrapper: createWrapper() });

      result.current.mutate('1');

      await waitFor(() => expect(result.current.isError).toBe(true));

      expect(result.current.error).toBeTruthy();
    });

    it('should invalidate queries on success', async () => {
      mockAxios.onDelete('/locations/1').reply(204);

      const { result } = renderHook(() => useDeleteLocation(), { wrapper: createWrapper() });

      const invalidateSpy = jest.spyOn(queryClient, 'invalidateQueries');

      result.current.mutate('1');

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: locationKeys.lists() });
    });
  });
});
