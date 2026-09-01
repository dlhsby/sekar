/**
 * Monitoring Constants (Phase 2D)
 * Single source of truth for status colors, labels, icons
 * WCAG 2.1 AA compliant hex colors
 */

import i18n from '@/lib/i18n/config';
import type { TrackingStatus } from '@/lib/api/monitoring';

// Canonical tracking-status colors (specs/design-system/tokens.json → status.*), kept in
// sync with mobile's nbColors.status* so map markers read identically on both
// platforms. Used for Google map marker fills (which can't read CSS vars).
// Status: active (clocked in + GPS fresh) | offline (clocked in but unreachable)
// | absent (not clocked in). Axis: is_within_area (inside/outside area bounds).
export const STATUS_COLORS: Record<TrackingStatus, string> = {
  active: '#15803D',
  offline: '#4B5563',
  absent: '#B91C1C',
};

export const STATUS_BG_COLORS: Record<TrackingStatus, string> = {
  active: '#DCFCE7',
  offline: '#F3F4F6',
  absent: '#FEE2E2',
};

export const STATUS_TEXT_COLORS: Record<TrackingStatus, string> = {
  active: '#14532D',
  offline: '#374151',
  absent: '#7F1D1D',
};

export function getStatusLabels(): Record<TrackingStatus, string> {
  return {
    active: i18n.t('status:tracking.active'),
    offline: i18n.t('status:tracking.offline'),
    absent: i18n.t('status:tracking.absent'),
  };
}

// Lucide icon names per status for color-blind accessibility
export const STATUS_ICON_NAMES: Record<TrackingStatus, string> = {
  active: 'check-circle',
  offline: 'circle-off',
  absent: 'alert-triangle',
};

// Role marker icon mapping
export const ROLE_MARKER_ICONS: Record<string, string> = {
  satgas: 'user',
  linmas: 'shield',
  korlap: 'star',
  admin_rayon: 'database',
  kepala_rayon: 'crown',
  management: 'building',
  admin_system: 'settings',
  superadmin: 'key',
};

// Action button colors
export const ACTION_COLORS = {
  whatsapp: '#25D366',
  call: '#3B82F6',
  trail: '#9333EA',
};

// Tailwind class mappings for status colors (using CSS variables)
export const STATUS_CARD_STYLES: Record<
  TrackingStatus,
  { bg: string; activeBg: string; text: string; dot: string }
> = {
  active: {
    bg: 'bg-[var(--color-status-active-bg)] hover:bg-[var(--color-status-active)]/20',
    activeBg: 'bg-[var(--color-status-active)]',
    text: 'text-white',
    dot: 'bg-[var(--color-status-active)]',
  },
  // `offline` now means "clocked in but unreachable" — an attention state — so it
  // takes the amber `idle` token. The grey `offline` token used to mean "not on
  // shift"; that meaning moved to `absent`, which reuses the red `missing` token.
  // No `--color-status-absent*` token exists and none was invented here.
  offline: {
    bg: 'bg-[var(--color-status-idle-bg)] hover:bg-[var(--color-status-idle)]/20',
    activeBg: 'bg-[var(--color-status-idle)]',
    text: 'text-white',
    dot: 'bg-[var(--color-status-idle)]',
  },
  absent: {
    bg: 'bg-[var(--color-status-missing-bg)] hover:bg-[var(--color-status-missing)]/20',
    activeBg: 'bg-[var(--color-status-missing)]',
    text: 'text-white',
    dot: 'bg-[var(--color-status-missing)]',
  },
};

// Tailwind class for status dot in user list
export const STATUS_DOT_CLASSES: Record<TrackingStatus, string> = {
  active: 'bg-[var(--color-status-active)]',
  offline: 'bg-[var(--color-status-idle)] animate-pulse',
  absent: 'bg-[var(--color-status-missing)]',
};

// Tailwind classes for status badges.
// Foreground uses the paired `--color-status-*` token (not a hardcoded hex) so
// it inverts with the `-bg` token in dark mode and keeps contrast on the tint.
export const STATUS_BADGE_CLASSES: Record<TrackingStatus, string> = {
  active:
    'bg-[var(--color-status-active-bg)] text-[var(--color-status-active)] border-[var(--color-status-active)]',
  offline:
    'bg-[var(--color-status-idle-bg)] text-[var(--color-status-idle)] border-[var(--color-status-idle)]',
  absent:
    'bg-[var(--color-status-missing-bg)] text-[var(--color-status-missing)] border-[var(--color-status-missing)]',
};

// ---------------------------------------------------------------------------
// Phase 2D-10 Gap Fix Constants
// ---------------------------------------------------------------------------

// Role abbreviations for map marker labels
export const ROLE_ABBREVIATIONS: Record<string, string> = {
  satgas: 'STG',
  linmas: 'LMS',
  korlap: 'KLP',
  kepala_rayon: 'KR',
  management: 'TM',
  admin_system: 'ADM',
  admin_rayon: 'AD',
  superadmin: 'SA',
};

// Polygon styles for boundary layers
export const POLYGON_STYLES = {
  district: {
    fill: '#60A5FA',
    fillOpacity: 0.08,
    stroke: '#2563EB',
    strokeWidth: 3,
    dashArray: [6, 4],
  },
  area: { fill: '#FBBF24', fillOpacity: 0.15, stroke: '#1C1917', strokeWidth: 2 },
} as const;

// Center marker styles for polygon centroids
export const CENTER_MARKER_STYLES = {
  district: { bg: '#2563EB', size: 32, label: 'R' },
  area: { bg: '#D97706', size: 28, label: 'A' },
} as const;

export function getDayTypeLabels(): Record<string, { label: string; color: string; bg: string }> {
  return {
    weekday: { label: i18n.t('status:dayType.weekday'), color: '#15803D', bg: '#DCFCE7' },
    weekend: { label: i18n.t('status:dayType.weekend'), color: '#D97706', bg: '#FEF3C7' },
    holiday: { label: i18n.t('status:dayType.holiday'), color: '#DC2626', bg: '#FEE2E2' },
  };
}

// Status severity order (most severe first) for sorting
export const STATUS_SEVERITY_ORDER: TrackingStatus[] = [
  'absent',
  'offline',
  'active',
];

// Map zoom breakpoints for marker labels
export const ZOOM_BREAKPOINTS = {
  noLabel: 14,
  abbreviated: 15,
  full: 16,
} as const;

// Cluster color thresholds
export const CLUSTER_COLORS = {
  critical: '#DC2626', // Has absent users (most severe)
  warning: '#4B5563', // Has offline users
  normal: '#15803D', // All active
  neutral: '#6B7280', // Edge case
} as const;
