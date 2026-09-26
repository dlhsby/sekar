/**
 * Pure helpers that turn an entity into an audit-safe snapshot and two
 * snapshots into a field diff. No TypeORM, no I/O — the subscriber feeds them.
 *
 * Rules (ISO/IEC 27001 A.8.15 + UU PDP data minimisation):
 *  - secrets are never written to the audit trail, only the fact they changed;
 *  - bookkeeping columns (timestamps, actor stamps) are dropped — the audit row
 *    already records who and when;
 *  - oversized values (polygons, base64 blobs) are replaced by a size marker so
 *    one edit can't bloat the append-only table.
 */

export const REDACTED = '[REDACTED]';

/** Largest JSON-encoded field kept verbatim. */
export const MAX_FIELD_BYTES = 2048;

/** Column-name fragments that are always redacted, on every entity. */
const SECRET_PATTERNS = [/password/i, /token/i, /secret/i, /otp/i, /api_?key/i];

const BOOKKEEPING = new Set([
  'created_at',
  'updated_at',
  'deleted_at',
  'created_by',
  'updated_by',
  'deleted_by',
]);

export type Snapshot = Record<string, unknown>;
export type Changes = Record<string, [unknown, unknown]>;

const isSecret = (key: string, redact: readonly string[]): boolean =>
  redact.includes(key) || SECRET_PATTERNS.some((p) => p.test(key));

function normalise(value: unknown): unknown {
  if (value instanceof Date) return value.toISOString();
  if (value === undefined) return null;
  if (Buffer.isBuffer(value)) return { _omitted: true, bytes: value.length };
  return value;
}

function capSize(value: unknown): unknown {
  if (value === null || typeof value === 'boolean' || typeof value === 'number') return value;
  const bytes = Buffer.byteLength(JSON.stringify(value) ?? '', 'utf8');
  return bytes > MAX_FIELD_BYTES ? { _omitted: true, bytes } : value;
}

/**
 * Audit-safe copy of an entity's own columns.
 * @param relations property names that are TypeORM relations (skipped — the FK
 *                  column, e.g. `district_id`, carries the reference instead).
 * @param columns   when given, only these mapped columns are kept (drops
 *                  virtual/computed properties attached for API responses).
 */
export function snapshotOf(
  entity: Record<string, unknown>,
  redact: readonly string[],
  relations: ReadonlySet<string> = new Set(),
  columns?: ReadonlySet<string>,
): Snapshot {
  const out: Snapshot = {};
  for (const [key, raw] of Object.entries(entity)) {
    if (BOOKKEEPING.has(key) || relations.has(key) || typeof raw === 'function') continue;
    if (columns && !columns.has(key)) continue;
    out[key] = isSecret(key, redact) ? REDACTED : capSize(normalise(raw));
  }
  return out;
}

const sameValue = (a: unknown, b: unknown): boolean =>
  JSON.stringify(normalise(a)) === JSON.stringify(normalise(b));

/**
 * Field-level diff as `{ field: [old, new] }`.
 * @param forced fields the ORM reports as updated even though both snapshots
 *               read `[REDACTED]` — surfaces "password changed" without the value.
 */
export function diffSnapshots(
  before: Snapshot,
  after: Snapshot,
  forced: readonly string[] = [],
): Changes {
  const changes: Changes = {};
  const keys = new Set([...Object.keys(before), ...Object.keys(after)]);
  for (const key of keys) {
    const oldV = normalise(before[key]);
    const newV = normalise(after[key]);
    if (!sameValue(oldV, newV) || (forced.includes(key) && oldV === REDACTED)) {
      changes[key] = [oldV, newV];
    }
  }
  return changes;
}
