import type { AuditLog } from './entities/audit-log.entity';

const COLUMNS: Array<[header: string, value: (r: AuditLog) => unknown]> = [
  [
    'occurred_at_utc',
    (r) => (r.created_at instanceof Date ? r.created_at.toISOString() : r.created_at),
  ],
  ['seq', (r) => r.seq],
  ['actor_name', (r) => r.actor_name],
  ['actor_role', (r) => r.actor_role],
  ['actor_id', (r) => r.actor_id],
  ['action', (r) => r.action],
  ['outcome', (r) => r.outcome],
  ['entity_type', (r) => r.entity_type],
  ['entity_label', (r) => r.entity_label],
  ['entity_id', (r) => r.entity_id],
  ['changes', (r) => r.changes],
  ['reason', (r) => r.reason],
  ['ip', (r) => r.ip],
  ['request_id', (r) => r.request_id],
  ['hash', (r) => r.hash],
];

/**
 * One CSV cell. Values a spreadsheet would evaluate (leading = + - @ tab CR)
 * are prefixed with an apostrophe — entity labels are operator-entered, so an
 * export must not become a formula-injection vector (OWASP CSV injection).
 */
export function csvCell(value: unknown): string {
  if (value === null || value === undefined) return '';
  let text = typeof value === 'object' ? JSON.stringify(value) : String(value);
  if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`;
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

/** RFC 4180 CSV with a UTF-8 BOM so Excel opens Indonesian text correctly. */
export function toAuditCsv(rows: readonly AuditLog[]): string {
  const lines = [COLUMNS.map(([h]) => h).join(',')];
  for (const row of rows) lines.push(COLUMNS.map(([, get]) => csvCell(get(row))).join(','));
  return `﻿${lines.join('\r\n')}\r\n`;
}
