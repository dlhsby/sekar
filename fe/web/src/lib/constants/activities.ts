/**
 * Activity Constants for SEKAR Web Application
 * Shared status labels and badge variants
 */

import i18n from '@/lib/i18n/config';
import type { ActivityStatus } from '@/types/models';

export function getActivityStatusLabels(): Record<ActivityStatus, string> {
  return {
    pending: i18n.t('status:pending'),
    approved: i18n.t('status:approved'),
    rejected: i18n.t('status:rejected'),
  };
}

/**
 * @deprecated Use getActivityStatusLabels() instead
 */
export const ACTIVITY_STATUS_LABELS: Record<ActivityStatus, string> = {
  pending: 'Menunggu',
  approved: 'Disetujui',
  rejected: 'Ditolak',
};

export const ACTIVITY_STATUS_BADGES: Record<ActivityStatus, 'warning' | 'success' | 'destructive'> =
  {
    pending: 'warning',
    approved: 'success',
    rejected: 'destructive',
  };
