# Geography

**Status:** ✅ Active · **Backend:** `locations`, `location-types`, `rayons`, `kecamatans`, `location-staff-requirements` · **Key ADRs:** ADR-013 (multi-location), ADR-010 (polygon boundaries)

## Overview
The organizational + spatial hierarchy: **City (Surabaya) → District (Rayon) → Region (Kawasan, planned) → Location (Lokasi)**. **7 rayons** contain locations (taman / green spaces) with map polygon boundaries, typed by location-type, within kecamatans (districts). Location-staff-requirements define minimum staffing. All four levels are collectively "monitoring areas".

> **Terminology:** the leaf entity is **Location** (EN) / **Lokasi** (ID), formerly "Area". The generic word "area" is retained only for the "monitoring area" umbrella (all levels). The Region/Kawasan tier (ADR-045) is not built yet — `locations.region_id` exists (nullable) as the forward hook.

## Key decisions
- **Polygon boundaries** (ADR-010) — locations carry editable map polygons used for geofencing, plus per-level map styling (border/fill color + opacity, marker).
- `kecamatans` (read-only reference) and `location-staff-requirements` are **backend-only** (no dedicated UI).

## Implementation
- **API:** [`../../api/contracts.md`](../../api/contracts.md) · errors [`../../api/error-handling.md`](../../api/error-handling.md) (live Swagger `/api/v1/docs`). Canonical routes `/locations`, `/location-types`, `/monitoring/location/:id`; old `/areas`, `/area-types`, `/monitoring/area/:id` kept as deprecated back-compat aliases.
- **Database:** [`../../database/schema.md`](../../database/schema.md) — tables `locations`, `location_types`, `location_staff_requirements`, `user_locations`, `schedule_locations`, `location_plants`; FK column `location_id`.
- **Web:** Locations (CRUD + polygon editor), Rayons (CRUD) — [`../../platforms/web/pages.md`](../../platforms/web/pages.md)
- **Mobile:** location/rayon context in monitoring & field screens — [`../../platforms/mobile/screens.md`](../../platforms/mobile/screens.md)

## Related features
- [monitoring](../monitoring/README.md)
- [users](../users/README.md)
- [plants](../plants/README.md)

## Changelog
- 2026-07-12 — Area→Location rename: leaf entity + DB tables/columns + canonical routes renamed (old routes kept as aliases). History: [`../../history/CHANGELOG.md`](../../history/CHANGELOG.md).
- 2026-07-10 — Spec created in product-docs restructure.
