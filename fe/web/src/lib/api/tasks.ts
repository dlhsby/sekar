/**
 * Tasks API Client (Phase 2C - simplified statuses, tagging)
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from './client';
import type { PaginatedResponse, TaskTag } from '@/types/models';

/**
 * Task Status - simplified to 4 (Phase 2C)
 */
export type TaskStatus = 'pending' | 'assigned' | 'in_progress' | 'completed';

/**
 * Task Priority
 */
export type TaskPriority = 'low' | 'normal' | 'high' | 'urgent';

/**
 * Task Interface (Phase 2C)
 */
export interface Task extends Record<string, unknown> {
  id: string;
  title: string;
  description?: string;
  assigned_to?: {
    id: string;
    full_name: string;
  };
  assigned_by?: {
    id: string;
    full_name: string;
  };
  area?: {
    id: string;
    name: string;
  };
  rayon?: {
    id: string;
    name: string;
  };
  activity_type?: {
    id: string;
    name: string;
    code: string;
  };
  tags?: TaskTag[];
  priority: TaskPriority;
  status: TaskStatus;
  due_date?: string;
  completed_at?: string;
  completion_photo_url?: string;
  completion_notes?: string;
  created_at: string;
  updated_at: string;
}

/**
 * Task Filters
 */
export interface TaskFilters {
  status?: TaskStatus;
  priority?: TaskPriority;
  assigned_to?: string;
  area_id?: string;
  rayon_id?: string;
  due_date_from?: string;
  due_date_to?: string;
  page?: number;
  limit?: number;
}

/**
 * Create Task DTO (Phase 2C)
 */
export interface CreateTaskDto {
  title: string;
  description?: string;
  assigned_to?: string;
  area_id?: string;
  rayon_id?: string;
  activity_type_id?: string;
  priority?: TaskPriority;
  due_date?: string;
  tagged_user_ids?: string[];
}

/**
 * Update Task DTO
 */
export interface UpdateTaskDto {
  title?: string;
  description?: string;
  assigned_to?: string;
  area_id?: string;
  rayon_id?: string;
  activity_type_id?: string;
  priority?: TaskPriority;
  due_date?: string;
  status?: TaskStatus;
}

/**
 * Query Key Factory
 */
export const tasksKeys = {
  all: ['tasks'] as const,
  lists: () => [...tasksKeys.all, 'list'] as const,
  list: (filters?: TaskFilters) => [...tasksKeys.lists(), filters] as const,
  details: () => [...tasksKeys.all, 'detail'] as const,
  detail: (id: string) => [...tasksKeys.details(), id] as const,
  tagged: () => [...tasksKeys.all, 'tagged'] as const,
};

/**
 * Fetch All Tasks
 */
export function useTasks(filters?: TaskFilters) {
  return useQuery({
    queryKey: tasksKeys.list(filters),
    queryFn: async () => {
      const response = await apiClient.get<PaginatedResponse<Task>>('/tasks', {
        params: filters,
      });
      return response.data;
    },
    staleTime: 2 * 60 * 1000,
  });
}

/**
 * Fetch Single Task
 */
export function useTask(id: string) {
  return useQuery({
    queryKey: tasksKeys.detail(id),
    queryFn: async () => {
      const response = await apiClient.get<Task>(`/tasks/${id}`);
      return response.data;
    },
    staleTime: 5 * 60 * 1000,
    enabled: !!id,
  });
}

/**
 * Create Task
 */
export function useCreateTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateTaskDto) => {
      const response = await apiClient.post<Task>('/tasks', data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: tasksKeys.lists() });
    },
  });
}

/**
 * Update Task
 */
export function useUpdateTask(id: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: UpdateTaskDto) => {
      const response = await apiClient.patch<Task>(`/tasks/${id}`, data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: tasksKeys.lists() });
      queryClient.invalidateQueries({ queryKey: tasksKeys.detail(id) });
    },
  });
}

/**
 * Delete Task
 */
export function useDeleteTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (taskId: string) => {
      await apiClient.delete(`/tasks/${taskId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: tasksKeys.lists() });
    },
  });
}

/**
 * Start Task
 */
export function useStartTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (taskId: string) => {
      const response = await apiClient.post<Task>(`/tasks/${taskId}/start`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: tasksKeys.lists() });
    },
  });
}

/**
 * Complete Task (Phase 2C - no GPS params)
 */
export function useCompleteTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      taskId,
      photoUrl,
      notes,
    }: {
      taskId: string;
      photoUrl?: string;
      notes?: string;
    }) => {
      const response = await apiClient.post<Task>(`/tasks/${taskId}/complete`, {
        completion_photo_url: photoUrl,
        completion_notes: notes,
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: tasksKeys.lists() });
    },
  });
}

/**
 * Tag a user on a task
 */
export function useTagTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ taskId, userIds }: { taskId: string; userIds: string[] }) => {
      const response = await apiClient.post<Task>(`/tasks/${taskId}/tag`, {
        user_ids: userIds,
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: tasksKeys.lists() });
      queryClient.invalidateQueries({ queryKey: tasksKeys.details() });
    },
  });
}

/**
 * Untag a user from a task
 */
export function useUntagTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ taskId, userId }: { taskId: string; userId: string }) => {
      const response = await apiClient.delete<Task>(`/tasks/${taskId}/tag/${userId}`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: tasksKeys.lists() });
      queryClient.invalidateQueries({ queryKey: tasksKeys.details() });
    },
  });
}
