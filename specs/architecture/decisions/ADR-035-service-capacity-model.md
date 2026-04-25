# ADR-035: Generic `service_capacity` Model (Rayon × ISO-Week × Service_Type)

## Status

Accepted

## Date

2026-04-24

## Context

Phase 3 needs a capacity calendar for pruning — when a kecamatan request converts into a task, the system should know whether the target rayon has capacity in the intended week, and warn (not block) if it is over-booked.

The client's explicit roadmap beyond Phase 3 includes extending SEKAR into a "DLH superapp": street sweeping, garbage collection, watering, planting. A pruning-specific capacity table (`rayon_pruning_capacity`) would lock us in and require schema duplication per future service.

Design constraints:

- **Granularity.** Daily capacity tracking at the rayon level is noise — daily volume varies with crew composition, weather, and unrelated events. Weekly granularity smooths this and matches how DLH actually plans (by the week). **Client confirmation (Apr 25, 2026, Q3 answer):** weekly is the **booking** granularity (kecamatan submits, capacity calendar shows weekly slots). Once a request is approved and converted into a task, the **assignment day** is selectable per-task — the convert-to-task flow exposes a day-picker scoped to the booked week, and the task carries a specific `scheduled_date`. Capacity tracking stays weekly; the daily picker is a UI affordance, not a separate capacity column.
- **Capacity is soft, not hard.** A converted task that exceeds capacity should surface a warning with alternatives (next available week), but `admin_data` or `top_management` can override. Hard blocks would make the system brittle against real-world exceptions.
- **Service breadth.** The same pattern must serve pruning today, watering and planting next quarter, street sweeping and garbage collection later. Separate tables per service compound migration and reporting cost linearly with service count.
- **Booking model.** A task implicitly books capacity on creation from a converted pruning request. Cancellation releases booking. Manual adjustments (override, rebalance) need an explicit endpoint.

## Decision

Introduce a single generic table **`service_capacity`** keyed by `(rayon_id, year, iso_week, service_type)`, with soft-block semantics on booking.

### Schema

```sql
CREATE TABLE service_capacity (
  id UUID PK,
  rayon_id UUID NOT NULL REFERENCES rayons(id),
  year INT NOT NULL,
  iso_week INT NOT NULL,                 -- ISO 8601 week number (1..53)
  service_type TEXT NOT NULL,            -- 'pruning' | 'watering' | 'planting'
                                         -- | 'cleaning' | 'collection' | 'generic'
  capacity_units INT NOT NULL DEFAULT 0, -- e.g., trees/week for pruning
  booked_units INT NOT NULL DEFAULT 0,
  UNIQUE (rayon_id, year, iso_week, service_type)
);
CREATE INDEX idx_service_capacity_rayon_week ON service_capacity(rayon_id, year, iso_week);
```

### Booking semantics

- **Implicit booking on task creation from pruning-request conversion.** `POST /api/v1/pruning-requests/:id/convert-to-task` computes `(year, iso_week)` from the chosen target date and atomically increments `booked_units` by `task.target_plant_count`.
- **Implicit release on task cancellation.** If the converted task is cancelled before completion, `booked_units` is decremented.
- **Soft over-capacity.** If the booking would push `booked_units > capacity_units`, the API returns **HTTP 409** with a response body containing the current utilization plus a suggested-week payload (next 4 weeks with available capacity). The client UI can let the reviewer proceed (override) or reschedule. The override path still performs the booking.
- **Explicit manual adjust.** `POST /api/v1/rayons/:id/capacity/book` with `{ service_type, year, iso_week, delta }` — for exceptional corrections by `admin_data` (rayon) or `top_management`.

### Capacity unit interpretation

| `service_type` | `capacity_units` means |
|---|---|
| `pruning` | Trees pruned per week |
| `watering` | Areas watered per week |
| `planting` | Plants planted per week |
| `cleaning` / `collection` | Service-specific (defined when feature lands) |
| `generic` | Opaque unit (fallback for ad-hoc use) |

Units are domain-specific per service_type but the table doesn't care — capacity vs. booked is a pure integer comparison within a service_type.

### Seed data

- 7 rayons × next 12 ISO weeks × `service_type='pruning'` with `capacity_units=0` (admin fills). Zero is a conservative default that surfaces unconfigured weeks as immediately over-capacity on first booking, forcing the admin to set real values.
- `monitoring_configs` row `capacity_suggestion_horizon_weeks` default 12 — controls the lookahead window for the 409 suggestion payload.

### Admin read/write

- `GET /api/v1/rayons/:id/capacity?service_type=&year=&from_week=&to_week=` — calendar view for admin UI.
- `PUT /api/v1/rayons/:id/capacity` — bulk edit of `capacity_units` (roles: `admin_data` rayon, `top_management`). `booked_units` is read-only through this endpoint; it only changes via booking flows.

## Consequences

### Positive

- **Reusable for the superapp.** Adding watering/planting/sweeping/collection is a seed-rows operation + client UI, no schema change.
- **Single source of truth for capacity.** One table to query for city-wide load, rayon-level load, service-mix, and forecast vs. actual.
- **Simple reporting.** Utilization = `booked / capacity`; by-rayon or by-service aggregates are one GROUP BY away.
- **Non-blocking.** Soft 409 with alternatives preserves operational flexibility. Reviewers stay in charge; the system advises.
- **ISO week is stable and universal.** Avoids timezone and calendar edge cases. Postgres `EXTRACT(ISOYEAR FROM ...)` and `EXTRACT(WEEK FROM ...)` produce the key directly.

### Negative

- **Weekly granularity may under-serve detailed planning.** A rayon might have Monday-heavy vs. Friday-heavy weeks that weekly totals hide. Mitigated by the existing tasks view (task.deadline per day) — capacity is strategic, task-list is tactical.
- **Capacity edits are manual.** Automatic derivation from staff count × hours is a future enhancement; today, admin enters values.
- **Race conditions on booking.** Concurrent conversions to the same week could both succeed before `booked_units` catches up. Mitigated by row-level lock (`SELECT ... FOR UPDATE`) inside the booking transaction.
- **Historical accuracy.** If a task's `target_plant_count` is edited after booking, the booked_units drift. Mitigation: triggered recount on `target_plant_count` change, or periodic reconciliation job. Chosen: recount-on-change, documented in `specs/api/contracts.md`.

## Alternatives Considered

1. **Per-service-type table** (`rayon_pruning_capacity`, `rayon_watering_capacity`, …). Rejected. N tables per service with identical shape; duplicates indexes, migrations, and module code; breaks cross-service utilization reporting.
2. **Daily granularity** (`rayon_id, date, service_type, capacity_units`). Rejected. Over-detailed; admins will leave most days zero or identical, creating noise. Daily visibility exists via task.deadline without storing daily capacity.
3. **No capacity model; let task creation always succeed.** Rejected. Client explicitly wants capacity visibility for top management. A reactive "we ran out" signal is too late.
4. **Hard-block over-capacity bookings.** Rejected. Real operations always have exceptions; a hard block invites workarounds that evade reporting. Soft 409 + override keeps the data honest.
5. **Capacity per area, not per rayon.** Rejected. Crews move across areas within a rayon; area-level capacity doesn't reflect how the work is actually resourced.
6. **Rolling 7-day windows instead of ISO weeks.** Rejected. Harder to display, harder to plan against, harder to aggregate. ISO weeks are what humans already use.

## References

- [ADR-013](./ADR-013-multi-area-assignment.md) — rayon scoping reused for capacity ownership
- [ADR-031](./ADR-031-task-typing-and-custom-fields.md) — `task_type` drives which service_type the booking lands in
- [ADR-032](./ADR-032-admin-data-disposition-authority-pruning-requests.md) — conversion flow where booking happens
- Phase 3 plan: `../../phases/phase-3-plants-monitoring-rebuild/README.md`
- API contracts: `../../api/contracts.md`
- Database schema: `../../database/schema.md`
