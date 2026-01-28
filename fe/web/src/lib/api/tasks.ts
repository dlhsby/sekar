/**
 * Tasks API Client
 * Task assignment and management
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from './client';
import { PaginatedResponse } from '@/types/models';

/**
 * Task Status Enum
 */
export type TaskStatus =
  | 'pending'
  | 'assigned'
  | 'accepted'
  | 'in_progress'
  | 'completed'
  | 'declined'
  | 'cancelled';

/**
 * Task Priority Enum
 */
export type TaskPriority = 'low' | 'normal' | 'high' | 'urgent';

/**
 * Task Interface
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
  activity_type?: {
    id: string;
    name: string;
    code: string;
  };
  priority: TaskPriority;
  status: TaskStatus;
  due_date?: string;
  completed_at?: string;
  completion_photo_url?: string;
  completion_notes?: string;
  decline_reason?: string;
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
  due_date_from?: string;
  due_date_to?: string;
  page?: number;
  limit?: number;
}

/**
 * Create Task DTO
 */
export interface CreateTaskDto {
  title: string;
  description?: string;
  assigned_to?: string;
  area_id?: string;
  activity_type_id?: string;
  priority?: TaskPriority;
  due_date?: string;
}

/**
 * Update Task DTO
 */
export interface UpdateTaskDto {
  title?: string;
  description?: string;
  assigned_to?: string;
  area_id?: string;
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
  my: () => [...tasksKeys.all, 'my'] as const,
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
    staleTime: 2 * 60 * 1000, // 2 minutes
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
    staleTime: 5 * 60 * 1000, // 5 minutes
    enabled: !!id,
  });
}

/**
 * Fetch My Tasks (Worker/Linmas only)
 */
export function useMyTasks(filters?: { status?: TaskStatus; date?: string }) {
  return useQuery({
    queryKey: tasksKeys.my(),
    queryFn: async () => {
      const response = await apiClient.get<PaginatedResponse<Task>>('/tasks/my', {
        params: filters,
      });
      return response.data;
    },
    staleTime: 2 * 60 * 1000, // 2 minutes
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
 * Accept Task (Worker/Linmas)
 */
export function useAcceptTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (taskId: string) => {
      const response = await apiClient.post<Task>(`/tasks/${taskId}/accept`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: tasksKeys.lists() });
      queryClient.invalidateQueries({ queryKey: tasksKeys.my() });
    },
  });
}

/**
 * Decline Task (Worker/Linmas)
 */
export function useDeclineTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ taskId, reason }: { taskId: string; reason: string }) => {
      const response = await apiClient.post<Task>(`/tasks/${taskId}/decline`, {
        decline_reason: reason,
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: tasksKeys.lists() });
      queryClient.invalidateQueries({ queryKey: tasksKeys.my() });
    },
  });
}

/**
 * Start Task (Worker/Linmas)
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
      queryClient.invalidateQueries({ queryKey: tasksKeys.my() });
    },
  });
}

/**
 * Complete Task (Worker/Linmas)
 */
export function useCompleteTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      taskId,
      photoUrl,
      notes,
      gpsLat,
      gpsLng,
    }: {
      taskId: string;
      photoUrl?: string;
      notes?: string;
      gpsLat?: number;
      gpsLng?: number;
    }) => {
      const response = await apiClient.post<Task>(`/tasks/${taskId}/complete`, {
        completion_photo_url: photoUrl,
        completion_notes: notes,
        gps_lat: gpsLat,
        gps_lng: gpsLng,
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: tasksKeys.lists() });
      queryClient.invalidateQueries({ queryKey: tasksKeys.my() });
    },
  });
}
