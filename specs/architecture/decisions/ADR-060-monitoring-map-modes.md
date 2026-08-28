# ADR-060 — Three monitoring map modes, one set of numbers

**Status:** Accepted (2026-08-12) · **Amended 2026-08-13** (third mode: `viewport`) · **Supersedes:** nothing · **Amends:** [ADR-046](./ADR-046-monitoring-drill-model.md) (adds a second reading of `display_scope`, does not change it)

## Context

The delivered monitoring map is a tap-to-drill hierarchy: Rayon → Kawasan → Lokasi, one level of
children at a time, with each worker rendered at **their own schedule tier and only there**
(`display_scope`, ADR-046). A lokasi-scheduled worker appears at that lokasi; a rayon-scheduled worker
at that rayon; an ad-hoc clock-in flat at city.

After a client review, the client asked to see **everything at once** — every rayon, kawasan and lokasi,
and every worker, from the city view — with tapping a rayon narrowing to *that rayon's whole subtree*
rather than to its immediate children. She was told this is heavier and insisted; the agreed compromise
is to ship both and let her choose.

Shown the real map, she accepted the cost but asked for **a third option**: the same everything-at-once
view, restricted to what is actually on screen, loading more as she pans or zooms out. That is the
honest resolution of the trade — zoom mode's reading of the data, without paying for the parts of the
city nobody is looking at.

That request is not a tweak to the drill model. It asks a **different question** about a worker:

- drill asks *"is this worker's schedule scoped to what I'm looking at?"*
- zoom asks *"is this worker standing anywhere inside what I'm looking at?"*

Both are legitimate. The first answers "is the plan being followed"; the second answers "who is out
there right now". Conflating them is what makes a monitoring map lie, so they are named and separated
rather than blended into one heuristic.

## Decision

**Ship three modes. They differ only in what is DRAWN or FETCHED — never in what is COUNTED.**

### 1. Worker visibility is the mode

| Mode | Predicate | Basis |
|------|-----------|-------|
| `drill` | `display_scope === scope && display_scope_id === view.id` | the worker's **schedule occurrence** (ADR-046) |
| `zoom` | worker's `district_id` / `region_id` / `location_id` matches the current node | the worker's **actual geography** |
| `viewport` | identical to `zoom` | identical to `zoom` — the difference is extent, not meaning |

`viewport` is deliberately **not** a third predicate. Every rendering decision reads one
`isZoomLike(mode)` helper, so the two can never drift into drawing different things; only the fetch
layer distinguishes them.

A consequence worth stating: in zoom mode an **ad-hoc clock-in appears inside the rayon they are
physically in**, even though their `display_scope` is flat city. That is the correct reading of "show
all the workers there" — and they keep their distinct *Luar Jadwal* styling, so they are visible
without being counted.

### 2. Geometry and nodes come from calls that already existed

Zoom mode needed **no new worker endpoint and no new geometry endpoint**:

- `computeSnapshot('city')` passes an empty filter, so the city snapshot already returns every live
  worker carrying `display_scope` **and** full geographic parentage. Zoom mode reads the **city**
  snapshot at every drill level and narrows client-side.
- `getBoundaries({ level: 'area' })` with no `district_id` already returns every district + kawasan +
  lokasi polygon. Drill mode simply pins `level` to `'district'` at city scope.

The one real gap was node **counts**, solved by `GET /monitoring/aggregate?scope=all` (see below).

### 2b. Viewport mode narrows the FETCH, server-side

Culling what is already downloaded does not help the payload — the client still pays for ~1.5 MB of
city-wide geometry and the server still runs the per-district builder passes behind it. Viewport mode
therefore sends the camera's bounds to the server:

- `GET /monitoring/boundaries?bbox=minLng,minLat,maxLng,maxLat` — returns only geometry intersecting
  the box. Filtering runs after the rows load, so it trims the **payload** and the client's polygon
  construction, which is where this map's cost is.
- `GET /monitoring/aggregate?scope=all&bbox=…` — an off-camera district has its two builder passes
  **skipped**, not merely its results discarded. That is the server-side half of the saving.

Three properties make it safe:

- **Bounding boxes, not true intersection.** O(vertices), no geometry library, and it errs toward
  *including* a shape. Over-inclusion costs a few KB; under-inclusion would blank a boundary the
  operator is standing inside, which reads as data loss.
- **Geometry beats centre.** A rayon large enough to fill the screen has its centre off-camera, so a
  centre-only test would drop the very shape being looked at. The centre is the fallback for entities
  carrying no polygon (kawasan often do not).
- **Totals never move.** `totals` / `roster_totals` stay computed over the full scope. A header that
  changed as the operator panned would be reporting the camera, not the city. Likewise a rayon's
  `area_count` stays its true size — a number that shrank while panning would read as data vanishing.

**A bbox alone is not enough.** At city zoom the box *is* the city, so the first build of viewport mode
still drew every kawasan and every lokasi — hundreds of stacked pins, exactly the view it was meant to
relieve. The mode therefore also carries **depth**: rayon near the city, kawasan as the camera closes
in (Google zoom ≥ 13 / `latitudeDelta` ≤ 0.05), lokasi and the workers standing in them closer still
(≥ 14.5 / ≤ 0.015). Detail arrives as there is room for it, and panning at that zoom brings the
neighbouring detail with it. Below the kawasan threshold the client asks for `level='district'`, so
lokasi geometry is not merely undrawn — it is never downloaded. Because a missing tier must read as
"not yet" and not as broken data, the map shows a **"zoom in to see kawasan / lokasi"** hint until it
is at full depth. Zoom mode is untouched: drawing everything at every zoom is the trade chosen there.

Client-side, the box is **padded by half a screen** and only redrawn once the camera leaves it, so
ordinary panning costs nothing; because the box is part of the query key, panning back to an
already-fetched region is served from cache. A malformed `bbox` is **ignored**, not rejected: a bad
value degrades to the full payload rather than blanking the map.

### 2c. Hiding individual rows

Tier facets answer "which layers do I want"; they are too blunt when the thing in the way is one rayon
out of nine or one person out of sixty. Both side-panel tabs therefore carry a per-row hide, persisted
per browser (`monitoring.hidden.v1`) beside the layer facets — it is a workspace preference, not a data
change. Three rules keep it safe on a monitoring surface:

1. **Hiding is presentation, never accounting.** Every count is computed server-side over the full
   scope, so a hidden lokasi is still counted inside its rayon and the tab badges still report what is
   in scope. A map whose numbers changed on request would be a map that lies on request.
2. **Never silent.** A hidden-count banner with a one-click restore sits above the list — including
   when *everything* is hidden, where an unexplained empty state would otherwise be the only feedback.
3. **A hidden node hides itself, not its subtree.** "I don't need Rayon Barat's pin" is not "I don't
   care about anything inside Rayon Barat"; hiding a whole subtree is what the facets and the drill
   scope are for.

Hidden rows leave the **map** as well as the list — not seeing the pin is the point.

### 3. Counts are mode-independent, by construction

`scope=all` is **composed** from the existing per-tier builders — `buildDistrictNodes`,
`buildRegionNodes`, `buildLocationNodes` called verbatim, per district, each district's children built
with that district's own `clockedInUserSet` exactly as `scope=district` / `scope=region` do.

It is deliberately **not** optimized into one wider grouped query. The tier counts must be *provably*
identical whichever mode asked for them, and this is the code that has already shipped the same class
of bug twice (a liveness guard applied at one tier and not the others). Composition makes the identity
a property of the code rather than a claim in a comment.

Response totals (`totals` / `roster_totals` / `presence_totals`) are taken from the **rayon tier
alone**. Summing across tiers would count each worker three times — in their rayon, their kawasan and
their lokasi.

`scope=all` enforces scope like every other aggregate scope: a rayon-scoped role is pinned to its own
subtree. Zoom mode is not a way around role scoping.

### 4. Performance: viewport culling, never clustering

Overlays outside the camera are not painted; bounds are captured on map idle. **Clustering is
forbidden here** — it was removed from this map on request because "it hid people and confused
operators", and re-introducing it inside the mode built specifically to show everything would be
self-defeating.

Culling therefore only *defers* what is off-screen, which panning brings straight back. Nothing is
hidden, capped or truncated.

The honest consequence: **a fully zoomed-out city view in zoom mode culls nothing** and remains the
worst case by definition. That is the client's explicit trade. It is to be measured and reported, not
silently mitigated.

### 5. Default and persistence

`drill` stays the default, persisted in `localStorage` (`monitoring.mode.v1`) alongside the layer
facets (`monitoring.layers.v6`). Nobody's map becomes heavier without asking for it. An unrecognised
stored value (a downgrade leaving a newer mode name behind) falls back to the default.

The control is a **select**, not a segmented tab strip: three options no longer fit side by side
without truncating their labels.

## Consequences

**Good**

- The client gets the view she asked for without losing the drill model the rest of the product relies on.
- One aggregate call replaces the 1 + 2N per-tier requests zoom mode would otherwise fan out.
- Because counts are shared, a discrepancy between modes is now a *detectable bug* rather than an
  expected difference.

**Bad / accepted**

- Zoom mode at full city zoom is unbounded work. Accepted, measured, reported — and now avoidable by
  choosing viewport mode instead.
- Viewport mode trades payload for **requests**: panning far enough refetches. The padded box and the
  query-key cache keep that to a few calls per session rather than one per pan, but it is a real trade
  on a slow connection.
- The bbox is part of the aggregate cache key (rounded to ~1 km), so two operators looking at
  different corners of the city no longer share one cache entry.
- Two predicates for "which workers belong here" exist in the client. They are named
  (`scopeMatches` / `subtreeMatches`) and selected in exactly one place, so the cost is a named fork
  rather than scattered conditionals.
- Mobile keeps drill mode only until parity work lands, widening a platform gap the client has already
  raised.

## Amendment — progressive reveal in viewport mode (2026-08-28)

The tier thresholds answered *"does this tier fit?"*. On the real dataset that is still the wrong
question: past zoom 13 every one of the 129 kawasan drew an identical pin, so the one with nobody
clocked in looked exactly like the ninety that were fine. The client's words, with a screenshot of the
result: show the notable markers first and reveal the rest as you zoom, the way Google Maps does — for
worker pins as much as for areas.

**Decision.** Keep the tier thresholds exactly as they are (they still gate which tiers are eligible),
and rank *within* them against a screen-space budget.

    eligible (tiersAtZoom) → cull to viewport → score → grid declutter → promoted

Four new modules, each pure and independently testable:

| Module | Responsibility |
|---|---|
| `lib/monitoring/mercator.ts` | lat/lng → pixels. Collision is a screen question, not a ground one. |
| `lib/monitoring/salience.ts` | urgency + affinity + tier → one number |
| `lib/monitoring/affinity.ts` | per-browser "places this operator watches", decayed and bounded |
| `lib/monitoring/declutter.ts` | 88 px grid, cell winner takes a slot, hard cap 60 |

**Salience is urgency-first.** `3·tidak_hadir + 2·belum_hadir`, plus a flat 1.5 when a rostered area has
nobody on it at all — without that term a one-person site standing empty scores the same as an
eight-person site missing one, and small total outages vanish. A calm, fully staffed area scores
exactly **zero**, which is what makes an empty-looking map a truthful signal rather than an artefact of
the budget. Workers score the same way: absent 3, outside their area 2.5, stale ping 2, off-schedule 1.

**Affinity is bounded at 3, deliberately.** It is the client's "places you looked at before", summed as
`2^(−ageDays/7)` over the last 20 visits and pruned to 200 entities / 90 days. The ceiling is the safety
property: familiarity can break a tie between two quiet areas and can **never** outrank an outage. A map
that showed an operator their habits instead of their problems would be worse than one with no ranking.

**Nothing is hidden.** A marker that loses its cell renders as a `marker-dot` at its true position, in
its own status colour, still clickable, still drilling. This is the same rule that removed clustering
from this map ("it hid people and confused operators") — the dot *is* the marker, at low priority.
Demoted kawasan and lokasi also drop their polygon **fill** while keeping their outline: the fill is the
heaviest thing the map paints and the least informative at low priority.

**Viewport mode only.** Drill mode is untouched by definition; zoom mode deliberately draws everything,
which is the trade the client chose there. `computeReveal` returns nulls when disabled and both modes
render byte-for-byte as before — asserted directly.

**Measured**, on the live dataset (1089 nodes: 8 rayon / 129 kawasan / 952 lokasi), all tiers in view,
which is the worst case by construction:

| zoom | eligible | full pins | dots | ranking cost |
|---|---|---|---|---|
| 11–12 | 8 | 7 | 1 | 0.2 ms |
| 13 | 137 | 51 | 86 | 0.4 ms |
| 14.5+ | 1089 | 60 | 1029 | 1.9 ms |

Ranking is free; the residual cost is the dot elements, which viewport culling cuts further in practice
(this table deliberately does not cull, so the numbers are the ceiling and not the typical case).

**Two client corrections, same review round.**

The mode hint was absolutely positioned at `top-3` — the same offset as the overlay stack — so it drew
straight through the breadcrumb/status bar. It is now a **row inside that stack**, which cannot overlap
by construction and survives another row being added above it.

The pin's ⓘ detail badge is **removed**, not moved. It sat at `top:-4px; right:-6px`, which is exactly
where `pinSvg` draws the active-count badge (`cx=39 cy=10`), so a button was covering the only live
number the marker carries. That corner belongs to the count, and the count is **display only** — no
handler, no hit area. The badge was not relocated because a ~16 px tap target is a poor one at any zoom
and mobile has no equivalent, so keeping it meant a gesture that worked badly on one platform and not
at all on the other. The pin has one meaning again — tap = drill — and area detail opens from the
full-height ⓘ button on the node's row in the sidebar.

**Bad / accepted**

- `DEFAULT_CELL_PX = 88` and `DEFAULT_CAP = 60` are judgement calls, not derivations. They are named
  constants in one file precisely so they can be retuned against operator feedback.
- 1029 dots is still 1029 DOM elements. Cheap ones — one `<div>`, no SVG, no label — but the tail is
  not free, and a materially larger geography would need a second look.
- Ranking the *culled* set means panning re-ranks. Intended (the budget is a property of the screen),
  but it does mean a marker can change form as the camera moves.
- Drilling into a rayon leaves the camera near zoom 12, below the kawasan threshold, so the drill alone
  reveals nothing new in viewport mode. Pre-existing tier behaviour, now more visible; worth revisiting
  with the client.
- Mobile does not have this yet, widening the platform gap ADR-060 already noted.

## Verification

- Drill mode's numbers must be **byte-identical** before and after this change: zoom alters what is
  drawn, never a count.
- `npm run e2e:scenarios -- --only=MON --verify-only` covers all four drill tiers, ad-hoc city pinning
  and the phantom-session guard.
- Backend specs assert **composition** rather than SQL: the `scope=all` node set equals the
  concatenation of the drill calls, per-district clocked-in sets, id narrowing, and totals taken from
  the rayon tier.

## Related

[ADR-046](./ADR-046-monitoring-drill-model.md) · [ADR-050](./ADR-050-presence-attendance-model.md) ·
[ADR-045](./ADR-045-four-level-location-hierarchy.md) · [monitoring feature](../../features/monitoring/README.md)
