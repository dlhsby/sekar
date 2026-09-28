import { AsyncLocalStorage } from 'node:async_hooks';

/** Who/where a change came from — snapshotted onto every audit row. */
export interface AuditStore {
  /** Id of the authenticated user driving the current request, if any. */
  userId?: string;
  /** Role code at the time of the action (roles can change later). */
  role?: string;
  /** Display name at the time of the action (users can be renamed/deleted). */
  name?: string;
  ip?: string;
  userAgent?: string;
  requestId?: string;
  /** Operator-supplied justification (e.g. a force delete), stored on the row. */
  reason?: string;
  /** Root audit row a cascade step belongs to (e.g. children of a force delete). */
  parentId?: string;
}

const storage = new AsyncLocalStorage<AuditStore>();

/**
 * Per-request audit context. Holds the acting user so the TypeORM subscribers
 * can stamp created_by / updated_by / deleted_by and write audit_logs rows
 * without every service threading the actor through. Populated by
 * AuditContextInterceptor; empty for cron/system work.
 */
export const auditContext = {
  run<T>(store: AuditStore, fn: () => T): T {
    return storage.run(store, fn);
  },
  /** The acting user's id for the current async context, or undefined (system/jobs). */
  getUserId(): string | undefined {
    return storage.getStore()?.userId;
  },
  /**
   * Run `fn` with extra fields layered over the current context (actor kept).
   * Used to attach a reason / cascade parent to every row written inside.
   */
  annotate<T>(extra: Pick<AuditStore, 'reason' | 'parentId'>, fn: () => T): T {
    return storage.run({ ...(storage.getStore() ?? {}), ...extra }, fn);
  },
  /** Full actor/request snapshot, or an empty object outside a request. */
  get(): Readonly<AuditStore> {
    return storage.getStore() ?? {};
  },
};
