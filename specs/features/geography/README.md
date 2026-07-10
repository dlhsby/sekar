# Geography

**Status:** ✅ Active · **Backend:** `areas`, `area-types`, `rayons`, `kecamatans`, `area-staff-requirements` · **Key ADRs:** ADR-013 (multi-area), ADR-010 (polygon boundaries)

## Overview
The organizational + spatial hierarchy: **7 rayons** → areas (taman / green spaces) with map polygon boundaries, typed by area-type, within kecamatans (districts). Area-staff-requirements define minimum staffing.

## Key decisions
- **Polygon boundaries** (ADR-010) — areas carry editable map polygons used for geofencing.
- `kecamatans` (read-only reference) and `area-staff-requirements` are **backend-only** (no dedicated UI).

## Implementation
- **API:** [`../../api/contracts.md`](../../api/contracts.md) · errors [`../../api/error-handling.md`](../../api/error-handling.md) (live Swagger `/api/v1/docs`)
- **Database:** [`../../database/schema.md`](../../database/schema.md)
- **Web:** Areas (CRUD + polygon editor), Rayons (CRUD) — [`../../platforms/web/pages.md`](../../platforms/web/pages.md)
- **Mobile:** area/rayon context in monitoring & field screens — [`../../platforms/mobile/screens.md`](../../platforms/mobile/screens.md)

## Related features
- [monitoring](../monitoring/README.md)
- [users](../users/README.md)
- [plants](../plants/README.md)

## Changelog
- 2026-07-10 — Spec created in product-docs restructure. History: [`../../history/CHANGELOG.md`](../../history/CHANGELOG.md).
