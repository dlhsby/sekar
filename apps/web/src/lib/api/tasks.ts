/**
 * Tasks API Client (Phase 2C - 8 statuses, tagging, verification)
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from './client';
import type { PaginatedResponse, TaskTag } from '@/types/models';

/**
 * Task Status - 8 values (Phase 2C)
 */
export type TaskStatus =
  | 'pending'
  | 'assigned'
  | 'accepted'
  | 'declined'
  | 'in_progress'
  | 'completed'
  | 'verified'
  | 'revision_needed';

/**
 * Task Priority
 */
export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';

/**
 * Assignment Scope - geographic scope for task assignment
 */
export type AssignmentScope = 'city' | 'district' | 'region' | 'location' | 'none';

/**
 * Task Interface (Phase 2C)
 */
export interface Task extends Record<string, unknown> {
  id: string;
  title: string;
  description?: string;
  created_by: string;
  creator?: { id: string; full_name: string };
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
  district?: {
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
  scope?: AssignmentScope;
  region_id?: string | null;
  deadline?: string;
  assigned_at?: string;
  accepted_at?: string;
  declined_at?: string;
  decline_reason?: string;
  started_at?: string;
  completed_at?: string;
  completion_photo_urls?: string[];
  completion_notes?: string;
  verified_by?: string;
  verifier?: { id: string; full_name: string };
  verified_at?: string;
  revision_reason?: string;
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
  location_id?: string;
  district_id?: string;
  deadline_after?: string;
  deadline_before?: string;
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
  location_id?: string;
  district_id?: string;
  region_id?: string;
  scope?: AssignmentScope;
  activity_type_id?: string;
  priority?: TaskPriority;
  deadline?: string;
  tagged_user_ids?: string[];
}

/**
 * Update Task DTO
 */
export interface UpdateTaskDto {
  title?: string;
  description?: string;
  assigned_to?: string;
  location_id?: string;
  district_id?: string;
  activity_type_id?: string;
  priority?: TaskPriority;
  deadline?: string;
  status?: TaskStatus;
}

/**
 * Query Key Factory
 */
/**
 * ADR-038: append-only audit row for one assignment hop on a task.
 * Returned by GET /tasks/:id/delegations in chronological order.
 */
export interface TaskDelegation {
  id: string;
  task_id: string;
  from_user_id: string | null;
  to_user_id: string;
  from_role: string | null;
  to_role: string;
  reason: string | null;
  created_at: string;
  from_user: { id: string; full_name: string; role: string } | null;
  to_user: { id: string; full_name: string; role: string };
}

export const tasksKeys = {
  all: ['tasks'] as const,
  lists: () => [...tasksKeys.all, 'list'] as const,
  list: (filters?: TaskFilters) => [...tasksKeys.lists(), filters] as const,
  details: () => [...tasksKeys.all, 'detail'] as const,
  detail: (id: string) => [...tasksKeys.details(), id] as const,
  tagged: (filters?: TaskFilters) => [...tasksKeys.all, 'tagged', filters] as const,
  myTasks: (filters?: TaskFilters) => [...tasksKeys.all, 'my-tasks', filters] as const,
  delegations: (id: string) => [...tasksKeys.all, 'delegations', id] as const,
};

/**
 * Fetch the assignment chain for a task (ADR-038).
 */
export function useTaskDelegations(id: string) {
  return useQuery({
    queryKey: tasksKeys.delegations(id),
    queryFn: async () => {
      const response = await apiClient.get<TaskDelegation[]>(`/tasks/${id}/delegations`);
      return response.data;
    },
    staleTime: 30 * 1000,
    enabled: !!id,
  });
}

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
 * Fetch Tagged Tasks (tasks where current user is tagged)
 */
export function useTaggedTasks(filters?: TaskFilters) {
  return useQuery({
    queryKey: tasksKeys.tagged(filters),
    queryFn: async () => {
      const response = await apiClient.get<PaginatedResponse<Task>>('/tasks/tagged', {
        params: filters,
      });
      return response.data;
    },
    staleTime: 2 * 60 * 1000,
  });
}

/**
 * Fetch My Tasks (tasks created by current user)
 */
export function useMyTasks(filters?: TaskFilters) {
  return useQuery({
    queryKey: tasksKeys.myTasks(filters),
    queryFn: async () => {
      const response = await apiClient.get<PaginatedResponse<Task>>('/tasks/my-tasks', {
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
 * Assign Task to a user
 */
export function useAssignTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ taskId, assignedTo }: { taskId: string; assignedTo: string }) => {
      const response = await apiClient.post<Task>(`/tasks/${taskId}/assign`, {
        assigned_to: assignedTo,
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: tasksKeys.all });
    },
  });
}

/**
 * Accept Task (assigned user accepts)
 */
export function useAcceptTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (taskId: string) => {
      const response = await apiClient.post<Task>(`/tasks/${taskId}/accept`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: tasksKeys.all });
    },
  });
}

/**
 * Decline Task (assigned user declines)
 */
export function useDeclineTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ taskId, reason }: { taskId: string; reason: string }) => {
      const response = await apiClient.post<Task>(`/tasks/${taskId}/decline`, { reason });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: tasksKeys.all });
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
 * Complete Task (Phase 2C - photo_urls array + description)
 */
export function useCompleteTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      taskId,
      completionPhotoUrls,
      description,
    }: {
      taskId: string;
      completionPhotoUrls?: string[];
      description?: string;
    }) => {
      const response = await apiClient.post<Task>(`/tasks/${taskId}/complete`, {
        completion_photo_urls: completionPhotoUrls,
        description,
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: tasksKeys.all });
    },
  });
}

/**
 * Verify Task (supervisor verifies completed task)
 */
export function useVerifyTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (taskId: string) => {
      const response = await apiClient.patch<Task>(`/tasks/${taskId}/verify`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: tasksKeys.all });
    },
  });
}

/**
 * Request Revision on a completed task
 */
export function useRequestRevision() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ taskId, reason }: { taskId: string; reason: string }) => {
      const response = await apiClient.patch<Task>(`/tasks/${taskId}/revision`, { reason });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: tasksKeys.all });
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
