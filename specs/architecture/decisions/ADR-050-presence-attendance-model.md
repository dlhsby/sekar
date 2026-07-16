# ADR-050: Presence & Attendance Model — Lifecycle, Live Presence & Counting Axes

## Status

Accepted — **supersedes the status-model portion of [ADR-046](./ADR-046-monitoring-subject-model.md)** (its 2026-07-16 "5 → 3" amendment) and **extends** its subject model. Depends on [ADR-047](./ADR-047-schedule-redesign.md) (occurrences carry the roster) and [ADR-013](./ADR-013-multi-area-assignment.md) (expected/present/absent). Implemented in **Phase 5.4**.

## Date

2026-07-16

## Context

Phase 5.3 collapsed `TrackingStatus` from five values to three (`active` · `offline` · `absent`) and promoted inside/outside to an axis. That was the right direction, but stress-testing the model against the concrete questions management actually asks exposed that **one flat `status` field was still answering three unrelated questions at once** — which is why `absent` ended up meaning "no-show", "went home", and "off today" simultaneously, and why several questions had no clean answer at all.

The twelve questions management wants a monitoring screen to answer:

1. Where is a given worker? 2. Is he scheduled today / right now? 3. Has he clocked in? 4. If in, is he late? 5. If not in, why — and who are the ones not clocking in? 6. If in, active or offline? 7. If in, inside or outside his area? 8. Has he clocked out (don't show him live, but let me see today's track)? 9. On clock-out, is he "offline" or *pulang*? 10. If active, where now? 11. If not active, where was he last active? 12. If unscheduled but online, show him with a different marker and don't count him toward staffing.

Auditing these against the code found four hard gaps, all traceable to the overload: **late** (Q4) is computed in the shifts module but never surfaced in monitoring; **clocked-out / *pulang*** (Q8/Q9) is indistinguishable from never-showed-up because both fold into `absent`; the **"why"** behind an absence (Q5 — *tidak hadir* vs *libur* vs *belum waktunya*) is not modelled; and an **unscheduled clock-in** (Q12) is drawn distinctly on the map but can still be counted toward staffing.

The recurring lesson of Phase 5 applies here too: the dangerous defects are invisible to a green suite because they are **semantic**, not type errors. Storing an *interpretation* (a status word) that is really a *derivation* of other facts is exactly what let the 5.3 `offline`↔`absent` inversion drift silently. The fix is structural, not another enum value.

## Decision

### Principle — store facts, derive the state

A worker's presence is a **pure function** of facts we already store — the roster occurrence, the shift/attendance record, and the live tracking row. We do **not** persist an interpreted lifecycle status that can drift from those facts. The display state is computed at read time (or cached on the aggregate feed, invalidated by the same events).

### Three orthogonal axes

| Axis | Answers | Source of truth (already exists) |
|---|---|---|
| **1 · Attendance lifecycle** | Q2, Q3, Q4, Q5, Q8, Q9 | roster occurrence ([ADR-047](./ADR-047-schedule-redesign.md)) + `shift` record (`clock_in_time`, `clock_out_time`, `is_late`) |
| **2 · Live presence** | Q1, Q6, Q7, Q10, Q11 | `user_tracking_status` (`last_location_at`, GPS, `is_within_area`) |
| **3 · Counting & role** | Q12 | role ∈ `STAFFING_COUNTED_ROLES` ∧ scheduled-for-this-subject |

### Axis 1 — Attendance lifecycle (one value per worker per service day)

| State | Meaning | Live map? |
|---|---|---|
| `tidak_bertugas` | not scheduled today (incl. approved *libur*) | no |
| `belum_hadir` | scheduled, not yet clocked in, still inside the arrival window | no (roster) |
| `terlambat` | scheduled, past start + grace, still not clocked in | no (flagged) |
| `bertugas` | **clocked in, not clocked out** — the only live state | **yes** |
| `pulang` | clocked out (voluntary) | no (today's history) |
| `tidak_hadir` | scheduled, shift window ended, never clocked in | no (flagged red) |

The state is derived first-match top-to-bottom (overrides applied first — see Policy):

| Scheduled? | Clocked in? | Clocked out? | Now vs shift window | → State |
|---|---|---|---|---|
| no | no | — | — | `tidak_bertugas` |
| yes | no | — | before start + grace | `belum_hadir` |
| yes | no | — | after start+grace, before end | `terlambat` |
| yes | no | — | after shift end | `tidak_hadir` |
| yes / no | yes | no | — | `bertugas` *(+ `ad_hoc` if unscheduled)* |
| yes / no | yes | yes | — | `pulang` |

**Only `bertugas` is ever a live map pin.** `belum_hadir` / `terlambat` / `pulang` / `tidak_hadir` / `tidak_bertugas` live in the roster / *daftar petugas* / today's-history panel — visible and queryable (answering Q8's "don't show him live but let me see his track"), never a live marker.

### Axis 2 — Live presence (only meaningful while `bertugas`)

Two orthogonal sub-axes drawn on the pin, plus one position field:

- **Connectivity** — `aktif` (a fix newer than `active_max_age_sec`) · `offline` (stale or no fix). This is all that remains of the 5.3 `active`/`offline`.
- **Area** — `dalam_area` · `luar_area` · `unknown` (no fix has ever arrived). The geofence axis, drawn as a ring, **never** summed into a headcount.
- **Position** — one field: the **current** fix when `aktif`, the **last-known** fix when `offline`. This answers Q10 (active → where now) and Q11 (offline → where last active) with the same value.

A worker can be `aktif` **and** `luar_area` — those are two independent facts (working, reachable, but outside his park). Conflating them is the mistake the axis split fixes.

### Axis 3 — Counting & role

**Staffing counted** = `bertugas` ∧ scheduled-for-this-subject ∧ role ∈ `STAFFING_COUNTED_ROLES` (satgas + linmas, per [ADR-046](./ADR-046-monitoring-subject-model.md)). An **ad-hoc** clock-in (`bertugas` ∧ not scheduled) and a **monitorable** role (korlap / kepala_rayon / admin_rayon) both render on the map with a distinct marker but **never** count. This closes the Q12 gap where an unscheduled clock-in of a counted role still inflated staffing.

### Policy decisions (locked 2026-07-16)

1. **Grace windows — configurable per shift-definition.** Default: `terlambat` = 15 min after `start_time`; `tidak_hadir` = at `end_time`. A shift may override.
2. **Forgotten clock-out — never auto-closed.** A worker still clocked in past his shift's **real end** stays `bertugas` with a **`lupa_clock_out`** flag until a supervisor corrects it; the system never fabricates a `clock_out_time`. Overtime is **explicit only** — presence past shift end is `lembur` *only* when an approved overtime record exists; otherwise it is `lupa_clock_out`, and no hours accrue past the scheduled end.
3. **Excused reasons — `cuti` · `sakit` · `izin` · `libur`,** set by `admin_rayon` / `korlap`. A scheduled worker with an approved reason reads as *excused* (`tidak_bertugas` for a whole-day *libur*/*cuti*, or an *excused* flavour of `tidak_hadir`) rather than an accountable no-show — this is the "why" behind Q5.
4. **Offline threshold — 10 min, configurable.** `monitoring.active_max_age_sec` default 300 → **600**. The value stays freely tunable — the settings catalog already permits up to 86400 s, so 10 min is nowhere near the ceiling (the only 600 cap was a legacy `monitoring-config` zod schema this key no longer writes through, since thresholds moved to `/settings`; it was widened for consistency). The korlap is **paged at the threshold**, but **only within the shift window** and **once per offline transition** — a worker who drops offline *after* his shift end is expected to be leaving and must not page. (10 > the 5-min sweeper interval also restores the backstop margin the 5.3 collapse had erased.)

### Service day & cross-midnight guardrails

Everything resolves against the shift's own **service day**, not the calendar day. This is what keeps **shift 3** (night shift, `crosses_midnight`, e.g. 21:00–05:00) correct:

- **`lupa_clock_out` is judged on the shift's real end timestamp** (cross-midnight aware), never on calendar midnight. A shift-3 worker at 02:00 whose shift ends 05:00 is `bertugas`, not flagged; a day-shift worker still open at 02:00 the next day *is* flagged.
- **A new clock-in is blocked only by a shift still inside its window.** A past-end open shift (`lupa_clock_out`) does **not** block the next day's clock-in — the worker clocks in for the new service day without closing the old one; the dangling shift lingers in the `shifts` table, flagged, for correction. `user_tracking_status` is one row per worker, so the new clock-in simply upserts the live tracking.
- **Live map and staffing counts are scoped to the current service day,** so a dangling shift from yesterday never lands on today's map or in today's count — it falls out of the live view at the boundary without being auto-closed.

Because forgotten clock-outs are never auto-closed, they accumulate as open records with no `clock_out_time`. A **supervisor correction affordance** (a "close & stamp" / clock-out-on-behalf action on flagged shifts) is a required companion so attendance/hours data does not develop holes.

### What this means for storage

- **`user_tracking_status` shrinks to the live half** — connectivity (`aktif`/`offline`) + `is_within_area` + GPS. It describes `bertugas` workers only; it stops encoding attendance. The 5.3 three-value enum's `absent` is no longer stored as a live status — "not clocked in" is derived from the absence of a clock-in, not written to the tracking row.
- **The lifecycle is derived** from the roster + shift record; no new stored enum, no drift.
- **`is_late` and `clock_out_time` are joined into the monitoring snapshot** — both already exist in the shifts module and were simply never surfaced on the map.

**Relationship to PR #277:** the `onClockOut → absent` fix (correcting the 5.3 inversion where clock-out wrote the pre-inversion `offline`) is correct for today's three-value model and stays in place. Under this ADR, once the lifecycle is derived, a *voluntary* clock-out resolves to `pulang`; a *forgotten* one is never turned into any terminal state.

## Consequences

### Positive
- All twelve questions get a clean, single home; the four gaps (late, *pulang*, absence-reason, ad-hoc counting) close.
- No stored interpretation → the class of drift bug that produced the 5.3 inversion cannot recur on the lifecycle axis.
- The live map is quiet by construction — only `bertugas` renders — while everything else stays queryable in the roster/history.
- Reuses what Phase 4 already built (`is_late`, roster expected/present/absent, occurrences); mostly derivation and surfacing.

### Negative
- More states to render (six lifecycle + two live sub-axes) than a single flat badge; the UI must encode them as chips/markers, not one colour.
- "Never auto-close" needs the supervisor correction affordance, or dangling shifts leave gaps in hours data.
- Deriving the lifecycle per read adds joins (roster + shift) to the snapshot; must stay within the aggregate-feed performance model of [ADR-046](./ADR-046-monitoring-subject-model.md) / [ADR-029](./ADR-029-monitoring-v2-event-sourced-redis.md).

### Security
- No change to visibility: lifecycle and live axes are computed over the same scope-filtered set ([ADR-044](./ADR-044-dynamic-rbac.md) `monitoring_scope`); a district role still never sees another rayon.

## Alternatives Considered

1. **Keep one flat status enum, add `pulang` / `terlambat` as more values.** Rejected — it repeats the overload that caused the 5.3 inversion; a flat enum cannot express "clocked-in ∧ aktif ∧ outside" without a combinatorial blow-up, and storing derivations invites drift.
2. **Store the derived lifecycle on the tracking row for read speed.** Rejected — the same drift risk; cache it on the aggregate feed (invalidated by the existing status-change events) instead of persisting it.
3. **Auto-close forgotten clock-outs at a margin (auto-*pulang*).** Rejected by management — fabricating a `clock_out_time` corrupts the attendance record; flag and let a supervisor correct it, and never let it become overtime.

## References
- [ADR-046](./ADR-046-monitoring-subject-model.md) — monitoring subject model (status portion superseded here)
- [ADR-047](./ADR-047-schedule-redesign.md) — occurrences carry the roster that drives the lifecycle
- [ADR-013](./ADR-013-multi-area-assignment.md) — expected/present/absent attendance
- [ADR-029](./ADR-029-monitoring-v2-event-sourced-redis.md) — event-sourced status + aggregate feed
- [ADR-044](./ADR-044-dynamic-rbac.md) — `monitoring_scope` visibility
- [ADR-049](./ADR-049-settings-architecture.md) — where `active_max_age_sec` + grace live in the settings catalog
- Feature spec: `../../features/monitoring/README.md`
- Model reference (scenario catalog + diagrams): the "SEKAR — Presence & Attendance Model" standardisation doc
