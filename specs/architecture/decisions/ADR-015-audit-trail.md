# ADR-015: Generic Audit Trail for Entity Change Tracking

## Status

Accepted

## Context

Client feedback (March 10, 2026) requested that revision history be visible in task and activity detail views. Currently, tasks have a `revision_reason` field that stores only the latest revision reason, with no history of prior revisions or status changes.

The client wants to see a full timeline of changes:
- When a task was created
- When it was accepted/declined by the assignee
- When status changed (e.g., in_progress → completed)
- When a revision was requested (with reason)
- When it was verified
- Similar for activities (created, approved, rejected)

Three approaches were considered:

1. **Entity-specific history tables** — `task_history`, `activity_history`, etc.
2. **Generic audit log table** — Single `audit_logs` table for all entity types
3. **Event sourcing** — Store all mutations as events, derive current state

Approach 3 is overkill for this use case. Approach 1 requires creating and maintaining multiple history tables. Approach 2 provides a single, generic solution that works for tasks, activities, overtime, and any future entities.

## Decision

Implement a **generic `audit_logs` table** with JSONB value storage:

1. **Table structure**:
   ```sql
   audit_logs (
     id UUID PK,
     entity_type VARCHAR(50),  -- 'task', 'activity', 'overtime', 'shift'
     entity_id UUID,
     action VARCHAR(50),       -- 'created', 'status_changed', 'revision_requested', etc.
     actor_id UUID FK → users,
     old_value JSONB,
     new_value JSONB,
     metadata JSONB,
     created_at TIMESTAMPTZ
   )
   ```

2. **AuditLogService** — Injectable service that provides:
   - `log(params)` — Create an audit entry
   - `getEntityHistory(entityType, entityId)` — Get timeline for an entity

3. **Integration pattern** — Services call `auditLogService.log()` after mutations:
   ```typescript
   // In TasksService, after status change:
   await this.auditLogService.log({
     entity_type: 'task',
     entity_id: task.id,
     action: 'status_changed',
     actor_id: user.id,
     old_value: { status: oldStatus },
     new_value: { status: newStatus },
   });
   ```

4. **Initial entity types**: `task`, `activity`, `overtime`, `shift`

5. **Standard actions**:
   | Action | Description |
   |--------|-------------|
   | `created` | Entity created |
   | `status_changed` | Status field changed |
   | `revision_requested` | Supervisor requested revision (metadata has reason) |
   | `approved` | Entity approved |
   | `rejected` | Entity rejected (metadata has reason) |
   | `updated` | General field update |
   | `assigned` | Entity assigned to user |
   | `verified` | Task verified by supervisor |

6. **Access control** — Audit trail visibility follows existing entity access:
   - Users see audit trail for entities they can view
   - No separate audit-specific permission needed

7. **No automatic trigger** — Audit logging is explicit (not database triggers). Services must call the audit log method. This is intentional:
   - Only meaningful mutations are logged (not every field update)
   - Better control over what old_value/new_value contain
   - No database-level dependencies

## Consequences

### Positive
- Single table for all entity audit trails
- JSONB storage handles varying entity structures without schema changes
- Easy to add new entity types in the future
- Timeline query is simple: `WHERE entity_type = X AND entity_id = Y ORDER BY created_at`
- Indexed for efficient lookups

### Negative
- Manual integration required in each service (not automatic)
- JSONB values are not type-safe at the database level
- Table will grow unbounded (consider retention policy for production)
- No referential integrity on entity_id (the referenced entity could be deleted)

### Performance
- Write: Single INSERT per audit entry (negligible overhead)
- Read: Indexed composite query `(entity_type, entity_id)` — efficient for single-entity timelines
- Growth: Estimated ~100-500 entries/day for initial usage, manageable with monthly partitioning if needed later
