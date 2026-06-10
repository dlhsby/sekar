/**
 * Task Constants for SEKAR Web Application
 * 8-status system with verification workflow
 */

import type { TaskStatus, TaskPriority } from '@/lib/api/tasks';

export const TASK_STATUS_LABELS: Record<TaskStatus, string> = {
  pending: 'Pending',
  assigned: 'Ditugaskan',
  accepted: 'Diterima',
  declined: 'Ditolak',
  in_progress: 'Sedang Dikerjakan',
  completed: 'Selesai',
  verified: 'Terverifikasi',
  revision_needed: 'Perlu Revisi',
};

export const TASK_STATUS_BADGES: Record<
  TaskStatus,
  'secondary' | 'default' | 'success' | 'warning' | 'destructive'
> = {
  pending: 'secondary',
  assigned: 'default',
  accepted: 'default',
  declined: 'destructive',
  in_progress: 'warning',
  completed: 'success',
  verified: 'success',
  revision_needed: 'destructive',
};

type PillTone = 'neutral' | 'ok' | 'warn' | 'bad' | 'info' | 'active';

/** StatusPill tone per task status — v2.1 status palette (TSK-1 + detail). */
export const TASK_STATUS_TONES: Record<TaskStatus, PillTone> = {
  pending: 'neutral',
  assigned: 'info',
  accepted: 'info',
  declined: 'bad',
  in_progress: 'active',
  completed: 'ok',
  verified: 'ok',
  revision_needed: 'warn',
};

export const TASK_PRIORITY_LABELS: Record<TaskPriority, string> = {
  low: 'Rendah',
  normal: 'Normal',
  high: 'Tinggi',
  urgent: 'Mendesak',
};

export const TASK_PRIORITY_TONES: Record<TaskPriority, PillTone> = {
  low: 'neutral',
  normal: 'info',
  high: 'warn',
  urgent: 'bad',
};

/**
 * The 4 kanban lanes (TSK-1, hifi-web §06) collapse the 8-status workflow into
 * the same coarse buckets the board shows: Belum mulai · Siap mulai · Dikerjakan
 * · Selesai. Declined folds into "Belum mulai" (awaits reassignment);
 * revision_needed into "Siap mulai" (work to redo).
 */
export interface KanbanLane {
  key: string;
  label: string;
  tone: PillTone;
  statuses: TaskStatus[];
}

export const TASK_KANBAN_LANES: KanbanLane[] = [
  { key: 'todo', label: 'Belum mulai', tone: 'neutral', statuses: ['pending', 'assigned', 'declined'] },
  { key: 'ready', label: 'Siap mulai', tone: 'warn', statuses: ['accepted', 'revision_needed'] },
  { key: 'doing', label: 'Sedang dikerjakan', tone: 'active', statuses: ['in_progress'] },
  { key: 'done', label: 'Selesai', tone: 'ok', statuses: ['completed', 'verified'] },
];
