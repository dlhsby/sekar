/**
 * Pruning Request status helpers — localized via i18n (pruning:list.statuses.*)
 * and badge variants for the dashboard pages. Mirrors the mobile constants so
 * labels stay in lockstep across platforms.
 */

import i18n from '@/lib/i18n/config';
import type { PruningRequestStatus } from '@/lib/api/pruning-requests';

/** Get localized pruning request status label. Call at render time with useTranslation() hook. */
export function getPruningRequestStatusLabel(status: PruningRequestStatus, t?: (key: string) => string): string {
  const translate = t || i18n.t;
  return translate(`pruning:list.statuses.${status}`);
}

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
