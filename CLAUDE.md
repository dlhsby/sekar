# CLAUDE.md

Guidance for Claude Code in this repository. **`specs/COMPLETION_STATUS.md` is the single source of truth** for status; use `git log` for commit history.

## Communication
- Be brief and concise; no unnecessary elaboration.
- Use `specs/` as the reference for all technical detail. Update existing docs instead of creating new ones.
- After changes, keep `specs/COMPLETION_STATUS.md` and the relevant `specs/phases/phase-X/STATUS.md` updated.

## Project Overview

**SEKAR** (Sistem Evaluasi Kinerja Satgas RTH; "SEKAR" is retained as the brand acronym) — worker tracking + task management for DLH Surabaya parks dept. Real-time GPS, clock-in/out with photo verification, work reports with media, supervisor dashboards, 7 Rayon structure, shift scheduling, task workflow, push notifications.

**Stack:** Backend NestJS 11 / TS 5.9 / PostgreSQL / TypeORM / JWT / WebSocket / AWS S3 · Mobile React Native 0.83 / React 19 / Redux Toolkit / FCM / Neo Brutalism (WCAG 2.1 AA) · Web Next.js 16 / React 19 / Tailwind 4 / Mapbox GL / Playwright · Node >=24.13, npm >=10.

## Quick Start

```bash
# Root tooling (token pipeline + eslint plugin) — once per checkout, from project root
npm install

# Infrastructure: PostgreSQL(5432) Adminer(8080) LocalStack S3(4566)
./infra/start.sh            # ./infra/stop.sh to stop

# Backend (be/)
npm install && cp .env.example .env
npm run migration:run && npm run db:seed   # db:seed is destructive (wipes first)
npm run start:dev          # http://localhost:3000  | API docs /api/docs

# Mobile (fe/mobile/) — set .env API_BASE_URL=http://10.0.2.2:3000 (emulator) or http://<IP>:3000 (device)
npm run android            # android:all for all devices | ios (macOS only)

# Web (fe/web/) — cp .env.local.example .env.local (Mapbox token)
npm run dev                # http://localhost:3001
```

Each workspace (`/`, `be/`, `fe/mobile/`, `fe/web/`) is **fully independent** — `npm install` in one never touches another. Token pipeline (from root): `npm run tokens:build` / `tokens:verify` / `test:tokens` — never hand-edit generated token files.

**Tests:** `npm test` (each workspace), `npm run test:cov` (backend, >80% required), `npm run test:e2e` (web).
**Test users:** `password123` for all — e.g. `admin/password123`, `satgas1/password123`. Phone login also works (e.g. `081200000006/password123`).

## Role Values Convention

**CRITICAL: always lowercase, matching backend enum. Never Pascal case** (`'Worker'`, `'Admin'`).

8 roles (ADR-009): `satgas` (field worker), `linmas` (security), `korlap` (field coordinator), `admin_data`, `kepala_rayon`, `top_management`, `admin_system`, `superadmin`. **Removed:** `worker`, `supervisor`, `admin`, `koordinator_lapangan`.

Phase 3 additions (ADR-032/033): `staff_kecamatan` (external, non-clockable, submits pruning requests); `admin_data` gains narrow `pruning_requests` disposition scoped by `users.rayon_id` — **no `admin_rayon` role**.

## Terminology Convention (ADR-010)

Code uses English; Indonesian only for UI labels / user-facing messages. `Activity`/`/activities` = Aktivitas · `Schedule`/`/schedules` = Jadwal · `Overtime`/`/overtime` = Lembur. **Dropped:** `WorkerAssignment`, `OvertimeAktivitas`, `Report` entity, `/aktivitas`, `/worker-schedules`.

## Conventions
- Module pattern: controller → service → repository → entity → DTOs. Auth via `@UseGuards(JwtAuthGuard, RolesGuard)`, `@Roles(...)`, `@GetUser()`. Swagger `@Api*` decorators.
- Check ADRs in `specs/architecture/decisions/` before major changes. SOLID, concise TypeScript, descriptive names.
- Security: bcrypt (10 rounds), GPS validation (±100m), class-validator input validation, rate limiting (100 req/min global, 5 req/min login). Never commit secrets.
- Testing: >80% coverage, Arrange-Act-Assert, mock external deps.
- DB: dev TypeORM auto-sync; prod migrations; soft delete via `deleted_at`.

## Backend .env essentials
`DATABASE_*` (localhost:5432, postgres/postgres, sekar_db) · `JWT_SECRET`, `JWT_EXPIRATION=7d` · Dev S3 via LocalStack (`AWS_ENDPOINT_URL=http://localhost:4566`, `AWS_S3_FORCE_PATH_STYLE=true`, test creds, bucket `sekar-media-dev`); prod leaves `AWS_ENDPOINT_URL` empty with real creds · `FCM_ENABLED=false` until Firebase configured. Full config: `specs/deployment/aws-s3-setup.md`, mobile network `specs/deployment/wsl2-network-setup.md`.

## Key Resources

| Topic | Path |
|-------|------|
| Project status (source of truth) | `specs/COMPLETION_STATUS.md` |
| Phase tracking | `specs/phases/phase-*/STATUS.md` |
| API contracts (~130 endpoints) / errors | `specs/api/contracts.md` · `specs/api/error-handling.md` |
| Architecture + ADRs | `specs/architecture/` · `specs/architecture/decisions/` |
| Security + dependency audit | `specs/architecture/security.md` |
| Design tokens (source of truth) | `specs/ui-ux/design-tokens.md` · `tokens.json` |
| Web PWA | `specs/phases/phase-3-plants-monitoring-rebuild/web.md` §PWA |
| Deployment / infra / WSL2 / S3 | `specs/deployment/` |
| E2E testing | `specs/testing/e2e-testing.md` |
| Full navigation | `specs/README.md` |

## Troubleshooting
- Port 3000 in use: `lsof -ti:3000 | xargs kill -9`. Metro cache: `npm start -- --reset-cache`. Android build: `cd android && ./gradlew clean`.
- "Cannot find eslint-plugin-sekar-design" / "tokens:build not found" / Metro "Cannot resolve @react-native/metro-config": run `npm install` from project **root** to resync tooling + workspace list.
- Full guide: `specs/deployment/infrastructure-setup.md`.
