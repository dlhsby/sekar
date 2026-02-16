/**
 * Overtime Constants for SEKAR Web Application
 * Shared status labels and badge variants
 */

import type { OvertimeStatus } from '@/types/models';

export const OVERTIME_STATUS_LABELS: Record<OvertimeStatus, string> = {
  pending: 'Menunggu',
  approved: 'Disetujui',
  rejected: 'Ditolak',
};

export const OVERTIME_STATUS_BADGES: Record<OvertimeStatus, 'warning' | 'success' | 'destructive'> = {
  pending: 'warning',
  approved: 'success',
  rejected: 'destructive',
};
