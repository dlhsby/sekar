/**
 * Shared utilities for filter modals.
 */

export function parseFilterDate(dateStr: string): Date | null {
  if (!dateStr) { return null; }
  const d = new Date(dateStr + 'T00:00:00');
  return isNaN(d.getTime()) ? null : d;
}

export function toFilterDateString(date: Date): string {
  const y = date.getFullYear();
  const m = (date.getMonth() + 1).toString().padStart(2, '0');
  const d = date.getDate().toString().padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function toTitleCase(s: string): string {
  return s.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}
