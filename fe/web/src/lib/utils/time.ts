/**
 * Locale-aware relative-time formatting (web mirror of the mobile
 * NotificationsScreen helper). Used by the notification bell + inbox.
 */
import i18n from '@/lib/i18n/config';
import { intlLocale } from '@/lib/i18n/date-locale';

export function formatRelativeTime(iso: string): string {
  try {
    const then = new Date(iso).getTime();
    if (Number.isNaN(then)) return '';
    const diffSec = Math.floor((Date.now() - then) / 1000);
    if (diffSec < 60) return i18n.t('common:time.relativeJustNow');
    if (diffSec < 3600) return i18n.t('common:time.relativeMinutesAgo', { count: Math.floor(diffSec / 60) });
    if (diffSec < 86400) return i18n.t('common:time.relativeHoursAgo', { count: Math.floor(diffSec / 3600) });
    if (diffSec < 7 * 86400) return i18n.t('common:time.relativeDaysAgo', { count: Math.floor(diffSec / 86400) });
    return new Date(iso).toLocaleDateString(intlLocale(), {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return '';
  }
}

/** Absolute date in Indonesian (e.g. "15 Jan 2026"). Returns '-' for empty/invalid. */
export function formatDate(iso?: string | Date | null): string {
  if (!iso) return '-';
  const d = iso instanceof Date ? iso : new Date(iso);
  if (Number.isNaN(d.getTime())) return '-';
  return d.toLocaleDateString(intlLocale(), { day: 'numeric', month: 'short', year: 'numeric' });
}
