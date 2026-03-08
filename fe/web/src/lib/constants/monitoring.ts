/**
 * Monitoring Constants (Phase 2D)
 * Single source of truth for status colors, labels, icons
 * WCAG 2.1 AA compliant hex colors
 */

import type { TrackingStatus } from '@/lib/api/monitoring';

// Spec-compliant WCAG 2.1 AA colors
export const STATUS_COLORS: Record<TrackingStatus, string> = {
  active: '#15803D',
  inactive: '#D97706',
  outside_area: '#9333EA',
  missing: '#DC2626',
  offline: '#6B7280',
};

export const STATUS_BG_COLORS: Record<TrackingStatus, string> = {
  active: '#DCFCE7',
  inactive: '#FEF3C7',
  outside_area: '#F3E8FF',
  missing: '#FEE2E2',
  offline: '#F3F4F6',
};

export const STATUS_TEXT_COLORS: Record<TrackingStatus, string> = {
  active: '#14532D',
  inactive: '#78350F',
  outside_area: '#581C87',
  missing: '#7F1D1D',
  offline: '#374151',
};

export const STATUS_LABELS: Record<TrackingStatus, string> = {
  active: 'Aktif',
  inactive: 'Idle',
  outside_area: 'Di Luar Area',
  missing: 'Tidak Terdeteksi',
  offline: 'Offline',
};

// Lucide icon names per status for color-blind accessibility
export const STATUS_ICON_NAMES: Record<TrackingStatus, string> = {
  active: 'check-circle',
  inactive: 'pause-circle',
  outside_area: 'arrow-up-right',
  missing: 'alert-triangle',
  offline: 'circle-off',
};

// Role marker icon mapping
export const ROLE_MARKER_ICONS: Record<string, string> = {
  satgas: 'user',
  linmas: 'shield',
  korlap: 'star',
  admin_data: 'database',
  kepala_rayon: 'crown',
  top_management: 'building',
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
    bg: 'bg-[var(--color-status-active-bg)] hover:bg-[#BBF7D0]',
    activeBg: 'bg-[var(--color-status-active)]',
    text: 'text-white',
    dot: 'bg-[var(--color-status-active)]',
  },
  inactive: {
    bg: 'bg-[var(--color-status-idle-bg)] hover:bg-[#FDE68A]',
    activeBg: 'bg-[var(--color-status-idle)]',
    text: 'text-white',
    dot: 'bg-[var(--color-status-idle)]',
  },
  outside_area: {
    bg: 'bg-[var(--color-status-outside-bg)] hover:bg-[#E9D5FF]',
    activeBg: 'bg-[var(--color-status-outside)]',
    text: 'text-white',
    dot: 'bg-[var(--color-status-outside)]',
  },
  missing: {
    bg: 'bg-[var(--color-status-missing-bg)] hover:bg-[#FECACA]',
    activeBg: 'bg-[var(--color-status-missing)]',
    text: 'text-white',
    dot: 'bg-[var(--color-status-missing)]',
  },
  offline: {
    bg: 'bg-[var(--color-status-offline-bg)] hover:bg-[#E5E7EB]',
    activeBg: 'bg-[var(--color-status-offline)]',
    text: 'text-white',
    dot: 'bg-[var(--color-status-offline)]',
  },
};

// Tailwind class for status dot in user list
export const STATUS_DOT_CLASSES: Record<TrackingStatus, string> = {
  active: 'bg-[var(--color-status-active)]',
  inactive: 'bg-[var(--color-status-idle)]',
  outside_area: 'bg-[var(--color-status-outside)]',
  missing: 'bg-[var(--color-status-missing)] animate-pulse',
  offline: 'bg-[var(--color-status-offline)]',
};

// Tailwind classes for status badges
export const STATUS_BADGE_CLASSES: Record<TrackingStatus, string> = {
  active: 'bg-[var(--color-status-active-bg)] text-[#14532D] border-[var(--color-status-active)]',
  inactive: 'bg-[var(--color-status-idle-bg)] text-[#78350F] border-[var(--color-status-idle)]',
  outside_area: 'bg-[var(--color-status-outside-bg)] text-[#581C87] border-[var(--color-status-outside)]',
  missing: 'bg-[var(--color-status-missing-bg)] text-[#7F1D1D] border-[var(--color-status-missing)]',
  offline: 'bg-[var(--color-status-offline-bg)] text-[#374151] border-[var(--color-status-offline)]',
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
  top_management: 'TM',
  admin_system: 'ADM',
  admin_data: 'AD',
  superadmin: 'SA',
};

// Full role labels for expanded marker labels
export const ROLE_FULL_LABELS: Record<string, string> = {
  satgas: 'Satgas',
  linmas: 'Linmas',
  korlap: 'Korlap',
  kepala_rayon: 'Kepala Rayon',
  top_management: 'Top Mgmt',
  admin_system: 'Admin',
  admin_data: 'Admin Data',
  superadmin: 'Superadmin',
};

// Polygon styles for boundary layers
export const POLYGON_STYLES = {
  rayon: { fill: '#60A5FA', fillOpacity: 0.08, stroke: '#2563EB', strokeWidth: 3, dashArray: [6, 4] },
  area: { fill: '#FBBF24', fillOpacity: 0.15, stroke: '#1C1917', strokeWidth: 2 },
} as const;

// Center marker styles for polygon centroids
export const CENTER_MARKER_STYLES = {
  rayon: { bg: '#2563EB', size: 32, label: 'R' },
  area: { bg: '#D97706', size: 28, label: 'A' },
} as const;

// Day type labels and colors
export const DAY_TYPE_LABELS: Record<string, { label: string; color: string; bg: string }> = {
  weekday: { label: 'Hari Kerja', color: '#15803D', bg: '#DCFCE7' },
  weekend: { label: 'Akhir Pekan', color: '#D97706', bg: '#FEF3C7' },
  holiday: { label: 'Hari Libur', color: '#DC2626', bg: '#FEE2E2' },
};

// Status severity order (most severe first) for sorting
export const STATUS_SEVERITY_ORDER: TrackingStatus[] = [
  'missing',
  'outside_area',
  'inactive',
  'active',
  'offline',
];

// Map zoom breakpoints for marker labels
export const ZOOM_BREAKPOINTS = {
  noLabel: 14,
  abbreviated: 15,
  full: 16,
} as const;

// Cluster color thresholds
export const CLUSTER_COLORS = {
  critical: '#DC2626',   // Has missing users
  warning: '#D97706',    // Has outside_area users
  normal: '#15803D',     // All active/inactive
  neutral: '#6B7280',    // All offline
} as const;
