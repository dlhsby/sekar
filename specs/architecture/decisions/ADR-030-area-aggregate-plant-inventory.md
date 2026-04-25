# ADR-030: Area-Aggregate Plant Inventory with Optional Notable-Plant Records

## Status

Accepted

## Date

2026-04-24

## Context

Phase 3 introduces plant management so DLH can forecast pruning cycles per area. A fundamental modeling question: do we track **each tree individually**, or aggregate by **species × area**?

Constraints and evidence:

- **Client directive (explicit).** In the Phase 3 kickoff, the client stated DLH does not want to identify each tree individually. At city scale (tens of thousands of trees across 7 rayons), per-tree surveying and ongoing maintenance is operationally infeasible.
- **Existing data is aggregate.** The historical CSV (`Rekap Perantingan dan Penanganan Potong Pohon`, 5,008 rows, Dec 2025–Apr 2026) records species + count + area + maintenance type. No tree IDs. Any per-tree model would require back-filling identity that never existed.
- **Forecasting target is area-level.** ADR-034's pruning-cycle prediction operates on species × area, not per-tree. Per-tree granularity adds no predictive value for the client's stated use case.
- **But heritage trees matter.** Historic trembesi, landmark mangroves, and flagged specimens (disease risk, structural concern) justify individual records with GPS, photos, and notes. These are a small minority — tens, not thousands.

The naive answers — "per-tree entity with full history" or "no inventory, just activities" — both fail: the first contradicts the client, the second prevents cycle forecasting.

## Decision

Adopt a **two-tier model**: an area-aggregate table for the bulk inventory, plus an optional individual-record table for notable specimens.

### Tables

```sql
area_plants                       -- aggregate inventory (the primary table)
  id UUID PK
  area_id UUID FK areas
  species_id UUID FK plant_species
  count INT NOT NULL DEFAULT 0
  last_pruned_at TIMESTAMPTZ NULL
  next_due_at TIMESTAMPTZ NULL
  status TEXT NOT NULL DEFAULT 'ok'   -- 'ok' | 'due' | 'overdue'
  UNIQUE (area_id, species_id)
  INDEX (area_id, status), (next_due_at)

notable_plants                    -- optional individual records
  id UUID PK
  area_id UUID FK
  species_id UUID FK
  gps_lat NUMERIC
  gps_lng NUMERIC
  label TEXT                        -- e.g. "Trembesi Sudirman 1"
  heritage BOOL DEFAULT FALSE
  photo_urls TEXT[]
  notes TEXT
  INDEX (area_id)
```

### Semantics

- **`area_plants` is the source of truth** for "how many of species S are in area A" and "when does A's S population need pruning next." Pruning activities roll up into `area_plants.last_pruned_at` via `activity_plant_items` (see ADR-031).
- **`notable_plants` is metadata-only.** It does not decrement `area_plants.count`. A heritage trembesi is *also* one of the N trembesi counted in `area_plants` for its area — `notable_plants` just attaches GPS + photos + heritage flag.
- **No per-tree history.** We do not track "this specific tree was last pruned on date X." History lives on `activities` + `activity_plant_items` at the species × area granularity.
- **Status is derived**, not authored. `area_plants.status` is refreshed nightly by `PlantDueDateRecalculator` (ADR-034) based on `next_due_at`.

### Write paths

| Event | Effect on `area_plants` | Effect on `notable_plants` |
|---|---|---|
| Admin bulk-imports CSV | UPSERT rows (area_id, species_id) with `count` | None |
| Activity submitted with `plant_items` (ADR-031) | `last_pruned_at = activity.completed_at`; trigger cycle recalc | None |
| Admin flags heritage tree | None (counted already) | INSERT new row |
| Admin removes dead tree | Decrement `count` by 1 | DELETE if notable |

## Consequences

### Positive

- **Matches existing data shape.** CSV import lands naturally into `area_plants` + `activity_plant_items` without inventing synthetic tree IDs.
- **Cheap bulk operations.** A pruning activity for "8 trembesi" updates one row, not 8. A city-wide overdue query scans `area_plants`, not a multi-thousand-row tree table.
- **Simple UX.** Admins enter counts; field workers submit species + count on activity completion. No tree-identity management.
- **Heritage expressiveness preserved.** `notable_plants` lets the client track what actually matters at the individual level without forcing every tree into that table.
- **Forecasting is trivial.** `next_due_at = last_pruned_at + species.default_pruning_cycle_days` is a single computed column per (area, species) (ADR-034).

### Negative

- **No individual tree trajectory.** We cannot answer "was *this specific* sono pruned more recently than average?" This is accepted per client directive.
- **Count accuracy depends on discipline.** If `area_plants.count` drifts from reality (trees die, are planted, are missed in import), forecasts drift. Mitigation: periodic physical audit flow (future), plus count-adjust endpoints for admin.
- **`notable_plants` double-counts conceptually.** A heritage tree is one row in `notable_plants` *and* one of the counted trees in `area_plants`. Documented clearly to avoid confusion in reports.

## Alternatives Considered

1. **Per-tree entity with full history table.** Rejected by explicit client directive. Also infeasible: no existing tree IDs, no survey budget, maintenance UX unmanageable at scale.
2. **No inventory, derive everything from activities.** Rejected. Activities only record what was pruned, never what exists. Cannot forecast "area has 50 trembesi, 8 were pruned, 42 still due" without a population count.
3. **`area_plants` only, no `notable_plants`.** Rejected. Loses the ability to track heritage / flagged trees, which the client explicitly called out as important.
4. **Separate `heritage_trees` table unlinked to inventory.** Rejected. `notable_plants` is richer (covers non-heritage flags like "diseased," "leaning") and sharing the species FK gives free reporting.

## References

- [ADR-010](./ADR-010-phase2c-terminology-cleanup.md) — plural, English, no feature-prefix naming (drives `plant_species`, `area_plants`, `notable_plants`)
- [ADR-031](./ADR-031-task-typing-and-custom-fields.md) — `activity_plant_items` line items that update `area_plants.last_pruned_at`
- [ADR-034](./ADR-034-pruning-cycle-prediction.md) — how `next_due_at` and `status` are computed
- Phase 3 plan: `../../phases/phase-3-plants-monitoring-rebuild/README.md`
- Database schema: `../../database/schema.md`
- API contracts: `../../api/contracts.md`
