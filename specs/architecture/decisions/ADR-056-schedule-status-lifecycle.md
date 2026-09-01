# ADR-056: Schedule status lifecycle — planned → present / absent

## Status

Accepted. Builds on [ADR-047](./ADR-047-schedule-redesign.md) / [ADR-053](./ADR-053-schedule-row-per-place.md) (the roster row) and [ADR-055](./ADR-055-punch-attendance-model.md) (the punch log the "did they clock in?" fact comes from). Complements — does not change — the ADR-050 presence axes.

## Date

2026-07-27

## Context

A roster row's `schedule.status` has eight values (`planned, present, absent, leave_sick, leave_annual, leave_permit, replaced, off`), but only three were ever written: creation sets `planned`/`off`, and the manual Ketidakhadiran/replace actions set `leave_*`/`off`/`replaced`. **Nothing wrote `present` or `absent`.** Clock-in never touched the row, and no job closed out a past no-show.

The visible symptom: a worker scheduled yesterday who never clocked in still showed **"Direncanakan"** in the Jadwal on both web and mobile, and `present`/`absent` were dead values despite having full UI copy. The status did not reflect reality anywhere that reads it (Jadwal, monitoring, reports).

## Decision

Drive the two missing transitions from the backend (the single source of truth both frontends read), with a lazy display overlay for immediacy.

- **`planned → present`** — set **synchronously in the clock-in handler** (`ShiftsService.clockIn` → `SchedulesService.markPresentForClockIn`), scoped to `(user, service_day, shift_definition)` and to `planned` only. Non-overtime; never allowed to fail the clock-in.
- **`planned → absent`** — an **hourly cron** (`ScheduleAbsenceCron` → `SchedulesService.sweepAbsences`) persists every past `planned` row whose clock-in window + `cutoff_grace_min` has closed. It self-heals: a row with a session becomes `present`, a genuine no-show becomes `absent`. `leave_*`/`off`/`replaced` are never touched.
- **Lazy display overlay** — web and mobile each carry a pure `effectiveScheduleStatus(status, shift, serviceDay, now)` that applies the *same* rule at render time, so a no-show reads "Tidak Hadir" the instant its window closes instead of waiting up to an hour for the cron. Because clock-in sets `present`, any row still `planned` past its window is a no-show — the rule needs no attendance lookup: **`planned` + window+grace elapsed ⇒ `absent`**.

The window close is `serviceDay + end_time (+1 day if crosses_midnight) + cutoff_grace_min` — the ADR-055 latest-clock-in cutoff, so a row is never marked absent while a worker could still legitimately clock in.

## Consequences

- Status is truthful everywhere with no per-read logic in surfaces that read raw rows (monitoring/reports): the cron persists it; the frontends just render, with the overlay only sharpening latency.
- Absent-marking is deliberately low-frequency (hourly, one bounded indexed query + a bulk update) — far lighter than the 15-min reminder crons — because a no-show is not time-critical.
- The window helper is duplicated across three codebases (be/web/mobile — no shared package); the three copies are kept identical and unit-tested. Backend frames time as WIB-in-UTC (`TimezoneUtil.jakartaNow`); the frontends compare in device-local, which the app already treats as WIB.
- No schema change (the columns and both frontends' status labels already existed).

## Amendment — 2026-07-27: the sweep is bounded

`sweepAbsences` selected **every** past `planned` row on each hourly tick. Harmless once converged, but the first run on a database that has never swept rewrites the entire backlog in one transaction — on staging that is tens of thousands of rows on the first cron tick after cutover.

It now takes a lookback window from `schedule.absence_sweep_lookback_days` (**default 7 days**; `0` = unbounded for a deliberate backfill), so each run is O(lookback) rather than O(history). `apps/be/scripts/staging-verify-schedules.sql` §8 reports the blast radius before you deploy.
