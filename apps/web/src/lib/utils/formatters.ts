/**
 * Shared formatting utilities for monitoring components
 */
import { intlLocale } from '@/lib/i18n/date-locale';
import i18n from '@/lib/i18n/config';

export function formatRelativeTime(isoString: string): string {
  const diff = Date.now() - new Date(isoString).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return i18n.t('common:time.relativeJustNow');
  if (minutes < 60) return i18n.t('common:time.relativeMinutesAgo', { count: minutes });
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return i18n.t('common:time.relativeHoursAgo', { count: hours });
  return i18n.t('common:time.relativeDaysAgo', { count: Math.floor(hours / 24) });
}

export function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  const hShort = i18n.t('common:time.hoursShort');
  const mShort = i18n.t('common:time.minutesShort');
  if (h === 0) return `${m}${mShort}`;
  return `${h}${hShort} ${m}${mShort}`;
}

export function formatTime(isoString: string): string {
  return new Date(isoString).toLocaleTimeString(intlLocale(), {
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatTimeWithSeconds(isoString: string): string {
  return new Date(isoString).toLocaleTimeString(intlLocale(), {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

export function formatDistance(meters: number): string {
  if (meters < 1000) return `${Math.round(meters)}m`;
  return `${(meters / 1000).toFixed(1)}km`;
}

export function formatMinutes(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  const hShort = i18n.t('common:time.hoursShort');
  const mShort = i18n.t('common:time.minutesShort');
  if (h === 0) return `${m}${mShort}`;
  return `${h}${hShort} ${m}${mShort}`;
}

/**
 * Today's date in Asia/Jakarta as `YYYY-MM-DD` (for `<input type="date">`
 * defaults). Plain `toISOString()` is the UTC date, which is yesterday
 * between 00:00-07:00 WIB. WIB has no DST so a fixed +7h shift is exact.
 */
export function todayJakartaISODate(now: Date = new Date()): string {
  return new Date(now.getTime() + 7 * 60 * 60 * 1000).toISOString().split('T')[0];
}
