import type { TFunction } from 'i18next';
import type { AuditEntry } from '@/lib/api/audit';

const REDACTED = '[REDACTED]';

/** Localised action name, falling back to the raw verb for domain actions we don't list. */
export function actionLabel(t: TFunction, action: string): string {
  return t(`admin:audit.actions.${action}`, { defaultValue: action });
}

/** Localised entity-type name, falling back to the raw type. */
export function entityTypeLabel(t: TFunction, type: string): string {
  return t(`admin:audit.entities.${type}`, { defaultValue: type });
}

/**
 * Display text for one audited value. Secrets arrive as `[REDACTED]` and huge
 * blobs as `{_omitted, bytes}` (ADR-061) — both get a human label, never the raw marker.
 */
export function formatAuditValue(t: TFunction, value: unknown): string {
  if (value === null || value === undefined || value === '') return t('admin:audit.detail.empty');
  if (value === REDACTED) return t('admin:audit.detail.redacted');
  if (typeof value === 'object' && value && '_omitted' in value) {
    return t('admin:audit.detail.omitted', { bytes: (value as { bytes?: number }).bytes ?? 0 });
  }
  if (typeof value === 'boolean') return value ? '✓' : '✗';
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

/** Timestamp in the operator's locale, with seconds (audit needs the precision). */
export function formatAuditTime(iso: string, locale: string): string {
  return new Date(iso).toLocaleString(locale === 'en' ? 'en-GB' : 'id-ID', {
    dateStyle: 'medium',
    timeStyle: 'medium',
  });
}

/** Number of changed fields for the list column, or null when not an update. */
export function changedFieldCount(entry: AuditEntry): number | null {
  return entry.changes ? Object.keys(entry.changes).length : null;
}
