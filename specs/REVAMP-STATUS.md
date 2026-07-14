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

## Also deferred (non-blocking)

Bulk-assign / schedule templates / CSV export · dark-mode visual sign-off · linmas staffing requirements
(the workbook is satgas-only) · the deferred RBAC `@Roles`→`@RequirePermissions` sweep (ADR-044 §Follow-ups).
