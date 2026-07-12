# SEKAR — Status (Source of Truth)

**Last updated:** 2026-07-10 · **Single source of truth** for status & metrics. Specs do not
duplicate these numbers. Build history: [`history/CHANGELOG.md`](history/CHANGELOG.md).

## Deployment

| Layer | Environment | Status | URL |
|-------|-------------|--------|-----|
| Backend (NestJS + PostgreSQL + Redis + MinIO) | Staging (AWS) | ✅ Live | https://api.sekar.wahyutrip.com · docs `/api/v1/docs` |
| Web (Next.js 16) | Staging (AWS) | ✅ Live | https://sekar.wahyutrip.com |
| Mobile (React Native APK) | UAT | ✅ Distributed | sekar.wahyutrip.com/android |
| Production (on-prem Docker Compose) | — | ⏳ Pending pemkot box | platform-agnostic, ready |
| Monitoring (Sentry) | wired | 🔄 Dormant until DSN set | backend + web + mobile |
| Secrets (dotenvx) | all envs | ✅ Encrypted (key in AWS SSM) | — |

**UAT sign-off:** 2026-06-22. Staging auto-deploys on green push to `main`; versioned releases via
`scripts/release.sh`.

## Ground-truth metrics (from code)

- **Backend:** 34 modules · 35 controllers · ~246 route handlers · 528+ tests · >80% coverage
- **Mobile:** 8 roles · 30+ screens · 4,200+ tests · WCAG 2.1 AA · offline-first
- **Web:** 8-role dashboard · Next.js 16 · 1,700+ tests · realtime · a11y-audited
- **Architecture:** 44 ADRs ([index](architecture/decisions/README.md)) · **i18n** id/en bilingual
  (react-i18next), API English-canonical
- **Quality:** zero `npm audit` vulnerabilities across workspaces

> Live endpoint list is the Swagger doc (`/api/v1/docs`); treat these counts as approximate.

## Feature status

Legend: ✅ Active · 🅿️ Parked (built, hidden from web nav, revisit later) · ⚠️ Deprecated

| Feature | Status | Web | Mobile |
|---------|--------|-----|--------|
| [Auth & roles](features/auth/README.md) | ✅ | ✅ | ✅ |
| [Users & profile](features/users/README.md) | ✅ | ✅ | ✅ |
| [Scheduling](features/scheduling/README.md) | ✅ | ✅ | ✅ (my-schedule) |
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
4. **Scheduling** — calendar + rule-based recurrence + team schedules (ADR-047) — 🟡 **In review** (branch `feat/phase-4-schedules`): `schedule_events` rule layer + materializer engine (rolling horizon), time-based overlap guard (multi-shift days legal), team fan-out with per-member conflict reporting, this/this-and-future/series edit semantics, template→events data migration (template cron retired), web calendar (month/week/day + table). Verified live against a scratch DB. Not merged/deployed.
5. **Monitoring (web)** — subject model, drop Surabaya bubble, team bubbles, static/mobile, search (ADR-046) — 🚧 Planned
6. **Mobile parity** — after web design ack.

Then revisit the parked features above. Track work in each feature spec's `## Changelog`.

**Deferred RBAC follow-ups (ADR-044 §Follow-ups):** (1) migrate the ~182 existing `@Roles` endpoints to `@RequirePermissions` via the compat shim + role-endpoint-matrix test — a dedicated later pass (or per-module as Phases 2–5 touch each); until then, role-permission edits only affect the new RBAC/settings endpoints. (2) Management's default grants = all-except-`settings:manage` (per UAT) — retunable at runtime; revisit whether to narrow `role:*`/`permission:*`.

**Deferred to implementation PRs (not Phase 0 gaps):** fleshing out `database/schema.md` / `database/erd.md` and `api/contracts.md` with the new tables/columns/endpoints (roles/permissions, regions, teams, schedule_events, settings, `users.region_id`, per-level styling) — these current-state detail docs are updated in the **same PR as the migration/code** per the specs-sync mandate. Several still describe today's korlap multi-location (`user_locations`) model and will be reconciled to the region + optional-location model as Phase 1–3 land.

## Links

- Navigation hub: [`README.md`](README.md) · Deployment: [`deployment/README.md`](deployment/README.md)
- Architecture & ADRs: [`architecture/`](architecture/) · API: [`api/contracts.md`](api/contracts.md) (+ Swagger)
- App setup: [`../apps/be/README.md`](../apps/be/README.md) · [`../apps/web/README.md`](../apps/web/README.md) · [`../apps/mobile/README.md`](../apps/mobile/README.md)
