# Scheduling

**Status:** ✅ Active · **Backend:** `shifts`, `shift-definitions`, `schedules`, `special-day-overrides`, `service-capacity` · **Key ADRs:** ADR-013 (multi-area), ADR-035 (service capacity)

## Overview
Shift definitions and the materialized **daily roster** that assigns workers to shifts/areas per day. A generation cron builds the roster; an edit policy governs allowed changes. Special-day overrides adjust the roster for holidays; service-capacity models rayon × ISO-week × service-type throughput. **Under revamp** post-UAT (a top UAT-feedback area).

## Key decisions
- **Materialized daily roster** — `daily-roster-generation.cron.ts` generates schedules per day from shift definitions for fast lookup and monitoring joins; `schedule-edit.policy.ts` gates edits.
- **Multi-area** (ADR-013) — a korlap/worker can be rostered across multiple areas.
- **Service capacity** (ADR-035) — generic `service_capacity` model (rayon × ISO-week × service_type); web UI is the rayon capacity weekly grid (`rayons/[id]/capacity`).
- `special-day-overrides` — **API implemented, no dedicated UI**.

## Revamp notes (post-UAT) — target design (ADR-047, ADR-048)
"Jadwal" names the whole process, not one entity. Design:
- **Rule + occurrences** — a `ScheduleEvent` holds recurrence (`none | daily | every_n_days | weekly | specific_dates`), shift, and scope; a generator materializes per-day, per-member **occurrences** into the existing `schedules`/`schedule_areas` roster so monitoring reads are unchanged.
- **Calendar UI** — day/week/month (Google-Calendar-style) for create/edit; datatable becomes secondary.
- **Individual + team** — team events name a PIC + invited members (korlap/satgas/linmas), fanned out to member occurrences ([teams](../teams/README.md)).
- **Static vs mobile scope** — `area_id` (static) or `region_id` (mobile, e.g. penyiraman).
- **Only satgas/linmas** occurrences feed understaffing; korlap optional (never auto-materialized); management/kepala_rayon/admin_rayon need no schedule.
- **Multiple shifts/day allowed** — a user may hold non-overlapping shifts (e.g. shift 1 + shift 2). The **overlap guard is time-based** (rejects true time-window overlaps, honors shift-3 midnight crossing), not one-per-day.
- **Rolling horizon** — a daily cron materializes each active event today + N days forward (`schedule.materialization_days`, default 30); event create/edit materializes in-horizon immediately (no blind full-calendar generation). Edits offer this / this-and-future / series scopes.
- **Occurrence link** — `schedules.schedule_event_id` (nullable FK): set = rule-generated, NULL = manual/ad-hoc.

## Implementation
- **API:** [`../../api/contracts.md`](../../api/contracts.md) · errors [`../../api/error-handling.md`](../../api/error-handling.md) (live Swagger `/api/v1/docs`)
- **Database:** [`../../database/schema.md`](../../database/schema.md)
- **Web:** Schedules page (roster grid); rayon capacity weekly grid (`rayons/[id]/capacity`) — [`../../platforms/web/pages.md`](../../platforms/web/pages.md)
- **Mobile:** My Schedule, Shift History — [`../../platforms/mobile/screens.md`](../../platforms/mobile/screens.md)

## Related features
- [geography](../geography/README.md)
- [attendance](../attendance/README.md)
- [overtime](../overtime/README.md)
- [teams](../teams/README.md)
- [monitoring](../monitoring/README.md)

## Changelog
- 2026-07-10 — Revamp target set: rule-based recurrence + occurrences, calendar UI, teams, static/mobile (ADR-047/048).
- 2026-07-10 — Spec created in product-docs restructure. History: [`../../history/CHANGELOG.md`](../../history/CHANGELOG.md).
