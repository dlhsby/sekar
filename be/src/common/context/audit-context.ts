import { AsyncLocalStorage } from 'node:async_hooks';

interface AuditStore {
  /** Id of the authenticated user driving the current request, if any. */
  userId?: string;
}

const storage = new AsyncLocalStorage<AuditStore>();

/**
 * Per-request audit context. Holds the acting user's id so the TypeORM
 * AuditSubscriber can stamp created_by / updated_by / deleted_by without every
 * service threading the actor through. Populated by AuditContextInterceptor.
 */
export const auditContext = {
  run<T>(store: AuditStore, fn: () => T): T {
    return storage.run(store, fn);
  },
  /** The acting user's id for the current async context, or undefined (system/jobs). */
  getUserId(): string | undefined {
    return storage.getStore()?.userId;
  },
};
