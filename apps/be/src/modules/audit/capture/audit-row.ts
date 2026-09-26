import type { AuditStore } from '../../../common/context/audit-context';
import type { AuditLog } from '../entities/audit-log.entity';
import type { AuditableOptions } from './auditable.decorator';
import { diffSnapshots, snapshotOf, type Snapshot } from './audit-diff';

export type CaptureKind = 'create' | 'update' | 'delete' | 'restore' | 'purge';

export interface CaptureInput {
  kind: CaptureKind;
  options: AuditableOptions;
  entityId: string | null;
  /** Row as it was before the change (null for create). */
  before: Record<string, unknown> | null;
  /** Row as it is after the change (null for purge). */
  after: Record<string, unknown> | null;
  /** Relation property names to leave out of snapshots. */
  relations: ReadonlySet<string>;
  /** Mapped column property names; anything else (virtual fields) is dropped. */
  columns?: ReadonlySet<string>;
  /** Columns the ORM reports as written (update only). */
  updatedColumns?: readonly string[];
  store: Readonly<AuditStore>;
}

export type AuditRow = Omit<
  AuditLog,
  'id' | 'seq' | 'chain_pos' | 'actor' | 'created_at' | 'prev_hash' | 'hash' | 'sealed_at'
>;

const LABEL_MAX = 200;

function labelOf(options: AuditableOptions, entity: Record<string, unknown> | null): string | null {
  if (!entity || !options.label) return null;
  try {
    return options.label(entity)?.toString().slice(0, LABEL_MAX) ?? null;
  } catch {
    return null; // a label is a convenience; never fail the write over it
  }
}

/**
 * Build the audit_logs row for one entity event, or null when there is nothing
 * worth recording (an update that only touched bookkeeping columns).
 */
export function buildAuditRow(input: CaptureInput): AuditRow | null {
  const { kind, options, before, after, relations, store } = input;
  const redact = options.redact ?? [];
  const columns = input.columns
    ? new Set([...input.columns].filter((c) => !(options.ignore ?? []).includes(c)))
    : undefined;
  const skip = new Set([...relations, ...(columns ? [] : (options.ignore ?? []))]);
  const snap = (e: Record<string, unknown> | null): Snapshot | null =>
    e ? snapshotOf(e, redact, skip, columns) : null;

  const oldSnap = snap(before);
  const newSnap = snap(after);
  let changes: AuditRow['changes'] = null;

  if (kind === 'update') {
    changes = diffSnapshots(oldSnap ?? {}, newSnap ?? {}, input.updatedColumns ?? []);
    if (Object.keys(changes).length === 0) return null;
  }

  return {
    entity_type: options.type,
    entity_id: input.entityId,
    entity_label: labelOf(options, after ?? before),
    action: kind,
    actor_id: store.userId ?? null,
    actor_role: store.role ?? null,
    actor_name: store.name ?? null,
    // create keeps the new row, delete/purge the last state; updates keep only the diff.
    old_value: kind === 'delete' || kind === 'purge' ? oldSnap : null,
    new_value: kind === 'create' ? newSnap : null,
    changes,
    metadata: null,
    reason: store.reason ?? null,
    outcome: 'success',
    source: store.userId ? 'api' : 'system',
    ip: store.ip ?? null,
    user_agent: store.userAgent ?? null,
    request_id: store.requestId ?? null,
    parent_id: store.parentId ?? null,
  };
}
