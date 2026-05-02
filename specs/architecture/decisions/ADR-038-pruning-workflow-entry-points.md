# ADR-038: Pruning Workflow Entry Points, Activity Tagging, and Task Delegation Audit

## Status

Accepted

## Date

2026-05-01

## Context

After Phase 3 sub-phases 3-7 / 3-10 / 3-11 shipped (kecamatan submission + admin disposition + convert-to-task + `PruningTaskForm`), client review surfaced that the **kecamatan request** path is one of **five** legitimate ways a pruning workflow gets started — and the existing model under-documents the other four. Three concrete gaps emerged:

1. **Pruning is an activity, not a request type.** Most real pruning work today is logged as a daily activity by `korlap` (often involving multiple `satgas` / `linmas` on the same job) without ever passing through a `pruning_request`. The admin_data on each rayon currently recaps this into a Google Form per location. The system must let `korlap` (and `kepala_rayon`, `admin_data`) create a pruning **activity** directly, without a parent task and without a parent request.

2. **An activity can involve multiple workers, but only one is the assignee/reporter.** When `korlap` files a pruning activity that involved three `satgas`, all three should see that activity on their own activity feed (so daily history reflects what they actually did) — but the canonical reporter / assignee is still the `korlap`. This requires an activity tagging relation parallel to `task_tags`.

3. **Tasks routinely flow through a delegation chain** before reaching the worker who executes the job. A common pattern: `top_management` assigns to `kepala_rayon` → `kepala_rayon` delegates to `admin_data` → `admin_data` delegates to `korlap` → `korlap` self-handles or assigns to `satgas`. The current `POST /tasks/:id/assign` endpoint overwrites `assigned_to` in place, losing the chain. Stakeholders need an audit trail of every delegation step (who, when, why) for accountability and reporting.

The five legitimate pruning entry points are therefore:

| # | Path | Trigger | Owner |
|---|------|---------|-------|
| **a** | Kecamatan request → review → convert to task → assign → execute → activity | External `staff_kecamatan` | `staff_kecamatan` → `admin_data` → `korlap` / `satgas` |
| **b** | Top-down task: `top_management` creates a task targeted at `kepala_rayon` / `admin_data` / `korlap` / `satgas` directly | Internal directive | `top_management` → assignee chain |
| **c** | Mid-level task: `kepala_rayon` or `admin_data` creates a task targeted at `korlap` or `satgas` | Internal planning | `kepala_rayon` / `admin_data` → executor |
| **d** | Self-assigned + tag: `kepala_rayon` / `admin_data` / `korlap` creates a task assigned to themselves and tags the workers involved | Centralized reporting | Reporter (assignee) + tagged workers |
| **e** | Direct activity, no task: `korlap` / `kepala_rayon` / `admin_data` opens `ActivitySubmissionScreen`, picks pruning type, optionally tags involved workers | Daily field reality | Reporter + tagged workers |

Paths **b**, **c**, **d** all need delegation tracking when the original assignee is not the executor. Paths **d** and **e** need activity tagging so tagged workers see the activity on their feed even though they didn't create it.

This ADR consolidates the model.

## Decision

Three concurrent, low-coupling changes:

### 1. `activity_tags` table — tag involved users on an activity

Schema parallels existing `task_tags`:

```sql
CREATE TABLE activity_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  activity_id UUID NOT NULL REFERENCES activities(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  tagged_by UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (activity_id, user_id)
);
CREATE INDEX idx_activity_tags_activity ON activity_tags(activity_id);
CREATE INDEX idx_activity_tags_user ON activity_tags(user_id);
```

**Service rules**

- `POST /api/v1/activities` accepts optional `tagged_user_ids: string[]`. Each is inserted as an `activity_tags` row with `tagged_by = current user id`.
- Tagged users do **not** become co-owners. The activity has exactly one `user_id` (creator/reporter) — that role is unchanged. Tagged users receive read access (filterable on their feed) and an FCM push notification.
- `GET /api/v1/activities` accepts a new query flag: `involving_me=true` returns activities where `user_id = current` **OR** there is an `activity_tags` row with `user_id = current`. The list response carries an `involvement: 'owner' | 'tagged'` discriminator per row.
- Tagged users may **not** edit the activity. Editing remains owner-only (the existing 1-hour edit window).
- An activity owner can untag a user via `DELETE /api/v1/activities/:id/tags/:userId` (owner-only, before the activity is approved).

### 2. `task_delegations` table — append-only audit trail

```sql
CREATE TABLE task_delegations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  from_user_id UUID REFERENCES users(id) ON DELETE SET NULL, -- NULL on initial creation
  to_user_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  action TEXT NOT NULL CHECK (action IN ('initial_assign','reassign','delegate','self_handle')),
  reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_task_delegations_task ON task_delegations(task_id, created_at);
```

**Service rules**

- Every successful task assignment writes one `task_delegations` row. Existing endpoints (`POST /tasks` with `assignedTo`, `POST /tasks/:id/assign`) wrap their save in the same transaction that writes the audit row.
- `action` discrimination:
  - `initial_assign`: first time the task gets an assignee (`from_user_id = NULL`).
  - `reassign`: a `top_management` / `kepala_rayon` reroutes the task to a different assignee at the same hierarchy level or higher.
  - `delegate`: assignee themself hands the task to a subordinate (e.g., `kepala_rayon` → `admin_data`, `admin_data` → `korlap`, `korlap` → `satgas`). Distinguished from `reassign` by `from_user_id == previous assignee`.
  - `self_handle`: assignee marks they will execute the task personally (no change in `assigned_to`, but the audit chain stops). Often paired with tagging involved workers.
- `reason` is optional but encouraged; surfaced to the receiving user in the assignment notification.
- New endpoint `GET /api/v1/tasks/:id/delegation-history` returns the chain ordered by `created_at` with embedded `from_user` + `to_user` summaries.
- The append-only constraint is enforced by the absence of `UPDATE` and `DELETE` endpoints on `task_delegations`. Only cascading delete from the parent task is allowed.
- Existing `tasks.assigned_to` is the **current** assignee (denormalized projection of the latest delegation). The two values must agree at all times; the service is the single writer.

### 3. Five entry points are documented, not enforced by new code paths

The five paths above all reduce to the existing primitives:

- Path **a** uses the existing kecamatan flow (with the week-booking change, see ADR-035 amendment dated 2026-05-01).
- Paths **b**, **c**, **d** all use `POST /tasks` (with optional `assigned_to`, optional `tagged_user_ids`); each subsequent reassignment uses `POST /tasks/:id/assign`. Both endpoints write to `task_delegations` per (2).
- Path **e** uses `POST /activities` with `task_id = null` and optional `tagged_user_ids` per (1).

No new entry-point endpoints are needed; the existing surface covers them once activity tagging and delegation audit are in place.

## Consequences

### Positive

- **Real-world fidelity.** Path-e (direct activity) matches how field work is actually reported today; the system stops forcing artificial `pruning_request` rows for internally-initiated work.
- **Centralized reporting works.** Path-d (self-assign + tag) lets `kepala_rayon` / `admin_data` keep daily reporting centralized while every involved worker still sees the activity on their own feed.
- **Accountability.** Delegation history makes "who passed this to whom" answerable from production data, not Slack memory.
- **Schema is small.** Two new tables, both append-only or near-append-only, both follow the `*_tags` / `*_history` pattern already accepted in the codebase.
- **Backward compatible.** Existing tasks and activities continue to work; the new fields are all optional.

### Negative

- **Two more tables to seed for demo.** The existing `seed-phase2.ts` / `seed-phase3.ts` flow gains a few inserts for sample delegation chains and tagging.
- **More tests.** Six new test scenarios at minimum (insert tag, untag, list with involvement filter, log delegation, list delegation history, blocked unauthorized untag).
- **Mobile UX surfaces multiply.** `ActivitySubmissionScreen` gets a tag multi-select; `TaskDetailScreen` gets a delegation history section; `ActivityListScreen` filter changes. Each is small but has to land before the model is genuinely useful.
- **Notification volume goes up.** Every tag fires an FCM push. Mitigated by per-user per-day digest grouping (out of scope this ADR; tracked as Phase 4 polish).

## Alternatives Considered

1. **Reuse `task_tags` for activity tagging by linking activities to a synthetic task.** Rejected. Forces every direct activity to carry a fake `task_id`, which breaks the "activity is canonical, task is optional" stance from ADR-010 and complicates queries.
2. **Embed delegation chain as a JSON array on `tasks.delegation_history`.** Rejected. Loses referential integrity (cascade on user deletion); forces full-row read/rewrite per delegation; can't index on `from_user_id` for "what did I delegate?" queries.
3. **Make tagged users co-owners with edit rights.** Rejected. Multi-writer activities are a moderation nightmare; existing 1-hour edit window assumes a single author.
4. **Add a dedicated `activity_type='pruning_team'` instead of tagging.** Rejected. Doesn't generalize — watering, planting, sweeping all have the same multi-worker pattern. Tagging is the cross-cutting solution.
5. **Skip the audit table; rely on git-style append on `tasks` row updates via TypeORM subscribers.** Rejected. Subscribers are the wrong layer for business-critical history; explicit table is queryable, exportable, and survives entity refactors.

## References

- [ADR-009](./ADR-009-eight-role-system.md) — role hierarchy that informs delegation directionality
- [ADR-010](./ADR-010-activity-as-canonical-work-record.md) — activities are first-class; tasks are scaffolding
- [ADR-031](./ADR-031-task-typing-and-custom-fields.md) — `task_type='perantingan'` carries the pruning-specific custom_fields; this ADR is orthogonal
- [ADR-032](./ADR-032-admin-data-disposition-authority-pruning-requests.md) — kecamatan disposition; updated to point here for tagging + delegation
- [ADR-035](./ADR-035-service-capacity-model.md) — service capacity; 2026-05-01 amendment switches kecamatan UX to weekly picker
- Phase 3 plan: [`../../phases/phase-3-plants-monitoring-rebuild/PLAN-pruning-redesign.md`](../../phases/phase-3-plants-monitoring-rebuild/PLAN-pruning-redesign.md)
