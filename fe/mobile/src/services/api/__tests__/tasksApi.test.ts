/**
 * Tasks API Service Tests
 */

import * as tasksApi from '../tasksApi';
import * as apiClient from '../apiClient';

// Mock the API client
jest.mock('../apiClient', () => ({
  get: jest.fn(),
  post: jest.fn(),
  put: jest.fn(),
  del: jest.fn(),
}));

const mockGet = apiClient.get as jest.MockedFunction<typeof apiClient.get>;
const mockPost = apiClient.post as jest.MockedFunction<typeof apiClient.post>;
const mockPut = apiClient.put as jest.MockedFunction<typeof apiClient.put>;
const mockDel = apiClient.del as jest.MockedFunction<typeof apiClient.del>;

describe('tasksApi', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createTask', () => {
    it('creates a task with correct data', async () => {
      const taskData = {
        title: 'Test Task',
        description: 'Test description',
        priority: 'high' as const,
        area_id: 'area-123',
        activity_type_id: 'activity-123',
      };
      const mockResponse = { data: { id: 'task-123', ...taskData } };
      mockPost.mockResolvedValue(mockResponse);

      const result = await tasksApi.createTask(taskData);

      expect(mockPost).toHaveBeenCalledWith('/tasks', taskData);
      expect(result).toEqual(mockResponse);
    });
  });

  describe('getTasks', () => {
    it('gets tasks with filters', async () => {
      const filters = { status: 'pending' as const, page: 1, limit: 10 };
      const mockResponse = {
        data: {
          data: [],
          meta: { total: 0, page: 1, limit: 10, totalPages: 0 },
        },
      };
      mockGet.mockResolvedValue(mockResponse);

      const result = await tasksApi.getTasks(filters);

      expect(mockGet).toHaveBeenCalledWith('/tasks', filters);
      expect(result).toEqual(mockResponse);
    });

    it('gets tasks without filters', async () => {
      const mockResponse = {
        data: {
          data: [],
          meta: { total: 0, page: 1, limit: 10, totalPages: 0 },
        },
      };
      mockGet.mockResolvedValue(mockResponse);

      const result = await tasksApi.getTasks();

      expect(mockGet).toHaveBeenCalledWith('/tasks', undefined);
      expect(result).toEqual(mockResponse);
    });
  });

  describe('getMyTasks', () => {
    it('gets my tasks with filters', async () => {
      const filters = { status: 'assigned', page: 1 };
      const mockResponse = {
        data: {
          data: [],
          meta: { total: 0, page: 1, limit: 10, totalPages: 0 },
        },
      };
      mockGet.mockResolvedValue(mockResponse);

      const result = await tasksApi.getMyTasks(filters);

      expect(mockGet).toHaveBeenCalledWith('/tasks/my-tasks', filters);
      expect(result).toEqual(mockResponse);
    });
  });

  describe('getTaskById', () => {
    it('gets task by ID', async () => {
      const taskId = 'task-123';
      const mockResponse = { data: { id: taskId, title: 'Test' } };
      mockGet.mockResolvedValue(mockResponse);

      const result = await tasksApi.getTaskById(taskId);

      expect(mockGet).toHaveBeenCalledWith(`/tasks/${taskId}`);
      expect(result).toEqual(mockResponse);
    });
  });

  describe('updateTask', () => {
    it('updates task with correct data', async () => {
      const taskId = 'task-123';
      const updateData = { title: 'Updated Title' };
      const mockResponse = { data: { id: taskId, ...updateData } };
      mockPut.mockResolvedValue(mockResponse);

      const result = await tasksApi.updateTask(taskId, updateData);

      expect(mockPut).toHaveBeenCalledWith(`/tasks/${taskId}`, updateData);
      expect(result).toEqual(mockResponse);
    });
  });

  describe('deleteTask', () => {
    it('deletes task by ID', async () => {
      const taskId = 'task-123';
      const mockResponse = { data: undefined };
      mockDel.mockResolvedValue(mockResponse);

      const result = await tasksApi.deleteTask(taskId);

      expect(mockDel).toHaveBeenCalledWith(`/tasks/${taskId}`);
      expect(result).toEqual(mockResponse);
    });
  });

  describe('assignTask', () => {
    it('assigns task to worker', async () => {
      const taskId = 'task-123';
      const assignData = { assigned_to: 'worker-123' };
      const mockResponse = {
        data: { id: taskId, assigned_to: 'worker-123' },
      };
      mockPost.mockResolvedValue(mockResponse);

      const result = await tasksApi.assignTask(taskId, assignData);

      expect(mockPost).toHaveBeenCalledWith(
        `/tasks/${taskId}/assign`,
        assignData,
      );
      expect(result).toEqual(mockResponse);
    });
  });

  describe('acceptTask', () => {
    it('accepts task', async () => {
      const taskId = 'task-123';
      const mockResponse = { data: { id: taskId, status: 'accepted' } };
      mockPost.mockResolvedValue(mockResponse);

      const result = await tasksApi.acceptTask(taskId);

      expect(mockPost).toHaveBeenCalledWith(`/tasks/${taskId}/accept`);
      expect(result).toEqual(mockResponse);
    });
  });

  describe('declineTask', () => {
    it('declines task with reason', async () => {
      const taskId = 'task-123';
      const declineData = { decline_reason: 'Not available' };
      const mockResponse = { data: { id: taskId, status: 'declined' } };
      mockPost.mockResolvedValue(mockResponse);

      const result = await tasksApi.declineTask(taskId, declineData);

      expect(mockPost).toHaveBeenCalledWith(
        `/tasks/${taskId}/decline`,
        declineData,
      );
      expect(result).toEqual(mockResponse);
    });
  });

  describe('startTask', () => {
    it('starts task', async () => {
      const taskId = 'task-123';
      const mockResponse = { data: { id: taskId, status: 'in_progress' } };
      mockPost.mockResolvedValue(mockResponse);

      const result = await tasksApi.startTask(taskId);

      expect(mockPost).toHaveBeenCalledWith(`/tasks/${taskId}/start`);
      expect(result).toEqual(mockResponse);
    });
  });

  describe('completeTask', () => {
    it('completes task with photo and GPS', async () => {
      const taskId = 'task-123';
      const completeData = {
        completion_notes: 'Done',
        completion_photo: 'base64data',
        gps_lat: -7.123,
        gps_lng: 112.456,
      };
      const mockResponse = { data: { id: taskId, status: 'completed' } };
      mockPost.mockResolvedValue(mockResponse);

      const result = await tasksApi.completeTask(taskId, completeData);

      expect(mockPost).toHaveBeenCalledWith(
        `/tasks/${taskId}/complete`,
        completeData,
      );
      expect(result).toEqual(mockResponse);
    });
  });

  describe('default export', () => {
    it('exports all functions', () => {
      const defaultExport = tasksApi.default;
      expect(defaultExport.createTask).toBeDefined();
      expect(defaultExport.getTasks).toBeDefined();
      expect(defaultExport.getMyTasks).toBeDefined();
      expect(defaultExport.getTaskById).toBeDefined();
      expect(defaultExport.updateTask).toBeDefined();
      expect(defaultExport.deleteTask).toBeDefined();
      expect(defaultExport.assignTask).toBeDefined();
      expect(defaultExport.acceptTask).toBeDefined();
      expect(defaultExport.declineTask).toBeDefined();
      expect(defaultExport.startTask).toBeDefined();
      expect(defaultExport.completeTask).toBeDefined();
    });
  });
});
