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
  assigned: 'Ditugaskan',
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
  assigned: 'default',
  in_progress: 'default',
  done: 'success',
  cancelled: 'secondary',
};

/**
 * StatusPill tone per pruning status — the v2.1 status palette (mirrors the
 * 5-status monitoring tones). Used by the detail revamp, the admin list, and
 * the kecamatan "Permintaan Saya" list so the chip colour is identical
 * everywhere a pruning status is shown.
 */
export const PRUNING_REQUEST_STATUS_TONES: Record<
  PruningRequestStatus,
  'neutral' | 'ok' | 'warn' | 'bad' | 'info' | 'active'
> = {
  submitted: 'warn',
  under_review: 'info',
  approved: 'ok',
  rejected: 'bad',
  assigned: 'info',
  in_progress: 'active',
  done: 'ok',
  cancelled: 'neutral',
};

/** Roles allowed to view + disposition pruning requests on the web dashboard. */
export const PRUNING_REQUEST_ADMIN_ROLES = [
  'admin_data',
  'kepala_rayon',
  'top_management',
  'admin_system',
  'superadmin',
] as const;
