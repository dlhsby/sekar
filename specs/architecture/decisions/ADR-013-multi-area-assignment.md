# ADR-013: Multi-Area Assignment with Junction Table

## Status

Accepted — amended by [ADR-045](./ADR-045-four-level-location-hierarchy.md) (Region tier; Area→Location) and [ADR-047](./ADR-047-schedule-redesign.md) (rule-based recurrence replaces the template-derived roster)

## Context

Client feedback (March 10, 2026) introduced three related requirements that break the current single-area-per-user assumption:

1. **Korlap handles multiple areas** — A korlap (field coordinator) can be assigned to manage multiple areas within a single rayon, not just one.
2. **Satgas/linmas dynamic area expansion** — When a satgas/linmas is assigned a task in an area different from their default schedule area, that task's area becomes an additional boundary for tracking purposes.
3. **Admin data and kepala rayon tracked at rayon level** — These roles use the rayon boundary polygon instead of area boundaries.

The current schema uses `user.area_id` as a single FK to the areas table. This is insufficient for multi-area korlap and dynamic satgas boundaries.

Three approaches were considered:

1. **Array column** — Store area IDs as a PostgreSQL array on the users table
2. **Junction table** — New `user_areas` table with assignment types
3. **JSON column** — Store area assignments as JSONB

Approach 1 lacks referential integrity and makes querying complex. Approach 3 has the same issues. Approach 2 provides proper foreign keys, queryable assignment types, and audit capability.

## Decision

Introduce a **`user_areas` junction table** with assignment types:

1. **Junction table structure**:
   ```sql
   user_areas (
     id UUID PK,
     user_id UUID FK → users,
     area_id UUID FK → areas,
     assignment_type VARCHAR(20), -- 'permanent' | 'task_based'
     assigned_at TIMESTAMPTZ,
     assigned_by UUID FK → users
   )
   ```

2. **Assignment types**:
   - `permanent` — Explicitly assigned areas (korlap gets areas assigned by admin; satgas/linmas get their default schedule area)
   - `task_based` — Automatically computed from active (in_progress) tasks in different areas. Created when task starts, removed when task completes/cancels.

3. **Effective boundaries resolution**:
   - **Korlap**: All `permanent` areas in `user_areas` → boundary check against any of these polygons
   - **Satgas/Linmas**: `permanent` areas + `task_based` areas → boundary check against union of all polygons
   - **Admin Data/Kepala Rayon**: Use rayon boundary_polygon (not area-based)
   - **getEffectiveAreas(userId)** method returns the union of permanent + task_based areas

4. **Backward compatibility**:
   - `user.area_id` column remains as the "primary" area (backward compat, default for schedule)
   - New code uses `user_areas` for boundary checking and monitoring filters
   - Migration creates `user_areas` entries from existing `user.area_id` values

5. **Task lifecycle integration**:
   - On task acceptance (status → `in_progress`): `syncTaskBasedAreas(userId)` creates `task_based` entry for task.area_id
   - On task completion/cancellation: `syncTaskBasedAreas(userId)` removes the `task_based` entry
   - This sync is idempotent — always recomputes from current active tasks

6. **Monitoring filter changes**:
   - Korlap filter: `area_ids` (array) replaces `area_id` (single) in `LiveUsersFilterDto`
   - `MonitoringController.applyScopeFilters()` queries `user_areas` for korlap's assigned areas

## Consequences

### Positive
- Proper relational model for many-to-many user-area relationships
- Clear distinction between permanent and dynamic assignments
- Queryable and indexable (vs array/JSON approaches)
- Automatic sync from task lifecycle events
- Supports future expansion (e.g., temporary assignments)

### Negative
- Breaking change to monitoring filter API (`area_id` → `area_ids`)
- Additional JOIN required for boundary checking (mitigated by user_areas indexes)
- Task service must call `syncTaskBasedAreas()` on every status change
- `user.area_id` becomes somewhat redundant (kept for backward compat)

### Performance
- `user_areas` table is small (users × avg areas ≈ hundreds of rows)
- Indexed on `(user_id)` and `(area_id)` for fast lookups
- Effective areas query: single JOIN, no N+1 risk

## Implementation status

- **Junction table, `getEffectiveAreas`/`getPermanentAreaIds`, korlap monitoring scope, assign/remove endpoints** — implemented (Phase 2C/2D).
- **§5 task lifecycle sync** — wired June 25, 2026 via `TaskAreaSyncService` (`apps/be/src/modules/tasks/services/task-area-sync.service.ts`). It recomputes the worker's `task_based` set from their currently-active tasks (statuses `assigned/accepted/in_progress/revision_needed`) and calls `syncTaskBasedAreas` on assign/accept/decline/complete/verify and on create-with-assignee. Failures are logged but never block the task transition.
- **Geofence honours task areas** — `StatusCalculatorService` now treats a worker as within-area if they are inside any of their effective areas (primary + task_based); the extra lookup only runs when they are outside their primary area.

### Simplified assignment (Jun 26, 2026)

User management is the single source of truth for assignment: a worker is given a **rayon (single)**, **permanent areas (multi)** and **one shift** (`users.shift_definition_id`). On create/update, `UsersService` reconciles the permanent `user_areas` rows to match (`reconcilePermanentAreas`), sets `users.area_id` to the first area (primary), and audit-logs a `reassign` on change (history preserved). Per-day `schedules` remain an optional override/ad-hoc layer; the default roster is **derived** — `GET /schedules/my` synthesizes from the areas + shift (no per-day rows). Clock-in (`ShiftsService.getActiveArea`) is **GPS-aware**: it picks the assigned area whose geofence contains the worker, else the nearest, and supports **no-area (ad-hoc)** workers (`area_id` null). A worker reads their own areas via self endpoint **`GET /users/me/areas`** (used by the mobile multi-area geofence + "Jadwal Saya"). Passwords are never set by admins — create/reset auto-generate a one-time temp password with `password_must_change`.
