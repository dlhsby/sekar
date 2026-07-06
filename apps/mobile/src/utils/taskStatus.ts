/**
 * Shared task-status presentation helpers — the "today's tasks" surfaces
 * (Home Ringkasan tile + TodayTasksModal) map a `TaskStatus` to a status-pill
 * tone + localized label.
 */
import i18n from '../i18n/config';
import type { StatusTone } from '../components/home/StatusPill';
import type { TaskStatus } from '../types/models.types';

/** Active (actionable) task statuses surfaced under "Tugas hari ini". */
export const ACTIVE_TASK_STATUSES: TaskStatus[] = [
  'pending',
  'assigned',
  'accepted',
  'in_progress',
  'revision_needed',
];

/**
 * "Tugas hari ini" scope — any task whose deadline, creation, or completion
 * falls on the current local day. Status-agnostic (all statuses included),
 * so Home and Monitoring share the same definition and produce the same count.
 */
export function isTaskScopedToday(task: { deadline?: string; created_at?: string; completed_at?: string }): boolean {
  const now = new Date();
  const sod = new Date(now); sod.setHours(0, 0, 0, 0);
  const eod = new Date(now); eod.setHours(23, 59, 59, 999);
  const within = (iso?: string): boolean => {
    if (!iso) { return false; }
    const t = new Date(iso).getTime();
    return t >= sod.getTime() && t <= eod.getTime();
  };
  return within(task.deadline) || within(task.created_at) || within(task.completed_at);
}

/** Map a task status to a StatusPill tone + localized label. */
export function taskPill(status: TaskStatus): { tone: StatusTone; label: string } {
  switch (status) {
    case 'in_progress':
      return { tone: 'ok', label: i18n.t('status:taskPill.in_progress') };
    case 'assigned':
    case 'accepted':
      return { tone: 'warn', label: i18n.t('status:taskPill.readyToStart') };
    case 'revision_needed':
      return { tone: 'bad', label: i18n.t('status:taskPill.revision_needed') };
    case 'completed':
      return { tone: 'info', label: i18n.t('status:taskPill.awaiting_verification') };
    case 'verified':
      return { tone: 'ok', label: i18n.t('status:taskPill.verified') };
    case 'declined':
      return { tone: 'bad', label: i18n.t('status:taskPill.declined') };
    default:
      return { tone: 'neutral', label: i18n.t('status:taskPill.pending') };
  }
}
