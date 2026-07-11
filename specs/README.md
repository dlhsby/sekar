# SEKAR Technical Specifications

Developer specs for **SEKAR** (Sistem Evaluasi Kinerja Satgas RTH) — worker tracking & task
management for DLH Surabaya's parks department: real-time GPS, clock-in/out with photo verification,
work reports, supervisor dashboards, 7-rayon structure, scheduling, task workflow, push
notifications.

Docs are organized as a **product** (by feature and concern), not by phase. Current status &
metrics live only in **[`COMPLETION_STATUS.md`](COMPLETION_STATUS.md)** — nothing here duplicates
them. Build history is in [`history/CHANGELOG.md`](history/CHANGELOG.md).

## Find what you need

### By feature — [`features/`](features/README.md)
One concise spec per domain (auth, scheduling, attendance, work, overtime, geography, monitoring,
plants, pruning, notifications, system) + [parked features](features/_archived/README.md). Each links
to the API/DB/UI detail rather than repeating it. **Start here to understand a capability.**

### By concern
| Area | Where | What |
|------|-------|------|
| Architecture & decisions | [`architecture/`](architecture/) · [ADR index](architecture/decisions/README.md) | System design, tech stack, security, caching, 44 ADRs |
| API | [`api/`](api/) | [`contracts.md`](api/contracts.md) (~246 handlers), auth, error codes (+ live Swagger `/api/v1/docs`) |
| Database | [`database/`](database/) | Schema, ERD, migrations, seed data, hardening |
| Design system | [`design-system/`](design-system/) | Neo Brutalism, tokens (SoT `tokens.json`), a11y, typography, i18n, [mockups](design-system/mockups/) |
| Testing | [`testing/`](testing/) | Strategy, coverage gates, test data, error-code reference |
| Deployment | [`deployment/`](deployment/README.md) | From-scratch guide + infra, CI/CD, secrets, operations, releases |

### By platform — [`platforms/`](platforms/)
- **Web** ([`platforms/web/`](platforms/web/)) — pages, components, data-fetching, tables, forms, realtime, performance
- **Mobile** ([`platforms/mobile/`](platforms/mobile/)) — screens, navigation, state, offline sync, permissions, components

## Tech stack

- **Backend:** NestJS 11 / TS 5.9 · PostgreSQL + TypeORM · JWT (Passport, 15-min access + 7-day refresh) ·
  S3 (staging) / MinIO (dev + prod) · Socket.IO + Redis Streams · Swagger `/api/v1/docs`
- **Mobile:** React Native 0.83 / React 19 · Redux Toolkit · React Navigation 7 · AsyncStorage · FCM · offline-first
- **Web:** Next.js 16 (App Router) / React 19 · TailwindCSS 4 (Neo Brutalism) · TanStack Query/Table ·
  React Hook Form + Zod · Recharts · **Google Maps** · Socket.IO · installable PWA
- **Infra:** Staging AWS (EC2 + RDS + S3, OIDC→ECR→SSM) · Production on-prem Docker Compose ·
  GitHub Actions · dotenvx secrets · CloudWatch + Sentry (dormant)

## Key decisions (see [ADR index](architecture/decisions/README.md))

- **Offline-first mobile** (ADR-002) with sync queue — field workers have poor coverage
- **UUID PKs** (ADR-001) — offline record creation without ID conflicts
- **Soft polygon geofencing** (ADR-005→010) — replaced the hard 100 m radius
- **Dynamic RBAC** (ADR-044, revamps ADR-009/032/033) — roles/permissions/scope/markers as data;
  9 seeded roles (satgas, linmas, korlap, admin_rayon, kepala_rayon, management, admin_system,
  superadmin, staff_kecamatan) plus operator-created custom roles
- **Event-sourced monitoring** (ADR-011→029) via Redis Streams

## Reading path (new developers)

1. Root [`/README.md`](/README.md) — project, local setup, release flow
2. [`architecture/system-overview.md`](architecture/system-overview.md) — how it fits together
3. [`features/README.md`](features/README.md) — pick the capability you're touching
4. [`database/schema.md`](database/schema.md) + [`api/contracts.md`](api/contracts.md) — the detail
5. [`COMPLETION_STATUS.md`](COMPLETION_STATUS.md) — what's live right now

## Related

- [`/CLAUDE.md`](/CLAUDE.md) — contributor rules · [`/README.md`](/README.md) — project README
- End-user manual (Bahasa, Docusaurus): [`../apps/docs/`](../apps/docs) → docs.sekar.wahyutrip.com
- Component setup: [`../apps/be/README.md`](../apps/be/README.md) · [`../apps/web/README.md`](../apps/web/README.md) · [`../apps/mobile/README.md`](../apps/mobile/README.md) · [`../infra/README.md`](../infra/README.md)
