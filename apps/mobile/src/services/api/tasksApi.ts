/**
 * Tasks API Service
 * Phase 2C: accept/decline + verify/revision support, tagging support
 */

import { get, post, put, del, patch } from './apiClient';
import type { ApiResponse } from '../../types/api.types';
import type {
  TasksFilter,
  TasksListResponse,
  CreateTaskRequest,
  UpdateTaskRequest,
  AssignTaskRequest,
  CompleteTaskRequest,
  TagTaskRequest,
  DeclineTaskRequest,
  RequestRevisionRequest,
} from '../../types/api.types';
import type { Task } from '../../types/models.types';

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
  filters?: {
    status?: string;
    deadline_after?: string;
    deadline_before?: string;
    created_after?: string;
    created_before?: string;
    sort_by?: string;
    sort_dir?: 'asc' | 'desc';
    page?: number;
    limit?: number;
    // May 12 — scope=assigned returns only tasks where the caller is
    // the current assignee; scope=created returns only tasks the caller
    // created. Omit (or 'all') for the legacy union behavior.
    scope?: 'assigned' | 'created' | 'all';
  },
): Promise<ApiResponse<TasksListResponse>> {
  return get<TasksListResponse>('/tasks/my-tasks', filters);
}

export async function getTaggedTasks(
  filters?: {
    status?: string;
    deadline_after?: string;
    deadline_before?: string;
    created_after?: string;
    created_before?: string;
    sort_by?: string;
    sort_dir?: 'asc' | 'desc';
    page?: number;
    limit?: number;
  },
): Promise<ApiResponse<TasksListResponse>> {
  return get<TasksListResponse>('/tasks/tagged', filters);
}

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

export async function getTaskDelegations(
  id: string,
): Promise<ApiResponse<TaskDelegation[]>> {
  return get<TaskDelegation[]>(`/tasks/${id}/delegations`);
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

export async function acceptTask(id: string): Promise<ApiResponse<Task>> {
  return post<Task>(`/tasks/${id}/accept`);
}

export async function declineTask(
  id: string,
  data: DeclineTaskRequest,
): Promise<ApiResponse<Task>> {
  return post<Task>(`/tasks/${id}/decline`, data);
}

export async function verifyTask(id: string): Promise<ApiResponse<Task>> {
  return patch<Task>(`/tasks/${id}/verify`);
}

export async function requestRevision(
  id: string,
  data: RequestRevisionRequest,
): Promise<ApiResponse<Task>> {
  return patch<Task>(`/tasks/${id}/revision`, data);
}

/**
 * Partial-complete a task — updates completed_plant_count, optionally spawns child task.
 * Phase 3 3-6: Task typing support
 */
export async function partialCompleteTask(
  id: string,
  data: {
    completed_count: number;
    plant_items?: Array<{ species_id: string; count: number }>;
    notes?: string;
    resume_tomorrow?: boolean;
  },
): Promise<ApiResponse<{ task: Task; child_task_id?: string }>> {
  return post<{ task: Task; child_task_id?: string }>(`/tasks/${id}/partial-complete`, data);
}

/**
 * Resume a task — spawns child task with remaining target_plant_count.
 * Phase 3 3-6: Task typing support
 */
export async function resumeTask(id: string): Promise<ApiResponse<Task>> {
  return post<Task>(`/tasks/${id}/resume`);
}

/**
 * Get task lineage — parent chain plus child tasks.
 * Phase 3 3-6: Task typing support
 */
export async function getTaskLineage(id: string): Promise<ApiResponse<{ parent?: Task; task: Task; children: Task[] }>> {
  return get<{ parent?: Task; task: Task; children: Task[] }>(`/tasks/${id}/lineage`);
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
  acceptTask,
  declineTask,
  verifyTask,
  requestRevision,
  partialCompleteTask,
  resumeTask,
  getTaskLineage,
};
