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
