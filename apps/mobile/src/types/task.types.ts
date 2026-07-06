/**
 * Tasks and task tags.
 * Phase 2C: accept/decline + verify/revision support, optional area_id, rayon support.
 */
import type { Area, Rayon, User } from './user.types';

// Task status - 8 values (Phase 2C: accept/decline + verify/revision)
export type TaskStatus =
  | 'pending'
  | 'assigned'
  | 'accepted'
  | 'declined'
  | 'in_progress'
  | 'completed'
  | 'verified'
  | 'revision_needed';

// Task priority
export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';

// Task Tag (Phase 2C)
export interface TaskTag {
  id: string;
  task_id: string;
  user_id: string;
  user?: User;
  created_at: string;
}

// Task (Phase 2C: accept/decline + verify/revision support, optional area_id, rayon support)
export interface Task {
  id: string;
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  deadline?: string;
  area_id?: string;
  area?: Area;
  rayon_id?: string;
  rayon?: Rayon;
  assigned_to?: string;
  assignee?: User;
  created_by: string;
  creator?: User;
  completion_photo_urls?: string[];
  completion_notes?: string;
  completed_at?: string;
  started_at?: string;
  assigned_at?: string;
  accepted_at?: string;
  declined_at?: string;
  decline_reason?: string;
  verified_by?: string;
  verifier?: User;
  verified_at?: string;
  revision_reason?: string;
  tags?: TaskTag[];
  created_at: string;
  updated_at: string;
}
