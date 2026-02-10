/**
 * Unit Tests: Tasks API
 * Tests task management operations
 */

import MockAdapter from 'axios-mock-adapter';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { apiClient } from '../client';
import {
  tasksKeys,
  useTasks,
  useTask,
  useCreateTask,
  useUpdateTask,
  useDeleteTask,
  useAcceptTask,
  useCompleteTask,
  type Task,
  type TaskFilters,
  type CreateTaskDto,
} from '../tasks';
import { PaginatedResponse } from '@/types/models';
import { ReactNode } from 'react';

describe('Tasks API', () => {
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

  const mockTask: Task = {
    id: '1',
    title: 'Clean Park',
    description: 'Clean the entire park area',
    assigned_to: {
      id: 'worker-1',
      full_name: 'Worker One',
    },
    assigned_by: {
      id: 'admin-1',
      full_name: 'Admin User',
    },
    area: {
      id: 'area-1',
      name: 'Taman Bungkul',
    },
    activity_type: {
      id: 'activity-1',
      name: 'Cleaning',
      code: 'CLN',
    },
    priority: 'high',
    status: 'pending',
    due_date: '2026-02-10',
    created_at: '2026-02-04T00:00:00Z',
    updated_at: '2026-02-04T00:00:00Z',
  };

  beforeEach(() => {
    mockAxios = new MockAdapter(apiClient);
  });

  afterEach(() => {
    mockAxios.restore();
    queryClient?.clear();
  });

  describe('tasksKeys', () => {
    it('should generate correct query keys', () => {
      expect(tasksKeys.all).toEqual(['tasks']);
      expect(tasksKeys.lists()).toEqual(['tasks', 'list']);
      expect(tasksKeys.list({ status: 'pending' })).toEqual(['tasks', 'list', { status: 'pending' }]);
      expect(tasksKeys.details()).toEqual(['tasks', 'detail']);
      expect(tasksKeys.detail('1')).toEqual(['tasks', 'detail', '1']);
      expect(tasksKeys.my()).toEqual(['tasks', 'my']);
    });
  });

  describe('useTasks', () => {
    const mockResponse: PaginatedResponse<Task> = {
      data: [mockTask],
      meta: { total: 1, page: 1, limit: 10, totalPages: 1 },
    };

    it('should fetch tasks without filters', async () => {
      mockAxios.onGet('/tasks').reply(200, mockResponse);

      const { result } = renderHook(() => useTasks(), { wrapper: createWrapper() });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(result.current.data?.data).toHaveLength(1);
      expect(result.current.data?.data[0].title).toBe('Clean Park');
    });

    it('should fetch tasks with filters', async () => {
      mockAxios.onGet('/tasks').reply((config) => {
        if (config.params?.status === 'pending' && config.params?.priority === 'high') {
          return [200, mockResponse];
        }
        return [404, { message: 'Not found' }];
      });

      const { result } = renderHook(() => useTasks({ status: 'pending', priority: 'high' }), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(result.current.data?.data[0].status).toBe('pending');
      expect(result.current.data?.data[0].priority).toBe('high');
    });

    it('should handle fetch error', async () => {
      mockAxios.onGet('/tasks').reply(500);

      const { result } = renderHook(() => useTasks(), { wrapper: createWrapper() });

      await waitFor(() => expect(result.current.isError).toBe(true));
    });
  });

  describe('useTask', () => {
    it('should fetch single task by ID', async () => {
      mockAxios.onGet('/tasks/1').reply(200, mockTask);

      const { result } = renderHook(() => useTask('1'), { wrapper: createWrapper() });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(result.current.data?.title).toBe('Clean Park');
      expect(result.current.data?.status).toBe('pending');
    });

    it('should not fetch when id is empty', () => {
      const { result } = renderHook(() => useTask(''), { wrapper: createWrapper() });

      expect(result.current.isFetching).toBe(false);
    });
  });

  describe('useCreateTask', () => {
    it('should create new task', async () => {
      const newTask: CreateTaskDto = {
        title: 'New Task',
        description: 'Task description',
        area_id: 'area-1',
        activity_type_id: 'activity-1',
        priority: 'normal',
        due_date: '2026-02-15',
      };

      mockAxios.onPost('/tasks', newTask).reply(201, { ...mockTask, id: '2', title: 'New Task', status: 'pending' });

      const { result } = renderHook(() => useCreateTask(), { wrapper: createWrapper() });

      result.current.mutate(newTask);

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
    });

    it('should invalidate queries on success', async () => {
      const newTask: CreateTaskDto = {
        title: 'New Task',
        description: 'Task description',
        area_id: 'area-1',
        activity_type_id: 'activity-1',
        priority: 'normal',
        due_date: '2026-02-15',
      };

      mockAxios.onPost('/tasks').reply(201, { ...mockTask, id: '2' });

      const { result } = renderHook(() => useCreateTask(), { wrapper: createWrapper() });

      const invalidateSpy = jest.spyOn(queryClient, 'invalidateQueries');

      result.current.mutate(newTask);

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: tasksKeys.lists() });
    });
  });

  describe('useUpdateTask', () => {
    it('should update task', async () => {
      mockAxios.onPatch('/tasks/1').reply(200, { ...mockTask, status: 'in_progress' });

      const { result } = renderHook(() => useUpdateTask('1'), { wrapper: createWrapper() });

      result.current.mutate({ status: 'in_progress' });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
    });
  });

  describe('useDeleteTask', () => {
    it('should delete task', async () => {
      mockAxios.onDelete('/tasks/1').reply(204);

      const { result } = renderHook(() => useDeleteTask(), { wrapper: createWrapper() });

      result.current.mutate('1');

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
    });
  });

  describe('useAcceptTask', () => {
    it('should accept task', async () => {
      mockAxios.onPost('/tasks/1/accept').reply(200, { ...mockTask, status: 'accepted' });

      const { result } = renderHook(() => useAcceptTask(), { wrapper: createWrapper() });

      result.current.mutate('1');

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
    });

    it('should invalidate queries on success', async () => {
      mockAxios.onPost('/tasks/1/accept').reply(200, mockTask);

      const { result } = renderHook(() => useAcceptTask(), { wrapper: createWrapper() });

      const invalidateSpy = jest.spyOn(queryClient, 'invalidateQueries');

      result.current.mutate('1');

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      // Check that invalidateQueries was called with queryKeys containing tasks
      expect(invalidateSpy).toHaveBeenCalled();
      const calls = invalidateSpy.mock.calls;
      const callsWithTasksKey = calls.filter(call =>
        call[0]?.queryKey?.[0] === 'tasks'
      );
      expect(callsWithTasksKey.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('useCompleteTask', () => {
    it('should complete task', async () => {
      mockAxios.onPost('/tasks/1/complete').reply(200, { ...mockTask, status: 'completed' });

      const { result } = renderHook(() => useCompleteTask(), { wrapper: createWrapper() });

      result.current.mutate({ taskId: '1' });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
    });

    it('should invalidate queries on success', async () => {
      mockAxios.onPost('/tasks/1/complete').reply(200, mockTask);

      const { result } = renderHook(() => useCompleteTask(), { wrapper: createWrapper() });

      const invalidateSpy = jest.spyOn(queryClient, 'invalidateQueries');

      result.current.mutate({ taskId: '1' });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      // Check that invalidateQueries was called with queryKeys containing tasks
      expect(invalidateSpy).toHaveBeenCalled();
      const calls = invalidateSpy.mock.calls;
      const callsWithTasksKey = calls.filter(call =>
        call[0]?.queryKey?.[0] === 'tasks'
      );
      expect(callsWithTasksKey.length).toBeGreaterThanOrEqual(1);
    });
  });
});
