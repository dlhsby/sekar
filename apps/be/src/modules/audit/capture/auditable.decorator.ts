/**
 * Marks a TypeORM entity for automatic audit capture (ADR-061). Every insert,
 * update, soft delete, restore and hard delete made through the entity manager
 * (`save`, `softRemove`, `recover`, `remove`) writes an `audit_logs` row in the
 * SAME transaction as the change — no audit row, no change.
 *
 * Writes that bypass entity events (`repository.update/delete/softDelete`,
 * QueryBuilder `.update()`) are NOT captured; `audit-coverage.spec.ts` bans
 * them in the services of auditable entities.
 */
export interface AuditableOptions<T = Record<string, unknown>> {
  /** Stable, English, snake_case type recorded in `audit_logs.entity_type`. */
  type: string;
  /** Human label snapshotted at write time (the row may be renamed or deleted later). */
  label?: (entity: T) => string | null | undefined;
  /** Extra columns to redact on top of the global secret patterns. */
  redact?: readonly string[];
  /** Columns left out entirely (personal UI preferences, caches) — no row for them. */
  ignore?: readonly string[];
}

/** Any entity class (TypeORM `EntityMetadata.target` for class-based entities). */
export type EntityClass = abstract new (...args: never[]) => unknown;

const registry = new Map<EntityClass, AuditableOptions>();

export function Auditable<T>(options: AuditableOptions<T>): ClassDecorator {
  return (target) => {
    registry.set(target as unknown as EntityClass, options as AuditableOptions);
  };
}

/** Options for an entity class, or undefined when it is not auditable. */
export function auditableOptions(target: unknown): AuditableOptions | undefined {
  return typeof target === 'function' ? registry.get(target as EntityClass) : undefined;
}

/** Every auditable entity type — used by the coverage spec and the filter UI. */
export function auditableTypes(): string[] {
  return [...registry.values()].map((o) => o.type).sort();
}
