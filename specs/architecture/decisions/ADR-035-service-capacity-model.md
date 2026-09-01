# ADR-035: Generic `service_capacity` Model (Rayon × ISO-Week × Service_Type)

## Status

Accepted — **Amended May 2026 by [ADR-038](./ADR-038-pruning-workflow-entry-points.md)**

> **Amendment (May 2026):** ADR-038 reframes kecamatan booking as **week-only** at submit time. The original "convert-to-task exposes a day-picker scoped to the booked week" UI is retained for admin overrides, but the default path is now **server-side auto-pick** — `convertToTask()` walks Mon–Sun of the requested ISO week (`expected_year` + `expected_iso_week` columns added to `pruning_requests`) and books the first day where `bookAtomic` succeeds, falling back to admin override only if the whole week is full. The mobile `WeekPicker` replaces the day-grid `AvailabilityCalendar` on the kecamatan submit form. Capacity is still tracked weekly per this ADR; only the booking UX changed.

## Date

2026-04-24

## Context

Phase 3 needs a capacity calendar for pruning — when a kecamatan request converts into a task, the system should know whether the target rayon has capacity in the intended week, and warn (not block) if it is over-booked.

The client's explicit roadmap beyond Phase 3 includes extending SEKAR into a "DLH superapp": street sweeping, garbage collection, watering, planting. A pruning-specific capacity table (`rayon_pruning_capacity`) would lock us in and require schema duplication per future service.

Design constraints:

- **Granularity.** Daily capacity tracking at the rayon level is noise — daily volume varies with crew composition, weather, and unrelated events. Weekly granularity smooths this and matches how DLH actually plans (by the week). **Client confirmation (Apr 25, 2026, Q3 answer):** weekly is the **booking** granularity (kecamatan submits, capacity calendar shows weekly slots). Once a request is approved and converted into a task, the **assignment day** is selectable per-task — the convert-to-task flow exposes a day-picker scoped to the booked week, and the task carries a specific `scheduled_date`. Capacity tracking stays weekly; the daily picker is a UI affordance, not a separate capacity column.
- **Capacity is soft, not hard.** A converted task that exceeds capacity should surface a warning with alternatives (next available week), but `admin_rayon` or `management` can override. Hard blocks would make the system brittle against real-world exceptions.
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
- **Explicit manual adjust.** `POST /api/v1/rayons/:id/capacity/book` with `{ service_type, year, iso_week, delta }` — for exceptional corrections by `admin_rayon` (rayon) or `management`.

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
- `PUT /api/v1/rayons/:id/capacity` — bulk edit of `capacity_units` (roles: `admin_rayon` rayon, `management`). `booked_units` is read-only through this endpoint; it only changes via booking flows.

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


## 2026-04-28 amendment — UX projection + reschedule endpoint

**Storage stays weekly.** The `service_capacity` table keeps the `(rayon_id, year, iso_week, service_type)` shape; `capacity_units` and `booked_units` remain weekly integers. Daily granularity is still rejected as the storage model (Alternative #2 above).

**UX-only daily projection.** Phase 3 staff_kecamatan UX Round 4 (mobile) introduces a per-day visualization in the submit + reschedule calendars. Each day inside the rendered window is mapped to one of four statuses derived from the day's containing ISO-week row:

| Condition | Status |
|-----------|--------|
| `capacity_units == 0` (admin hasn't filled the slot) | `unknown` |
| `booked_units >= capacity_units` | `full` |
| `booked_units >= capacity_units * 0.8` | `partial` |
| otherwise | `available` |

Past dates are filtered at the picker layer. The projection lives in `apps/mobile/src/screens/pruningRequests/utils/capacityCalendar.ts` and is consumed by `AvailabilityCalendar`. **No backend or database change.**

**Read access widened.** `GET /api/v1/rayons/:id/capacity` now allows `staff_kecamatan` (scoped to their own `rayon_id` exactly like `admin_rayon`) so the submit calendar can display availability without leaking other rayons' booking data.

**New write endpoint.** `PATCH /api/v1/pruning-requests/:id/expected-date` lets `admin_rayon` (rayon-scoped), `kepala_rayon`, `management`, `admin_system`, and `superadmin` adjust a request's `expected_date` independent of the convert-to-task flow. Allowed when status ∈ {`submitted`, `under_review`, `approved`} and the new date is today-or-future. This endpoint does **not** mutate `service_capacity`; capacity bookings still occur only at convert-to-task time.

## 2026-05-01 amendment — kecamatan picks a week, not a day

**Storage stays weekly** (no further change to the `service_capacity` shape). What changes is what `staff_kecamatan` is asked to choose at submit time.

**Why the shift.** The day-grid `AvailabilityCalendar` led submitters to assume the chosen day was a commitment, even though capacity is booked weekly and the actual execution day is set by `admin_rayon` at convert-to-task. The day-grid also offered no useful affordance — every day in the same ISO week shared the same status colour. Switching to a week-picker matches the storage model, removes the false specificity, and frees the admin to schedule the concrete day inside that week without renegotiating with the submitter.

**Submission DTO.** `CreatePruningRequestDto` accepts `expected_year: number` and `expected_iso_week: number` (both 1-indexed, ISO 8601 week numbering). Legacy `detail_date` remains accepted for one release as a fallback so older mobile builds continue to work; when present it is normalised to `(year, iso_week)` server-side. New mobile builds send only the week pair.

**Persistence.** `pruning_requests` gains two nullable columns `expected_year INT` and `expected_iso_week INT`. The pre-existing `expected_date` column is **kept**: it is populated by `admin_rayon` (or by the convert-to-task auto-pick described below) once the concrete day is decided. Three states are now valid:

| State | `expected_year`/`expected_iso_week` | `expected_date` | Meaning |
|-------|-------------------------------------|-----------------|---------|
| Submitted with week | set | NULL | Submitter picked a week; concrete day TBD |
| Date assigned | set | set | Admin or auto-pick chose the day |
| Legacy / admin-direct | NULL | set | Old build or admin-edited reschedule |

**Convert-to-task auto-pick.** If a request has `expected_year`/`expected_iso_week` and the converting admin does **not** pass an explicit `scheduledDate`, the service iterates Mon→Sun of that ISO week and books `service_capacity` atomically on the first day where capacity allows. The picked day is written to `expected_date` and to the new task's deadline. If every day of the chosen week is full, the convert returns the existing 409 with the suggested-week payload (next 4 weeks with capacity), unchanged from the original ADR.

**Reschedule unchanged.** `PATCH /pruning-requests/:id/expected-date` continues to accept a single ISO date — admin override is always concrete, never weekly. The reschedule does not clear `expected_year`/`expected_iso_week`; the week of record stays for audit, the date is the source of truth.

**Mobile UX.** `AvailabilityCalendar` (day-grid grouped by week) is replaced by `WeekPicker` (vertically stacked week cards). Each card shows the week range, an overall capacity badge, and seven small per-day chips coloured by the same `available|partial|full|unknown` projection as before — the chips are informational only and not tappable. Tapping a card returns `(year, isoWeek)`. The `RescheduleSheet` (admin) keeps the day-grid because admins need date precision.
