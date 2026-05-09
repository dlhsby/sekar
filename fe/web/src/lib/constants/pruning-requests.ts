/**
 * Pruning Request status helpers — Indonesian labels and badge variants
 * for the dashboard pages. Mirrors the mobile constants so labels stay in
 * lockstep across platforms.
 */

import type { PruningRequestStatus } from '@/lib/api/pruning-requests';

export const PRUNING_REQUEST_STATUS_LABELS: Record<PruningRequestStatus, string> = {
  submitted: 'Terkirim',
  under_review: 'Sedang Ditinjau',
  approved: 'Disetujui',
  rejected: 'Ditolak',
  converted: 'Dijadwalkan',
  in_progress: 'Sedang Dikerjakan',
  done: 'Selesai',
  cancelled: 'Dibatalkan',
};

export const PRUNING_REQUEST_STATUS_BADGES: Record<
  PruningRequestStatus,
  'default' | 'secondary' | 'success' | 'warning' | 'destructive'
> = {
  submitted: 'warning',
  under_review: 'warning',
  approved: 'success',
  rejected: 'destructive',
  converted: 'default',
  in_progress: 'default',
  done: 'success',
  cancelled: 'secondary',
};

/** Roles allowed to view + disposition pruning requests on the web dashboard. */
export const PRUNING_REQUEST_ADMIN_ROLES = [
  'admin_data',
  'kepala_rayon',
  'top_management',
  'admin_system',
  'superadmin',
] as const;
