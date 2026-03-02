/**
 * Tasks API Service Tests
 * Phase 2C: no accept/decline, new tagging support, changed completeTask
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
      };
      const mockResponse = { data: { id: 'task-123', ...taskData } };
      mockPost.mockResolvedValue(mockResponse);

      const result = await tasksApi.createTask(taskData);

      expect(mockPost).toHaveBeenCalledWith('/tasks', taskData);
      expect(result).toEqual(mockResponse);
    });

    it('creates a task with rayon_id instead of area_id', async () => {
      const taskData = {
        title: 'Rayon Task',
        description: 'Test description',
        priority: 'medium' as const,
        rayon_id: 'rayon-123',
      };
      const mockResponse = { data: { id: 'task-456', ...taskData } };
      mockPost.mockResolvedValue(mockResponse);

      const result = await tasksApi.createTask(taskData);

      expect(mockPost).toHaveBeenCalledWith('/tasks', taskData);
      expect(result).toEqual(mockResponse);
    });

    it('creates a task with tagged users', async () => {
      const taskData = {
        title: 'Tagged Task',
        description: 'Test description',
        priority: 'low' as const,
        area_id: 'area-123',
        tagged_user_ids: ['user-1', 'user-2'],
      };
      const mockResponse = { data: { id: 'task-789', ...taskData } };
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
      const mockResponse = { data: [] };
      mockGet.mockResolvedValue(mockResponse);

      const result = await tasksApi.getMyTasks(filters);

      expect(mockGet).toHaveBeenCalledWith('/tasks/my-tasks', filters);
      expect(result).toEqual(mockResponse);
    });
  });

  describe('getTaggedTasks', () => {
    it('gets tasks tagged for current user', async () => {
      const mockResponse = {
        data: [
          { id: 'task-1', title: 'Tagged Task 1' },
          { id: 'task-2', title: 'Tagged Task 2' },
        ],
      };
      mockGet.mockResolvedValue(mockResponse);

      const result = await tasksApi.getTaggedTasks();

      expect(mockGet).toHaveBeenCalledWith('/tasks/tagged', undefined);
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
    it('assigns task to user', async () => {
      const taskId = 'task-123';
      const assignData = { assigned_to: 'user-123' };
      const mockResponse = {
        data: { id: taskId, assigned_to: 'user-123' },
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
    it('completes task with description and photo', async () => {
      const taskId = 'task-123';
      const completeData = {
        description: 'Task completed successfully',
        completion_photo_urls: ['https://example.com/photo.jpg'],
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

    it('completes task with only description', async () => {
      const taskId = 'task-456';
      const completeData = {
        description: 'Finished the work',
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

  describe('addTaskTags', () => {
    it('adds tags (user IDs) to a task', async () => {
      const taskId = 'task-123';
      const userIds = ['user-1', 'user-2', 'user-3'];
      const mockResponse = {
        data: { id: taskId, tagged_users: userIds },
      };
      mockPost.mockResolvedValue(mockResponse);

      const result = await tasksApi.addTaskTags(taskId, userIds);

      expect(mockPost).toHaveBeenCalledWith(`/tasks/${taskId}/tag`, {
        user_ids: userIds,
      });
      expect(result).toEqual(mockResponse);
    });
  });

  describe('removeTaskTag', () => {
    it('removes a tag (user ID) from a task', async () => {
      const taskId = 'task-123';
      const userId = 'user-1';
      const mockResponse = { data: undefined };
      mockDel.mockResolvedValue(mockResponse);

      const result = await tasksApi.removeTaskTag(taskId, userId);

      expect(mockDel).toHaveBeenCalledWith(`/tasks/${taskId}/tag/${userId}`);
      expect(result).toEqual(mockResponse);
    });
  });

  describe('default export', () => {
    it('exports all functions', () => {
      const defaultExport = tasksApi.default;
      expect(defaultExport.createTask).toBeDefined();
      expect(defaultExport.getTasks).toBeDefined();
      expect(defaultExport.getMyTasks).toBeDefined();
      expect(defaultExport.getTaggedTasks).toBeDefined();
      expect(defaultExport.getTaskById).toBeDefined();
      expect(defaultExport.updateTask).toBeDefined();
      expect(defaultExport.deleteTask).toBeDefined();
      expect(defaultExport.assignTask).toBeDefined();
      expect(defaultExport.startTask).toBeDefined();
      expect(defaultExport.completeTask).toBeDefined();
      expect(defaultExport.addTaskTags).toBeDefined();
      expect(defaultExport.removeTaskTag).toBeDefined();
    });
  });
});
