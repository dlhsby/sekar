# Geography

**Status:** ✅ Active · 🚧 4-level revamp planned · **Backend:** `areas`, `area-types`, `rayons`, `regions`, `kecamatans`, `area-staff-requirements` · **Key ADRs:** ADR-045 (4-level hierarchy + styling), ADR-013 (multi-area), ADR-010 (polygon boundaries)

## Overview
The organizational + spatial hierarchy. Being reworked (UAT) from 3 levels to **4**: City (Surabaya) → **Rayon** (District) → **Region / Kawasan** (NEW) → **Area / Lokasi**. Areas are typed by area-type; area-staff-requirements define minimum staffing. Every level is a "monitoring area" with its own map styling and marker.

## Key decisions
- **Four-level hierarchy** (ADR-045) — new `regions` (Kawasan) entity between rayon and area; `areas.region_id` nullable; regions are new master data drawn fresh. Areas re-parented via a **bulk form** (validates `region.rayon_id == area.rayon_id`); **region delete sets child `region_id = NULL`** (no cascade).
- **Per-level map styling** (ADR-045) — separate `border_color` / `fill_color` / `border_opacity` (0–1) / `fill_opacity` (0–1) + `marker_icon`/`marker_color` on all four tiers, each edited in its own master-data surface incl. a **City styling card** for the single Surabaya row (legacy single `color` kept as fallback; colors `^#[0-9A-Fa-f]{6}$`).
- **Static vs mobile** — a region enables mobile (roaming) subjects geofenced to the region; areas remain static geofences.
- **Polygon boundaries** (ADR-010) — every level carries editable polygons used for geofencing.
- `kecamatans` (read-only reference) and `area-staff-requirements` are **backend-only** (no dedicated UI).

## Implementation
- **API:** [`../../api/contracts.md`](../../api/contracts.md) · errors [`../../api/error-handling.md`](../../api/error-handling.md) (live Swagger `/api/v1/docs`)
- **Database:** [`../../database/schema.md`](../../database/schema.md)
- **Web:** City styling card, Rayons (CRUD), Regions (CRUD + polygon editor), Areas (CRUD + polygon editor + bulk re-parent) — [`../../platforms/web/pages.md`](../../platforms/web/pages.md)
- **Mobile:** area/rayon context in monitoring & field screens — [`../../platforms/mobile/screens.md`](../../platforms/mobile/screens.md)

## Related features
- [monitoring](../monitoring/README.md)
- [users](../users/README.md)
- [plants](../plants/README.md)
- [teams](../teams/README.md)

## Changelog
- 2026-07-10 — 4-level hierarchy (Region/Kawasan) + per-level map styling planned (ADR-045).
- 2026-07-10 — Spec created in product-docs restructure. History: [`../../history/CHANGELOG.md`](../../history/CHANGELOG.md).
