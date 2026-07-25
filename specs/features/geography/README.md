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

## Known gap — inactive rayon/kawasan vs monitoring (TODO, revisit)

`is_active` now exists on all four levels (City is implicit; Rayon/Kawasan added 2026-07-15).
Two decisions were deliberately deferred — **revisit during the Phase-5 monitoring revamp**:

1. **Monitoring still shows deactivated rayon/kawasan, on purpose.** Hiding them would also hide the
   **live workers** clocked in under them — a safety-visible change, not a cosmetic one. Web pins this
   with `useRayons(true)` in `components/monitoring/HierarchyFilterPanel.tsx`; the backend monitoring
   services query the `Rayon` repository directly and never call `rayonsService.findAll()`, so the
   new active-only default does not reach them. **If monitoring is ever made to hide inactive
   levels, pair it with the deactivate guard** (below) or a worker can silently vanish from the map.
2. **Scope of "hide it" is master data + schedule only** (per the operator): grids, filters, pickers
   and the schedule forms. Tasks/overtime/plants pickers inherit the active-only default via
   `useRayons()`/`useRegions()` — not separately audited.

**Guard, not cascade** (chosen over hiding children): deactivating is **refused with 409** while a
rayon still has active kawasan/lokasi/petugas (`RAYON_DEACTIVATE_IN_USE`), or a kawasan still has
active lokasi (`REGION_DEACTIVATE_IN_USE`). Nothing is ever hidden implicitly, so there is no
"active lokasi under an inactive rayon" state to reason about. `activate()` is never guarded, and
`findOne()` stays unfiltered — filtering it would 404 the very record being reactivated.

**Open tension — delete guards are asymmetric.** Rayon `remove()` already refuses while lokasi
reference it (`rayons.service.ts`), but Kawasan `remove()` deliberately does **not**: per ADR-045 it
detaches children (`region_id = NULL`) and soft-removes. A delete guard on Kawasan was requested;
it is **not implemented here** because it would contradict ADR-045. Resolve the ADR first if the
guard is wanted — deactivate (guarded) and delete (detaches) intentionally differ today.

## Known gap — "Area" display strings not yet swept (TODO)

The 2026-07-15 sweep fixed the **`/locations` page identity** (title/breadcrumb/nav keys) and the
**`areaType` → `locationType`** relation, but **~70 user-facing strings still read "Area" where they
mean a *Lokasi***. Inventoried, not yet renamed — deferred deliberately, sweep in a later pass:

| Namespace | Count | Examples |
|---|---|---|
| `schedules` | 17 | `modals.areas.title` "Ubah Area" · `modals.areaList.title` "Area Jadwal" · `buttons.areaCount` "{{count}} Area" |
| `admin` | 16 | `users.form.areaAssignment` "Area Penugasan" · `rayons.columnAreas`/`stats.totalAreas` "Jumlah Area" · `rayons.areaDetail.areaName` "Nama Area" |
| `tasks` | 12 | `list.tableHeaderArea` "Area / Rayon" · `form.areaLabel` "Area (Opsional)" · `form.areaPlaceholder` "Pilih Area" |
| `import` | 12 | `kmz.areaTypeLabel` "Tipe Area" · `kmz.columns.name` "Nama Area" · `export.allAreas` "Semua Area" |
| `plants` | 5 | `catalog.description` "…per area" · `areaDetail.notFound` "Area tidak ditemukan" |
| `activities` | 4 | `list.filters.area`/`allAreas` · `list.table.columns.area` |
| `common` | 4 | `entities.area` "Area" · `empty.noAreas` · `stats.totalArea` "Total Area" (renders `total_areas`, a **count** — not m²) |
| `overtime` | 2 | `list.table.columns.area` · `detail.fields.area` |

**Out of scope — do NOT rename:**
- **`monitoring` (49 strings)** — "Batas Area", "Dalam area", "Titik Area", `sidebar.tabAreas` etc. are **correct**: a *monitoring area* legitimately = rayon/kawasan/lokasi. Also gated behind the Phase-5 monitoring revamp. Renaming these is a regression.
- **Area-as-size:** `admin:locations.coverageLabel` "Luas Area", `rayons.stats.totalCoverageArea` "Luas Tutupan", `coverage_area`.
- **Geofence state:** `common:ui.withinArea`/`outsideArea`, `home:statusSection.outsideArea`.
- **Wire contracts:** `area_type` (response field + query param), monitoring `area_ids`, `/areas` import/export entity keys, `AreaType`/`areaTypesService` (= the *LocationType* service/repo, not the relation).

Prose examples (e.g. `tasks:form.titlePlaceholder` "Contoh: Penyiraman Area Timur") read as place names — judgement call, not a mechanical rename.

## Changelog

Moved to [CHANGELOG.md](./CHANGELOG.md) (newest first) to keep this overview short. Add new entries there.
