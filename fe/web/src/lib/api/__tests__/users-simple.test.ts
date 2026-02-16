/**
 * Unit Tests: Users API (Direct API Calls)
 * Tests user CRUD API endpoints directly
 */

import MockAdapter from 'axios-mock-adapter';
import { apiClient } from '../client';
import { userKeys } from '../users';
import type { User, PaginatedResponse, CreateUserDto, UpdateUserDto } from '@/types/models';

describe('Users API', () => {
  let mockAxios: MockAdapter;

  beforeEach(() => {
    mockAxios = new MockAdapter(apiClient);
  });

  afterEach(() => {
    mockAxios.restore();
  });

  describe('GET /users', () => {
    it('should fetch users list', async () => {
      const mockResponse: PaginatedResponse<User> = {
        data: [
          {
            id: '1',
            username: 'admin',
            full_name: 'Admin User',
            role: 'admin_system',
            created_at: '2026-01-01T00:00:00Z',
            updated_at: '2026-01-01T00:00:00Z',
          },
          {
            id: '2',
            username: 'worker1',
            full_name: 'Worker One',
            role: 'satgas',
            created_at: '2026-01-01T00:00:00Z',
            updated_at: '2026-01-01T00:00:00Z',
          },
        ],
        meta: {
          total: 2,
          page: 1,
          limit: 10,
          totalPages: 1,
        },
      };

      mockAxios.onGet(/\/users/).reply(200, mockResponse);

      const response = await apiClient.get<PaginatedResponse<User>>('/users');

      expect(response.data.data).toHaveLength(2);
      expect(response.data.data[0].username).toBe('admin');
    });

    it('should fetch users with role filter', async () => {
      const mockResponse: PaginatedResponse<User> = {
        data: [
          {
            id: '1',
            username: 'admin',
            full_name: 'Admin User',
            role: 'admin_system',
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

      mockAxios.onGet(/\/users\?.*role=admin_system/).reply(200, mockResponse);

      const response = await apiClient.get<PaginatedResponse<User>>('/users?role=admin_system');

      expect(response.data.data).toHaveLength(1);
      expect(response.data.data[0].role).toBe('admin_system');
    });

    it('should fetch users with pagination', async () => {
      const mockResponse: PaginatedResponse<User> = {
        data: [
          {
            id: '3',
            username: 'worker2',
            full_name: 'Worker Two',
            role: 'satgas',
            created_at: '2026-01-01T00:00:00Z',
            updated_at: '2026-01-01T00:00:00Z',
          },
        ],
        meta: {
          total: 10,
          page: 2,
          limit: 5,
          totalPages: 2,
        },
      };

      mockAxios.onGet(/\/users\?.*page=2.*limit=5/).reply(200, mockResponse);

      const response = await apiClient.get<PaginatedResponse<User>>('/users?page=2&limit=5');

      expect(response.data.meta.page).toBe(2);
      expect(response.data.meta.limit).toBe(5);
    });

    it('should fetch users with search filter', async () => {
      const mockResponse: PaginatedResponse<User> = {
        data: [
          {
            id: '1',
            username: 'admin',
            full_name: 'Admin User',
            role: 'admin_system',
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

      mockAxios.onGet(/\/users\?.*search=admin/).reply(200, mockResponse);

      const response = await apiClient.get<PaginatedResponse<User>>('/users?search=admin');

      expect(response.data.data[0].username).toContain('admin');
    });

    it('should handle fetch error', async () => {
      mockAxios.onGet(/\/users/).reply(500, {
        statusCode: 500,
        message: 'Server error',
        error: 'InternalServerError',
      });

      await expect(apiClient.get('/users')).rejects.toThrow();
    });
  });

  describe('GET /users/:id', () => {
    it('should fetch single user by ID', async () => {
      const mockUser: User = {
        id: '1',
        username: 'admin',
        full_name: 'Admin User',
        role: 'admin_system',
        created_at: '2026-01-01T00:00:00Z',
        updated_at: '2026-01-01T00:00:00Z',
      };

      mockAxios.onGet('/users/1').reply(200, mockUser);

      const response = await apiClient.get<User>('/users/1');

      expect(response.data.username).toBe('admin');
      expect(response.data.role).toBe('admin_system');
    });

    it('should handle user not found', async () => {
      mockAxios.onGet('/users/999').reply(404, {
        statusCode: 404,
        message: 'User not found',
        error: 'NotFound',
      });

      await expect(apiClient.get('/users/999')).rejects.toThrow();
    });
  });

  describe('POST /users', () => {
    it('should create new user', async () => {
      const newUser: CreateUserDto = {
        username: 'newuser',
        password: 'password123',
        full_name: 'New User',
        role: 'satgas',
      };

      const mockResponse: User = {
        id: '10',
        username: 'newuser',
        full_name: 'New User',
        role: 'satgas',
        created_at: '2026-02-04T00:00:00Z',
        updated_at: '2026-02-04T00:00:00Z',
      };

      mockAxios.onPost('/users', newUser).reply(201, mockResponse);

      const response = await apiClient.post<User>('/users', newUser);

      expect(response.status).toBe(201);
      expect(response.data.username).toBe('newuser');
    });

    it('should handle validation errors', async () => {
      const invalidUser: CreateUserDto = {
        username: 'a',
        password: '123',
        full_name: '',
        role: 'satgas',
      };

      mockAxios.onPost('/users').reply(400, {
        statusCode: 400,
        message: 'Validation failed',
        errors: {
          username: 'Username must be at least 3 characters',
          password: 'Password must be at least 6 characters',
          full_name: 'Full name is required',
        },
      });

      await expect(apiClient.post('/users', invalidUser)).rejects.toThrow();
    });

    it('should handle duplicate username error', async () => {
      const newUser: CreateUserDto = {
        username: 'admin',
        password: 'password123',
        full_name: 'Another Admin',
        role: 'admin_system',
      };

      mockAxios.onPost('/users').reply(409, {
        statusCode: 409,
        message: 'Username already exists',
        error: 'Conflict',
      });

      await expect(apiClient.post('/users', newUser)).rejects.toThrow();
    });
  });

  describe('PATCH /users/:id', () => {
    it('should update existing user', async () => {
      const updateData: UpdateUserDto = {
        full_name: 'Updated Name',
        role: 'korlap',
      };

      const mockResponse: User = {
        id: '1',
        username: 'admin',
        full_name: 'Updated Name',
        role: 'korlap',
        created_at: '2026-01-01T00:00:00Z',
        updated_at: '2026-02-04T00:00:00Z',
      };

      mockAxios.onPatch('/users/1', updateData).reply(200, mockResponse);

      const response = await apiClient.patch<User>('/users/1', updateData);

      expect(response.data.full_name).toBe('Updated Name');
      expect(response.data.role).toBe('korlap');
    });

    it('should update user password', async () => {
      const updateData: UpdateUserDto = {
        password: 'new-password-123',
      };

      mockAxios.onPatch('/users/1', updateData).reply(200, {
        id: '1',
        username: 'admin',
        full_name: 'Admin User',
        role: 'admin_system',
        created_at: '2026-01-01T00:00:00Z',
        updated_at: '2026-01-01T00:00:00Z',
      });

      const response = await apiClient.patch('/users/1', updateData);

      expect(response.status).toBe(200);
    });

    it('should handle update validation errors', async () => {
      mockAxios.onPatch('/users/1').reply(400, {
        statusCode: 400,
        message: 'Validation failed',
        error: 'BadRequest',
      });

      await expect(apiClient.patch('/users/1', { full_name: '' })).rejects.toThrow();
    });
  });

  describe('DELETE /users/:id', () => {
    it('should delete user', async () => {
      mockAxios.onDelete('/users/1').reply(204);

      const response = await apiClient.delete('/users/1');

      expect(response.status).toBe(204);
    });

    it('should handle delete error', async () => {
      mockAxios.onDelete('/users/1').reply(404, {
        statusCode: 404,
        message: 'User not found',
        error: 'NotFound',
      });

      await expect(apiClient.delete('/users/1')).rejects.toThrow();
    });

    it('should handle forbidden delete', async () => {
      mockAxios.onDelete('/users/1').reply(403, {
        statusCode: 403,
        message: 'Cannot delete admin user',
        error: 'Forbidden',
      });

      await expect(apiClient.delete('/users/1')).rejects.toThrow();
    });
  });

  describe('Query Keys', () => {
    it('should generate correct query keys', () => {
      expect(userKeys.all).toEqual(['users']);
      expect(userKeys.lists()).toEqual(['users', 'list']);
      expect(userKeys.list({ role: 'admin_system' })).toEqual([
        'users',
        'list',
        { role: 'admin_system' },
      ]);
      expect(userKeys.details()).toEqual(['users', 'detail']);
      expect(userKeys.detail('1')).toEqual(['users', 'detail', '1']);
    });
  });
});
