/**
 * Tasks API Service
 * Phase 2C: simplified (no accept/decline), tagging support
 */

import { get, post, put, del } from './apiClient';
import type { ApiResponse } from '../../types/api.types';
import type {
  Task,
  TasksFilter,
  TasksListResponse,
  CreateTaskRequest,
  UpdateTaskRequest,
  AssignTaskRequest,
  CompleteTaskRequest,
  TagTaskRequest,
} from '../../types/api.types';

export async function createTask(
  data: CreateTaskRequest,
): Promise<ApiResponse<Task>> {
  return post<Task>('/tasks', data);
}

export async function getTasks(
  filters?: TasksFilter & { page?: number; limit?: number },
): Promise<ApiResponse<TasksListResponse>> {
  return get<TasksListResponse>('/tasks', filters);
}

export async function getMyTasks(
  filters?: { status?: string; from_date?: string; to_date?: string; page?: number; limit?: number },
): Promise<ApiResponse<Task[]>> {
  return get<Task[]>('/tasks/my-tasks', filters);
}

export async function getTaggedTasks(
  filters?: { status?: string; from_date?: string; to_date?: string; page?: number; limit?: number },
): Promise<ApiResponse<Task[]>> {
  return get<Task[]>('/tasks/tagged', filters);
}

export async function getTaskById(id: string): Promise<ApiResponse<Task>> {
  return get<Task>(`/tasks/${id}`);
}

export async function updateTask(
  id: string,
  data: UpdateTaskRequest,
): Promise<ApiResponse<Task>> {
  return put<Task>(`/tasks/${id}`, data);
}

export async function deleteTask(id: string): Promise<ApiResponse<void>> {
  return del<void>(`/tasks/${id}`);
}

export async function assignTask(
  id: string,
  data: AssignTaskRequest,
): Promise<ApiResponse<Task>> {
  return post<Task>(`/tasks/${id}/assign`, data);
}

export async function startTask(id: string): Promise<ApiResponse<Task>> {
  return post<Task>(`/tasks/${id}/start`);
}

export async function completeTask(
  id: string,
  data: CompleteTaskRequest,
): Promise<ApiResponse<Task>> {
  return post<Task>(`/tasks/${id}/complete`, data);
}

export async function addTaskTags(
  taskId: string,
  userIds: string[],
): Promise<ApiResponse<Task>> {
  const body: TagTaskRequest = { user_ids: userIds };
  return post<Task>(`/tasks/${taskId}/tag`, body);
}

export async function removeTaskTag(
  taskId: string,
  userId: string,
): Promise<ApiResponse<void>> {
  return del<void>(`/tasks/${taskId}/tag/${userId}`);
}

export default {
  createTask,
  getTasks,
  getMyTasks,
  getTaggedTasks,
  getTaskById,
  updateTask,
  deleteTask,
  assignTask,
  startTask,
  completeTask,
  addTaskTags,
  removeTaskTag,
};
