import { NotificationType } from '../entities/notification.entity';

/**
 * The notification types a user may toggle from the mobile preferences screen
 * (Phase 4-3, §D2). Maps the 9 spec-defined user-facing categories onto the
 * live `NotificationType` enum (spec's `task_revision` → `TASK_UPDATED`).
 *
 * Types NOT in this list (SYSTEM, ANNOUNCEMENT, REPORT_SUBMITTED, TASK_DECLINED)
 * are not user-configurable and always send — the enforcement check defaults to
 * enabled when no row exists, so they are unaffected.
 */
export const CONFIGURABLE_NOTIFICATION_TYPES: readonly NotificationType[] = [
  NotificationType.TASK_ASSIGNED,
  NotificationType.TASK_COMPLETED,
  NotificationType.TASK_UPDATED,
  NotificationType.ACTIVITY_APPROVED,
  NotificationType.ACTIVITY_REJECTED,
  NotificationType.OVERTIME_APPROVED,
  NotificationType.OVERTIME_REJECTED,
  NotificationType.MISSING_WORKER_ALERT,
  NotificationType.SHIFT_REMINDER,
] as const;
