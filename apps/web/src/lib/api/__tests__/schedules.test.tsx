/**
 * Unit Tests: Daily Schedules API
 * Tests operational daily roster management
 */

import MockAdapter from 'axios-mock-adapter';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { apiClient } from '../client';
import {
  dailyScheduleKeys,
  useDailyRoster,
  useMyRoster,
  useGenerateRoster,
  useSetLeave,
  useReplaceWorker,
  useUpdateRosterAreas,
  useUpdateRosterShift,
  type Schedule,
} from '../schedules';
import { ReactNode } from 'react';

describe('Daily Schedules API', () => {
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

  const mockSchedule: Schedule = {
    id: 'daily-1',
    user_id: 'user-1',
    schedule_date: '2026-02-04',
    rayon_id: 'rayon-1',
    shift_definition_id: 'shift-1',
    status: 'planned',
    replacement_user_id: null,
    original_user_id: null,
    source: 'template',
    is_overtime: false,
    notes: null,
    user: {
      id: 'user-1',
      full_name: 'John Doe',
      username: 'johndoe',
      role: 'satgas',
    },
    shift_definition: {
      id: 'shift-1',
      name: 'Pagi',
      start_time: '06:00',
      end_time: '14:00',
    },
    replacement_user: null,
    schedule_areas: [
      {
        id: 'area-1',
        location_id: 'area-1',
        location: {
          id: 'area-1',
          name: 'Taman Bungkul',
          code: 'TB',
        },
      },
    ],
  };

  beforeEach(() => {
    mockAxios = new MockAdapter(apiClient);
  });

  afterEach(() => {
    mockAxios.reset();
  });

  describe('Query Keys', () => {
    it('should generate correct query keys', () => {
      expect(dailyScheduleKeys.all).toEqual(['schedules']);
      expect(dailyScheduleKeys.lists()).toEqual(['schedules', 'list']);
      expect(dailyScheduleKeys.byDate('2026-02-04')).toEqual([
        'schedules',
        'list',
        { date: '2026-02-04', rayonId: undefined },
      ]);
      expect(dailyScheduleKeys.myRoster('2026-02-04')).toEqual([
        'schedules',
        'my',
        '2026-02-04',
      ]);
    });
  });

  describe('useDailyRoster', () => {
    it('should fetch daily schedules for a date', async () => {
      const date = '2026-02-04';
      mockAxios.onGet(`/schedules/date/${date}?rayonId=`).reply(200, [mockSchedule]);

      const { result } = renderHook(() => useDailyRoster(date), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.data).toEqual([mockSchedule]);
    });

    it('should fetch daily schedules filtered by rayon', async () => {
      const date = '2026-02-04';
      const rayonId = 'rayon-1';
      mockAxios
        .onGet(`/schedules/date/${date}?rayonId=${rayonId}`)
        .reply(200, [mockSchedule]);

      const { result } = renderHook(() => useDailyRoster(date, rayonId), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.data).toEqual([mockSchedule]);
    });

    it('should handle empty roster', async () => {
      const date = '2026-02-04';
      mockAxios.onGet(`/schedules/date/${date}?rayonId=`).reply(200, []);

      const { result } = renderHook(() => useDailyRoster(date), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.data).toEqual([]);
    });

    it('should be disabled when date is empty', () => {
      const { result } = renderHook(() => useDailyRoster(''), {
        wrapper: createWrapper(),
      });

      expect(result.current.isLoading).toBe(false);
    });
  });

  describe('useMyRoster', () => {
    it('should fetch current user roster', async () => {
      mockAxios.onGet('/schedules/my?').reply(200, mockSchedule);

      const { result } = renderHook(() => useMyRoster(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.data).toEqual(mockSchedule);
    });

    it('should fetch user roster for specific date', async () => {
      mockAxios
        .onGet('/schedules/my?date=2026-02-04')
        .reply(200, mockSchedule);

      const { result } = renderHook(() => useMyRoster('2026-02-04'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.data).toEqual(mockSchedule);
    });

    it('should handle null roster', async () => {
      mockAxios.onGet('/schedules/my?').reply(200, null);

      const { result } = renderHook(() => useMyRoster(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.data).toBeNull();
    });
  });

  describe('useGenerateRoster', () => {
    it('should generate roster for a date', async () => {
      mockAxios.onPost('/schedules/generate').reply(200, { generated: 10 });

      const { result } = renderHook(() => useGenerateRoster(), {
        wrapper: createWrapper(),
      });

      result.current.mutate('2026-02-04');

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual({ generated: 10 });
    });

    it('should handle generation errors', async () => {
      mockAxios.onPost('/schedules/generate').reply(400, { error: 'Bad request' });

      const { result } = renderHook(() => useGenerateRoster(), {
        wrapper: createWrapper(),
      });

      result.current.mutate('2026-02-04');

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });
    });
  });

  describe('useSetLeave', () => {
    it('should set leave on roster entry', async () => {
      const updatedSchedule: Schedule = {
        ...mockSchedule,
        status: 'leave_sick',
        notes: 'Sakit flu',
      };
      mockAxios.onPatch(`/schedules/daily-1/leave`).reply(200, updatedSchedule);

      const { result } = renderHook(() => useSetLeave(), {
        wrapper: createWrapper(),
      });

      result.current.mutate({
        id: 'daily-1',
        leave_type: 'sick',
        notes: 'Sakit flu',
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(updatedSchedule);
    });

    it('should support annual leave', async () => {
      const updatedSchedule: Schedule = {
        ...mockSchedule,
        status: 'leave_annual',
      };
      mockAxios.onPatch(`/schedules/daily-1/leave`).reply(200, updatedSchedule);

      const { result } = renderHook(() => useSetLeave(), {
        wrapper: createWrapper(),
      });

      result.current.mutate({
        id: 'daily-1',
        leave_type: 'annual',
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data?.status).toBe('leave_annual');
    });
  });

  describe('useReplaceWorker', () => {
    it('should replace worker on roster entry', async () => {
      const replacement = { id: 'user-2', full_name: 'Jane Doe', username: 'janedoe' };
      const updatedSchedule: Schedule = {
        ...mockSchedule,
        status: 'replaced',
        replacement_user: replacement,
        replacement_user_id: 'user-2',
      };
      mockAxios.onPatch(`/schedules/daily-1/replace`).reply(200, updatedSchedule);

      const { result } = renderHook(() => useReplaceWorker(), {
        wrapper: createWrapper(),
      });

      result.current.mutate({
        id: 'daily-1',
        replacement_user_id: 'user-2',
        notes: 'Sakit mendadak',
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data?.replacement_user?.id).toBe('user-2');
    });
  });

  describe('useUpdateRosterAreas', () => {
    it('should update areas on roster entry', async () => {
      const area2 = {
        id: 'area-2',
        location_id: 'area-2',
        location: { id: 'area-2', name: 'Taman Mundu', code: 'TM' },
      };
      const updatedSchedule: Schedule = {
        ...mockSchedule,
        schedule_areas: [
          mockSchedule.schedule_areas[0],
          area2,
        ],
      };
      mockAxios.onPatch(`/schedules/daily-1/areas`).reply(200, updatedSchedule);

      const { result } = renderHook(() => useUpdateRosterAreas(), {
        wrapper: createWrapper(),
      });

      result.current.mutate({
        id: 'daily-1',
        location_ids: ['area-1', 'area-2'],
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data?.schedule_areas).toHaveLength(2);
    });
  });

  describe('useUpdateRosterShift', () => {
    it('should update shift on roster entry', async () => {
      const newShift = {
        id: 'shift-2',
        name: 'Sore',
        start_time: '14:00',
        end_time: '22:00',
      };
      const updatedSchedule: Schedule = {
        ...mockSchedule,
        shift_definition_id: 'shift-2',
        shift_definition: newShift,
      };
      mockAxios.onPatch(`/schedules/daily-1/shift`).reply(200, updatedSchedule);

      const { result } = renderHook(() => useUpdateRosterShift(), {
        wrapper: createWrapper(),
      });

      result.current.mutate({
        id: 'daily-1',
        shift_definition_id: 'shift-2',
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data?.shift_definition?.id).toBe('shift-2');
    });

    it('should support null shift (no shift)', async () => {
      const updatedSchedule: Schedule = {
        ...mockSchedule,
        shift_definition_id: null,
        shift_definition: null,
      };
      mockAxios.onPatch(`/schedules/daily-1/shift`).reply(200, updatedSchedule);

      const { result } = renderHook(() => useUpdateRosterShift(), {
        wrapper: createWrapper(),
      });

      result.current.mutate({
        id: 'daily-1',
        shift_definition_id: null,
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data?.shift_definition).toBeNull();
    });
  });
});
