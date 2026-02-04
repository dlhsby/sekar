/**
 * Unit Tests: Users API
 * Tests user CRUD operations and TanStack Query hooks
 */

import MockAdapter from 'axios-mock-adapter';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { apiClient } from '../client';
import {
  userKeys,
  useUsers,
  useUser,
  useCreateUser,
  useUpdateUser,
  useDeleteUser,
} from '../users';
import type { User, PaginatedResponse, CreateUserDto, UpdateUserDto } from '@/types/models';
import { ReactNode } from 'react';

describe('Users API', () => {
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

  const mockUser: User = {
    id: '1',
    username: 'admin',
    full_name: 'Admin User',
    role: 'admin',
    status: 'active',
    created_at: '2026-01-01T00:00:00Z',
  };

  beforeEach(() => {
    mockAxios = new MockAdapter(apiClient);
  });

  afterEach(() => {
    mockAxios.restore();
    queryClient?.clear();
  });

  describe('userKeys', () => {
    it('should generate correct query keys', () => {
      expect(userKeys.all).toEqual(['users']);
      expect(userKeys.lists()).toEqual(['users', 'list']);
      expect(userKeys.list({ role: 'admin' })).toEqual(['users', 'list', { role: 'admin' }]);
      expect(userKeys.details()).toEqual(['users', 'detail']);
      expect(userKeys.detail('1')).toEqual(['users', 'detail', '1']);
    });
  });

  describe('useUsers', () => {
    const mockResponse: PaginatedResponse<User> = {
      data: [mockUser],
      meta: {
        total: 1,
        page: 1,
        limit: 10,
        totalPages: 1,
      },
    };

    it('should fetch users without filters', async () => {
      mockAxios.onGet('/users?').reply(200, mockResponse);

      const { result } = renderHook(() => useUsers(), { wrapper: createWrapper() });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(result.current.data?.data).toHaveLength(1);
      expect(result.current.data?.data[0].username).toBe('admin');
      expect(result.current.data?.meta.total).toBe(1);
    });

    it('should fetch users with search filter', async () => {
      mockAxios.onGet('/users?search=admin').reply(200, mockResponse);

      const { result } = renderHook(() => useUsers({ search: 'admin' }), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(result.current.data?.data[0].username).toBe('admin');
    });

    it('should fetch users with role filter', async () => {
      mockAxios.onGet('/users?role=admin').reply(200, mockResponse);

      const { result } = renderHook(() => useUsers({ role: 'admin' }), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(result.current.data?.data[0].role).toBe('admin');
    });

    it('should fetch users with pagination', async () => {
      mockAxios.onGet('/users?page=2&limit=20').reply(200, {
        data: [],
        meta: { total: 0, page: 2, limit: 20, totalPages: 0 },
      });

      const { result } = renderHook(() => useUsers({ page: 2, limit: 20 }), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(result.current.data?.meta.page).toBe(2);
      expect(result.current.data?.meta.limit).toBe(20);
    });

    it('should handle fetch error', async () => {
      mockAxios.onGet('/users?').reply(500, {
        statusCode: 500,
        message: 'Internal server error',
      });

      const { result } = renderHook(() => useUsers(), { wrapper: createWrapper() });

      await waitFor(() => expect(result.current.isError).toBe(true));

      expect(result.current.error).toBeTruthy();
    });
  });

  describe('useUser', () => {
    it('should fetch single user by ID', async () => {
      mockAxios.onGet('/users/1').reply(200, mockUser);

      const { result } = renderHook(() => useUser('1'), { wrapper: createWrapper() });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(result.current.data?.username).toBe('admin');
      expect(result.current.data?.role).toBe('admin');
      expect(result.current.data?.status).toBe('active');
    });

    it('should handle user not found', async () => {
      mockAxios.onGet('/users/999').reply(404, {
        statusCode: 404,
        message: 'User not found',
        error: 'NotFound',
      });

      const { result } = renderHook(() => useUser('999'), { wrapper: createWrapper() });

      await waitFor(() => expect(result.current.isError).toBe(true));

      expect(result.current.error).toBeTruthy();
    });

    it('should not fetch when id is empty', () => {
      const { result } = renderHook(() => useUser(''), { wrapper: createWrapper() });

      expect(result.current.isFetching).toBe(false);
      expect(result.current.data).toBeUndefined();
    });
  });

  describe('useCreateUser', () => {
    it('should create new user', async () => {
      const newUser: CreateUserDto = {
        username: 'newuser',
        full_name: 'New User',
        password: 'password123',
        role: 'worker',
      };

      const createdUser: User = {
        ...newUser,
        id: '10',
        status: 'active',
        created_at: '2026-02-04T00:00:00Z',
      };

      mockAxios.onPost('/users', newUser).reply(201, createdUser);

      const { result } = renderHook(() => useCreateUser(), { wrapper: createWrapper() });

      result.current.mutate(newUser);

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(result.current.data?.username).toBe('newuser');
      expect(result.current.data?.id).toBe('10');
    });

    it('should handle validation errors', async () => {
      mockAxios.onPost('/users').reply(400, {
        statusCode: 400,
        message: 'Validation failed',
        errors: {
          username: 'Username is required',
          password: 'Password must be at least 6 characters',
        },
      });

      const { result } = renderHook(() => useCreateUser(), { wrapper: createWrapper() });

      result.current.mutate({} as CreateUserDto);

      await waitFor(() => expect(result.current.isError).toBe(true));

      expect(result.current.error).toBeTruthy();
    });

    it('should invalidate queries on success', async () => {
      const newUser: CreateUserDto = {
        username: 'newuser',
        full_name: 'New User',
        password: 'password123',
        role: 'worker',
      };

      mockAxios.onPost('/users').reply(201, { ...newUser, id: '10', status: 'active', created_at: '2026-02-04' });

      const { result } = renderHook(() => useCreateUser(), { wrapper: createWrapper() });

      const invalidateSpy = jest.spyOn(queryClient, 'invalidateQueries');

      result.current.mutate(newUser);

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: userKeys.lists() });
    });
  });

  describe('useUpdateUser', () => {
    it('should update existing user', async () => {
      const updateData: UpdateUserDto = {
        full_name: 'Updated Name',
      };

      const updatedUser: User = {
        ...mockUser,
        full_name: 'Updated Name',
      };

      mockAxios.onPatch('/users/1', updateData).reply(200, updatedUser);

      const { result } = renderHook(() => useUpdateUser(), { wrapper: createWrapper() });

      result.current.mutate({ id: '1', data: updateData });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(result.current.data?.full_name).toBe('Updated Name');
    });

    it('should handle update error', async () => {
      mockAxios.onPatch('/users/1').reply(404, {
        statusCode: 404,
        message: 'User not found',
      });

      const { result } = renderHook(() => useUpdateUser(), { wrapper: createWrapper() });

      result.current.mutate({ id: '1', data: { full_name: 'New Name' } });

      await waitFor(() => expect(result.current.isError).toBe(true));

      expect(result.current.error).toBeTruthy();
    });

    it('should invalidate queries on success', async () => {
      const updatedUser: User = { ...mockUser, full_name: 'Updated' };
      mockAxios.onPatch('/users/1').reply(200, updatedUser);

      const { result } = renderHook(() => useUpdateUser(), { wrapper: createWrapper() });

      const invalidateSpy = jest.spyOn(queryClient, 'invalidateQueries');

      result.current.mutate({ id: '1', data: { full_name: 'Updated' } });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: userKeys.detail('1') });
      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: userKeys.lists() });
    });
  });

  describe('useDeleteUser', () => {
    it('should delete user', async () => {
      mockAxios.onDelete('/users/1').reply(204);

      const { result } = renderHook(() => useDeleteUser(), { wrapper: createWrapper() });

      result.current.mutate('1');

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
    });

    it('should handle delete error', async () => {
      mockAxios.onDelete('/users/1').reply(404, {
        statusCode: 404,
        message: 'User not found',
        error: 'NotFound',
      });

      const { result } = renderHook(() => useDeleteUser(), { wrapper: createWrapper() });

      result.current.mutate('1');

      await waitFor(() => expect(result.current.isError).toBe(true));

      expect(result.current.error).toBeTruthy();
    });

    it('should invalidate queries on success', async () => {
      mockAxios.onDelete('/users/1').reply(204);

      const { result } = renderHook(() => useDeleteUser(), { wrapper: createWrapper() });

      const invalidateSpy = jest.spyOn(queryClient, 'invalidateQueries');

      result.current.mutate('1');

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: userKeys.lists() });
    });
  });
});
