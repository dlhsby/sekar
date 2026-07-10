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
- **Architecture:** 38 ADRs ([index](architecture/decisions/README.md)) · **i18n** id/en bilingual
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

**Backend-only (API implemented, no UI):** `special-day-overrides`, `service-capacity` (ADR-035),
`kecamatans` (read-only), `area-staff-requirements`, `audit`.
**Deprecated:** `supervisor` module (superseded by `monitoring`; not removed — 21 refs).

## Next

Post-UAT: **monitoring** and **scheduling** revamps (UAT feedback); revisit the parked features
above. Track work in the relevant feature spec's `## Changelog`.

## Links

- Navigation hub: [`README.md`](README.md) · Deployment: [`deployment/README.md`](deployment/README.md)
- Architecture & ADRs: [`architecture/`](architecture/) · API: [`api/contracts.md`](api/contracts.md) (+ Swagger)
- App setup: [`../apps/be/README.md`](../apps/be/README.md) · [`../apps/web/README.md`](../apps/web/README.md) · [`../apps/mobile/README.md`](../apps/mobile/README.md)
