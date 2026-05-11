# Phase 3: Backend Requirements

**Last Updated:** 2026-04-27
**Status:** 🟡 In Progress (3-1 through 3-12 landed; 3-13/3-14 deferred)
**Framework:** NestJS 11.x, TypeScript 5.9, TypeORM, Redis 7, Socket.IO
**Related ADRs:** [ADR-029](../../architecture/decisions/ADR-029-monitoring-v2-redis.md), [ADR-030](../../architecture/decisions/ADR-030-area-aggregate-plant-inventory.md), [ADR-031](../../architecture/decisions/ADR-031-task-typing-custom-fields.md), [ADR-032](../../architecture/decisions/ADR-032-admin-data-pruning-disposition.md), [ADR-033](../../architecture/decisions/ADR-033-staff-kecamatan-role.md), [ADR-034](../../architecture/decisions/ADR-034-pruning-cycle-prediction.md), [ADR-035](../../architecture/decisions/ADR-035-service-capacity-model.md)
**Testing target:** ≥ 85 % stmts per new module
**See also:** [Database Schema](./database.md), [Infrastructure](./infrastructure.md), [README](./README.md)

---

## Current Codebase Facts (Verified)

| File | Key Facts |
|------|-----------|
| `be/src/modules/monitoring/services/status-calculator.service.ts:186-263` | `onLocationPing` issues 6+ DB queries per ping — saturates 15-connection pool at 500 workers in ~50 s |
| `be/src/modules/location/location.service.ts:92-103` | Only the **latest** location in a batch triggers status recalculation — offline batches silently lose transitions |
| `be/src/gateways/events.gateway.ts:362-418` | `AREA_STAFFING_CHANGED` emits on every flip, no debounce, no Redis adapter |
| `be/src/modules/users/enums/role.enum.ts` | 8 roles; `admin_data` excluded from `OVERTIME_APPROVERS` and all approval groups |
| `be/src/modules/tasks/entities/task.entity.ts` | 8 statuses (ADR-009 debt — deferred); no `task_type` / `custom_fields` / `parent_task_id` / partial-completion |
| `be/src/modules/activities/` | Canonical work record (ADR-010); no `custom_fields` / `plant_items` relation / `reference_code` |

---

## Module Changes Overview

| Module | Change Type | Description |
|--------|-------------|-------------|
| `monitoring` | Major rewrite | Redis Streams projector, debouncer, stale sweeper, unified snapshot endpoint, eager-load rewrite of `onLocationPing` |
| `location` | Minor fix | Iterate full batch (or reservoir sample) when producing to Redis Stream |
| `tasks` | Major enhancement | `task_type` + `custom_fields` + `TaskTypeRegistry` + parent/child + partial-complete + resume + lineage |
| `activities` | Minor enhancement | `custom_fields`, `plant_items` relation, `reference_code`, photo columns, `pruning_request_id` |
| `users` | Enum extension | `+staff_kecamatan`; new `PRUNING_REQUEST_REVIEWERS` role-group constant |
| `plants` | New module | `plant_species`, `area_plants`, `notable_plants`; `PlantDueDateService` |
| `pruning-requests` | New module | Entity, service, controller, workflow, notifications |
| `service-capacity` | New module | Generic weekly grid + booking + calendar query |
| `plant-seeds` | New module | Seeds catalog + unified transaction ledger |
| `gateways` | Adapter swap | Socket.IO Redis adapter; event emission routes via `StaffingDebouncerService` |
| `common` | New service | `RedisService` with connection pool + health check + graceful shutdown |

---

## A. Monitoring v2 (module rewrite)

### A1. New services

| Service | Responsibility | Key methods |
|---------|----------------|-------------|
| `RedisService` (common) | Connection lifecycle; `XADD`, `XREADGROUP`, `XACK`, `XLEN` helpers; `/health` report | `publish`, `subscribe`, `streamAdd`, `streamRead`, `ping` |
| `StatusProjectorService` | Reads Redis Stream `location:pings`, eager-loads user context once, writes `user_tracking_status`, emits events | `@Cron('*/1 * * * * *')` loop (configurable); `processBatch(messages[])` |
| `StaffingDebouncerService` | Collapses bursts of `AREA_STAFFING_CHANGED` within `STAFFING_DEBOUNCE_SECONDS` | `flag(areaId, areaState)`, internal timer per area |
| `StaleStatusSweeperService` | `@Cron('*/5 * * * *')`; flips `ACTIVE` without recent ping → `MISSING` | `sweep()`; batch size 50 |

### A2. `onLocationPing` rewrite

Before:
- 6+ DB queries per ping: user, shift, area, polygon, prior status, staffing count.

After:
- **One** eager-loaded query at handler entry: `User` with `shift`, `area`, `area.boundary_polygon`, `area.rayon` relations.
- Queue the `LocationPingEvent` to Redis Stream (`XADD location:pings MAXLEN ~ 100000 * ...`).
- Return to caller immediately; projector does the writes asynchronously.

Pool impact: down from ~3,000 queries/sec at peak (500 workers × 6 queries ÷ 12 s × headroom) to ~40 queries/sec (one-per-ping fast SELECT on a covered index).

### A3. Batch iteration fix (`location.service.ts:92-103`)

```ts
// BEFORE — only last entry triggers status
for (const ping of batch) await this.save(ping);
await this.statusCalculator.onLocationPing(batch[batch.length - 1]);

// AFTER — every ping queued; projector applies them in order
for (const ping of batch) {
  await this.save(ping);
  await this.redis.streamAdd('location:pings', serialize(ping));
}
```

For offline-drain batches > 100 entries, the projector applies a **keep-latest-within-30s-window** reservoir so we don't re-emit identical statuses.

### A4. Unified snapshot endpoint

```http
GET /api/v1/monitoring/snapshot?scope=city|rayon|area&id=<uuid>
                               &includes=workers,plants,overdue,rayons,areas
Authorization: Bearer <jwt>
```

Response (abbreviated):

```json
{
  "success": true,
  "data": {
    "scope": "rayon",
    "scope_id": "…",
    "generated_at": "2026-04-24T12:00:00+07:00",
    "workers": [ { "user_id": "…", "status": "active", "lat": -7.25, "lng": 112.75, "area_id": "…" } ],
    "rayons": [ { "id": "…", "boundary_polygon": {…}, "health_score": 0.87 } ],
    "areas": [ { "id": "…", "plant_status": "due", "active_count": 4, "required_count": 5 } ],
    "plant_summary": { "ok": 120, "due": 18, "overdue": 3 },
    "overdue_areas": [ { "area_id": "…", "name": "Jalan Darmo Sec 1 R", "overdue_species": ["trembesi", "sono"] } ]
  }
}
```

Replaces today's 3–4 round-trips on dashboard load. Cached in React Query under `monitoring:snapshot:<scope>:<id>`; WebSocket patches mutate this cache in place.

### A5. WebSocket events (v2, Redis-adapter-backed)

| Event | Trigger | Payload |
|-------|---------|---------|
| `status:v2` | `StatusProjectorService` detects status transition | `{ user_id, prev, next, area_id, rayon_id, ts }` |
| `cluster:update` | Delta of workers in a bbox since last emit | `{ scope, scope_id, added[], removed[], changed[] }` |
| `inventory:updated` | `area_plants` row change (after activity completion / forecast cron) | `{ area_id, species_id, status, next_due_at }` |
| `request:status-changed` | `pruning_requests.status` transition | `{ request_id, prev, next, rayon_id, submitted_by, assigned_task_id? }` |
| `area:plant-status-changed` | `area_plants.status` aggregate flips for an area | `{ area_id, prev, next, counts: { ok, due, overdue } }` |
| `area:staffing-changed` | Debounced aggregate of staffing flips | same as Phase 2D, now debounced by `StaffingDebouncerService` |

---

## B. Plants module (new)

### B1. Endpoints

| Method | Path | Auth / Roles | Description |
|--------|------|--------------|-------------|
| `GET` | `/api/v1/plant-species` | JWT / any | List catalog (paginated) |
| `POST` | `/api/v1/plant-species` | **`admin_data`** (Q5 Apr 25), `admin_system`, `superadmin` | Create species |
| `PATCH` | `/api/v1/plant-species/:id` | **`admin_data`** (Q5), `admin_system`, `superadmin` | Update |
| `DELETE` | `/api/v1/plant-species/:id` | `admin_system`, `superadmin` | Soft-delete only — `admin_data` cannot delete species (auditable trace) |
| `GET` | `/api/v1/areas/:id/plants` | JWT / scoped | Area inventory rollup |
| `PUT` | `/api/v1/areas/:id/plants` | `admin_data` (own rayon), `admin_system`, `superadmin` | Bulk upsert species × count rows |
| `GET` | `/api/v1/notable-plants?area_id=` | **JWT — including `satgas` and `linmas`** for own-area read (Q4 Apr 25); `korlap` own area; `admin_data`/`kepala_rayon` own rayon; `top_management`/admin_system/superadmin all | List (read-only for satgas/linmas) |
| `POST` | `/api/v1/notable-plants` | `korlap` (own area), `admin_data` (rayon), `admin_system`, `superadmin` | Create (CRUD remains korlap+) |
| `PATCH DELETE` | `/api/v1/notable-plants/:id` | same | Update/Delete (CRUD remains korlap+) |
| `GET` | `/api/v1/monitoring/area/:id/plant-status` | JWT / scoped | Green/yellow/red + due-date breakdown |

### B2. `PlantDueDateService`

Deterministic forecast per [ADR-034](../../architecture/decisions/ADR-034-pruning-cycle-prediction.md):

```
next_due_at = last_pruned_at + (override_cycle_days ?? species.default_pruning_cycle_days ?? area_type_default)
status = now > next_due_at           → 'overdue'
       | now > next_due_at - 14 days → 'due'
       | else                        → 'ok'
```

Run daily by `PlantDueDateRecalculator` cron (`@Cron('0 2 * * *')` WIB). Also recomputed synchronously when an activity completes with `plant_items` for the area.

---

## C. Task typing (tasks module)

### C1. Entity additions

See [database.md §tasks](./database.md#tasks-additive). Key backend work:

- `TaskTypeRegistry` (injectable, singleton) — per-type Zod schema for `custom_fields`. Pruning vocabulary locked Apr 25, 2026 (client Q1 answer; full glossary in [README §Pruning Vocabulary](./README.md#pruning-vocabulary-q1--locked-apr-25-2026)):
  ```ts
  // be/src/modules/tasks/registry/task-type-registry.ts
  export const PRUNING_CASE_TYPES = ['GT', 'PT', 'PS', 'PD', 'PK'] as const;     // case_type column on activities
  export const PRUNING_ACTIONS    = ['PM', 'PB', 'PC'] as const;                  // custom_fields.pruning_action
  export const PRUNING_SOURCES    = ['TIW', 'TS', 'CC', 'PW', 'Wk'] as const;     // custom_fields.source

  registry.register('pruning', z.object({
    area_type:       z.enum(['road', 'park', 'median']),
    pruning_action:  z.enum(PRUNING_ACTIONS),                                     // required: PM/PB/PC
    source:          z.enum(PRUNING_SOURCES),                                     // required: TIW/TS/CC/PW/Wk
    target_species:  z.array(z.object({ species_id: z.string().uuid(), count: z.int().positive() })),
    damage_cause:    z.string().optional(),
    notes:           z.string().optional(),
  }));
  ```
- **`case_type` (the GT/PT/PS/PD/PK enum) is a column on `activities`, NOT on `tasks`** — a single task may produce multiple activities each with its own case_type when the field crew encounters different conditions per tree. The CHECK constraint in [database.md §activities](./database.md#activities-additive) enforces non-null `case_type` whenever `custom_fields.task_type = 'pruning'`.
- `TasksService.createTyped(dto)` — validates `custom_fields` against registry.
- `ActivitiesService.submit(dto)` — validates pruning case_type + custom_fields together; sets `source` from the parent `pruning_request.intake_channel` when `pruning_request_id` is provided; otherwise defaults `source = 'CC'` for korlap-initiated `GT` activities.

### C2. New endpoints

| Method | Path | Auth / Roles | Description |
|--------|------|--------------|-------------|
| `POST` | `/api/v1/tasks` (extended) | `korlap`, `admin_data`, `kepala_rayon`, `admin_system`, `superadmin` | Accepts `task_type`, `custom_fields`, `target_plant_count` |
| `POST` | `/api/v1/tasks/:id/partial-complete` | `satgas` (assigned), `korlap` | Body: `{ completed_count, plant_items[], notes }`. Server decides whether to spawn a child task via `TaskResumePolicy` |
| `POST` | `/api/v1/tasks/:id/resume` | same | Creates child task with `parent_task_id = :id`, remaining `target_plant_count` |
| `GET` | `/api/v1/tasks/:id/lineage` | JWT / scoped | Returns parent chain + children tree |

### C3. Partial-completion request example

```http
POST /api/v1/tasks/{id}/partial-complete
Authorization: Bearer <jwt>

{
  "completed_count": 5,
  "plant_items": [
    { "species_id": "…trembesi-uuid", "count": 5 }
  ],
  "notes": "5 of 8 trembesi done, rain stopped work",
  "resume_tomorrow": true
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "task": { "id": "…", "status": "partial", "completed_plant_count": 5 },
    "activity_id": "…",
    "child_task_id": "…"
  }
}
```

---

## D. Activities module (extended)

### D1. Entity additions

See [database.md §activities](./database.md#activities-additive).

### D2. Endpoint updates

| Method | Path | Change |
|--------|------|--------|
| `POST` | `/api/v1/activities` | Accepts `custom_fields`, `plant_items[]`, `photo_before_url`, `photo_after_url`, `pruning_request_id`, `reference_code` (optional; server generates if omitted), **`tagged_user_ids?: string[]` (May 1, ADR-038 — multi-worker pruning)** |
| `GET` | `/api/v1/activities?task_type=pruning&rayon_id=&area_id=&from=&to=` | Filters on `custom_fields.maintenance_type` via JSONB operators |
| `GET` | `/api/v1/activities?involving_me=true` | **May 1, ADR-038.** Returns activities where current user is the owner OR appears in `activity_tags`; each row includes `involvement: 'owner'\|'tagged'` discriminator |
| `DELETE` | `/api/v1/activities/:id/tags/:userId` | **May 1, ADR-038.** Untag a user; owner-only, before approval |

When an activity with `pruning_request_id` is created, the originating request transitions `assigned → in_progress → done` and emits `request:status-changed`.

Tagged users (`tagged_user_ids`) are written to the `activity_tags` table — see [database.md §activity_tags](./database.md#activity-tags-may-1) and ADR-038. Owner remains the sole writer; tagged users gain read-only feed visibility.

---

## E. Pruning requests (new module)

### E1. Endpoints

| Method | Path | Auth / Roles | Description |
|--------|------|--------------|-------------|
| `POST` | `/api/v1/pruning-requests` | `staff_kecamatan` | Submit. **May 1, ADR-035 amendment:** body sends `expected_year` + `expected_iso_week` (week the submitter prefers); legacy `detail_date` still accepted for one release as a fallback |
| `GET` | `/api/v1/pruning-requests?mine=true` | `staff_kecamatan` | Own submissions |
| `GET` | `/api/v1/pruning-requests?rayon_id=&status=` | `admin_data` (own rayon), `top_management` (read-all), `admin_system`, `superadmin` | Queue |
| `POST` | `/api/v1/pruning-requests/:id/review` | `admin_data` (own rayon), `admin_system`, `superadmin` | `{ decision: 'approved'|'rejected', notes }`. **May 10, 2026:** approve now requires `request.scheduled_date != null` (use Atur Jadwal first); 409 `"Atur jadwal terlebih dahulu sebelum menyetujui permohonan"` otherwise. Reject path is unchanged. Use `under_review` for tentative dispositions. |
| `POST` | `/api/v1/pruning-requests/:id/assign-to-task` | same | `{ areaId?, assignedTo, scheduledDate?, caseType, pruningAction, units? }` → returns `{ request, task }`. **May 1, ADR-035 amendment:** `scheduledDate` is optional — when omitted, the service iterates Mon→Sun of `request.expectedIsoWeek` and books the first day where capacity allows. **May 11, 2026:** `areaId` is now optional (pruning typically runs in neighborhoods / private yards outside managed areas; created task inherits `rayon_id` from the request and uses the request's GPS + address as work location). `units` defaults to `1` server-side (capacity = permohonan slots, not tree count — tree count lives on `request.treeCount`). Status transitions to `assigned`. Assignee may be any in-rayon user with role `korlap`, `satgas`, `linmas`, `kepala_rayon`, or `admin_data` (admin may pick themselves for the centralized-report pattern). |
| `PATCH` | `/api/v1/pruning-requests/:id/expected-date` | `admin_data` (own rayon), `kepala_rayon`, `top_management`, `admin_system`, `superadmin` | **Round 4 (Apr 28).** `{ expectedDate: 'YYYY-MM-DD' }` — adjust `scheduled_date` independent of conversion. Status whitelist `submitted` / `under_review` / `approved` / `assigned` / `in_progress` (**May 10, 2026 late+1**). For requests with a linked task (`assigned` or `in_progress`), the cascade runs in one transaction: rebook `service_capacity` if the ISO week changed (book new before release old; abort on capacity-full BEFORE touching old slot), bump linked `task.deadline`, write a `task_delegations` audit row (`reason: "Jadwal diubah ke YYYY-MM-DD"`), then push to assignee. `task.started_at` / activity records are left untouched — petugas keeps the same shift, only the finish-by target moves. `done` / `rejected` / `cancelled` remain blocked — terminal states cannot be rescheduled. |
| `GET` | `/api/v1/pruning-requests/:id/result` | submitter, reviewer, top_management, admins | Task + activities + photos |

### E2. Guard wiring

New permission constant:

```ts
// be/src/modules/users/constants/role-groups.ts
export const PRUNING_REQUEST_REVIEWERS = [
  UserRole.ADMIN_DATA,       // rayon-scoped per ADR-032
  UserRole.ADMIN_SYSTEM,
  UserRole.SUPERADMIN,
] as const;
```

`PruningRequestsController` uses `@Roles(...PRUNING_REQUEST_REVIEWERS)` + a `RayonScopeGuard` that rejects with 403 when `request.rayon_id !== user.rayon_id` (except for `admin_system` / `superadmin`).

### E3. State machine

```
submitted → under_review → approved → assigned → in_progress → done
                         ↘ rejected
                         ↘ cancelled (submitter)
```

Transitions emit `request:status-changed` WS event and FCM notification to submitter.

---

## F. Service capacity (new module)

| Method | Path | Auth / Roles | Description |
|--------|------|--------------|-------------|
| `GET` | `/api/v1/rayons/:id/capacity?service_type=&year=&from_week=&to_week=` | `admin_data` (own), `kepala_rayon`, `top_management`, `admin_system`, `superadmin`, **`staff_kecamatan` (own rayon — Round 4)** | Weekly grid |
| `PUT` | `/api/v1/rayons/:id/capacity` | `admin_data` (own rayon), `top_management`, `admin_system`, `superadmin` | Bulk upsert capacity_units |
| `POST` | `/api/v1/rayons/:id/capacity/book` | same | Manual booking `{ year, iso_week, service_type, units, task_id? }` |

**Capacity granularity (Q3 Apr 25):** booking is **weekly** (`iso_week`-keyed in `service_capacity`). The day-picker for the actual assignment date lives downstream in the assign-to-task flow — `POST /api/v1/pruning-requests/:id/assign-to-task` accepts `scheduled_date` (a specific calendar day within the booked week) and records it on the resulting task. `service_capacity.booked_units` is incremented at the week granularity regardless of which day inside the week the task is scheduled for.

**Round 4 amendment (Apr 28):** the storage model stays weekly per ADR-035, but the **mobile staff_kecamatan submit screen** projects the weekly grid into a per-day status (`available` / `partial` / `full` / `unknown`) for the preferred-date picker. The projection is UX-only — no schema change, no daily booking column. Projection rule: `capacity_units == 0` → unknown; `booked_units >= capacity_units` → full; `booked_units >= capacity_units * 0.8` → partial; otherwise available. See the 2026-04-28 amendment to ADR-035 and `fe/mobile/src/screens/pruningRequests/utils/capacityCalendar.ts`.

Implicit booking happens on `/pruning-requests/:id/assign-to-task`: `CapacityService.book(rayon_id, iso_week_of(scheduled_for), 'pruning', 1, task_id)`.

---

## G. Plant seeds (new module)

| Method | Path | Auth / Roles | Description |
|--------|------|--------------|-------------|
| `GET` | `/api/v1/plant-seeds` | `admin_data` (Taman Aktif), **`kepala_rayon`** (own rayon, Q2 Apr 25 — read-only), `top_management`, `admin_system`, `superadmin` | Seed master read |
| `POST PATCH` | `/api/v1/plant-seeds` | `admin_data` (Taman Aktif), `top_management`, `admin_system`, `superadmin` | Seed master mutations (kepala_rayon NOT included — read-only) |
| `GET` | `/api/v1/seed-transactions?seed_id=&type=&from=&to=` | `admin_data` (Taman Aktif), **`kepala_rayon`** (own rayon, Q2), `top_management`, `admin_system`, `superadmin` | Ledger query (read) |
| `POST` | `/api/v1/seed-transactions` | `admin_data` (Taman Aktif), `top_management`, `admin_system`, `superadmin` | Record transaction (kepala_rayon NOT included — read-only) |

`SeedTransactionService` updates `plant_seeds.stock_qty` atomically in the same transaction as the insert (sum-signed by `transaction_type`).

---

## H. New role & guards

### H1. Enum extension

`UserRole.STAFF_KECAMATAN = 'staff_kecamatan'` added to `be/src/modules/users/enums/role.enum.ts` per [ADR-033](../../architecture/decisions/ADR-033-staff-kecamatan-role.md).

### H2. Role-group additions

| Group | Members | Used by |
|-------|---------|---------|
| `PRUNING_REQUEST_SUBMITTERS` | `staff_kecamatan` | `POST /pruning-requests` |
| `PRUNING_REQUEST_REVIEWERS` | `admin_data`, `admin_system`, `superadmin` | review / convert / queue endpoints |
| `PLANT_SEED_MANAGERS` | `admin_data` (filtered by rayon name = 'Taman Aktif'), `top_management`, `admin_system`, `superadmin` | `/plant-seeds`, `/seed-transactions` |

### H3. Clockability

`staff_kecamatan` is **not** clockable (no shifts, no monitoring, no activities). Enforced by existing `ClockableRolesGuard` (Phase 2E) — no modification required as long as the guard uses a positive allow-list.

### H4. Systematic guard sweep

A role-matrix integration test (new, `test/integration/role-matrix.e2e-spec.ts`) hits every controller route with a JWT for each role and asserts 200/201/403/404 matches the expected matrix. Run in CI after sub-phase 3-2.

---

## I. Notifications

| Trigger | Channel | Recipients |
|---------|---------|-----------|
| `pruning_request.status → approved/rejected/assigned` | FCM + WS toast | submitter |
| `pruning_request.status → done` | FCM | submitter |
| `area_plants.status → overdue` (daily digest) | FCM + email | `top_management`, `admin_data` (rayon) |
| `task.created from pruning_request` | FCM + WS | assignee |
| `task.status → partial` with `resume_tomorrow=true` | FCM | korlap of area |

FCM remains `FCM_ENABLED` gated (see Phase 4 activation). In this phase, notification hooks are wired but default to WS + DB-log when FCM is disabled.

---

## J. Test coverage targets

| Module | Lines | Branches | Notes |
|--------|-------|----------|-------|
| `monitoring` v2 services | ≥ 88 % | ≥ 80 % | Projector, debouncer, sweeper |
| `tasks` (extended) | ≥ 85 % | ≥ 78 % | `TaskTypeRegistry` 100 % |
| `activities` (extended) | ≥ 85 % | ≥ 80 % | |
| `plants` | ≥ 88 % | ≥ 80 % | `PlantDueDateService` 100 % |
| `pruning-requests` | ≥ 88 % | ≥ 80 % | State machine 100 % |
| `service-capacity` | ≥ 85 % | ≥ 78 % | Booking concurrency tests |
| `plant-seeds` | ≥ 85 % | ≥ 78 % | Ledger arithmetic 100 % |

Integration tests (per sub-phase):

- **3-3:** Redis Streams round-trip; projector applies 10k events without loss; sweeper flips stale ACTIVE → MISSING
- **3-6:** task partial-complete → resume → complete propagates lineage
- **3-9:** pruning_request submit → review → assign-to-task → activity completion propagates status back to request
- **3-11:** capacity booking decrements on convert, rebalances on task cancel

---

**Last Updated:** 2026-04-24
