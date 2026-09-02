# SEKAR — Status (Source of Truth)

**Last updated:** 2026-09-02 · **Single source of truth** for status & metrics. Specs do not
duplicate these numbers. Build history: [`history/CHANGELOG.md`](history/CHANGELOG.md).

## Deployment

| Layer | Environment | Status | URL |
|-------|-------------|--------|-----|
| Backend (NestJS + PostgreSQL + Redis + MinIO) | Staging (AWS) | ✅ Live | https://api.sekar.wahyutrip.com · docs `/api/v1/docs` |
| Web (Next.js 16) | Staging (AWS) | ✅ Live | https://sekar.wahyutrip.com |
| Mobile (React Native APK) | UAT | ✅ Distributed — **v0.1.4 / versionCode 6** | sekar.wahyutrip.com/android |
| Production (on-prem Docker Compose) | — | ⏳ Pending pemkot box | platform-agnostic, ready |
| Monitoring (Sentry) | wired | 🔄 Dormant until DSN set | backend + web + mobile |
| Secrets (dotenvx) | all envs | ✅ Encrypted (key in AWS SSM) | — |
| AWS account | staging | ✅ **`204284492859`** (migrated 2026-09-02) | region `ap-southeast-3` |
| Nightly DB backup | staging | ✅ systemd timer 19:15 UTC → S3, 14-day retention | `sekar-db-backups-204284492859` |

**UAT sign-off:** 2026-06-22. **Staging deploys are DELIBERATE** — `deploy-staging.yml` runs only on a
push to the `staging` branch (merge `main` → `staging`) or a manual dispatch. Merging to `main` does
**not** deploy; this line previously claimed it did. Versioned releases via `scripts/release.sh`.

> **Staging is currently ~403 commits behind `main`.** Nothing from that backlog is deployed, which is
> why a monitoring-attendance regression that lived briefly on `main` never reached a running system.

## Ground-truth metrics (from code)

- **Backend:** 38 modules · 44 controllers · ~305 route handlers · 2,858 tests · >80% coverage
- **Mobile:** 8 roles · 54 screens · 4,585 tests · WCAG 2.1 AA · offline-first
- **Web:** 8-role dashboard · Next.js 16 · 2,433 tests · realtime · a11y-audited
- **Architecture:** 55 ADRs ([index](architecture/decisions/README.md)) · **i18n** id/en bilingual
  (react-i18next), API English-canonical
- **Quality:** zero `npm audit` vulnerabilities across workspaces · 92 token/ESLint-rule tests
- **Guardrails:** `i18n:check` verifies keys are *used-and-present*, not just id/en-symmetric;
  `sekar-design/no-low-contrast-text` blocks sub-AA foreground greys; a metadata spec checks
  **105/105** TypeORM join paths without a database

> Live endpoint list is the Swagger doc (`/api/v1/docs`); treat these counts as approximate.

## Feature status

Legend: ✅ Active · 🅿️ Parked (built, hidden from web nav, revisit later) · ⚠️ Deprecated

| Feature | Status | Web | Mobile |
|---------|--------|-----|--------|
| [Auth & roles](features/auth/README.md) | ✅ | ✅ | ✅ |
| [Users & profile](features/users/README.md) | ✅ | ✅ | ✅ |
| [Scheduling](features/scheduling/README.md) | ✅ | ✅ | ✅ (my-schedule, day view) |
| [Attendance](features/attendance/README.md) | ✅ | ✅ (log) | ✅ |
| [Work items](features/work/README.md) | ✅ | ✅ | ✅ |
| [Overtime](features/overtime/README.md) | ✅ | ✅ | ✅ (submit) |
| [Geography](features/geography/README.md) | ✅ | ✅ | context |
| [Monitoring](features/monitoring/README.md) | ✅ | ✅ | ✅ |
| [Plants](features/plants/README.md) | ✅ | ✅ | context |
| [Pruning](features/pruning/README.md) | ✅ | ✅ | ✅ |
| [Notifications](features/notifications/README.md) | ✅ | ✅ | ✅ |
| [System](features/system/README.md) | ✅ | partial | version check |
| [Assets](features/_archived/README.md) | 🅿️ | hidden | present |
| [Analytics](features/_archived/README.md) | 🅿️ | hidden | present |
| [Reporting builder/schedules](features/_archived/README.md) | 🅿️ | hidden | — |
| [Import / Export](features/_archived/README.md) | 🅿️ | hidden | — |
| [Seeds](features/_archived/README.md) | 🅿️ | hidden | present |

**Backend-only (API implemented, no UI):** `special-day-overrides`, `kecamatans` (read-only),
`location-staff-requirements`, `audit`. (`service-capacity` has a web UI: rayon capacity grid.)
**Deprecated:** `supervisor` module (superseded by `monitoring`; not removed — 21 refs).

## Next

**Post-UAT foundational revamp** (specs authored 2026-07-10; ADR-044–049). Phased, one PR per phase,
bottom-up, web before mobile:
1. **Access control** — dynamic RBAC (roles/permissions/scope/markers), role-management page, Settings split (ADR-044/049) — ✅ **Merged to main** (PR #202 + verification hardening #205): rbac + settings modules, migrations, seeds, roles/permissions/settings API, web role-management + system-settings, `usePermissions`, audit trail, settings bounds. Legacy `@Roles` endpoints untouched (guard migration = Phase 5.5, deferred). **Not deployed to staging** (deploy only when all phases land).
2. **Geography** — 4-level hierarchy: Region/Kawasan + per-level map styling (ADR-045) — ✅ **Merged to main** (PR #202 + #206): regions module + migrations, per-level styling, `locations.region_id`, `users.region_id`, web `/regions` + `MapStyleFields`, cross-rayon integrity guards, boundary validation, rayon-scoped listing. City styling + monitoring region-tier drill deferred to Phase 5. Not deployed.
3. **Users & Teams** — role-driven scope inputs; teams CRUD (ADR-044/048) — ✅ **Merged to main** (PR #202 + #207): teams backend + web `/teams`; user form scope role-driven from monitoring_scope; backend role+scope validation; team-name uniqueness + active-type filtering. Not deployed.
4. **Scheduling** — calendar + rule-based recurrence + team schedules (ADR-047) — ✅ **Merged to main** (PRs #218–223, Phase 4 engine + UX redesign): `schedule_events` rule layer + materializer engine (rolling horizon), time-based overlap guard (multi-shift days legal), team fan-out with per-member conflict reporting, this/this-and-future/series edit semantics, template→events data migration (template cron retired). **Jadwal UX redesign** on top: single range select (default Hari) with drill-down, Rayon▸Kawasan▸Lokasi day coverage board (per-tier accent), year mini-calendars, per-rayon month + per-shift/role week summaries, hybrid search + filter chips, capacity converged on `location_staff_requirements` (understaffing = satgas+linmas only), mobile day-nav. Verified live against a scratch DB. **P5 rayon-scope schedule model DONE** (ScheduleScope +`rayon`, migration + CHECK widened, materializer/projections/validation/day-board/event-form wired, tests + live-verified). Weekend/holiday capacity + year heatmap + holiday management also landed. **Deferred:** full mobile parity; dark-mode visual sign-off. Not merged/deployed.
5. **Monitoring (web)** — subject model, drop Surabaya bubble, presence model, static/mobile, search (ADR-046) — ✅ **Merged to main** (PRs #279–#294 backend + #324/#325/#326 web UX): aggregate drill Rayon→Kawasan→Lokasi→workers, 3-axis presence (Aktif/Tidak Aktif/Tidak Hadir + inside/outside + Luar Jadwal), scope-narrowing drill, per-entity glyph markers + boundary border/fill colors (seeded defaults: rayon=building, kawasan=trees, lokasi=leaf, teams=distinct glyphs), team glyph marker with click→member list, worker trail + area-detail on marker click, breadcrumb with inline stats, Individu/Tim filter, attendance split (belum/tidak hadir). **Marker layers migrated to Advanced Markers** (node/worker/team/current-node on `AdvancedMarkerElement`, DOM glyph pins) after a browser profiling pass — reposition-on-patch (memoize content by visual signature, move-only on GPS patch, ~47× cheaper than rebuild); requires a vector `mapId`. Verified end-to-end after a clean reseed (Playwright, all levels + desktop/mobile) incl. live Advanced-Markers smoke; be 371 + web 342 monitoring specs green. **Mobile parity: COMPLETE** (2026-08/09, PRs #463–#486) — all 15 audited rows (M1–M10, W1–W5): progressive reveal + tier rule + label declutter on mobile, geo search index, row-hide, Wilayah/Petugas tabs, plant overlay + photo viewing on both platforms, web attendance drill-down on a new `/monitoring/attendance` (the superseded `/supervisor/*` now has no callers), reassignment made reachable again on both platforms after ~11 weeks dark, and a web hover preview. Seven of the audit's rows were wrong and corrected in place — a symbol existing is not a feature existing. **Remaining:** **cloud-console follow-up** — replicate the #304 base-map declutter in the Map Style bound to the Map ID (vector maps ignore JSON `styles`). Not deployed to staging.
6. **Mobile parity** — after web design ack — ✅ **Merged to main** (PR0/PR0b/PR0c cross-platform canon + mobile PR1–PR4, #345–#367): contract/type + all-9-role sweep, Surabaya bubble dropped, Rayon→Kawasan→Lokasi drill with the region-less fallback, workers from `/monitoring/snapshot` with `display_scope` tier-matching, team-marker expansion (ADR-048), lifecycle presence pills + shared presence colour standard (ADR-050), WS `subscribe:region` + `user:clock-out` removal + hybrid server search (online, client fallback offline). Post-sweep fixes: residual contract drift, task scope selector + submit-activity-from-task, RBAC menu access, excused pill, WSL2 Android dev-loop repair (#373). **Deliberately deferred (optional, not regressions):** day-view stays the default (no week/month switcher); "Jadwal Petugas" supervisor viewer is a new feature → [`REVAMP-STATUS.md`](REVAMP-STATUS.md). Not deployed to staging.

> **Staging cutover — 🚧 prep underway (not deployed).** All revamp phases have landed on `main`, which
> is ~289 commits ahead of `origin/staging`; the cutover runs **38 migrations against a live DB holding
> real UAT data**. Eight hazards found while preparing (empty RBAC tables after migration, old code served
> during migration, a deploy-poll timeout shorter than the chain, PG14/15 dev-vs-staging split, a
> destructive staging seed profile, the same RBAC trap armed for production, Redis role-cache staleness
> after the role rename, and installed APKs on the old contract) are tabled with fixes in
> [`REVAMP-STATUS.md`](REVAMP-STATUS.md#deployment--cutover); the runbook and go/no-go gate live in
> [`deployment/staging-cutover-runbook.md`](deployment/staging-cutover-runbook.md).

> **Phase 4 consolidation — ✅ complete (2026-07-16, PRs #268–#272).** Closed the scheduling model
> gaps before 5/6: configurable per-rayon `staffing_level` + polymorphic staff-requirements (seeded
> from the client workbook), the city ("Surabaya") scope now a permanent board node, capacity
> editable from master data **and** from the tier that owns it, teams counted toward staffing with a
> first-class Tim column, search that actually prunes/expands the board, day-type resolved in **WIB**,
> and a per-container boundary map. Web UX + backend hardening + comprehensive tests throughout.
> Final state: web **145 suites / 2065**, be **148 / 2403**, production build green, tsc/eslint/i18n
> clean on both. Detail: [`features/scheduling/README.md`](features/scheduling/README.md) `## Changelog`
> (2026-07-15/16). Rollout status: [`REVAMP-STATUS.md`](REVAMP-STATUS.md).
>
> **Carried into Phase 5 (known, not regressions):** monitoring still shows inactive rayon/kawasan
> (hiding them would drop live clocked-in workers off the map — must pair with the deactivate guard);
> lokasi `is_active` is **not enforced at clock-in** (`shifts.service.ts` → unfiltered
> `locationsService.findOne`); the kawasan delete guard contradicts ADR-045 (resolve the ADR first);
> ~70 "Area" display strings still mean *lokasi*; Year view ignores search filters; `toPaths` is
> duplicated between `AreaBoundaryMap` and `SimpleMonitoringMap`; `DayBoard` is 951 lines (over the
> 800 ceiling). **Staging stays undeployed until 5+6 land** — note `main` now carries an unapplied
> `is_active` migration and the `areaType`→`locationType` rename (field APKs read "N/A" until updated).
> **Also on `main` (2026-07-20):** the monitoring drill-level value `'area'`→`'location'` — the
> `GET /monitoring/snapshot?scope=` param + aggregate/staffing node `type` value changed, so installed
> APKs send/read the old `'area'` value until updated (mobile never actually receives an `'area'`-type
> node at its city/rayon scope, so runtime impact is minimal). The boundaries `?level=area` param + the
> `.areas[]` payload are unchanged.

Then revisit the parked features above. Track work in each feature spec's `## Changelog`.

**Deferred RBAC follow-ups (ADR-044 §Follow-ups):** (1) migrate the ~182 existing `@Roles` endpoints to `@RequirePermissions` via the compat shim + role-endpoint-matrix test — a dedicated later pass (or per-module as Phases 2–5 touch each); until then, role-permission edits only affect the new RBAC/settings endpoints. (2) Management's default grants = all-except-`settings:manage` (per UAT) — retunable at runtime; revisit whether to narrow `role:*`/`permission:*`.

**Deferred to implementation PRs (not Phase 0 gaps):** fleshing out `database/schema.md` / `database/erd.md` and `api/contracts.md` with the new tables/columns/endpoints (roles/permissions, regions, teams, schedule_events, settings, `users.region_id`, per-level styling) — these current-state detail docs are updated in the **same PR as the migration/code** per the specs-sync mandate. Several still describe today's korlap multi-location (`user_locations`) model and will be reconciled to the region + optional-location model as Phase 1–3 land.

## Links

- Navigation hub: [`README.md`](README.md) · Deployment: [`deployment/README.md`](deployment/README.md)
- Architecture & ADRs: [`architecture/`](architecture/) · API: [`api/contracts.md`](api/contracts.md) (+ Swagger)
- App setup: [`../apps/be/README.md`](../apps/be/README.md) · [`../apps/web/README.md`](../apps/web/README.md) · [`../apps/mobile/README.md`](../apps/mobile/README.md)
