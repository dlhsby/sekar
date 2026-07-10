# Monitoring

**Status:** ✅ Active · **Backend:** `monitoring`, `location`, `gateways` · **Key ADRs:** ADR-011→029 (event-sourced status), ADR-016 (Redis scaling), ADR-006 (location partitioning)

## Overview
Real-time supervisor dashboard: live worker positions, five-status tracking, and an aggregate-first drill-down (Surabaya → rayon → area → workers) over Google Maps, with Socket.IO push. Scope is authorized by role (city / rayon / area). Backed by the `monitoring` module (services + cron under `apps/be/src/modules/monitoring`) and the `location` module (ingest + history). **Under revamp** post-UAT (a top UAT-feedback area).

## Key decisions
- **Event-sourced status via Redis Streams** (ADR-029, supersedes ADR-011) — status is derived from a location/event stream, not a materialized column; `monitoring/cron` recomputes aggregates.
- **Redis for WebSocket scaling** (ADR-016) — Socket.IO adapter + notification retry.
- **Location log partitioning** (ADR-006) — monthly partitions for query performance.
- **Aggregate-first drill-down** — bubbles show active-inside-area / scheduled ratios; markers standardized web + mobile.
- ⚠️ The legacy `supervisor` module is **deprecated** — superseded by this feature; do not extend it.

## Revamp notes (post-UAT)
Monitoring is slated for rework based on UAT feedback. Record the target model and any new ADR here when that work starts; log changes in the Changelog below.

## Implementation
- **API:** [`../../api/contracts.md`](../../api/contracts.md) · errors [`../../api/error-handling.md`](../../api/error-handling.md) (live Swagger `/api/v1/docs`)
- **Database:** [`../../database/schema.md`](../../database/schema.md)
- **Web:** Monitoring page (map + drill-down + roster) — [`../../platforms/web/pages.md`](../../platforms/web/pages.md)
- **Mobile:** Map Dashboard — [`../../platforms/mobile/screens.md`](../../platforms/mobile/screens.md)

## Related features
- [geography](../geography/README.md)
- [attendance](../attendance/README.md)
- [notifications](../notifications/README.md)

## Changelog
- 2026-07-10 — Spec created in product-docs restructure. History: [`../../history/CHANGELOG.md`](../../history/CHANGELOG.md).
