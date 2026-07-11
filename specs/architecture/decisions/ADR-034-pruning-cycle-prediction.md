# ADR-034: Pruning Cycle Prediction — Species × Area_Type Lookup (No ML), with Manual Override

## Status

Accepted

## Date

2026-04-24

## Context

The mayor's directive driving Phase 3 is: stop pruning reactively; forecast when each area needs pruning next, based on app data. The client has stated the app should "automatically" schedule the next pruning per area.

Modeling options:

- **ML model** (e.g., survival analysis or gradient boosting over species × climate × area_type × past activity). Requires training data at scale we don't have — the CSV is 5,008 rows across 4 months with heterogeneous, untagged records. Also produces predictions the client can't easily audit or override.
- **Fixed global cycle** (e.g., "prune every 6 months"). Matches no species. Trembesi and sono behave very differently from ornamental shrubs.
- **Deterministic rule: species-specific baseline cycle, applied to area-aggregate last-pruned date.** Simple, auditable, overridable. Aligns with ADR-030's area-aggregate inventory.

The client explicitly said they do not want per-tree individuality. Per-species baseline + area-level application is the right granularity.

Open question at decision time: should cycle depend on `area_type` (e.g., roadside vs. park)? Probably yes eventually — a roadside trembesi needs more frequent pruning than a park one. But we don't have the data to parameterize that today. We design the model to accept a future `species × area_type` refinement without restructuring.

## Decision

Adopt a **deterministic species-baseline pruning cycle** with admin override and daily recalculation. Design for a future `species × area_type` refinement without building it now.

### Model

- `plant_species.default_pruning_cycle_days INT NULL` — baseline in days per species. Admin-filled (iteratively, as data accumulates). NULL means "no forecast available; status stays `ok`."
- `area_plants.last_pruned_at TIMESTAMPTZ NULL` — updated when an `activity` with `task_type='pruning'` and matching `activity_plant_items` completes (ADR-031).
- `area_plants.next_due_at = last_pruned_at + INTERVAL default_pruning_cycle_days DAY` — materialized column, recomputed nightly.
- `area_plants.status TEXT` — derived label:

| Condition | Status |
|---|---|
| `next_due_at IS NULL` (never pruned, or no cycle defined) | `ok` |
| `next_due_at > now() + interval '14 days'` | `ok` |
| `now() <= next_due_at <= now() + interval '14 days'` | `due` |
| `next_due_at < now()` | `overdue` |

The 14-day "due window" is a configurable `monitoring_configs` row (`plant_due_window_days`, default 14).

### Recalculation

`PlantDueDateRecalculator` — NestJS `@Cron('0 3 * * *')` (3 AM daily):

1. For each `area_plants` row where `last_pruned_at IS NOT NULL` and species cycle is set: recompute `next_due_at` and `status`.
2. Publish `area:plant-status-changed` WS events for areas whose status label flipped. Fan-out routes through the same Redis-backed path as monitoring (ADR-029) so status changes propagate without new infra.
3. Write an audit row (per ADR-015) for any admin-overridden `next_due_at` that the recalculator left untouched.

Activity submission (ADR-031) also triggers an inline recalc for the specific `area_plants` row, so a completed pruning immediately flips the status from `overdue` → `ok` without waiting for the cron.

### Manual override

- `admin_rayon` (rayon-scoped per ADR-032) or `management` can `PATCH /api/v1/areas/:id/plants/:plant_id` to set `next_due_at` directly (e.g., "this area was pruned outside the app last week").
- Overrides are tagged (`area_plants.override_at`, `override_by`) so the cron knows not to recompute. A later activity submission clears the override.

### Future refinement (not built)

When we have ≥ 12 months of data across area types, introduce:

```sql
species_area_cycle(species_id, area_type, cycle_days)
```

and change the lookup order to: `species_area_cycle → plant_species.default_pruning_cycle_days`. No schema change to `area_plants` required.

## Consequences

### Positive

- **Auditable.** Every forecast is `last_pruned_at + species.cycle_days`. Anyone can verify in SQL. No opaque ML reasoning.
- **Client-tunable.** The client can adjust `plant_species.default_pruning_cycle_days` per species without a developer. They can override specific areas directly.
- **Cheap.** Daily cron touches `area_plants` rows once; most are no-ops. Inline recalc on activity submission is single-row. No training pipeline.
- **Aligned with inventory model.** ADR-030's area-aggregate granularity is exactly the unit of forecasting here.
- **Graceful on missing data.** Species without `default_pruning_cycle_days` simply don't forecast; they're not errors.
- **Extensible.** The `species_area_cycle` refinement slots in later without data migration.

### Negative

- **Accuracy depends on admin discipline.** If `default_pruning_cycle_days` is left NULL or guessed, forecasts are poor. Mitigation: seed a best-effort baseline from CSV data in Phase 3 sub-phase 3-13; surface species with NULL cycles on the admin dashboard.
- **Count drift propagates to forecasts.** If `area_plants.count` is wrong, forecasts remain pointed at the wrong quantity. Mitigation: periodic physical audit flow (future work).
- **No per-tree granularity.** A single old tree in a healthy area still pulls the whole area's status. Accepted per ADR-030's client directive; `notable_plants` absorbs true individual cases.
- **14-day due window is a heuristic.** Too small → late-stage alerts; too large → alert fatigue. Starts at 14, configurable, tuned via operational feedback.

## Alternatives Considered

1. **ML survival model.** Rejected. Training data thin and heterogeneous; opaque to client; high maintenance cost (retraining pipelines, drift monitoring). Revisit in Phase 5+ if data matures.
2. **Fixed global cycle (e.g., 90 days).** Rejected. Species variance is too large; produces universally-wrong forecasts.
3. **Per-tree cycle** (with `notable_plants.next_due_at`). Rejected for the main inventory per ADR-030; `notable_plants` can carry its own `next_due_at` for heritage tracking without driving area-status forecasts.
4. **Growth-rate model** (measure tree size, infer cycle). Rejected. Requires measurements not in current data; complicates field workflow.
5. **Schedule from pruning-request backlog instead.** Rejected. Pruning requests are reactive public demand; forecasts need to be proactive. Both coexist — requests add urgency, forecasts catch what requests miss.

## References

- [ADR-030](./ADR-030-area-aggregate-plant-inventory.md) — area-aggregate inventory model
- [ADR-031](./ADR-031-task-typing-and-custom-fields.md) — activities with `plant_items` update `last_pruned_at`
- [ADR-015](./ADR-015-audit-trail.md) — audit logging for admin overrides
- [ADR-029](./ADR-029-monitoring-v2-event-sourced-redis.md) — WS fan-out path reused for plant status events
- Phase 3 plan: `../../phases/phase-3-plants-monitoring-rebuild/README.md`
- API contracts: `../../api/contracts.md`
- Database schema: `../../database/schema.md`
