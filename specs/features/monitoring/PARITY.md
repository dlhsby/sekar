# Monitoring — web ⇄ mobile parity audit

Audited 2026-08-28, against `main` at the merge of PR #463.

**Why this exists.** Monitoring grew on both platforms at different speeds, and the two are now
different products in places. This is the inventory: every divergence, which direction it runs, what it
would cost to close, and — for a few of them — the argument that it should *stay* open.

**How to read it.** "Gap" means one platform has something the other does not. It does not mean the
other platform is wrong. Section 5 lists divergences that are decisions, not drift; closing those would
undo a call somebody already made.

---

## 1. Already at parity — do not rebuild

Checked first, because the obvious assumption ("mobile is behind, port everything") is wrong in several
places and would waste the most time.

| Capability | Status |
|---|---|
| **Three map modes** (`drill` / `zoom` / `viewport`) | **Both.** Mobile has `MonitoringMode`, `isZoomLike`, and renders all three from `MODE_OPTIONS` in `ToolsOverlay`. The modes are *present and selectable on mobile today*. |
| Geo layer facets (`boundary` / `fill` / `marker` / `label`) | Both, same four facets |
| Personnel facets (`petugas` / `tim`) | Both |
| Worker scoping by mode (`scopeMatches` / `subtreeMatches`) | Both — mobile has `utils/monitoringScope.ts` |
| Level-wise node markers | Both — mobile `AggregateBubbleLayer`, web `NodeMarkerLayer` |
| Drill hierarchy carrying parent ids | Both — mobile `monitoringDrillNodes.ts` carries `districtId` |
| Viewport bbox fetching | Both — mobile `utils/viewportBox.ts` |
| Tier thresholds by zoom | Both — mobile `zoomTiers` on `latitudeDelta`, web on zoom level |

**Consequence:** the request "I want those 3 modes on mobile too" is already satisfied. What differs is
how the modes *behave* once selected — which is §2.

---

## 2. Gaps: mobile is missing what web has

| # | Gap | Size | Why it matters |
|---|---|---|---|
| M1 | **Progressive reveal** — `salience` / `affinity` / `declutter` / `mercator` (0 files on mobile) | **L** | **DONE** (slice 1). The core of PR #463. Without it mobile's zoom mode draws every eligible marker, which is the exact complaint that started this work — and a phone is the *most* crowded surface. |
| M2 | **Scope-aware tier admission** (`tiersFor`) | S | **DONE** (slice 1). Drilling into a city-spanning rayon on mobile shows nothing, same defect the client hit on web. |
| M3 | **Label decluttering** | M | **DONE** (slice 1). Mobile reserves an opposite-side slot per label (Android bitmap clipping) but does not measure collisions. Web measures and withholds. |
| M4 | **Row hide** (`hidden.ts`, restore banner) | M | **DONE** (slice 3). No mobile equivalent. |
| M5 | **Luar jadwal filter** | S | **DONE** (slice 2). Same presence-model gap web had: visible in the summary, not filterable. Added as its own axis, not a fourth `PresenceActivity`. |
| M6 | **Geo search index** (`useGeoIndex`) | M | **DONE** (slice 2). **Audit correction:** the original entry claimed no lokasi was findable at city scope. That was inferred from web's analogous bug and is **wrong** — the boundaries endpoint's default level already returns all 952 areas and 129 regions, verified against the live API. The real defects were different and both confirmed by reading the code: (a) `fetchBoundaries.fulfilled` **replaces** the whole store, so viewport mode's bbox fetch narrowed search to what was on camera; (b) `SearchResultType` had no `region` member and the search loop never read `r.regions`, so **kawasan was unfindable in every mode**. |
| M7 | **Breadcrumb in the list sheet** + "Daftar Area dan Petugas" naming | S | **DONE** (slice 3). Mobile has a breadcrumb on the map, none in the sheet. |
| M8 | **Wilayah / Petugas tabbed list** | M | **DONE** (slice 3). Mobile's `MonitoringStatusSheet` is attendance-shaped; there is no browsable node list with drill, hide and detail per row. |
| M9 | Bulk reassign | M | Web has `BulkReassignModal`; mobile reassigns one worker from `UserDetailSheet`. |
| M10 | On-leave list | S | Web `OnLeaveList`; no mobile equivalent. |

## 3. Gaps: web is missing what mobile has

Worth stating plainly: **a supervisor at a desk can currently do less than one on a phone.** For a
supervisor tool that is backwards.

| # | Gap | Size | Why it matters |
|---|---|---|---|
| W1 | **Plant overlay layer** (`PlantOverlayLayer`, `plants` layer row) | M | Mobile has a fifth layer row web has no equivalent of. Web's `layers.ts` has no `plants` key at all. |
| W2 | **Photo gallery** (`PhotoGallery`) | M | Verification photos are viewable on a phone, not at a desk. |
| W3 | **Attendance detail modal** (`AttendanceDetailModal`, `UserAttendanceModal`) | M | Per-user attendance drill-down. |
| W4 | **Trail date stepper** (`TrailDateStepper`, `TrailInfoBar`) | S | Web's `LocationTimeline` shows today only; mobile can step days. |
| W5 | Marker preview (`MarkerPreview`) | S | Long-press preview before committing to a drill. |

---

## 4. Recommended order

Ordered by *client-visible value per unit of risk*, not by size.

1. **M1 + M2 + M3 — the mobile map.** — *planned:* [`plans/2026-08-28-slice1-mobile-map-reveal.md`](./plans/2026-08-28-slice1-mobile-map-reveal.md) One coherent slice: the reveal is meaningless without the tier
   rule, and the label pass shares its geometry. Biggest gap, and the phone is where crowding hurts
   most. Retires clustering (see §5).
2. ~~**M6 + M5 — mobile search and filter.**~~ **DONE (slice 2).** M6 was indeed a defect, though not
   the one this document first described — see its row above for the correction.
3. ~~**M4 + M7 + M8 — the mobile list sheet.**~~ **DONE (slice 3).**
4. **W1–W4 — web catches up.** Independent of everything above; can run in parallel with a different
   pair of hands.
5. **M9 + M10 — reassignment and leave.** Lowest urgency; both are administrative rather than
   monitoring.

**Not recommended:** a single "parity" branch. Each numbered slice is its own spec → plan → PR. A
combined branch would be unreviewable and would couple a mobile map rewrite to a web photo viewer.

---

## 5. Deliberate divergences — closing these would undo a decision

| Divergence | Standing decision |
|---|---|
| **Mobile clusters worker pins; web does not** | Clustering was removed from web **on the client's request** — "it hid people and confused operators" — and replaced by the ranked dot field. Porting clustering to web would reinstate what she rejected. **Resolved 2026-08-28, and DONE in slice 1: mobile lost clustering.** The original complaint was that clustering hides people, and that is not a property of screen size — a merged bubble hides its members on a phone exactly as it did on a desktop. The dot field withholds *detail* and never withholds a *marker*, which is the distinction the complaint was actually about. Slice 1 retires it. |
| **Label placement differs** (web absolute, mobile reserved slot) | Not drift: `react-native-maps` anchors by a fraction of the rendered view and Android snapshots that view to a bitmap, clipping anything outside its bounds. Same *result*, different mechanism, by necessity. |
| **Tier thresholds keyed differently** (web zoom level, mobile `latitudeDelta`) | The platforms expose different camera models. The thresholds are tuned to match visually; unifying the *units* is not possible. |
| **Panel resize is web-only** | A phone sheet has no spare width. Correctly absent. |

## 6. Open decisions

1. ~~Clustering on mobile~~ — **resolved**, see §5. Mobile adopts the dot field.
2. **Plant overlay on web (W1)** — is this wanted at a desk, or is it a field-only tool? Blocks slice 4
   only; the rest of the roadmap does not depend on the answer.
3. **Density constants for mobile** — a phone viewport is roughly a quarter of a laptop's, so the
   separation box and cap need their own values. Deliberately left to be *measured* during slice 1
   rather than guessed here; web's own constants were retuned twice after seeing them rendered.

---

## Method

Inventoried by file presence and symbol search across `apps/{web,mobile}/src/**/monitoring*`, then
each candidate gap confirmed by reading the implementation on both sides. Counts and absences in §1–3
were verified individually, not inferred from filenames — several filename matches ("cluster",
"trail") turned out to be unrelated substrings.
