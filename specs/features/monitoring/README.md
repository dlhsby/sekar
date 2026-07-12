# Monitoring

**Status:** ✅ Active · **Backend:** `monitoring`, `location`, `gateways` · **Key ADRs:** ADR-011→029 (event-sourced status), ADR-016 (Redis scaling), ADR-006 (location partitioning)

## Overview
Real-time supervisor dashboard: live worker positions, five-status tracking, and an aggregate-first drill-down (Surabaya → rayon → location → workers) over Google Maps, with Socket.IO push. Scope is authorized by role (city / rayon / location). Backed by the `monitoring` module (services + cron under `apps/be/src/modules/monitoring`) and the `location` module (ingest + history). **Under revamp** post-UAT (a top UAT-feedback area).

## Key decisions
- **Event-sourced status via Redis Streams** (ADR-029, supersedes ADR-011) — status is derived from a location/event stream, not a materialized column; `monitoring/cron` recomputes aggregates.
- **Redis for WebSocket scaling** (ADR-016) — Socket.IO adapter + notification retry.
- **Location log partitioning** (ADR-006) — monthly partitions for query performance.
- **Aggregate-first drill-down** — bubbles show active-inside-location / scheduled ratios; markers standardized web + mobile.
- ⚠️ The legacy `supervisor` module is **deprecated** — superseded by this feature; do not extend it.

## Revamp notes (post-UAT) — target model (ADR-046)
- **Subject model** — *monitorable* (anyone clocked-in: satgas, linmas, korlap, kepala_rayon, admin_rayon) vs *scheduled/staffing-counted* (**only satgas + linmas**). Non-scheduled clock-ins surface only via daftar petugas / search.
- **Supervisor visibility** (hierarchical, server-enforced) — management → all Surabaya; kepala_rayon/admin_rayon → their rayon; korlap → their region (+ optional location) incl. team members; satgas/linmas → none.
- **Static vs mobile** — static geofenced to their location; mobile (e.g. penyiraman) geofenced to their region, same tolerance as locations ([ADR-045](../../architecture/decisions/ADR-045-four-level-location-hierarchy.md)). Drill visibility: rayon = all; region = mobile-of-region + static-in-its-locations; location = static-of-location.
- **Drill** — **remove the Surabaya bubble**; draw all rayon boundaries on first load with per-rayon bubbles; no workers at top level. Drill: Rayon → Region → Location → workers.
- **Bubble** = marker + active-count with status-tinted ring; **hover** = `total / active / by_shift{s1,s2,s3} / by_role / understaffed` at that scope. **Teams** render as one group bubble (member count + team name) that expands to members ([teams](../teams/README.md)).
- **Understaffing** counts only satgas+linmas vs `LocationStaffRequirement`.
- **Search** — server-backed, scope-filtered; matches worker name / location / team keyword; returns anyone clocked-in with a location fix in the last 24h (incl. non-scheduled). Status color rings unchanged.
- **Perf** — keep event-sourced Redis streams (ADR-029) + in-place snapshot patching (no map remounts); server-computed bubble aggregates; rooms `monitoring:rayon|region|area:{id}`.
- **Web first**, then mobile parity after client/PM design ack.

## Implementation
- **API:** [`../../api/contracts.md`](../../api/contracts.md) · errors [`../../api/error-handling.md`](../../api/error-handling.md) (live Swagger `/api/v1/docs`)
- **Database:** [`../../database/schema.md`](../../database/schema.md)
- **Web:** Monitoring page (map + drill-down + roster) — [`../../platforms/web/pages.md`](../../platforms/web/pages.md)
- **Mobile:** Map Dashboard — [`../../platforms/mobile/screens.md`](../../platforms/mobile/screens.md)

## Related features
- [geography](../geography/README.md)
- [attendance](../attendance/README.md)
- [notifications](../notifications/README.md)
- [scheduling](../scheduling/README.md)
- [teams](../teams/README.md)

## Changelog
- 2026-07-12 — **Area→Location terminology sweep.** Renamed drill hierarchy, active-inside-location, LocationStaffRequirement; keep monitoring WS room prefixes (`area:{id}`).
- 2026-07-10 — Revamp target set: subject model, static/mobile, drop Surabaya bubble, team bubbles, region tier, search (ADR-046).
- 2026-07-10 — Spec created in product-docs restructure. History: [`../../history/CHANGELOG.md`](../../history/CHANGELOG.md).
