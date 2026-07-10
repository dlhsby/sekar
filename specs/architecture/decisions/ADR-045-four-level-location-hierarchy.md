# ADR-045: Four-Level Location Hierarchy — Region (Kawasan) + Per-Level Map Styling

## Status

Accepted — **Amends [ADR-010](./ADR-010-phase2c-terminology-cleanup.md), [ADR-013](./ADR-013-multi-area-assignment.md)** (3-level → 4-level spatial model)

## Date

2026-07-10

## Context

Today the spatial model is three levels: **Surabaya (city) → Rayon → Area**, each entity carrying a single `color` field and a GeoJSON `boundary_polygon` (rayon/area). UAT introduces a level between rayon and area for coarser grouping and for **mobile** (non-static) monitoring subjects — e.g. a penyiraman (watering) truck that roams a district but has no fixed location. The client also wants richer map styling: separate border and fill colors with independent opacity, plus a per-level marker, defined in master-data management.

## Decision

Adopt a four-level hierarchy and treat every level as a **monitoring area** with its own styling and marker:

| Level | Term (UI) | Entity | Parent |
|---|---|---|---|
| City | Surabaya (City View) | city config (single) | — |
| District | **Rayon** | `rayons` | city |
| **Region** | **Kawasan** (NEW) | `regions` | rayon |
| Location | **Lokasi** (current Area) | `areas` | region |

### New `regions` (Kawasan) entity

`id`, `name`, `rayon_id` (FK), `boundary_polygon` (GeoJSON), `center_lat/lng`, `marker_icon`, plus the shared styling fields below. Regions are **new master data drawn fresh** on the map; they are not auto-generated from existing areas.

### Area re-parenting

`areas.region_id` (nullable FK) is added. Existing areas keep working with `region_id = NULL` and are **re-parented manually** after regions are drawn, via a **bulk re-parent form** (select one or more areas → choose target region → confirm). On save the backend validates `region.rayon_id === area.rayon_id` (an area cannot move to a region in a different rayon) and sets `area.region_id`. `areas.rayon_id` is retained (denormalized) for back-compat and fast rayon rollups; when `region_id` is set, `rayon_id` is kept consistent with the region's rayon. **On region delete**, child areas are **not** cascaded — their `region_id` is set to `NULL` (soft delete on the region), so no area data is lost.

### Per-level styling + marker (all four levels)

The **City** level is a single row (Surabaya) in a `city_config`/settings-backed record; `rayons`, `regions`, `areas` are the other three. Each carries:
`border_color`, `fill_color`, `border_opacity` (0–1), `fill_opacity` (0–1), `marker_icon`, `marker_color`. Colors validate against `^#[0-9A-Fa-f]{6}$` and opacities against `0..1` at the DTO layer; `marker_icon` is from the curated icon set ([ADR-044](./ADR-044-dynamic-rbac.md) §Marker & styling constraints). The legacy single `color` column is retained as a fallback during migration and mapped onto `border_color`/`fill_color` defaults. Each level is edited in its own master-data CRUD (rayons / regions / areas pages); **City styling** (the single Surabaya row) is edited on a dedicated City card in geography master-data — so operators can set the marker + border/fill/opacity for all four tiers.

### Static vs mobile subjects

The new Region level enables **mobile monitoring subjects**: a worker/team assigned to a *region* (not a specific location) is geofenced against the region boundary and expected to roam within it. **Static** subjects remain geofenced to their `area`. Which one applies is a property of the schedule occurrence (`area_id` vs `region_id`), not the user record — see [ADR-047](./ADR-047-schedule-redesign.md) and [ADR-046](./ADR-046-monitoring-subject-model.md).

### Monitoring drill tiers

The monitoring aggregate/boundaries endpoints gain a **region tier** between rayon and area: City → Rayon → **Region** → Area → workers.

## Consequences

### Positive
- Coarser grouping (Kawasan) matches how field ops actually organize roaming crews.
- Mobile subjects get a natural geofence (region) instead of being forced into a fake fixed area.
- Independent border/fill/opacity + marker per level gives operators real cartographic control.
- Nullable `region_id` + retained `rayon_id` = zero-downtime migration; existing data keeps rendering.

### Negative
- One more tier to render, cache, and drill through in monitoring (perf-sensitive; handled in ADR-046).
- Re-parenting existing areas into regions is manual operator work (accepted; regions are fresh data).
- Geofencing must support both region-polygon (mobile) and area-polygon/circle (static) checks.

### Security / integrity
- `region_id`/`rayon_id` consistency enforced (region's rayon wins when both set).
- Styling fields validated (hex colors, opacity 0–1) at the DTO layer.

## Alternatives Considered
1. **Auto-create one default region per rayon** and bucket all areas under it. Rejected by the user in planning — regions are drawn as new master data; areas re-parented manually for cleaner final data.
2. **Model mobile subjects as an area with a huge radius.** Rejected — pollutes area data and breaks understaffing math; a region is the correct spatial abstraction.
3. **Keep single `color`, add opacity only.** Rejected — client explicitly wants separate border/fill colors.

## References
- [ADR-010](./ADR-010-phase2c-terminology-cleanup.md) — polygon geofencing (extended to regions)
- [ADR-013](./ADR-013-multi-area-assignment.md) — area assignment (region tier added above it)
- [ADR-046](./ADR-046-monitoring-subject-model.md) — static vs mobile subjects, region drill tier
- [ADR-047](./ADR-047-schedule-redesign.md) — schedule scope (`area_id` vs `region_id`)
- Feature spec: `../../features/geography/README.md`
