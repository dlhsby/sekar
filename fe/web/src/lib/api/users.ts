import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from './client';
import {
  User,
  UserFilters,
  CreateUserDto,
  UpdateUserDto,
  CreatedUser,
  PaginatedResponse,
} from '@/types/models';

/**
 * Query keys for users
 */
export const userKeys = {
  all: ['users'] as const,
  lists: () => [...userKeys.all, 'list'] as const,
  list: (filters: UserFilters) => [...userKeys.lists(), filters] as const,
  details: () => [...userKeys.all, 'detail'] as const,
  detail: (id: string) => [...userKeys.details(), id] as const,
};

/**
 * Fetch users with filters
 */
const fetchUsers = async (filters: UserFilters = {}): Promise<PaginatedResponse<User>> => {
  const params = new URLSearchParams();

  if (filters.search) params.append('search', filters.search);
  if (filters.role) params.append('role', filters.role);
  if (filters.page) params.append('page', String(filters.page));
  if (filters.limit) params.append('limit', String(filters.limit));

  const response = await apiClient.get<PaginatedResponse<User>>(`/users?${params.toString()}`);
  return response.data;
};

/**
 * Fetch single user by ID
 */
const fetchUser = async (id: string): Promise<User> => {
  const response = await apiClient.get<User>(`/users/${id}`);
  return response.data;
};

/**
 * Create new user
 */
const createUser = async (data: CreateUserDto): Promise<CreatedUser> => {
  const response = await apiClient.post<CreatedUser>('/users', data);
  return response.data;
};

/** Admin password reset — returns a one-time temp password. */
const resetUserPassword = async (id: string): Promise<{ temp_password: string }> => {
  const response = await apiClient.post<{ temp_password: string }>(`/users/${id}/reset-password`);
  return response.data;
};

/**
 * Update existing user
 */
const updateUser = async ({ id, data }: { id: string; data: UpdateUserDto }): Promise<User> => {
  const response = await apiClient.patch<User>(`/users/${id}`, data);
  return response.data;
};

/**
 * Delete user (soft delete)
 */
const deleteUser = async (id: string): Promise<void> => {
  await apiClient.delete(`/users/${id}`);
};

/**
 * Hook to fetch users with filters
 *
 * @example
 * ```tsx
 * const { data, isLoading, error } = useUsers({
 *   search: 'john',
 *   role: 'Admin',
 *   page: 1,
 *   limit: 20
 * });
 * ```
 */
export function useUsers(filters: UserFilters = {}) {
  return useQuery({
    queryKey: userKeys.list(filters),
    queryFn: () => fetchUsers(filters),
  });
}

/**
 * Hook to fetch single user by ID
 *
 * @example
 * ```tsx
 * const { data: user, isLoading } = useUser(userId);
 * ```
 */
export function useUser(id: string) {
  return useQuery({
    queryKey: userKeys.detail(id),
    queryFn: () => fetchUser(id),
    enabled: !!id,
  });
}

/**
 * Hook to create new user
 *
 * @example
 * ```tsx
 * const createUserMutation = useCreateUser();
 *
 * const handleSubmit = async (data) => {
 *   try {
 *     await createUserMutation.mutateAsync(data);
 *     toast.success('User created successfully');
 *   } catch (error) {
 *     toast.error('Failed to create user');
 *   }
 * };
 * ```
 */
export function useCreateUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createUser,
    onSuccess: () => {
      // Invalidate all user lists to refetch
      queryClient.invalidateQueries({ queryKey: userKeys.lists() });
    },
  });
}

/** Hook to reset a user's password (admin) — returns a one-time temp password. */
export function useResetUserPassword() {
  return useMutation({ mutationFn: resetUserPassword });
}

/**
 * Hook to update existing user
 *
 * @example
 * ```tsx
 * const updateUserMutation = useUpdateUser();
 *
 * const handleUpdate = async (id, data) => {
 *   try {
 *     await updateUserMutation.mutateAsync({ id, data });
 *     toast.success('User updated successfully');
 *   } catch (error) {
 *     toast.error('Failed to update user');
 *   }
 * };
 * ```
 */
export function useUpdateUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateUser,
    onSuccess: (data) => {
      // Invalidate user lists
      queryClient.invalidateQueries({ queryKey: userKeys.lists() });
      // Invalidate specific user detail
      queryClient.invalidateQueries({ queryKey: userKeys.detail(data.id) });
    },
  });
}

/**
 * Hook to delete user
 *
 * @example
 * ```tsx
 * const deleteUserMutation = useDeleteUser();
 *
 * const handleDelete = async (id) => {
 *   if (confirm('Are you sure?')) {
 *     try {
 *       await deleteUserMutation.mutateAsync(id);
 *       toast.success('User deleted successfully');
 *     } catch (error) {
 *       toast.error('Failed to delete user');
 *     }
 *   }
 * };
 * ```
 */
export function useDeleteUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteUser,
    onSuccess: () => {
      // Invalidate user lists to refetch
      queryClient.invalidateQueries({ queryKey: userKeys.lists() });
    },
  });
}

/** Deactivate a user (is_active=false) — distinct from delete; reversible. */
export function useDeactivateUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiClient.patch<User>(`/users/${id}/deactivate`).then((r) => r.data),
    onSuccess: (user) => {
      queryClient.invalidateQueries({ queryKey: userKeys.lists() });
      queryClient.invalidateQueries({ queryKey: userKeys.detail(user.id) });
    },
  });
}

/** Reactivate a deactivated user (is_active=true). */
export function useActivateUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiClient.patch<User>(`/users/${id}/activate`).then((r) => r.data),
    onSuccess: (user) => {
      queryClient.invalidateQueries({ queryKey: userKeys.lists() });
      queryClient.invalidateQueries({ queryKey: userKeys.detail(user.id) });
    },
  });
}
