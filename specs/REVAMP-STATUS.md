# SEKAR Post-UAT Revamp — Status & Deferred Work

**Purpose:** one scannable place for where the UAT revamp (ADR-044–049) stands and what is deliberately
deferred, so it can be revisited without re-deriving context. Status source of truth for shipped work stays
[`COMPLETION_STATUS.md`](./COMPLETION_STATUS.md); this doc tracks the **revamp rollout** specifically.

**Delivery model:** bottom-up, one PR per phase to `main`, then **deploy the whole revamp at once**. A
mid-way deploy is unsafe — the schema flips `areas`→`locations` and adds a Kawasan tier the current *live*
monitoring UI can't render, so staging must not be deployed until all phases land + a local dress-rehearsal
passes.

## Phase status

| Phase | Scope | Status |
|-------|-------|--------|
| 1 | Access control — dynamic RBAC, role mgmt, settings split (ADR-044/049) | ✅ merged to `main` |
| 2 | Geography — Kawasan tier + per-level styling (ADR-045) | ✅ merged (+ #227 data from live staging) |
| 3 | Users & Teams — role-driven scope, team categories (ADR-044/048) | ✅ merged |
| 4 | Scheduling — rule + occurrences, calendar, teams (ADR-047) | ✅ merged; **consolidation in progress** (staffing model + city scope + polish + tests) |
| 5 | Monitoring revamp (web) — ADR-046 | 🚧 partial — see checklist below |
| 6 | Mobile parity | ⏳ deferred — see below |
| — | Staging deploy / cutover | ⏳ deferred until 5+6 land + dress-rehearsal |

## Area hierarchy (settled)

`Location → Rayon` (required) + `Location → Kawasan` (**optional**, `region_id` nullable, ADR-045). Kawasan
is an optional grouping/zone within a rayon, not a mandatory spine — `Rayon▸Kawasan▸Lokasi` (grouped rayons)
and `Rayon▸Lokasi` (Taman Aktif, region-less) are both first-class. Any drill/tree UI must handle the
region-less bucket (the web day board already does).

## Staffing / capacity model (settled — implemented in Phase 4 consolidation)

Requirements are **polymorphic**, attached to the subject a rayon's **`rayons.staffing_level`**
(`region | location | rayon`) points at: the 7 grouped rayons → per-**kawasan**; Taman Aktif → per-**location**
(park); city patrol → city-level (optional). Understaffing = scheduled satgas+linmas at that subject vs the
requirement. Seeded from the client "Kebutuhan Satgas" workbook (satgas-only; linmas added via UI later).

---

## Phase 5 — Monitoring revamp (web), ADR-046 — remaining checklist

**Landed so far (backend/data groundwork, no staging deploy):** 5.0 staffing correctness (the live
regression — monitoring was blind to 76% of the city's target) · 5.1 `radius_meters` retired (geofencing
is polygon-only) · 5.2 kawasan geometry seeded · **5.3 status model collapsed 5 → 3** (`active` /
`offline` / `absent`; `offline` **inverted meaning**, inside/outside became an axis, two thresholds
retired — ADR-046 amended). Per-item detail in `specs/features/monitoring/README.md`.

**Presence model standardised (design, feeds 5.4):** [ADR-050](./architecture/decisions/ADR-050-presence-attendance-model.md)
splits the flat status into three *derived* axes (attendance lifecycle · live presence · counting) so it
answers management's twelve questions and can't drift like the 5.3 enum. Four policies locked (per-shift
grace · forgotten clock-out never auto-closed · cuti/sakit/izin/libur reasons · 10-min offline paged at
threshold). Guardrails: service-day scoping + cross-midnight (shift 3). Companion need: a supervisor
"close & stamp" affordance for dangling shifts. (5.4a already shipped the 10-min offline default; the
settings catalog already allowed ample headroom, so no catalog-max change was needed.)

**Remaining:**

- **Implement the presence/attendance model** (ADR-050) — derive the six-state lifecycle from roster + shift
  record, surface `is_late` / `clock_out_time`, gate ad-hoc out of staffing counts. Belongs with 5.4.

- **Drop the Surabaya bubble**; draw all rayon boundaries on first load with per-rayon bubbles; no workers
  at top level.
- **Region (Kawasan) tier in the drill:** Rayon → Kawasan → Location → workers (now has data from #227),
  handling the region-less bucket (Rayon → Location) for Taman Aktif.
- **Static vs mobile subjects:** static geofenced to their location; mobile (e.g. penyiraman) geofenced to
  their region.
- **Team bubbles** — group marker that expands to members on click/zoom.
- **Server-backed, scope-filtered search** (worker / location / team; incl. non-scheduled clock-ins).
- **WS/refresh hardening** under load (no map remounts, no lag).
- **Understaffing on the map must use the polymorphic subject** (region/location/rayon/city), reusing the
  Phase-4 helper — not location-only.
- **Advanced Markers (deferred here on purpose, 2026-07-15).** `google.maps.Marker` is deprecated (warning
  only — still supported, 12+ months' notice). The **foundation is already in `main`**: a configurable Map ID
  (System Settings key `maps.map_id` + `GOOGLE_MAPS_MAP_ID` / `NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID`, served via
  `GET /config/maps`, resolved by `useMapId()`), the `marker` library is loaded in `GoogleMapsGate`, and a
  reusable imperative `components/maps/AdvancedMarker.tsx` wrapper exists. **Already migrated:**
  `GoogleBoundaryEditor` (#257, verified in-browser) + `MapDisplayModal` (#258).
  **Still on legacy `Marker` → do them as part of this revamp:** `SimpleMonitoringMap`, `NodeMarkerLayer`,
  `WorkerClusterLayer`. Deferred deliberately because (a) `AdvancedMarkerElement` renders **DOM nodes** vs the
  legacy marker's optimized layer, so hundreds of worker pins risk a **pan/zoom perf regression** that needs
  in-browser profiling, and (b) the icon layer here is a real rewrite (SVG-string pins + `SymbolPath.CIRCLE`
  cluster/area circles + hover). Build them with Advanced Markers **from the start** in this revamp and
  perf-test. Note `@react-google-maps/api` has **no** `AdvancedMarker` component — use the imperative wrapper
  (or evaluate `@vis.gl/react-google-maps`).

## Phase 6 — Mobile parity (after web design ack)

- **Monitoring parity** — mirror the ADR-046 revamp on React Native (native Google Maps controls).
- **Worker week/month switcher** — the worker `MyScheduleScreen` is **day-only today** (date picker +
  prev/next). A Hari/Minggu/Bulan switcher was *claimed* in commit `c3434c9d` + an earlier changelog line
  but **was never coded**; day-only was a deliberate simplicity choice. Building the switcher is optional
  Phase-6 work, not a regression to "restore".
- **"Jadwal Petugas" — supervisor schedule viewer (new, read-only).** Design:
  - **Role-scoped:** management → all Surabaya · kepala_rayon / admin_rayon → their rayon · korlap →
    their region/locations.
  - **Day-first** (date picker + prev/next), consistent with the worker screen.
  - **Content:** workers grouped by shift with status pills + an **understaffing badge per subject**
    (kawasan/location per `staffing_level`); optionally a collapsible Rayon▸Kawasan▸Lokasi list, one level
    open at a time.
  - **Read-only** — create/edit stays on web (mobile is the field companion). Backend reuses the
    scope-filtered coverage projection the web day board already computes.

## Deployment / cutover — when 5 + 6 land

- **All-at-once** deploy of the revamp to staging (then production later).
- Forward **migration chain** runs clean from the pre-revamp schema → current (verified: idempotent, in
  order). Includes the non-destructive data migrations that let the **live** DB adopt kawasan +
  re-parenting + staffing without a destructive reseed (`17496…` kawasan/re-parent; the staffing-seed
  migration from Phase-4 consolidation).
- **Gate:** run the full chain + seed + smoke-test monitoring against real geography on a **local staging
  clone first** (the Phase-4 Step-8 dress-rehearsal covers scheduling; extend to monitoring before deploy).
- Caveat: some migration `down()` paths assume no multi-shift roster rows — forward-only deploy, so not a
  blocker; documented in the migration files.
- **Verified (Step 8 dress-rehearsal, 2026-07-15):** the full 67-migration chain runs clean on an empty DB,
  then the seeder populates (kawasan + areas + 195 staffing rows, 0 duplicates). The data-adoption
  migrations (`17496` kawasan, `17500` staffing) **skip on a fresh DB** (seeder owns fresh) and run on an
  existing DB (live adoption). `17500` is **authoritative** — it clears prior auto-seeded staffing (config
  data, re-derivable) before inserting the workbook numbers, so it's not purely additive. `17499` drops the
  incompatible pre-revamp `uq_area_staff_requirements`. The **local UI drive** (start app, log in, walk the
  supervisor flows) is still pending — do it before the actual staging deploy.

## Also deferred (non-blocking)

Bulk-assign / schedule templates / CSV export · dark-mode visual sign-off · linmas staffing requirements
(the workbook is satgas-only) · the deferred RBAC `@Roles`→`@RequirePermissions` sweep (ADR-044 §Follow-ups).
