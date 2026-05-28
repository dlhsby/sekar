# ADR-031: Task Typing via `task_type` Enum + JSONB `custom_fields` Validated by Per-Type Schema Registry

## Status

Accepted — **Amended May 2026 by [ADR-038](./ADR-038-pruning-workflow-entry-points.md)**

> **Amendment (May 2026):** ADR-038 formalizes the **5 legal entry points** by which a pruning workflow can begin (kecamatan request, top-down task assignment, mid-chain delegation, korlap self-assigned task with tagging, bare activity without a task). Activities are now first-class — `activities.task_id` is nullable and an activity may stand alone with `activity_tags`. Task assignment hops are audited in `task_delegations`. The single-task-per-pruning-job model implied by sections below should be read through the ADR-038 lens.

## Date

2026-04-24

## Context

Phase 3 introduces pruning as the first typed workflow, with watering, planting, removal, and inspection on the near horizon. The existing `tasks` table (`be/src/modules/tasks/entities/task.entity.ts`) is homogeneous: no discriminator, no per-activity-type columns, no partial-completion semantics, no parent/child linkage. ADR-010 unified `activities` as the canonical completion record; `activity.entity.ts` is similarly homogeneous.

Concrete Phase 3 requirements:

- **Pruning tasks** need species line items with counts, maintenance type (PC/PM/PB), road context (JT/JH/ST), before/after photos, and handling status.
- **Resume-tomorrow** flow: a worker who prunes 5 of 10 target trees needs a child task for the remaining 5, linked to the parent for reporting.
- **Partial completion**: the task record must carry `target_plant_count` and `completed_plant_count` so progress is visible before the task is closed.
- **Future types** (watering, planting, removal, inspection) will each need their own custom fields. Adding columns per-type explodes the schema.
- **CSV backfill** preserves external reference codes (`25PR0…`) and handling-status acronyms whose semantics the client has yet to confirm. We need extensibility without migration churn.

The choice is: table-per-type, polymorphic parent/child tables, plain untyped JSON, or typed JSONB with validation.

## Decision

Add **`task_type` enum + `custom_fields` JSONB** to both `tasks` and `activities`, validated at the service layer by a **`TaskTypeRegistry`** (Zod-style schemas keyed by type). Add parent/child linkage and plant-count progress columns to `tasks`. Attach species line items via a dedicated `activity_plant_items` table.

### Schema changes

```sql
-- tasks (additive)
ALTER TABLE tasks
  ADD COLUMN task_type TEXT NOT NULL DEFAULT 'generic',
  ADD COLUMN custom_fields JSONB NOT NULL DEFAULT '{}',
  ADD COLUMN parent_task_id UUID NULL REFERENCES tasks(id),
  ADD COLUMN target_plant_count INT NULL,
  ADD COLUMN completed_plant_count INT NOT NULL DEFAULT 0;

-- task_type allowed values (enforced by registry, not DB enum, to ease rollout):
--   'generic' | 'pruning' | 'watering' | 'planting' | 'removal' | 'inspection'

CREATE INDEX idx_tasks_type_status ON tasks(task_type, status);
CREATE INDEX idx_tasks_parent ON tasks(parent_task_id);

-- activities (additive)
ALTER TABLE activities
  ADD COLUMN case_type TEXT NULL,  -- pruning case enum: 'GT' | 'PT' | 'PS' | 'PD' | 'PK' (NOT NULL when task_type='pruning'; NULL otherwise)
  ADD COLUMN custom_fields JSONB NOT NULL DEFAULT '{}',
  ADD COLUMN photo_before_url TEXT NULL,
  ADD COLUMN photo_after_url TEXT NULL,
  ADD COLUMN reference_code TEXT NULL UNIQUE,
  ADD COLUMN pruning_request_id UUID NULL REFERENCES pruning_requests(id);

-- CHECK constraint: pruning activities require a case_type
ALTER TABLE activities ADD CONSTRAINT chk_pruning_case_type
  CHECK (
    (custom_fields->>'task_type' <> 'pruning')
    OR (case_type IN ('GT', 'PT', 'PS', 'PD', 'PK'))
  );

-- activity_plant_items (new)
CREATE TABLE activity_plant_items (
  id UUID PK,
  activity_id UUID NOT NULL REFERENCES activities(id) ON DELETE CASCADE,
  species_id UUID NOT NULL REFERENCES plant_species(id),
  count INT NOT NULL,
  notes TEXT NULL
);
CREATE INDEX idx_activity_plant_items_activity ON activity_plant_items(activity_id);
```

### The `TaskTypeRegistry`

A service-layer registry keyed by `task_type` holds a Zod schema for `custom_fields`:

```ts
// be/src/modules/tasks/registry/task-type-registry.ts
//
// Pruning vocabulary locked Apr 25, 2026 (client Q1 answer; see Phase 3
// README §Pruning Vocabulary for full glossary).
//
// case_type   — what kind of pruning case (column on activities)
// pruning_action — what cut technique (custom_fields.pruning_action)
// source      — request origin channel (custom_fields.source)
export const PRUNING_CASE_TYPES = ['GT', 'PT', 'PS', 'PD', 'PK'] as const;
//   GT = Giat Perantingan (scheduled)
//   PT = Pohon Tumbang (fallen)
//   PS = Pohon Sempal (broken-off branch)
//   PD = Pohon Doyong/Miring (leaning)
//   PK = Pohon Kropos/Mati (rotten/dead)

export const PRUNING_ACTIONS = ['PM', 'PB', 'PC'] as const;
//   PM = Pangkas Meja (table-style top trim)
//   PB = Potong Bawah (bottom-up cut)
//   PC = Pangkas Cantik (decorative)

export const PRUNING_SOURCES = ['TIW', 'TS', 'CC', 'PW', 'Wk'] as const;
//   TIW = Taruna Walikota
//   TS  = Taruna Senior
//   CC  = Command Center
//   PW  = Permintaan Warga (paper-letter intake)
//   Wk  = Aplikasi Wargaku

export const taskTypeRegistry = {
  pruning: z.object({
    pruning_action: z.enum(PRUNING_ACTIONS),                // required: PM/PB/PC
    source: z.enum(PRUNING_SOURCES),                        // required: TIW/TS/CC/PW/Wk
    road_context: z.enum(['JT', 'JH', 'ST']).optional(),    // existing
    damage_cause: z.string().optional(),
    notes: z.string().optional(),                           // for CSV-backfill rows that didn't map cleanly
  }),
  watering: z.object({ /* ... */ }),
  generic: z.object({}).passthrough(),
  // ...
}
```

`TaskService.create` / `ActivityService.submit` resolve the schema by `task_type`, call `.parse(custom_fields)`, and 400 on mismatch. Adding a new type is a registry entry + reviewer sign-off, not a migration.

### Parent/child + partial completion

- `POST /api/v1/tasks/:id/partial-complete` accepts `{ completed_plant_count_delta, plant_items[] }`, increments the parent's `completed_plant_count`, writes an `activity` + `activity_plant_items`, and does **not** close the task.
- `POST /api/v1/tasks/:id/resume` creates a child task with `parent_task_id = :id`, `target_plant_count = parent.target - parent.completed`, and `status = assigned`.
- `GET /api/v1/tasks/:id/lineage` returns the parent/child tree for reporting.

### Why JSONB + registry, not columns-per-type

- Six planned types × ~5 fields each = 30+ optional columns on `tasks`. Most rows would be null for any given type. Column explosion plus per-type migration cadence.
- The set of fields will keep evolving (CSV backfill may reveal new handling-status codes). JSONB + registry lets us iterate without downtime.
- Validation discipline (Zod at the service layer) prevents the "schema drift" that plain JSON columns invite.

## Consequences

### Positive

- **Extensible.** New task types (watering, planting, etc.) require only a registry entry and a UI form. No migration.
- **Type-safe at the edges.** Zod schemas give us compile-time-style guarantees at the service boundary; DTO validation is unified with custom-field validation.
- **Partial completion is first-class.** `target_plant_count` / `completed_plant_count` columns and `parent_task_id` support the resume-tomorrow flow without inventing a side table.
- **Activity parallelism.** Mirroring `custom_fields` + `plant_items` on activities keeps the completion record and the task definition schema-compatible; reporting queries are symmetric.
- **CSV backfill fits cleanly.** `reference_code` preserves external IDs; `custom_fields` absorbs maintenance_type, road_context, handling_status, damage_cause without inventing columns.

### Negative

- **JSONB validation must be disciplined.** A forgotten `.parse()` silently admits drift. Mitigation: a single `TaskService.create`/`ActivityService.submit` entry point, plus integration tests per registered type.
- **2026-05-23 audit note — registry validator not yet enforced at the API boundary.** `tasks.custom_fields` and `activities.custom_fields` columns currently accept any JSON. The `TaskTypeRegistry` design is documented below, but no schema-aware validator runs inside the DTO pipeline today. Tracked in the Phase 3 gap audit (`specs/phases/phase-3-plants-monitoring-rebuild/GAP-AUDIT-2026-05-23.md`, finding M7); fix is Wave 6 hardening, not a Wave 1 blocker.
- **Cross-type queries are awkward.** Filtering by `custom_fields->>'maintenance_type'` requires GIN indexes or expression indexes per hot field. Documented in `specs/database/schema.md`; add indexes as usage emerges.
- **Registry governance overhead.** Adding a type requires deliberate review (form UX + validation schema + reporting impact). This is a feature, not a bug.
- **DB-side type is TEXT, not ENUM.** Chosen over a Postgres ENUM to avoid `ALTER TYPE` migrations per new type. Registry is the source of truth; a CHECK constraint is optional and not enforced initially.

## Alternatives Considered

1. **Table-per-type** (`pruning_tasks`, `watering_tasks`, …). Rejected. Explodes module count, duplicates the lifecycle state machine, and breaks the shared `activities` completion path.
2. **Polymorphic base/child tables** (`task_base` + `task_pruning_details`). Rejected. NestJS + TypeORM polymorphic patterns are brittle (no first-class STI/JTI support), and every query needs a join + type narrowing.
3. **Untyped JSON column, no validation.** Rejected. Invites schema drift, bugs surface in production instead of at the service boundary, and reporting queries become defensive.
4. **Postgres ENUM for `task_type`.** Deferred. TEXT + registry avoids `ALTER TYPE … ADD VALUE` migrations and keeps the registry authoritative. We can promote to ENUM later if stability warrants.
5. **Side table for `plant_items` on tasks (planned items) as well as activities (completed items).** Considered and deferred. Target is already captured by `target_plant_count`; species-level targets can go into `task.custom_fields.target_items[]` if needed, and promoted to a table if usage demands.

## References

- [ADR-009](./ADR-009-phase2c-role-system-overhaul.md) — task-status simplification (8→4) remains outstanding debt, not addressed here
- [ADR-010](./ADR-010-phase2c-terminology-cleanup.md) — `activities` is the canonical completion record
- [ADR-030](./ADR-030-area-aggregate-plant-inventory.md) — `activity_plant_items` feeds `area_plants.last_pruned_at`
- [ADR-034](./ADR-034-pruning-cycle-prediction.md) — uses `plant_items` data for cycle recalculation
- [ADR-038](./ADR-038-pruning-workflow-entry-points.md) — pruning is reachable through 5 entry points; activities can be filed without a task; tagging covers multi-worker pruning
- Phase 3 plan: `../../phases/phase-3-plants-monitoring-rebuild/README.md`
- API contracts: `../../api/contracts.md`
- Database schema: `../../database/schema.md`

## 2026-05-01 amendment — activities are independent (ADR-038)

`task_type='perantingan'` continues to drive `custom_fields` validation **when** an activity reports against a task, but `activities.task_id` remains nullable and entry path **e** in ADR-038 (direct activity, no task — by `korlap` / `kepala_rayon` / `admin_data`) is now first-class. Direct activities still validate against the same `case_type` / `pruning_action` / `source` enums; the task-typing layer is reused, not bypassed. Multi-worker activities are recorded via the new `activity_tags` table — the activity owner is the reporter, tagged users gain read access on their own feed.
