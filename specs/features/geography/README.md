# Geography

**Status:** ✅ Active · 🚧 4-level revamp planned · **Backend:** `locations`, `location-types`, `rayons`, `regions`, `kecamatans`, `location-staff-requirements` · **Key ADRs:** ADR-045 (4-level hierarchy + styling), ADR-013 (multi-location), ADR-010 (polygon boundaries)

## Overview
The organizational + spatial hierarchy. Being reworked (UAT) from 3 levels to **4**: City (Surabaya) → **Rayon** (District) → **Region / Kawasan** (NEW) → **Location / Lokasi**. Locations are typed by location-type; location-staff-requirements define minimum staffing. Every level is a "monitoring area" with its own map styling and marker.

## Key decisions
- **Four-level hierarchy** (ADR-045) — new `regions` (Kawasan) entity between rayon and location; `locations.region_id` nullable; regions are new master data drawn fresh. Locations re-parented via a **bulk form** (validates `region.rayon_id == location.rayon_id`); **region delete sets child `region_id = NULL`** (no cascade).
- **Per-level map styling** (ADR-045) — separate `border_color` / `fill_color` / `border_opacity` (0–1) / `fill_opacity` (0–1) + `marker_icon`/`marker_image_url` (image-only markers; configured `marker_color` removed) on all four tiers, each edited in its own master-data surface incl. a **City styling card** for the single Surabaya row (legacy single `color` kept as fallback; colors `^#[0-9A-Fa-f]{6}$`).
- **Static vs mobile** — a region enables mobile (roaming) subjects geofenced to the region; locations remain static geofences.
- **Polygon boundaries** (ADR-010) — every level carries editable polygons used for geofencing.
- `kecamatans` (read-only reference) and `location-staff-requirements` are **backend-only** (no dedicated UI).

## Implementation
- **API:** [`../../api/contracts.md`](../../api/contracts.md) · errors [`../../api/error-handling.md`](../../api/error-handling.md) (live Swagger `/api/v1/docs`)
- **Database:** [`../../database/schema.md`](../../database/schema.md)
- **Web:** City styling card, Rayons (CRUD), Regions (CRUD + polygon editor), Locations (CRUD + polygon editor + bulk re-parent) — [`../../platforms/web/pages.md`](../../platforms/web/pages.md)
- **Mobile:** location/rayon context in monitoring & field screens — [`../../platforms/mobile/screens.md`](../../platforms/mobile/screens.md)

## Related features
- [monitoring](../monitoring/README.md)
- [users](../users/README.md)
- [plants](../plants/README.md)
- [teams](../teams/README.md)

## Changelog
- 2026-07-12 — **Phase 2 review hardening.** Region **cannot move to another rayon while it has assigned areas** (would break the `region.rayon_id == location.rayon_id` invariant; detach/reassign first). Region + rayon **boundary writes are now GeoJSON-validated** (same rules as location boundaries; simple `Polygon` only — MultiPolygon/self-intersection not modelled by the validator yet). `GET /regions` is **rayon-scoped** for district-scope callers (kepala_rayon/admin_rayon/korlap see only their rayon, mirroring the locations list). Web: region area-assignment now invalidates the `locations` query cache (was a dead `['areas']` key — the locations table showed stale `region_id` until reload). **Deferred (Phase 5):** the monitoring `boundaries` endpoint still returns the legacy `color` field only; the full per-level border/fill/opacity payload ships with the monitoring revamp.
- 2026-07-12 — **Phase 0–3 verification pass.** ADR-045 + this spec corrected to the image-only marker model (`marker_image_url`, no configured `marker_color`); ADR-045's monitoring region-tier claim marked **deferred to Phase 5** (endpoints still expose rayon/location tiers only).
- 2026-07-12 — **Area→Location terminology sweep.** Renamed entities, tables, columns, and routes: `areas` → `locations`, `area-types` → `location-types`, `area-staff-requirements` → `location-staff-requirements`. Keep: "monitoring area" (generic), `area_name`, `is_within_area`, `/me assigned_area`, route `/areas/:locationId/staff-requirements`.
- 2026-07-12 — **Rayon form colour cleanup.** Removed the duplicate legacy single-colour "Warna" field; map styling now has only **Warna Batas** (border) + **Warna Isi** (fill). **Fill is optional** — a toggle (off = no fill / transparent, `fill_color = null`) with a one-click **"Sama dengan warna batas"**. The legacy `color` column now mirrors `border_color` on save (kept for any remaining consumers). Shared `MapStyleFields` change → applies to rayon/region/area; `ColorField` label made optional.
- 2026-07-11 — Kawasan **area re-parenting UI**: "Assign Areas" action + `AssignAreasModal` (multi-select, same-rayon only). Backend `assignAreas` now REPLACE semantics (un-parents deselected areas; empty clears). Users **Shift column removed** (shift comes from schedules).
- 2026-07-11 — Removed rayon/region/area `marker_color` (image-only markers); per-kind default marker; wired `marker_image_url` into the geo forms. Migration `17491900000000`.
- 2026-07-11 — Marker-as-image: `marker_image_url` on rayons/regions/areas via `MapStyleDto` + `MarkerImagePicker` (preseeded gallery + custom upload) in `MapStyleFields`. Migration `17491800000000`.
- 2026-07-10 — Phase 2 landed: `regions` module (CRUD, `region:*`-gated) + migration; per-level styling (border/fill color+opacity, marker) on rayons/regions/areas; `areas.region_id` (re-parent, rayon-matched) + `users.region_id`; web `/regions` (Kawasan) page + `MapStyleFields` on rayon/area/region forms + area→region select. Verified live. City-level styling + monitoring region-tier drill deferred to Phase 5.
- 2026-07-10 — 4-level hierarchy (Region/Kawasan) + per-level map styling planned (ADR-045).
- 2026-07-10 — Spec created in product-docs restructure. History: [`../../history/CHANGELOG.md`](../../history/CHANGELOG.md).
