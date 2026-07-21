/**
 * Unit Tests: Activities API
 * Tests activity fetching operations with Phase 2C schema
 */

import MockAdapter from 'axios-mock-adapter';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { apiClient } from '../client';
import { useActivities, useActivity, useDeleteActivity } from '../activities';
import type { PaginatedResponse, Activity, ActivityFilters } from '@/types/models';
import { ReactNode } from 'react';

describe('Activities API', () => {
  let mock: MockAdapter;

  beforeEach(() => {
    mock = new MockAdapter(apiClient);
  });

  afterEach(() => {
    mock.restore();
  });

  const mockActivity: Activity = {
    id: 'activity-1',
    user_id: 'user-1',
    user: {
      id: 'user-1',
      username: 'satgas1',
      full_name: 'Satgas One',
      role: 'satgas',
    },
    shift_id: 'shift-1',
    location_id: 'area-1',
    area: {
      id: 'area-1',
      name: 'Taman Bungkul',
    },
    activity_type_id: 'type-1',
    activity_type: {
      id: 'type-1',
      code: 'SWEEPING',
      name: 'Penyapuan',
    },
    description: 'Penyapuan area taman',
    photo_urls: ['photo1.jpg', 'photo2.jpg'],
    gps_lat: -7.289383,
    gps_lng: 112.742308,
    status: 'pending',
    created_at: '2026-02-16T08:00:00Z',
  };

  describe('GET /activities', () => {
    it('should fetch activities list without filters', async () => {
      const mockResponse: PaginatedResponse<Activity> = {
        data: [mockActivity],
        meta: {
          total: 1,
          page: 1,
          limit: 10,
          totalPages: 1,
        },
      };

      mock.onGet('/activities').reply(200, mockResponse);

      const response = await apiClient.get<PaginatedResponse<Activity>>('/activities');

      expect(response.data.data).toHaveLength(1);
      expect(response.data.data[0].description).toBe('Penyapuan area taman');
      expect(response.data.data[0].user?.role).toBe('satgas');
    });

    it('should fetch activities with activity type filter', async () => {
      const filters: ActivityFilters = { activity_type_id: 'type-1' };
      const mockResponse: PaginatedResponse<Activity> = {
        data: [mockActivity],
        meta: { total: 1, page: 1, limit: 10, totalPages: 1 },
      };

      mock.onGet('/activities', { params: filters }).reply(200, mockResponse);

      const response = await apiClient.get<PaginatedResponse<Activity>>('/activities', {
        params: filters,
      });

      expect(response.data.data).toHaveLength(1);
      expect(response.data.data[0].activity_type?.code).toBe('SWEEPING');
    });

    it('should fetch activities with area filter', async () => {
      const filters: ActivityFilters = { location_id: 'area-1' };

      mock.onGet('/activities', { params: filters }).reply(200, {
        data: [mockActivity],
        meta: { total: 1, page: 1, limit: 10, totalPages: 1 },
      });

      const response = await apiClient.get('/activities', { params: filters });

      expect(response.data.data).toHaveLength(1);
      expect(response.data.data[0].area?.name).toBe('Taman Bungkul');
    });

    it('should fetch activities with date range filter', async () => {
      const filters: ActivityFilters = {
        from_date: '2026-02-15',
        to_date: '2026-02-17',
      };

      mock.onGet('/activities', { params: filters }).reply(200, {
        data: [mockActivity],
        meta: { total: 1, page: 1, limit: 10, totalPages: 1 },
      });

      const response = await apiClient.get('/activities', { params: filters });

      expect(response.status).toBe(200);
      expect(response.data.data).toHaveLength(1);
    });

    it('should fetch activities with pagination', async () => {
      const filters: ActivityFilters = { page: 2, limit: 20 };

      mock.onGet('/activities', { params: filters }).reply(200, {
        data: [],
        meta: { total: 15, page: 2, limit: 20, totalPages: 1 },
      });

      const response = await apiClient.get('/activities', { params: filters });

      expect(response.data.meta.page).toBe(2);
      expect(response.data.meta.limit).toBe(20);
    });

    it('should handle empty activities list', async () => {
      mock.onGet('/activities').reply(200, {
        data: [],
        meta: { total: 0, page: 1, limit: 10, totalPages: 0 },
      });

      const response = await apiClient.get<PaginatedResponse<Activity>>('/activities');

      expect(response.data.data).toHaveLength(0);
      expect(response.data.meta.total).toBe(0);
    });
  });

  describe('GET /activities/:id', () => {
    it('should fetch single activity by ID', async () => {
      mock.onGet('/activities/activity-1').reply(200, mockActivity);

      const response = await apiClient.get<Activity>('/activities/activity-1');

      expect(response.data.id).toBe('activity-1');
      expect(response.data.description).toBe('Penyapuan area taman');
      expect(response.data.photo_urls).toHaveLength(2);
      expect(response.data.gps_lat).toBe(-7.289383);
    });

    it('should handle activity not found', async () => {
      mock.onGet('/activities/nonexistent').reply(404, {
        statusCode: 404,
        message: 'Activity not found',
        error: 'NotFound',
      });

      await expect(apiClient.get('/activities/nonexistent')).rejects.toThrow();
    });
  });

  describe('DELETE /activities/:id', () => {
    it('should delete activity successfully', async () => {
      mock.onDelete('/activities/activity-1').reply(204);

      const response = await apiClient.delete('/activities/activity-1');

      expect(response.status).toBe(204);
    });

    it('should handle delete error (forbidden)', async () => {
      mock.onDelete('/activities/activity-1').reply(403, {
        statusCode: 403,
        message: 'Cannot delete activity from completed shift',
        error: 'Forbidden',
      });

      await expect(apiClient.delete('/activities/activity-1')).rejects.toThrow();
    });
  });

  describe('Error Handling', () => {
    it('should handle server error', async () => {
      mock.onGet('/activities').reply(500, {
        statusCode: 500,
        message: 'Internal server error',
        error: 'InternalServerError',
      });

      await expect(apiClient.get('/activities')).rejects.toThrow();
    });

    it('should handle network error', async () => {
      mock.onGet('/activities').networkError();

      await expect(apiClient.get('/activities')).rejects.toThrow();
    });
  });
});

/**
 * React Query Hook Tests
 * Tests TanStack Query hooks for activities API
 */
describe('Activities API Hooks', () => {
  let mock: MockAdapter;

  const createWrapper = () => {
    const queryClient = new QueryClient({
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
    mock = new MockAdapter(apiClient);
  });

  afterEach(() => {
    mock.restore();
  });

  const mockActivity: Activity = {
    id: 'activity-1',
    user_id: 'user-1',
    user: {
      id: 'user-1',
      username: 'satgas1',
      full_name: 'Satgas One',
      role: 'satgas',
    },
    shift_id: 'shift-1',
    location_id: 'area-1',
    area: {
      id: 'area-1',
      name: 'Taman Bungkul',
    },
    activity_type_id: 'type-1',
    activity_type: {
      id: 'type-1',
      code: 'SWEEPING',
      name: 'Penyapuan',
    },
    description: 'Penyapuan area taman',
    photo_urls: ['photo1.jpg', 'photo2.jpg'],
    gps_lat: -7.289383,
    gps_lng: 112.742308,
    status: 'pending',
    created_at: '2026-02-16T08:00:00Z',
  };

  describe('useActivities', () => {
    it('should fetch activities list', async () => {
      const mockResponse: PaginatedResponse<Activity> = {
        data: [mockActivity],
        meta: {
          total: 1,
          page: 1,
          limit: 10,
          totalPages: 1,
        },
      };

      mock.onGet('/activities').reply(200, mockResponse);

      const { result } = renderHook(() => useActivities(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(result.current.data?.data).toHaveLength(1);
      expect(result.current.data?.data[0].description).toBe('Penyapuan area taman');
    });

    it('should apply filters', async () => {
      const mockResponse: PaginatedResponse<Activity> = {
        data: [mockActivity],
        meta: { total: 1, page: 1, limit: 10, totalPages: 1 },
      };

      mock.onGet('/activities').reply(200, mockResponse);

      const { result } = renderHook(
        () =>
          useActivities({
            activity_type_id: 'type-1',
            location_id: 'area-1',
          }),
        { wrapper: createWrapper() }
      );

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(result.current.data?.data).toHaveLength(1);
    });

    it('should handle pagination', async () => {
      const mockResponse: PaginatedResponse<Activity> = {
        data: [],
        meta: { total: 50, page: 2, limit: 10, totalPages: 5 },
      };

      mock.onGet('/activities').reply(200, mockResponse);

      const { result } = renderHook(() => useActivities({ page: 2, limit: 10 }), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(result.current.data?.meta.page).toBe(2);
      expect(result.current.data?.meta.limit).toBe(10);
    });
  });

  describe('useActivity', () => {
    it('should fetch single activity', async () => {
      mock.onGet('/activities/activity-1').reply(200, mockActivity);

      const { result } = renderHook(() => useActivity('activity-1'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(result.current.data?.id).toBe('activity-1');
      expect(result.current.data?.description).toBe('Penyapuan area taman');
    });

    it('should not fetch when id is empty', () => {
      const { result } = renderHook(() => useActivity(''), {
        wrapper: createWrapper(),
      });

      expect(result.current.isLoading).toBe(false);
      expect(result.current.data).toBeUndefined();
    });
  });

  describe('useDeleteActivity', () => {
    it('should have mutation function', () => {
      const { result } = renderHook(() => useDeleteActivity(), {
        wrapper: createWrapper(),
      });

      expect(result.current.mutate).toBeDefined();
      expect(typeof result.current.mutate).toBe('function');
    });
  });
});
