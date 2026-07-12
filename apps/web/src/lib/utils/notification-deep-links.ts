/**
 * Notification deep-link router (web).
 *
 * Maps a notification's `type` + `data` payload to the dashboard route that
 * shows the underlying entity. Mirrors the mobile FCM tap-routing
 * (RootNavigator / NotificationsScreen) and the mobile.md §B7 matrix.
 *
 * Backend `data` payload keys (verified in apps/be/src triggers):
 *   task_id · activity_id · overtime_id · pruning_request_id ·
 *   worker_user_id · location_id · shift_definition_id
 */

import type { AppNotification } from '@/lib/api/notifications';

const asId = (value: unknown): string | undefined =>
  typeof value === 'string' && value.length > 0 ? value : undefined;

/**
 * Resolve the in-app destination for a notification, or `null` when there is
 * no specific entity to open (e.g. a generic system announcement).
 */
export function notificationToRoute(notification: AppNotification): string | null {
  const data = (notification.data ?? {}) as Record<string, unknown>;

  const taskId = asId(data.task_id);
  if (taskId) return `/tasks/${taskId}`;

  const activityId = asId(data.activity_id);
  if (activityId) return `/activities/${activityId}`;

  const overtimeId = asId(data.overtime_id);
  if (overtimeId) return `/overtime/${overtimeId}`;

  const pruningId = asId(data.pruning_request_id);
  if (pruningId) return `/pruning-requests/${pruningId}`;

  const workerId = asId(data.worker_user_id);
  if (workerId) return `/monitoring?focus=${workerId}`;

  // Fall back on the type when the payload omits an explicit entity id — this is
  // the case for seeded/demo notifications (their `data` is null by design), so
  // every tugas/aktivitas/lembur notification still opens its relevant section.
  switch (notification.type) {
    case 'task_assigned':
    case 'task_updated':
    case 'task_completed':
    case 'task_declined':
      return '/tasks';
    case 'activity_approved':
    case 'activity_rejected':
    case 'activity_tagged':
      return '/activities';
    case 'overtime_approved':
    case 'overtime_rejected':
      return '/overtime';
    case 'report_submitted':
      return '/activities';
    case 'shift_reminder':
      return '/schedules';
    case 'missing_worker_alert':
      return '/monitoring';
    case 'area_plant_overdue':
      return '/plants';
    default:
      return null;
  }
}
