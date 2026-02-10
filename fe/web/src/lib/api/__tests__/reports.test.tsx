/**
 * Unit Tests: Reports API
 * Tests work reports management and review
 */

import MockAdapter from 'axios-mock-adapter';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { apiClient } from '../client';
import {
  reportsKeys,
  useReports,
  useReport,
  useReviewReport,
  type WorkReport,
  type PaginatedReportsResponse,
} from '../reports';
import { ReactNode } from 'react';

describe('Reports API', () => {
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

  const mockReport: WorkReport = {
    id: '1',
    worker_id: 'worker-1',
    shift_id: 'shift-1',
    area_id: 'area-1',
    report_type: 'task_completion',
    description: 'Completed cleaning',
    gps_lat: '-7.2885',
    gps_lng: '112.7395',
    photo_url: 'https://example.com/photo.jpg',
    is_reviewed: false,
    created_at: '2026-02-04T00:00:00Z',
    updated_at: '2026-02-04T00:00:00Z',
    worker: {
      id: 'worker-1',
      username: 'worker1',
      full_name: 'Worker One',
      role: 'worker',
    },
    area: {
      id: 'area-1',
      name: 'Taman Bungkul',
      areaType: {
        code: 'TM',
        name: 'Taman',
      },
    },
    shift: {
      id: 'shift-1',
      clock_in_time: '2026-02-04T06:00:00Z',
      area: {
        id: 'area-1',
        name: 'Taman Bungkul',
        areaType: {
          code: 'TM',
          name: 'Taman',
        },
      },
      worker: {
        id: 'worker-1',
        username: 'worker1',
        full_name: 'Worker One',
        role: 'worker',
      },
    },
  };

  beforeEach(() => {
    mockAxios = new MockAdapter(apiClient);
  });

  afterEach(() => {
    mockAxios.restore();
    queryClient?.clear();
  });

  describe('reportsKeys', () => {
    it('should generate correct query keys', () => {
      expect(reportsKeys.all).toEqual(['reports']);
      expect(reportsKeys.lists()).toEqual(['reports', 'list']);
      expect(reportsKeys.list({ worker_id: 'worker-1' })).toEqual([
        'reports',
        'list',
        { worker_id: 'worker-1' },
      ]);
      expect(reportsKeys.details()).toEqual(['reports', 'detail']);
      expect(reportsKeys.detail('1')).toEqual(['reports', 'detail', '1']);
      expect(reportsKeys.my()).toEqual(['reports', 'my']);
    });
  });

  describe('useReports', () => {
    const mockResponse: PaginatedReportsResponse = {
      data: [mockReport],
      meta: { total: 1, page: 1, limit: 10, totalPages: 1 },
    };

    it('should fetch reports without filters', async () => {
      // Mock returns just the array, hook wraps it in paginated format
      mockAxios.onGet('/reports').reply(200, [mockReport]);

      const { result } = renderHook(() => useReports(), { wrapper: createWrapper() });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(result.current.data?.data).toHaveLength(1);
      expect(result.current.data?.data[0].description).toBe('Completed cleaning');
    });

    it('should fetch reports with filters', async () => {
      mockAxios.onGet('/reports').reply((config) => {
        if (config.params?.worker_id === 'worker-1' && config.params?.report_type === 'task_completion') {
          return [200, [mockReport]];
        }
        return [404, { message: 'Not found' }];
      });

      const { result } = renderHook(
        () => useReports({ worker_id: 'worker-1', report_type: 'task_completion' }),
        { wrapper: createWrapper() }
      );

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(result.current.data?.data[0].worker_id).toBe('worker-1');
    });

    it('should handle fetch error', async () => {
      mockAxios.onGet('/reports').reply(500);

      const { result } = renderHook(() => useReports(), { wrapper: createWrapper() });

      await waitFor(() => expect(result.current.isError).toBe(true));
    });
  });

  describe('useReport', () => {
    it('should fetch single report by ID', async () => {
      mockAxios.onGet('/reports/1').reply(200, mockReport);

      const { result } = renderHook(() => useReport('1'), { wrapper: createWrapper() });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(result.current.data?.description).toBe('Completed cleaning');
      expect(result.current.data?.is_reviewed).toBe(false);
    });

    it('should not fetch when id is empty', () => {
      const { result } = renderHook(() => useReport(''), { wrapper: createWrapper() });

      expect(result.current.isFetching).toBe(false);
    });
  });

  describe('useReviewReport', () => {
    it('should review report', async () => {
      const reviewedReport = { ...mockReport, is_reviewed: true };
      mockAxios.onPatch('/reports/1/review').reply(200, reviewedReport);

      const { result } = renderHook(() => useReviewReport(), { wrapper: createWrapper() });

      result.current.mutate('1');

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(result.current.data?.is_reviewed).toBe(true);
    });

    it('should invalidate queries on success', async () => {
      mockAxios.onPatch('/reports/1/review').reply(200, mockReport);

      const { result } = renderHook(() => useReviewReport(), { wrapper: createWrapper() });

      const invalidateSpy = jest.spyOn(queryClient, 'invalidateQueries');

      result.current.mutate('1');

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: reportsKeys.lists() });
    });
  });
});
