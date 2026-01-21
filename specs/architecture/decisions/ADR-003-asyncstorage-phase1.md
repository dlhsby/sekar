# ADR-003: AsyncStorage for Phase 1 Offline Queue

**Date:** 2026-01-16
**Status:** ✅ Accepted
**Deciders:** System Architect, Mobile Team
**Tags:** mobile, storage, offline, phase-1

---

## Context

Phase 1 MVP needs offline storage for 30 workers with limited offline queue requirements. Initial specs mentioned WatermelonDB but it was never installed.

### Requirements for Phase 1
- Store offline queue (max 100 items per device)
- Store user session and preferences
- Simple key-value storage
- Works for 30 workers pilot

---

## Decision

**Use AsyncStorage for Phase 1 offline queue instead of WatermelonDB. Migrate to WatermelonDB only if needed in Phase 2+.**

### Rationale

```typescript
// Simple AsyncStorage implementation
interface OfflineQueue {
  clockIns: ClockInAction[];
  reports: ReportAction[];
  locationLogs: LocationAction[];
}

const saveQueue = async (queue: OfflineQueue) => {
  await AsyncStorage.setItem('offline_queue', JSON.stringify(queue));
};

const loadQueue = async (): Promise<OfflineQueue> => {
  const data = await AsyncStorage.getItem('offline_queue');
  return data ? JSON.parse(data) : { clockIns: [], reports: [], locationLogs: [] };
};
```

---

## Consequences

### ✅ Positive
- **Simplicity:** Already installed, zero setup
- **Sufficient:** Handles 100-item queue easily (<1MB)
- **Fast:** Read/write in <10ms
- **Battle-tested:** Used by thousands of RN apps

### ❌ Negative
- **No query capability:** Must load entire queue to filter
- **No transactions:** Risk of partial writes (mitigated by careful code)
- **Size limit:** ~6MB on Android, 10MB on iOS
- **Not suitable for >500 items** or complex queries

### Migration Path (Phase 2+)

```
Triggers for WatermelonDB migration:
- Queue regularly exceeds 100 items
- Need complex queries (filter by date/area)
- Storage exceeds 5MB
- Need relations between entities
```

---

## Alternatives Considered

1. **WatermelonDB** - Too complex for MVP, deferred to Phase 2+
2. **Realm** - Requires native linking, overkill for Phase 1
3. **SQLite** - More setup than AsyncStorage, unnecessary for 100 items

---

## Implementation

- [x] Remove WatermelonDB references from specs
- [x] Update mobile/offline-sync.md with AsyncStorage approach
- [x] Implement queue with AsyncStorage
- [x] Add 100-item limit with user warning
- [x] Document migration trigger points

---

**Related ADRs:** [ADR-002: Offline-First](./ADR-002-offline-first-mobile.md)

**Last Updated:** 2026-01-16
