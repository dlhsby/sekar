# ADR-060 — Two monitoring map modes, one set of numbers

**Status:** Accepted (2026-08-12) · **Supersedes:** nothing · **Amends:** [ADR-046](./ADR-046-monitoring-drill-model.md) (adds a second reading of `display_scope`, does not change it)

## Context

The delivered monitoring map is a tap-to-drill hierarchy: Rayon → Kawasan → Lokasi, one level of
children at a time, with each worker rendered at **their own schedule tier and only there**
(`display_scope`, ADR-046). A lokasi-scheduled worker appears at that lokasi; a rayon-scheduled worker
at that rayon; an ad-hoc clock-in flat at city.

After a client review, the client asked to see **everything at once** — every rayon, kawasan and lokasi,
and every worker, from the city view — with tapping a rayon narrowing to *that rayon's whole subtree*
rather than to its immediate children. She was told this is heavier and insisted; the agreed compromise
is to ship both and let her choose.

That request is not a tweak to the drill model. It asks a **different question** about a worker:

- drill asks *"is this worker's schedule scoped to what I'm looking at?"*
- zoom asks *"is this worker standing anywhere inside what I'm looking at?"*

Both are legitimate. The first answers "is the plan being followed"; the second answers "who is out
there right now". Conflating them is what makes a monitoring map lie, so they are named and separated
rather than blended into one heuristic.

## Decision

**Ship two modes. They differ only in what is DRAWN — never in what is COUNTED.**

### 1. Worker visibility is the mode

| Mode | Predicate | Basis |
|------|-----------|-------|
| `drill` | `display_scope === scope && display_scope_id === view.id` | the worker's **schedule occurrence** (ADR-046) |
| `zoom` | worker's `district_id` / `region_id` / `location_id` matches the current node | the worker's **actual geography** |

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
selects. Nobody's map becomes heavier without asking for it.

## Consequences

**Good**

- The client gets the view she asked for without losing the drill model the rest of the product relies on.
- One aggregate call replaces the 1 + 2N per-tier requests zoom mode would otherwise fan out.
- Because counts are shared, a discrepancy between modes is now a *detectable bug* rather than an
  expected difference.

**Bad / accepted**

- Zoom mode at full city zoom is unbounded work. Accepted, measured, reported.
- Two predicates for "which workers belong here" exist in the client. They are named
  (`scopeMatches` / `subtreeMatches`) and selected in exactly one place, so the cost is a named fork
  rather than scattered conditionals.
- Mobile keeps drill mode only until parity work lands, widening a platform gap the client has already
  raised.

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
