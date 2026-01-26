/**
 * Tasks API Service
 *
 * Handles all task-related API calls for Phase 2 task management.
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
  DeclineTaskRequest,
  CompleteTaskRequest,
} from '../../types/api.types';

/**
 * Create a new task
 */
export async function createTask(
  data: CreateTaskRequest,
): Promise<ApiResponse<Task>> {
  return post<Task>('/tasks', data);
}

/**
 * Get list of tasks with optional filters
 */
export async function getTasks(
  filters?: TasksFilter & { page?: number; limit?: number },
): Promise<ApiResponse<TasksListResponse>> {
  return get<TasksListResponse>('/tasks', filters);
}

/**
 * Get my assigned tasks (Worker/Linmas)
 */
export async function getMyTasks(
  filters?: { status?: string; page?: number; limit?: number },
): Promise<ApiResponse<TasksListResponse>> {
  return get<TasksListResponse>('/tasks/my-tasks', filters);
}

/**
 * Get task by ID
 */
export async function getTaskById(id: string): Promise<ApiResponse<Task>> {
  return get<Task>(`/tasks/${id}`);
}

/**
 * Update task
 */
export async function updateTask(
  id: string,
  data: UpdateTaskRequest,
): Promise<ApiResponse<Task>> {
  return put<Task>(`/tasks/${id}`, data);
}

/**
 * Delete task
 */
export async function deleteTask(id: string): Promise<ApiResponse<void>> {
  return del<void>(`/tasks/${id}`);
}

/**
 * Assign task to worker
 */
export async function assignTask(
  id: string,
  data: AssignTaskRequest,
): Promise<ApiResponse<Task>> {
  return post<Task>(`/tasks/${id}/assign`, data);
}

/**
 * Accept assigned task (Worker)
 */
export async function acceptTask(id: string): Promise<ApiResponse<Task>> {
  return post<Task>(`/tasks/${id}/accept`);
}

/**
 * Decline assigned task (Worker)
 */
export async function declineTask(
  id: string,
  data: DeclineTaskRequest,
): Promise<ApiResponse<Task>> {
  return post<Task>(`/tasks/${id}/decline`, data);
}

/**
 * Start working on task
 */
export async function startTask(id: string): Promise<ApiResponse<Task>> {
  return post<Task>(`/tasks/${id}/start`);
}

/**
 * Complete task with photo and GPS
 */
export async function completeTask(
  id: string,
  data: CompleteTaskRequest,
): Promise<ApiResponse<Task>> {
  return post<Task>(`/tasks/${id}/complete`, data);
}

export default {
  createTask,
  getTasks,
  getMyTasks,
  getTaskById,
  updateTask,
  deleteTask,
  assignTask,
  acceptTask,
  declineTask,
  startTask,
  completeTask,
};
