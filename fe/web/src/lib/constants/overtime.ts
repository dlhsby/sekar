/**
 * Overtime Constants for SEKAR Web Application
 * Shared status labels and badge variants
 */

import i18n from '@/lib/i18n/config';
import type { OvertimeStatus } from '@/types/models';

export function getOvertimeStatusLabels(): Record<OvertimeStatus, string> {
  return {
    pending: i18n.t('status:pending'),
    approved: i18n.t('status:approved'),
    rejected: i18n.t('status:rejected'),
  };
}

export const OVERTIME_STATUS_BADGES: Record<OvertimeStatus, 'warning' | 'success' | 'destructive'> =
  {
    pending: 'warning',
    approved: 'success',
    rejected: 'destructive',
  };
