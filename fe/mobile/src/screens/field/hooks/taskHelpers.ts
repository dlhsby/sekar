/**
 * Task Helper Functions
 * Pure utility functions for audit event building
 * Status/priority formatting is centralized in src/utils/statusHelpers.ts
 */

import i18n from '../../../i18n/config';
import { nbColors } from '../../../constants/nbTokens';
import { toTitleCase } from '../../../utils/filterHelpers';
import type { Task } from '../../../types/models.types';
import type { User } from '../../../types/models.types';

export type AuditEvent = {
  key: string;
  event: string;
  timestamp: Date | string;
  icon: string;
  color: string;
  actor?: string;
  note?: string;
};

/** Format user display as "Role - Nama" */
export function formatUser(user: User | null | undefined): string {
  if (!user) return '—';
  return `${toTitleCase(user.role)} - ${user.full_name}`;
}

export function buildAuditEvents(task: Task | null): AuditEvent[] {
  if (!task) { return []; }
  const events: AuditEvent[] = [];

  events.push({
    key: 'created',
    event: i18n.t('tasks:audit.created'),
    timestamp: task.created_at,
    icon: 'plus-circle',
    color: nbColors.primary,
    actor: task.creator ? formatUser(task.creator) : undefined,
  });

  if (task.assigned_at) {
    events.push({
      key: 'assigned',
      event: i18n.t('tasks:audit.assigned'),
      timestamp: task.assigned_at,
      icon: 'account-arrow-right',
      color: nbColors.warningLight,
      actor: task.assignee ? formatUser(task.assignee) : undefined,
    });
  }

  if (task.accepted_at) {
    events.push({
      key: 'accepted',
      event: i18n.t('tasks:audit.accepted'),
      timestamp: task.accepted_at,
      icon: 'check-circle',
      color: nbColors.success,
      actor: task.assignee ? formatUser(task.assignee) : undefined,
    });
  }

  if (task.declined_at) {
    events.push({
      key: 'declined',
      event: i18n.t('tasks:audit.declined'),
      timestamp: task.declined_at,
      icon: 'close-circle',
      color: nbColors.danger,
      actor: task.assignee ? formatUser(task.assignee) : undefined,
      note: task.decline_reason ?? undefined,
    });
  }

  if (task.started_at) {
    events.push({
      key: 'started',
      event: i18n.t('tasks:audit.started'),
      timestamp: task.started_at,
      icon: 'play-circle',
      color: nbColors.primary,
      actor: task.assignee ? formatUser(task.assignee) : undefined,
    });
  }

  if (task.completed_at) {
    events.push({
      key: 'completed',
      event: i18n.t('tasks:audit.completed'),
      timestamp: task.completed_at,
      icon: 'check-all',
      color: nbColors.success,
      actor: task.assignee ? formatUser(task.assignee) : undefined,
    });
  }

  if (task.revision_reason && task.status === 'revision_needed') {
    events.push({
      key: 'revision',
      event: i18n.t('tasks:audit.revision'),
      timestamp: task.updated_at,
      icon: 'pencil-circle',
      color: nbColors.warningLight,
      actor: task.verifier ? formatUser(task.verifier) : undefined,
      note: task.revision_reason,
    });
  }

  if (task.verified_at) {
    events.push({
      key: 'verified',
      event: i18n.t('tasks:audit.verified'),
      timestamp: task.verified_at,
      icon: 'shield-check',
      color: nbColors.success,
      actor: task.verifier ? formatUser(task.verifier) : undefined,
    });
  }

  return events;
}
