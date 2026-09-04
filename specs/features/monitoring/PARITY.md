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
| **Three map modes** (`drill` / `zoom` / `viewport`) | **Both.** Mobile has `MonitoringMode`, `isZoomLike`, and renders all three from `MODE_OPTIONS` in `ToolsOverlay`. The modes are *present and selectable on mobile today*. Corrected 2026-09-02: mobile's zoom mode only switched the worker predicate and the polygons — its node markers still came from the per-scope drill composition, so "Zoom (semua)" drew rayon alone at city scope. Both zoom-like modes now fetch `scope=all` like web. |
| Geo layer facets (`boundary` / `fill` / `marker` / `label`) | Both, same four facets |
| Personnel facets (`petugas` / `tim`) | Both |
| Worker scoping by mode (`scopeMatches` / `subtreeMatches`) | Both — mobile has `utils/monitoringScope.ts` |
| Level-wise node markers | Both — `NodeMarkerLayer` on both platforms. **This row was true at the symbol level only until 2026-09-02**: mobile's layer existed and was wired, but drew the *retired* `hadir/terjadwal` ratio bubble rather than the ADR-051 glyph pin, clustered nodes (which ADR-060 §4 forbids), and dropped the `promotedNodes`/`labelledNodes` its own reveal pass computed. See §Method — a symbol existing is not a feature existing. |
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
| M9 | Bulk reassign | M | **DONE** (both). **Audit correction — the sixth of its kind, and the largest.** This row said web *has* bulk reassign. It has the COMPONENT: `BulkReassignModal` is fully built and unit-tested, and referenced by nothing but its own test. So is web's `ReassignWorkerModal`, and so is mobile's. Mobile's `BoundaryDetailModal` even renders a reassign button — behind `is_understaffed && onReassign`, and **no caller ever passes `onReassign`** (ESLint says so: *'onReassign' is defined but never used*). **Reassignment is unreachable on BOTH platforms, single and bulk.** `git log -S 'onReassign='` shows a trigger DID exist and was stripped on 2026-06-10 by `49026d85` — an emergency "just display a map" rebuild whose own message says *"Filters / boundaries / clustering / drawers to be layered back on once the map is confirmed rendering"*. Filters and boundaries were restored; this was not. The gap is not parity — it is a **feature that has been dark on both platforms for ~11 weeks.** |
| M10 | On-leave list | S | **Audit correction — already DONE on mobile, nothing to build.** "No mobile equivalent" is false: `MonitoringStatusSheet` renders an on-leave section, fed end to end — `monitoringSlice` populates `onLeaveUsers` from `on_leave_users`, `MapDashboardScreen` passes it through `StatusAndDetailSheets`. Verified before building, which is the only reason it was not rebuilt on top of itself. |

## 3. Gaps: web is missing what mobile has

Worth stating plainly: **a supervisor at a desk can currently do less than one on a phone.** For a
supervisor tool that is backwards.

| # | Gap | Size | Why it matters |
|---|---|---|---|
| W1 | **Plant overlay layer** | M | **DONE** (slice 4). **Audit correction, twice over:** this row claimed mobile had an overlay web lacked. Mobile's `PlantOverlayLayer` was a **stub** — 28 lines returning `null` unconditionally, `TODO sub-phase 3-8` — so its Tanaman toggle controlled nothing; and web already had a `/plants` page, a Tanaman row in `AreaDetailPanel` and a `useNotablePlants` client. The real gap was that **neither platform drew plants on the map**. Built on both, at lokasi scope: the endpoint is per-location, so anything wider would be ~950 requests. |
| W2 | **Photo gallery** (`PhotoGallery`) | M | **DONE** (both). **Audit correction — the W1 shape, again.** This row claimed photos are viewable on a phone but not at a desk. They are viewable on NEITHER. Mobile's `PhotoGallery` is exported from the barrel and unit-tested but **rendered by no screen**; `UserDetailSheet` shows only a photo *count* ("3 foto") on an activity card whose `onPress` is `NOOP`. Web shows neither count nor photo. The backend already returns `photo_url`/`photo_urls` (`monitoring-user.service.ts:832`), so the data is there and unused on both sides. Real gap: **no operator can open a verification photo anywhere.** Web shows a camera button on any activity carrying a photo, opening the extracted `ui/photo-lightbox` (which also gave the pruning page the stepping it never had). **Mobile now opens them too**: the activity LIST returns `photo_count` with an EMPTY `photo_urls` (they load on detail), so a card with photos fetches its detail on tap and hands the URLs to the long-dormant `PhotoGallery`. Cards without photos stay unpressable rather than becoming dead targets. **W2 fully closed on both platforms.** |
| W3 | **Attendance detail modal** (`AttendanceDetailModal`, `UserAttendanceModal`) | M | **DONE** (web). Verified CORRECT before building — no `supervisor/attendance?date=` call existed anywhere in web. Built on NEW `GET /monitoring/attendance` rather than the superseded `/supervisor` one: web had zero coupling to that module and adding some would be the wrong direction. The reimplementation drops four defects the original carried (satgas-only roster, server-local day bounds, `clock_in_time` instead of `service_day`, one row per shift so a double clock-in counted twice). **Mobile migrated too** (same slice): the LIST was a one-line URL swap as designed, but the DETAIL deliberately changed `shift` → `shifts[]`, so `UserAttendanceModal` now renders one card per session — the old single-shift shape hid the second session of anyone who clocked out for a break, making a full day read as a half one. `/supervisor/attendance*` now has no callers. (`active-users` and `area-status` still do.) |
| W4 | **Trail date stepper** (`TrailDateStepper`, `TrailInfoBar`) | S | **DONE.** **Audit correction:** web's `LocationTimeline` does NOT show today only — it has a full `DatePicker` bound to `onDateChange` and can already reach any date. The real difference is narrower and purely ergonomic: mobile adds **prev/next chevrons** that step one day at a time (clamped at today, since there is no future GPS), so the common "what about yesterday" needs one tap instead of opening a picker. Scope is a control, not a capability. Web's `LocationTimeline` now has prev/next chevrons, clamped forward at today. |
| W5 | Marker preview (`MarkerPreview`) | S | **DONE** (web), as a **hover** preview rather than a copy. Mobile shows the card on TAP because a tap is imprecise and the map recenters first, so committing straight to a drill often drills the wrong node; a mouse has neither problem and web's click→drill is already the shorter path. Copying the tap flow would have added a click to every drill. The information moves to hover instead — name, tier, scheduled/hadir/aktif — so the value parity was after ("see what this is before you commit") arrives without the step. Building it surfaced a live bug: the panel header reads `areaDetail.${variant}` and the locale still carried `area` from the Area→Location rename, so **every lokasi panel rendered the raw key `areaDetail.location`**. |

---

## 4. Recommended order

Ordered by *client-visible value per unit of risk*, not by size.

1. **M1 + M2 + M3 — the mobile map.** — *planned:* [`plans/2026-08-28-slice1-mobile-map-reveal.md`](./plans/2026-08-28-slice1-mobile-map-reveal.md) One coherent slice: the reveal is meaningless without the tier
   rule, and the label pass shares its geometry. Biggest gap, and the phone is where crowding hurts
   most. Retires clustering (see §5).
2. ~~**M6 + M5 — mobile search and filter.**~~ **DONE (slice 2).** M6 was indeed a defect, though not
   the one this document first described — see its row above for the correction.
3. ~~**M4 + M7 + M8 — the mobile list sheet.**~~ **DONE (slice 3).**
4. ~~**W1–W5 — web catches up.**~~ **ALL DONE.** Independent of everything above; can run in parallel
   with a different pair of hands.

   > **This line used to read "W1–W4" and silently omitted W5.** Someone (me) planned from this
   > ordering rather than from §3's table, reported "every parity row closed", and only found W5 by
   > re-reading the table afterwards. **§4 is a reading order, not the inventory — §3 is.** Keep the
   > two in sync, or plan from §3.
5. ~~**M9 + M10 — reassignment and leave.**~~ **DONE** — and neither was what this line assumed.
   M10 needed no code (mobile already had it end to end); M9 turned out to be reassignment being
   unreachable on BOTH platforms, dark for ~11 weeks after a rebuild dropped its trigger.

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
2. ~~Plant overlay on web (W1)~~ — **resolved**: wanted at a desk. Built on both platforms at lokasi
   scope. A city-wide view would need a new bbox endpoint; deferred until someone asks for it.
3. ~~**Density constants for mobile**~~ — **resolved 2026-08-29, measured on a Pixel 5.**
   `DEFAULT_CELL_X/Y = 132×76`, cap 24. The provisional 110×72 was wrong in the predicted direction:
   110 was 22dp *narrower* than the 132dp label it exists to bound (`MarkerLabel.slotV.width`), so
   two names 110–131dp apart both promoted and then overlapped — the same defect web shipped when it
   sized its box to the 88px icon instead of the 150px label. Y = 30 label + 40 ring + 5 arrow = 75.
   Units are dp throughout (`useWindowDimensions` reports dp; RN styles are dp). The cap is a
   backstop, not the limit: separation alone already admits only ⌊392/132⌋×⌊851/76⌋ = 22.
   **The instinct to measure rather than guess was right — the guess was off by exactly the amount
   that produces visible overlap.**

---

## Method

Inventoried by file presence and symbol search across `apps/{web,mobile}/src/**/monitoring*`, then
each candidate gap confirmed by reading the implementation on both sides. Counts and absences in §1–3
were verified individually, not inferred from filenames — several filename matches ("cluster",
"trail") turned out to be unrelated substrings.

**That was not enough.** Five rows have since been corrected while building them (M6, W1 twice, W2,
W4), and they failed the same way: **a symbol existing is not a feature existing.** `PlantOverlayLayer`
returned `null`. `PhotoGallery` is rendered by no screen. `LocationTimeline` already had the date
control this document said it lacked. A file-presence inventory cannot tell "implemented" from
"exported", so before building any remaining row, **read its call sites and confirm something renders
it** — the check that would have caught all five.
