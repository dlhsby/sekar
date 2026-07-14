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
import { makeCrudHooks } from './crud-hooks';
import { collectAllPages } from './paginate';

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
const buildUserParams = (filters: UserFilters, page: number): string => {
  const params = new URLSearchParams();
  if (filters.search) params.append('search', filters.search);
  if (filters.role) params.append('role', filters.role);
  if (filters.roles?.length) params.append('roles', filters.roles.join(','));
  params.append('page', String(page));
  if (filters.limit) params.append('limit', String(filters.limit));
  return params.toString();
};

const fetchUsersPage = async (
  filters: UserFilters,
  page: number
): Promise<PaginatedResponse<User>> =>
  (await apiClient.get<PaginatedResponse<User>>(`/users?${buildUserParams(filters, page)}`)).data;

const fetchUsers = async (filters: UserFilters = {}): Promise<PaginatedResponse<User>> => {
  // Explicit page → the caller drives pagination; return that single page.
  if (filters.page) return fetchUsersPage(filters, filters.page);

  // No explicit page → the caller wants the FULL roster (every table/dropdown
  // passes a high `limit` to "load all"). The API hard-caps `limit`, so a single
  // request silently drops the tail — users vanish from the list and role counts
  // read low. Walk every page so the client always receives the complete set.
  return collectAllPages((page) => fetchUsersPage(filters, page));
};

/**
 * Fetch single user by ID
 */
const fetchUser = async (id: string): Promise<User> => {
  const response = await apiClient.get<User>(`/users/${id}`);
  return response.data;
};

/** Admin password reset — returns a one-time temp password. */
const resetUserPassword = async (id: string): Promise<{ temp_password: string }> => {
  const response = await apiClient.post<{ temp_password: string }>(`/users/${id}/reset-password`);
  return response.data;
};

/** Live username availability check (create-user form). */
export const checkUsername = async (username: string): Promise<boolean> => {
  const response = await apiClient.get<{ available: boolean }>(
    `/users/check-username?username=${encodeURIComponent(username)}`
  );
  return response.data.available;
};

/** Suggest a unique username from a full name. */
export const suggestUsername = async (fullName: string): Promise<string> => {
  const response = await apiClient.get<{ username: string }>(
    `/users/suggest-username?full_name=${encodeURIComponent(fullName)}`
  );
  return response.data.username;
};

/**
 * Live phone availability check (phone doubles as a login identifier, so it must
 * be unique). `excludeUserId` skips the user's own number when editing.
 */
export const checkPhone = async (phone: string, excludeUserId?: string): Promise<boolean> => {
  const params = new URLSearchParams({ phone });
  if (excludeUserId) params.set('excludeUserId', excludeUserId);
  const response = await apiClient.get<{ available: boolean }>(
    `/users/check-phone?${params.toString()}`
  );
  return response.data.available;
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

// CRUD hooks via factory
const userCrudHooks = makeCrudHooks<User & CreatedUser, CreateUserDto, UpdateUserDto>({
  resource: 'users',
  listKey: userKeys.lists(),
  detailKeyFn: (id) => userKeys.detail(id),
  // For users, extract ID from response data instead of mutation variables
  getDetailIdFromResponse: (data) => data.id,
});

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
export const useCreateUser = userCrudHooks.useCreate;

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
export const useUpdateUser = userCrudHooks.useUpdate;

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
export const useDeleteUser = userCrudHooks.useDelete;

/** Deactivate a user (is_active=false) — distinct from delete; reversible. */
export function useDeactivateUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiClient.patch<User>(`/users/${id}/deactivate`).then((r) => r.data),
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
