# Scheduling

**Status:** ✅ Active · **Backend:** `shifts`, `shift-definitions`, `schedules`, `special-day-overrides`, `service-capacity` · **Key ADRs:** ADR-013 (multi-area), ADR-035 (service capacity)

## Overview
Shift definitions and the materialized **daily roster** that assigns workers to shifts/areas per day. Special-day overrides adjust the roster for holidays; service-capacity (planned) models rayon × ISO-week × service-type throughput. **Under revamp** post-UAT.

## Key decisions
- **Materialized daily roster** — schedules are generated per day from shift definitions for fast lookup and monitoring joins.
- **Service capacity** (ADR-035) — generic `service_capacity` model (rayon × ISO-week × service_type); **backend-only, no UI yet**.
- `special-day-overrides` is **backend-only** (no UI).

## Implementation
- **API:** [`../../api/contracts.md`](../../api/contracts.md) · errors [`../../api/error-handling.md`](../../api/error-handling.md) (live Swagger `/api/v1/docs`)
- **Database:** [`../../database/schema.md`](../../database/schema.md)
- **Web:** Schedules page (roster grid) — [`../../platforms/web/pages.md`](../../platforms/web/pages.md)
- **Mobile:** My Schedule, Shift History — [`../../platforms/mobile/screens.md`](../../platforms/mobile/screens.md)

## Related features
- [geography](../geography/README.md)
- [attendance](../attendance/README.md)
- [overtime](../overtime/README.md)

## Changelog
- 2026-07-10 — Spec created in product-docs restructure. History: [`../../history/CHANGELOG.md`](../../history/CHANGELOG.md).
