/**
 * Task Constants for SEKAR Web Application
 * 8-status system with verification workflow
 *
 * Labels are now localized via i18n (tasks:status.* and tasks:priority.*)
 * Use getTaskStatusLabel(status, t) instead of TASK_STATUS_LABELS[status]
 */

import i18n from '@/lib/i18n/config';
import type { TaskStatus, TaskPriority } from '@/lib/api/tasks';

/** Get localized task status label. Call at render time with useTranslation() hook. */
export function getTaskStatusLabel(status: TaskStatus, t?: (key: string) => string): string {
  const translate = t || i18n.t;
  return translate(`tasks:status.${status}`);
}

/** Get localized task priority label. Call at render time with useTranslation() hook. */
export function getTaskPriorityLabel(priority: TaskPriority, t?: (key: string) => string): string {
  const translate = t || i18n.t;
  return translate(`tasks:priority.${priority}`);
}

/** Get localized kanban lane label. Call at render time with useTranslation() hook. */
export function getKanbanLaneLabel(laneKey: string, t?: (key: string) => string): string {
  const translate = t || i18n.t;
  return translate(`tasks:lanes.${laneKey}`);
}

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
 *
 * Call getKanbanLaneLabel(lane.key, t) at render time to get localized labels.
 */
export interface KanbanLane {
  key: string;
  tone: PillTone;
  statuses: TaskStatus[];
}

export const TASK_KANBAN_LANES: KanbanLane[] = [
  { key: 'todo', tone: 'neutral', statuses: ['pending', 'assigned', 'declined'] },
  { key: 'ready', tone: 'warn', statuses: ['accepted', 'revision_needed'] },
  { key: 'doing', tone: 'active', statuses: ['in_progress'] },
  { key: 'done', tone: 'ok', statuses: ['completed', 'verified'] },
];
