# ADR-047: Schedule Redesign — Rule-Based Recurrence Materialized into Occurrences, Calendar UI, Teams

## Status

Accepted — **Implemented (Phase 4, 2026-07-12)** · Amends [ADR-013](./ADR-013-multi-area-assignment.md) (template-derived roster → rule-based recurring events; the standing-template generator is retired — templates were data-migrated into daily events)

## Date

2026-07-10

## Context

Scheduling today is a **materialized daily roster**: a cron generates one `schedules` row per worker per WIB day from the worker's standing template (`users.shift_definition_id` + permanent `user_locations`), with a `(user_id, schedule_date)` unique constraint and a `schedule_locations` join for 0..N locations. There is no recurrence engine, no calendar UI (only a datatable), and no team concept. Monitoring reads these materialized rows to know who is "scheduled".

UAT wants a **Google-Calendar-inspired** model: schedules defined per day per shift, set as recurring (every N days, weekly, specific dates) or one-off, viewable as day/week/month calendars, supporting **individual and team** schedules, and **static or mobile** scope. Only `korlap` (optional), `satgas`, and `linmas` need schedules; management/kepala_rayon/admin_rayon do not. Shift 3 crosses midnight (already modeled on `ShiftDefinition.crosses_midnight`).

## Decision

Split scheduling into a **rule source** (`ScheduleEvent`) and **materialized occurrences** that reuse the existing roster rows, so monitoring keeps reading `schedules`/`schedule_locations` unchanged.

### `ScheduleEvent` (rule)

Fields:
- `id`, `title` (optional), audit.
- **Recurrence** — structured, not an opaque rrule string: `recurrence_type` (`none | daily | every_n_days | weekly | specific_dates`), `start_date`, `end_date` (nullable = open-ended), and a `recurrence_config` JSON holding `interval_n` (for `every_n_days`), `weekdays[]` (for `weekly`), `dates[]` (for `specific_dates`). `none` = a single-day event on `start_date`.
- `shift_definition_id` — one shift per event. A user working two shifts in a day has **two events** (see overlap guard).
- **Scope** — a `scope` enum: `static` requires `location_id` (region_id NULL); `mobile` requires `region_id` (location_id NULL). DTO validation enforces exactly one is set for the scope; setting both, or the wrong one, is rejected.
- **Kind** — `is_team`: individual events carry `user_id`; team events carry `team_id`, `pic_user_id` (required), and an invited-member list.

### Materialization

A generator expands each active `ScheduleEvent` into concrete **per-day, per-member occurrences** written to `schedules` (+ `schedule_locations` for static scope; `schedules.region_id` for mobile). Each occurrence sets **`schedules.schedule_event_id`** (nullable FK): non-NULL = rule-generated; NULL = a manual/ad-hoc row (the existing `source` field is retained for back-compat). This preserves the `(user_id, schedule_date, shift_definition_id)` roster contract monitoring reads.

**Rolling horizon, not blind pre-generation.** A daily cron (~00:15 WIB) materializes each active event for today **+ N days forward** (N = configurable `schedule_materialization_days`, default 30, stored with the other monitoring/system config per [ADR-049](./ADR-049-settings-architecture.md)); creating/editing an event also materializes its in-horizon occurrences immediately. This bounds write volume and avoids materializing far-future or already-past days — addressing the client's "don't generate every day blindly" concern while keeping monitoring's roster reads unchanged.

### Overlap guard

Uniqueness is **time-based, not per (user, day)**: a user may hold **multiple non-overlapping shifts in one day** (e.g. shift 1 + shift 2). A new occurrence is rejected only if its shift's time window **overlaps** an existing occurrence for the same user, computing real start/end instants (honoring shift-3's `crosses_midnight`, which extends into the next WIB day).

Examples (shift 1 06:00–15:00, shift 2 15:00–23:00, shift 3 21:00–05:00+1):
- shift 1 + shift 2 same day → **allowed** (touching, not overlapping).
- shift 1 + shift 1 same day → **rejected** (duplicate).
- prior-day shift 3 (…→05:00) + today shift 1 (06:00→) → **allowed**.
- shift 2 + shift 3 same day → **rejected** (23:00 vs 21:00 overlap).

Team fan-out applies the guard per member; an already-booked member is flagged in the response (not silently overwritten), and the rest still schedule.

### Edit semantics (calendar-style)

Editing a recurring event offers **this occurrence** (rewrites one `schedules` row, detaching it as an override), **this-and-future** (re-materializes from the edit date forward), or **entire series** (re-materializes all in-horizon occurrences). Deletes mirror the same three scopes. Past occurrences are never rewritten. Changes are audited via `schedules.updated_by`/`updated_at` + the event's audit columns.

*Implementation notes (Phase 4):* "this occurrence" edits go through the roster row API (`PATCH /schedules/...`, which sets `is_detached`); `DELETE /schedule-events/:id?scope=this&date=` soft-deletes that date's occurrence rows — the soft-deleted rows persist as tombstones so re-materialization never resurrects the day. `this_and_future` splits the series (original gets `end_date = from_date−1`, a new event continues; members carry over). Past dates are rejected with 400 on all this/this-and-future edits and deletes.

### Single-row reads with multiple shifts

Legacy single-row consumers (`GET /schedules/my`, clock-in shift/areas resolution, monitoring's rayon stamp) read the worker's **most relevant** row for the day: with multiple shifts, the shift whose window covers "now" (WIB, `crosses_midnight` honored), else the next upcoming shift, else the last of the day. Full-day consumers (calendar, counts) read every row; monitoring counts **distinct workers**, not rows.

### Teams

A team schedule is created with a **PIC** (korlap or satgas/linmas) and **invited members** (korlap/satgas/linmas). Fan-out creates an occurrence for each member. Team type + marker come from the teams catalog ([ADR-048](./ADR-048-teams.md)); monitoring renders the team as a group bubble.

### Who gets scheduled

`satgas`/`linmas` are the scheduled workforce; only their occurrences feed understaffing ([ADR-046](./ADR-046-monitoring-subject-model.md)). `korlap` scheduling is **optional** — korlap are never auto-materialized from a standing template; a korlap occurrence exists only if someone explicitly creates a korlap event in the calendar (individual, or as a team PIC/member). `management`/`kepala_rayon`/`admin_rayon` are never scheduled. Korlap occurrences are still never counted toward understaffing.

### UI

Web gets a **calendar** (day/week/month) for creating/editing events with recurrence, individual-vs-team, and static-vs-mobile scope. The existing datatable becomes a secondary view. A lightweight React calendar approach is preferred over a heavy dependency.

### "Jadwal" terminology

"Jadwal" (Schedule) names the **whole process/feature**, not a single entity, to match user mental model. The `schedules` table remains the materialized roster; `schedule_events` is the rule layer.

## Consequences

### Positive
- Calendar UX + recurrence without breaking monitoring (still reads materialized rows).
- Teams become first-class; one event fans out to many member occurrences.
- Static/mobile scope is explicit on the event, driving geofencing downstream.
- Overlap guard prevents double-booking, including across the midnight boundary.

### Negative
- Two layers (events + occurrences) to keep consistent; regeneration/edit semantics need care (edit-this-vs-edit-series, like calendars).
- The daily-roster cron evolves into an event-expansion generator; migration must preserve existing rosters.
- Recurrence + team fan-out increases write volume; bounded by expanding only a rolling horizon.

### Security
- Only roles with `schedules.*` permissions create/edit events; scope-checked to the editor's rayon/region.
- Team invites limited to eligible roles (korlap/satgas/linmas).

## Alternatives Considered
1. **Pure materialized (no rules), calendar writes rows directly.** Rejected by the user — recurring patterns would be manual copy-forward.
2. **Fully rule-based (no materialization), monitoring queries rules live.** Rejected — forces rewriting monitoring's roster reads and complicates ad-hoc overrides; materialization keeps the contract stable.
3. **Store recurrence only on `users` (standing template).** Rejected — can't express per-day/team/mobile variation or overlapping shifts.

## References
- [ADR-013](./ADR-013-multi-area-assignment.md) — roster + `schedule_locations` (reused as occurrences)
- [ADR-046](./ADR-046-monitoring-subject-model.md) — occurrences feed understaffing; static/mobile
- [ADR-048](./ADR-048-teams.md) — team catalog + markers
- Feature spec: `../../features/scheduling/README.md`
