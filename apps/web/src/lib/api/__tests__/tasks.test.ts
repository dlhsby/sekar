/**
 * Unit Tests: Tasks API
 * Tests task CRUD operations and workflow state transitions
 */

import MockAdapter from 'axios-mock-adapter';
import { apiClient } from '../client';
import type { PaginatedResponse } from '@/types/models';
import type { Task, TaskStatus } from '../tasks';

describe('Tasks API', () => {
  let mockAxios: MockAdapter;

  beforeEach(() => {
    mockAxios = new MockAdapter(apiClient);
  });

  afterEach(() => {
    mockAxios.restore();
  });

  const mockTask: Task = {
    id: '1',
    title: 'Cleanup Taman Bungkul',
    description: 'Remove trash and maintain plants',
    status: 'pending',
    priority: 'high',
    district_id: 'district-1',
    area_id: 'area-1',
    created_by: 'user-1',
    created_at: '2026-02-04T00:00:00Z',
    updated_at: '2026-02-04T00:00:00Z',
  };

  describe('GET /tasks', () => {
    it('should fetch tasks list', async () => {
      const mockResponse: PaginatedResponse<Task> = {
        data: [mockTask],
        meta: {
          total: 1,
          page: 1,
          limit: 10,
          totalPages: 1,
        },
      };

      mockAxios.onGet(/\/tasks/).reply(200, mockResponse);

      const response = await apiClient.get<PaginatedResponse<Task>>('/tasks');

      expect(response.data.data).toHaveLength(1);
      expect(response.data.data[0].title).toBe('Cleanup Taman Bungkul');
    });

    it('should fetch tasks with status filter', async () => {
      mockAxios.onGet(/\/tasks\?status=in_progress/).reply(200, {
        data: [],
        meta: { total: 0, page: 1, limit: 10, totalPages: 0 },
      });

      const response = await apiClient.get('/tasks?status=in_progress');

      expect(response.status).toBe(200);
    });

    it('should fetch tasks with area filter', async () => {
      mockAxios.onGet(/\/tasks\?area_id=area-1/).reply(200, {
        data: [mockTask],
        meta: { total: 1, page: 1, limit: 10, totalPages: 1 },
      });

      const response = await apiClient.get('/tasks?area_id=area-1');

      expect(response.data.data).toHaveLength(1);
    });
  });

  describe('GET /tasks/:id', () => {
    it('should fetch single task by ID', async () => {
      mockAxios.onGet('/tasks/1').reply(200, mockTask);

      const response = await apiClient.get<Task>('/tasks/1');

      expect(response.data.title).toBe('Cleanup Taman Bungkul');
      expect(response.data.status).toBe('pending');
    });

    it('should handle task not found', async () => {
      mockAxios.onGet('/tasks/999').reply(404, {
        statusCode: 404,
        message: 'Task not found',
        error: 'NotFound',
      });

      await expect(apiClient.get('/tasks/999')).rejects.toThrow();
    });
  });

  describe('POST /tasks', () => {
    it('should create new task', async () => {
      const newTask = {
        title: 'New Task',
        description: 'Description',
        priority: 'medium' as const,
        district_id: 'district-1',
        area_id: 'area-1',
      };

      mockAxios.onPost('/tasks', newTask).reply(201, {
        ...newTask,
        id: '10',
        status: 'pending',
        created_by_id: 'user-1',
        created_at: '2026-02-04T00:00:00Z',
        updated_at: '2026-02-04T00:00:00Z',
      });

      const response = await apiClient.post('/tasks', newTask);

      expect(response.status).toBe(201);
      expect(response.data.title).toBe('New Task');
    });

    it('should handle validation errors', async () => {
      mockAxios.onPost('/tasks').reply(400, {
        statusCode: 400,
        message: 'Validation failed',
        errors: {
          title: 'Title is required',
          district_id: 'Rayon ID is required',
        },
      });

      await expect(apiClient.post('/tasks', {})).rejects.toThrow();
    });
  });

  describe('PATCH /tasks/:id', () => {
    it('should update task', async () => {
      const updateData = {
        title: 'Updated Task Title',
        status: 'in_progress' as TaskStatus,
      };

      mockAxios.onPatch('/tasks/1', updateData).reply(200, {
        ...mockTask,
        ...updateData,
      });

      const response = await apiClient.patch('/tasks/1', updateData);

      expect(response.data.title).toBe('Updated Task Title');
      expect(response.data.status).toBe('in_progress');
    });
  });

  describe('DELETE /tasks/:id', () => {
    it('should delete task', async () => {
      mockAxios.onDelete('/tasks/1').reply(204);

      const response = await apiClient.delete('/tasks/1');

      expect(response.status).toBe(204);
    });

    it('should handle delete error', async () => {
      mockAxios.onDelete('/tasks/1').reply(403, {
        statusCode: 403,
        message: 'Cannot delete assigned task',
        error: 'Forbidden',
      });

      await expect(apiClient.delete('/tasks/1')).rejects.toThrow();
    });
  });

  describe('POST /tasks/:id/assign', () => {
    it('should assign task to workers', async () => {
      const assignData = {
        worker_ids: ['worker-1', 'worker-2'],
      };

      mockAxios.onPost('/tasks/1/assign', assignData).reply(200, {
        ...mockTask,
        status: 'assigned',
        assigned_workers: [
          { id: 'worker-1', username: 'worker1', full_name: 'Worker One', role: 'worker' },
          { id: 'worker-2', username: 'worker2', full_name: 'Worker Two', role: 'worker' },
        ],
      });

      const response = await apiClient.post('/tasks/1/assign', assignData);

      expect(response.data.status).toBe('assigned');
      expect(response.data.assigned_workers).toHaveLength(2);
    });
  });

  describe('POST /tasks/:id/start', () => {
    it('should start task', async () => {
      mockAxios.onPost('/tasks/1/start').reply(200, {
        ...mockTask,
        status: 'in_progress',
        started_at: '2026-02-04T08:00:00Z',
      });

      const response = await apiClient.post('/tasks/1/start');

      expect(response.data.status).toBe('in_progress');
      expect(response.data.started_at).toBeDefined();
    });
  });

  describe('POST /tasks/:id/complete', () => {
    it('should complete task', async () => {
      mockAxios.onPost('/tasks/1/complete').reply(200, {
        ...mockTask,
        status: 'completed',
        completed_at: '2026-02-04T10:00:00Z',
      });

      const response = await apiClient.post('/tasks/1/complete');

      expect(response.data.status).toBe('completed');
      expect(response.data.completed_at).toBeDefined();
    });
  });
});
