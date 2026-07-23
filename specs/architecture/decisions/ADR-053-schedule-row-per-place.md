# ADR-053: One schedule row = one worker, one shift, one place

## Status

Accepted — **implemented** (be/web/mobile; migrations 17516–17518)

## Date

2026-07-23

## Context

A worker legitimately covers several places in one shift: a satgas works lokasi A
from 07:00, moves to lokasi B, then to a kawasan in another rayon; a korlap
monitors a handful of small taman. The scheduling model had no way to express
that, because `UQ_schedules_user_date_shift` allowed exactly one row per
(worker, day, shift).

Two shapes were considered.

**A — one row, many places.** Grow the row into sets: `schedule_locations`
(already 0..N), plus junctions for kawasan and rayon. Partially built on
2026-07-23 (`schedule_regions`, `schedule_event_locations`, multi-select in the
create form).

**B — many rows, one place each.** Keep the form as it is (1 rayon → optional 1
kawasan → 1 lokasi) and cover more ground by adding another schedule.

**A was rejected**, for reasons that are about the product, not the schema:

- **Every schedule surface is organised by geography.** The day board nests
  rayon → kawasan → lokasi; the map drills the same way. A row spanning 3 lokasi
  in 2 kawasan has no correct home — render it once per lokasi and one person
  appears as three; render it at the parent and it is invisible at the lokasi
  where the work happens.
- **The form degenerates into unions.** Multi-rayon forces the kawasan list to be
  a union across rayon, which forces the lokasi list to be a union across
  kawasan. There is no non-arbitrary answer to "which kawasan do we show?".
- **`display_scope_id` is a single value** (`monitoring-stats.service.ts`), so
  multi-coverage silently placed the marker at whichever row sorted first.

Rejecting A only works if B does not produce false absences: a korlap with three
rows who clocks in once must not read as one `bertugas` and two `tidak_hadir`.
That is what the invariant below is for.

## Decision

**A schedule row is an EXPECTATION — "this worker is due here this shift". It is
not a unit of attendance.**

Three consequences, and everything else follows from them:

1. **Presence belongs to `(worker, shift, service-day)`, never to a row.** One
   clock-in produces one lifecycle state (ADR-050), and every row for that shift
   reads the same state. The code already leans this way:
   `scheduledUserIdsForCurrentShift` returns a set of *user ids*.

2. **Any count above lokasi is `COUNT(DISTINCT user_id)`.** A worker with three
   rows is one person in a rayon total and one person in the city total.

3. **Per-lokasi staffing counts `assigned ∧ present`, not
   `assigned ∧ physically-inside-right-now`.** A satgas assigned to A, B and X
   who is clocked in covers all three for that shift. Counting only bodies
   currently inside a boundary would mark B understaffed from 07:00–09:00 while
   its satgas was legitimately at A — an alarm for someone on duty and on plan.
   **Inside/outside stays a separate axis** (ADR-050's location axis):
   information, never a staffing input.

Supporting rules:

- **Uniqueness becomes `(user, date, shift, place)`.** This still blocks the
  duplicate that is genuinely wrong — same worker, same shift, *same place* —
  which is what an operator actually fat-fingers.
- **The current assignment is derived, not stored:** the row whose area contains
  the worker's position, else the nearest. This is `getActiveArea`'s existing
  clock-in rule, reused rather than reinvented, so it updates by itself as the
  worker moves from A to B.
- **One worker is always one marker**, drawn from live GPS. Markers come from
  people, not rows, so multi-row can never duplicate anyone on the map.
- **The day board shows a roaming worker under each assigned lokasi.** The board
  answers "who is due here", and they are due at each.
- **Monitoring coverage for korlap is schedule-driven, full stop.** Coverage =
  the union of the places on today's rows (a kawasan row expands to its lokasi, a
  rayon row to its lokasi). The standing user assignment (`user_locations`,
  `users.region_id`) is **no longer a monitoring-scope source**: two sources of
  truth is exactly the drift that produced the bugs this ADR closes, and with
  recurring schedules materialised 60 days ahead a scheduled worker essentially
  always has rows. No rows today ⇒ no coverage, and the UI says so plainly rather
  than showing a stale world. Those columns keep their other jobs (task scoping,
  permanent placement, and the ad-hoc clock-in fallback — attendance, not
  monitoring).
- **Multi-row is allowed for every role**, not just roaming ones. The
  count-once rule lives in the counting layer, so no role restriction has to be
  frozen into the schema.

**Deliberately not adopted: per-row time windows.** They would make staffing
time-aware ("who is due here at 10:00") but add a field to a form we just
simplified and a scheduling burden for admins. Consequence 3 makes the model
correct without them.

## Consequences

**Reverted** (variant A, built earlier the same day — keeping it beside B would
mean two ways to express one thing, the clutter this ADR exists to remove):
multi-select lokasi in the create form; the `schedule_regions` and
`schedule_event_locations` junctions; `region_ids` on `PATCH /schedules/:id/areas`.

Unaffected and retained: the cross-midnight roster fix, the verbose duplicate
message, `ScopeFields` reuse in the edit modal, and asking the recurrence scope
*after* the form.

**Risk — silent, not loud.** Aggregates that sum per-node counts up the tree
become wrong under multi-row with no error, just an inflated number. The audit of
every counter in `monitoring-stats.service.ts` runs **before** any code lands.

**Done:** counting audit (the schedule-derived counters were already
`DISTINCT user_id`; the real defect was staffing keying off live position, now
`assigned ∧ present`) → variant A reverted (`17516`) → uniqueness key
`(user, date, shift, place)` (`17517`, which added `schedules.location_id`) →
board counts union `workerIds` instead of summing occurrences →
`GET /schedules/my/day` + mobile card lists every row → overlap guard ignores
siblings → **`schedule_locations` retired entirely** (`17518`), so the place has
exactly one home.

**Verification (live data):** a korlap with 3 lokasi who clocks in once — one
status, no false absences, all 3 lokasi covered, rayon and city totals show 1.

## Related

- **ADR-050** — the presence model this rests on; consequence 1 makes its
  per-worker derivation an explicit invariant rather than an implementation detail.
- **ADR-047** — calendar-style scheduling (events → occurrences); unchanged.
- **ADR-046** — korlap monitoring scope; this ADR settles it as schedule-driven
  and drops the static fallback.
- **ADR-045 / ADR-052** — the city → rayon → kawasan → lokasi geography, in which
  kawasan is optional (Rayon Taman Aktif hangs lokasi straight off the rayon).
