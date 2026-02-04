/**
 * Unit Tests: Schedules API
 * Tests worker schedule management
 */

import MockAdapter from 'axios-mock-adapter';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { apiClient } from '../client';
import {
  scheduleKeys,
  useSchedules,
  useSchedule,
  useCreateSchedule,
  useUpdateSchedule,
  useDeleteSchedule,
} from '../schedules';
import { WorkerSchedule, PaginatedResponse, CreateScheduleDto } from '@/types/models';
import { ReactNode } from 'react';

describe('Schedules API', () => {
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

  const mockSchedule: WorkerSchedule = {
    id: '1',
    worker_id: 'worker-1',
    area_id: 'area-1',
    shift_definition_id: 'shift-1',
    date: '2026-02-04',
    status: 'scheduled',
    created_at: '2026-02-04T00:00:00Z',
    worker: {
      id: 'worker-1',
      username: 'worker1',
      full_name: 'Worker One',
    },
    area: {
      id: 'area-1',
      name: 'Taman Bungkul',
    },
    shift_definition: {
      id: 'shift-1',
      name: 'Pagi',
      start_time: '06:00',
      end_time: '14:00',
    },
  };

  beforeEach(() => {
    mockAxios = new MockAdapter(apiClient);
  });

  afterEach(() => {
    mockAxios.restore();
    queryClient?.clear();
  });

  describe('scheduleKeys', () => {
    it('should generate correct query keys', () => {
      expect(scheduleKeys.all).toEqual(['schedules']);
      expect(scheduleKeys.lists()).toEqual(['schedules', 'list']);
      expect(scheduleKeys.list({ worker_id: 'worker-1' })).toEqual([
        'schedules',
        'list',
        { worker_id: 'worker-1' },
      ]);
      expect(scheduleKeys.details()).toEqual(['schedules', 'detail']);
      expect(scheduleKeys.detail('1')).toEqual(['schedules', 'detail', '1']);
    });
  });

  describe('useSchedules', () => {
    const mockResponse: PaginatedResponse<WorkerSchedule> = {
      data: [mockSchedule],
      meta: { total: 1, page: 1, limit: 10, totalPages: 1 },
    };

    it('should fetch schedules without filters', async () => {
      mockAxios.onGet('/schedules').reply(200, mockResponse);

      const { result} = renderHook(() => useSchedules(), { wrapper: createWrapper() });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(result.current.data?.data).toHaveLength(1);
      expect(result.current.data?.data[0].status).toBe('scheduled');
    });

    it('should fetch schedules with filters', async () => {
      // Mock with params matcher instead of query string
      mockAxios.onGet('/schedules').reply((config) => {
        if (config.params?.worker_id === 'worker-1' && config.params?.date === '2026-02-04') {
          return [200, mockResponse];
        }
        return [404, { message: 'Not found' }];
      });

      const { result } = renderHook(
        () => useSchedules({ worker_id: 'worker-1', date: '2026-02-04' }),
        { wrapper: createWrapper() }
      );

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(result.current.data?.data[0].worker_id).toBe('worker-1');
    });

    it('should handle fetch error', async () => {
      mockAxios.onGet('/schedules?').reply(500);

      const { result } = renderHook(() => useSchedules(), { wrapper: createWrapper() });

      await waitFor(() => expect(result.current.isError).toBe(true));
    });
  });

  describe('useSchedule', () => {
    it('should fetch single schedule by ID', async () => {
      mockAxios.onGet('/schedules/1').reply(200, mockSchedule);

      const { result } = renderHook(() => useSchedule('1'), { wrapper: createWrapper() });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(result.current.data?.status).toBe('scheduled');
      expect(result.current.data?.date).toBe('2026-02-04');
    });

    it('should not fetch when id is empty', () => {
      const { result } = renderHook(() => useSchedule(''), { wrapper: createWrapper() });

      expect(result.current.isFetching).toBe(false);
    });
  });

  describe('useCreateSchedule', () => {
    it('should create new schedule', async () => {
      const newSchedule: CreateScheduleDto = {
        worker_id: 'worker-1',
        area_id: 'area-1',
        shift_definition_id: 'shift-1',
        date: '2026-02-05',
      };

      mockAxios.onPost('/schedules', newSchedule).reply(201, { ...newSchedule, id: '2', status: 'scheduled' });

      const { result } = renderHook(() => useCreateSchedule(), { wrapper: createWrapper() });

      result.current.mutate(newSchedule);

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
    });

    it('should invalidate queries on success', async () => {
      const newSchedule: CreateScheduleDto = {
        worker_id: 'worker-1',
        area_id: 'area-1',
        shift_definition_id: 'shift-1',
        date: '2026-02-05',
      };

      mockAxios.onPost('/schedules').reply(201, { ...newSchedule, id: '2' });

      const { result } = renderHook(() => useCreateSchedule(), { wrapper: createWrapper() });

      const invalidateSpy = jest.spyOn(queryClient, 'invalidateQueries');

      result.current.mutate(newSchedule);

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: scheduleKeys.lists() });
    });
  });

  describe('useUpdateSchedule', () => {
    it('should update schedule', async () => {
      mockAxios.onPatch('/schedules/1').reply(200, { ...mockSchedule, status: 'completed' });

      const { result } = renderHook(() => useUpdateSchedule('1'), { wrapper: createWrapper() });

      result.current.mutate({ status: 'completed' });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
    });
  });

  describe('useDeleteSchedule', () => {
    it('should delete schedule', async () => {
      mockAxios.onDelete('/schedules/1').reply(204);

      const { result } = renderHook(() => useDeleteSchedule(), { wrapper: createWrapper() });

      result.current.mutate('1');

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
    });

    it('should invalidate queries on success', async () => {
      mockAxios.onDelete('/schedules/1').reply(204);

      const { result } = renderHook(() => useDeleteSchedule(), { wrapper: createWrapper() });

      const invalidateSpy = jest.spyOn(queryClient, 'invalidateQueries');

      result.current.mutate('1');

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: scheduleKeys.lists() });
    });
  });
});
