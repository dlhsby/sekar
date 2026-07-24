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
| 4 | Scheduling — rule + occurrences, calendar, teams (ADR-047) | ✅ merged — consolidation complete (staffing model + city scope + polish + tests) |
| 5 | Monitoring revamp (web) — ADR-046 | ✅ merged to `main` (PRs #279–#294 backend + #324–#326 web) |
| 6 | Mobile parity | ✅ merged to `main` (PR0/PR0b/PR0c canon + mobile PR1–PR4, #345–#367); two **optional** items stay deferred (below) |
| — | `rayon`→`district` rename (ADR-052) | ✅ merged — DB/backend/web/mobile (PRs #339/#341/#342) |
| — | Schedule row per place (ADR-053) + "Belum Dijadwalkan" (ADR-054) | ✅ merged — be + web (PR #374) |
| — | Staging deploy / cutover | 🚧 **prep underway** — see [`deployment/staging-cutover-runbook.md`](./deployment/staging-cutover-runbook.md) |

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

## Phase 5 — Monitoring revamp (web), ADR-046 — ✅ COMPLETE (merged to `main`, not deployed)

**All web-frontend items landed** (PRs #324–#326): the top-level **Surabaya bubble was dropped** (city lands
on rayon bubbles; `'surabaya'` removed from the `Scope` union, `SurabayaSummaryCard` deleted), **team bubbles**
with member expansion, the **Advanced Markers** migration (node/worker/team layers on `AdvancedMarkerElement`,
reposition-on-patch, browser-profiled), and WS/refresh hardening. Verified end-to-end via Playwright after a
clean reseed. What follows is the historical landing record.

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

**Implemented so far — 11 PRs merged 2026-07-16 (#279–289), all medium-reviewed + CI-green:**
- ✅ **Presence/attendance model (ADR-050)** — 5.4a offline 5→10 min · 5.4b pure lifecycle engine ·
  5.4c lifecycle on the snapshot (`is_late`, ad-hoc marker) · 5.4d ad-hoc excluded from staffing ·
  5.4e mobile crews geofence against their kawasan.
- ✅ **Region (Kawasan) tier** — 5.5a aggregate (`getAggregate('region')` + `region_id` on area nodes) ·
  5.5b `monitoring:region:{id}` WS room · 5.5c region-scope enforcement.
- ✅ **Web region drill** — 5.6a Rayon → Kawasan → Lokasi with the region-less fallback.
- ✅ **Server-backed search** — 5.7a `GET /monitoring/search` (name/lokasi + last-24h, incl.
  monitorable-but-unscheduled) · 5.7b web search box wired to it.
- ✅ **Understaffing uses the polymorphic subject** (landed in 5.0, refined in 5.4d/5.5a).

**Follow-on consistency fixes (landed with Phase 6, cross-platform):** an audit while starting mobile
parity surfaced a few web/backend items reconciled alongside mobile — ad-hoc clock-ins excluded from staffing
counts (`buildAreaSummaries`), ad-hoc `display_scope` flattened to `city` + rendered as "Luar Jadwal" markers,
workers rendered at their own `display_scope` tier (not only lokasi), a dead `outside_area` branch removed, and
`/me` extended with `monitoring_scope` + korlap fallback sets. See `specs/features/monitoring/README.md`.

## Phase 6 — Mobile parity — ✅ COMPLETE (2026-07-20 → 2026-07-22, merged to `main`)

**Contract-sync already absorbed by mobile** (merged earlier): area→location, rayon→district (ADR-052),
status 5→3 collapse, `radius_meters` retire, role renames. **Mobile monitoring drill-UX parity + the
all-feature sweep then landed** as PRs to `main`:
- **PR0 canon (cross-platform)** — backend/web consistency fixes done first so mobile builds on canon:
  ad-hoc staffing exclusion, ad-hoc `display_scope='city'`, `/me` gains `monitoring_scope`+`region_id`+
  `assigned_location_ids`, web dead-branch cleanup. korlap occurrence-union coverage auth (`PR0b`) and the
  web all-tier/ad-hoc *rendering* (`PR0c`, browser-verified) landed as their own follow-ups.
- **PR1–4 (mobile), all merged** — contract/type + all-9-role sweep (#345) → drop the Surabaya bubble +
  region drill tier (#348, #350–#351) → workers from `/monitoring/snapshot` with `display_scope`
  scope-matching (#349) → team-marker expansion (#352) → lifecycle presence pills + `tracking.offline`
  alignment (#353) → WS `subscribe:region` + `user:clock-out` removal + hybrid server search (#347).
- **Post-sweep mobile fixes also merged:** residual contract drift (area→location scope, roster shape),
  task scope selector + submit-activity-from-task, RBAC menu access + Swagger/Postman sync, excused
  (on-leave) pill (ADR-050), and the WSL2/Windows-emulator Android dev-loop repair (#373).

**Deliberately deferred — optional, not regressions** (unchanged by the cutover):
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

## Deployment / cutover — 🚧 prep underway (all phases have landed)

**Runbook + go/no-go gate: [`deployment/staging-cutover-runbook.md`](./deployment/staging-cutover-runbook.md).**
`origin/staging` is ~289 commits behind `main` and still runs the **pre-revamp** schema, so the cutover
runs **38 migrations in one shot against a live DB holding real UAT data**.

**Known cutover hazards (found while preparing — each has a fix in the runbook):**

| # | Hazard | Why it bites |
|---|--------|--------------|
| F1 | `17491300000000-AddRbacTables` creates `roles`/`permissions`/`role_permissions` **empty**, and **no migration inserts rows** — only the seeder does, which `deploy-staging.yml` never ran. | `RolePermissionsService` returns `[]` for an unknown role ⇒ every `@RequirePermissions` handler 403s and every role's `monitoring_scope` is `none`. Staging would come up authenticated but **authorization-dead**. Fix: non-destructive `db:seed:prod` (reference profile) step after `migration:run:prod`. |
| F2 | Migrations ran while the **old containers kept serving**; recreate happened after. | Old code meets new schema the instant `RenameAreaToLocation` commits → 500s for the whole migration window. Fix: stop backend/web + serve a maintenance response **before** migrating. |
| F3 | The SSM poll capped the whole deploy at ~6 min, then hard-failed. | A 38-migration chain can exceed it, reporting failure while migrations keep running ⇒ **partially-migrated DB with a red build**. Fix: raise the poll past the measured chain time and fail as "unknown state — do not retry blindly". |
| F4 | Staging RDS is **PostgreSQL 15.17** (private); local infra pins **`postgres:14-alpine`**. | A PG15 dump can't restore into PG14 — the rehearsal needs a throwaway PG15 target, and the dump must run from the EC2 box. Infra bump to PG15 is a post-cutover follow-up. |
| F5 | `db:seed:staging` calls `truncateAll()`. | It **wipes every table**. It must never run against the live staging DB; only the reference profile is safe there. |
| F6 | `production.ts` doesn't seed roles/permissions (unlike `reference.ts`). | The same F1 trap is armed for the eventual **production** cutover. |
| F7 | Role codes renamed (`top_management`→`management`, `admin_data`→`admin_rayon`); the permission cache is Redis-keyed by role code. | Forced re-login for everyone + Redis must be flushed post-deploy. |
| F8 | Installed mobile APKs still emit pre-revamp shapes. | Field devices break at cutover → the staging APK ships **with** the release. |

- **All-at-once** deploy of the revamp to staging (then production later).
- Forward **migration chain** runs clean from the pre-revamp schema → current (verified: idempotent, in
  order). Includes the non-destructive data migrations that let the **live** DB adopt kawasan +
  re-parenting + staffing without a destructive reseed (`17496…` kawasan/re-parent; the staffing-seed
  migration from Phase-4 consolidation).
- **Gate:** run the full chain + reference seed + the whole per-role UAT matrix against a **restored dump of
  real staging data** on a throwaway PG15, with a before/after row census showing zero unexplained loss.
  The Phase-4 Step-8 dress-rehearsal (empty DB) is **not sufficient** — it never exercised live rows.
- Caveat: some migration `down()` paths assume no multi-shift roster rows — forward-only deploy, so not a
  blocker; documented in the migration files. **Rollback is therefore the RDS snapshot, not `down()`** —
  the workflow takes a pre-deploy snapshot and waits for it before migrating.
- **Verified (Step 8 dress-rehearsal, 2026-07-15) — empty-DB only:** the then-67-migration chain runs clean
  on an empty DB,
  then the seeder populates (kawasan + areas + 195 staffing rows, 0 duplicates). The data-adoption
  migrations (`17496` kawasan, `17500` staffing) **skip on a fresh DB** (seeder owns fresh) and run on an
  existing DB (live adoption). `17500` is **authoritative** — it clears prior auto-seeded staffing (config
  data, re-derivable) before inserting the workbook numbers, so it's not purely additive. `17499` drops the
  incompatible pre-revamp `uq_area_staff_requirements`. Because those two skip on a fresh DB, **that
  rehearsal never exercised them** — the staging-clone rehearsal exists precisely to cover that gap.

## Also deferred (non-blocking)

Bulk-assign / schedule templates / CSV export · dark-mode visual sign-off · linmas staffing requirements
(the workbook is satgas-only) · the deferred RBAC `@Roles`→`@RequirePermissions` sweep (ADR-044 §Follow-ups).
