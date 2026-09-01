# ADR-051: Unified Icon + Color Marker System

## Status

Accepted — **New** · supersedes the image-marker portion of ADR-045

## Date

2026-07-17

## Context

Markers were represented **two incompatible ways** at once:

- **`marker_image_url`** — a picture: one of nine `pin-*.svg` presets, or an uploaded PNG. Rendered for **areas** (rayon/kawasan/lokasi) + **teams**, and set by `MarkerImagePicker` on every geo/team/role form.
- **`marker_icon`** — a named glyph drawn in code (shield, hard-hat, trees…). Rendered for **worker pins** (the role glyph inside a live-status-colored teardrop).

Every entity carried **both** fields, but each context rendered only one — so areas stored a `marker_icon` nothing drew, roles stored a `marker_image_url` nothing drew, and the role editor showed two conflicting pickers. This caused a string of monitoring bugs (the "default building-circle vs edit pin" mismatch, custom role markers with no effect, count/status dropping off area pins).

The two representations differ in a way that matters: **glyphs are code-drawn, so they compose** — a status color, a staffing-count badge, a health ring, and per-worker modifiers stack onto them cheaply. Images cannot cheaply composite live status/count on the raster map, which is exactly why worker pins never used them. The nine image presets are, in fact, just **fixed glyph+color combos** — reproducible (and generalized to *any* glyph × *any* color) by a glyph system. The only thing images add is **arbitrary uploaded artwork**, which is not an operational need for a parks-department monitoring tool.

## Decision

**Unify every marker on `marker_icon` (glyph) + a color.** One code-drawn pin renders everywhere:

- **Areas** (rayon/kawasan/lokasi): a teardrop pin in the area's **identity color** with its glyph, plus the **active-count badge + staffing-status ring**. The identity color is the area's existing **`border_color`** — one color per area, shared by boundary and marker (no separate marker-color column).
- **Workers**: the same pin, but fill = **live status color** (green active / amber offline) + the role's glyph + ad-hoc/outside modifiers. Role `marker_color` is not used for the pin fill (status wins).
- **Teams**: glyph + `marker_color` (team color) on the group bubble.
- **Defaults**: per kind — rayon → `building`, kawasan/lokasi → `trees`/`tree`, plus per-role seeded glyphs.

**`marker_image_url` is retired.** Uploaded custom images are no longer supported; the nine presets migrate to their glyph equivalent (`pin-purple` → `star`, `pin-teal` → `droplets`, …), and an area's marker color collapses to its `border_color`.

### Phased rollout

1. **Migration** `MarkerIconFromImagePreset` — backfill `marker_icon` from each area's `marker_image_url` preset (uploaded images fall back to the per-kind default glyph). `marker_image_url` left intact.
2. **Web render** — one `pinMarker(glyph, color, { count, health })` builder; area nodes + map previews + boundary editors draw glyph + `border_color` (+ count/status ring); `entityMarkerDefault` returns a glyph, not a URL.
3. **Editors** — geo/team/role forms use the glyph picker + color; drop `MarkerImagePicker`.
4. **Cleanup** — drop `marker_image_url` columns/DTOs and the `MarkerImagePicker` component.

## Consequences

- **One composable system**: count + staffing status return to area pins; worker pins keep live status; editors collapse to a single pattern (glyph picker + color).
- **Loses uploaded artwork** and **collapses independent marker colors to the boundary color** (an area is one identity color). Both are deliberate simplifications for an operational tool.
- Supersedes the image-marker mechanism introduced under ADR-045 (per-level styling); the color/opacity boundary styling from ADR-045 stays.

## Revision (2026-07-17) — fill is white; status is the outline

Refined after review: the **glyph identifies the type/role** and **all live status rides the OUTLINE ring + count number** (uniform across geo AND workers). **Fill = the entity's own color:** geo (rayon/kawasan/lokasi) → its **`fill_color` at `fill_opacity`** (with a white inner head so the glyph stays readable on a colored/translucent fill); **teams** → their team color; **workers have no color, so they fill white** (rayon=building, kawasan=trees, lokasi=tree, worker=role glyph). **All live status rides the OUTLINE ring + the count number**, uniformly across geo AND workers: area outline = staffing health (green ok / amber short / red none / grey empty) + active-count badge; worker outline = activity (green aktif / amber offline; **grey = ad-hoc**), with a **dashed** outline for a worker outside its area. **Teams are the one exception** — they carry no glyph-type and are differentiated by a **colored fill** (team color). This supersedes the earlier "fill = identity/border color" and the short-lived "fill = per-type color" — both caused confusion; decoupling fill (always white) from status (always the outline) is the final model. `border_color`/`marker_color` no longer feed the marker (only the boundary).
