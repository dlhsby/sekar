/**
 * Activity Constants for SEKAR Web Application
 * Shared status labels and badge variants
 */

import type { ActivityStatus } from '@/types/models';

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
