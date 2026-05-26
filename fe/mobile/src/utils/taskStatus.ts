/**
 * Shared task-status presentation helpers — the "today's tasks" surfaces
 * (Home Ringkasan tile + TodayTasksModal) map a `TaskStatus` to a status-pill
 * tone + Indonesian label the same way.
 */
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

/** Map a task status to a StatusPill tone + Indonesian label. */
export function taskPill(status: TaskStatus): { tone: StatusTone; label: string } {
  switch (status) {
    case 'in_progress':
      return { tone: 'ok', label: 'Berjalan' };
    case 'assigned':
    case 'accepted':
      return { tone: 'warn', label: 'Siap mulai' };
    case 'revision_needed':
      return { tone: 'bad', label: 'Revisi' };
    default:
      return { tone: 'neutral', label: 'Menunggu' };
  }
}
