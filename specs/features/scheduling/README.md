# Scheduling

**Status:** ✅ Active · **Backend:** `shifts`, `shift-definitions`, `schedules`, `special-day-overrides`, `service-capacity` · **Key ADRs:** ADR-013 (multi-location), ADR-035 (service capacity)

## Overview
Shift definitions and the materialized **daily roster** that assigns workers to shifts/locations per day. A generation cron builds the roster; an edit policy governs allowed changes. Special-day overrides adjust the roster for holidays; service-capacity models rayon × ISO-week × service-type throughput. **Under revamp** post-UAT (a top UAT-feedback area).

## Key decisions
- **Materialized daily roster** — `daily-roster-generation.cron.ts` generates schedules per day from shift definitions for fast lookup and monitoring joins; `schedule-edit.policy.ts` gates edits.
- **Multi-location** (ADR-013) — a korlap/worker can be rostered across multiple locations.
- **Service capacity** (ADR-035) — generic `service_capacity` model (rayon × ISO-week × service_type); web UI is the rayon capacity weekly grid (`rayons/[id]/capacity`).
- `special-day-overrides` — **API implemented, no dedicated UI**.

## Revamp notes (post-UAT)
Scheduling is slated for rework based on UAT feedback. Capture the target design and decisions here (and any new ADR) when that work starts; log changes in the Changelog below.

## Implementation
- **API:** [`../../api/contracts.md`](../../api/contracts.md) · errors [`../../api/error-handling.md`](../../api/error-handling.md) (live Swagger `/api/v1/docs`)
- **Database:** [`../../database/schema.md`](../../database/schema.md)
- **Web:** Schedules page (roster grid); rayon capacity weekly grid (`rayons/[id]/capacity`) — [`../../platforms/web/pages.md`](../../platforms/web/pages.md)
- **Mobile:** My Schedule, Shift History — [`../../platforms/mobile/screens.md`](../../platforms/mobile/screens.md)

## Related features
- [geography](../geography/README.md)
- [attendance](../attendance/README.md)
- [overtime](../overtime/README.md)

## Changelog
- 2026-07-10 — Spec created in product-docs restructure. History: [`../../history/CHANGELOG.md`](../../history/CHANGELOG.md).
