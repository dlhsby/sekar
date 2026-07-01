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
# One-command flow (recommended) — run from project root
./scripts/setup.sh          # env files, all installs, infra, migrations (+ optional destructive seed)
./scripts/start.sh          # backend + web in background, Metro foreground (--no-mobile to skip Metro)
./scripts/stop.sh           # stop services (--infra to also stop Docker)
# Single services: ./scripts/start-be.sh · start-web.sh · start-mobile.sh [--android]
# Ports per project: be/.env.local PORT (default 3000) · fe/web/.env.local WEB_PORT (default 3001)

# Manual per-workspace flow
npm install                 # root tooling (token pipeline + eslint plugin), once per checkout

./scripts/infra.sh start    # PostgreSQL, Adminer(8080), MinIO S3(9000)+console(9001), Redis; `stop`/`down`/`status` too

# Backend (be/)
npm install && cp .env.local.example .env.local
npm run migration:run && npm run db:seed   # db:seed is destructive (wipes first; fresh DB needs one backend boot first)
npm run start:dev          # http://localhost:${BE_PORT:-3000}  | API docs /api/v1/docs

# Mobile (fe/mobile/) — cp .env.local.example .env.local; set API_BASE_URL=http://10.0.2.2:<BE_PORT> (emulator) or http://<IP>:<BE_PORT> (device)
npm run android            # android:all for all devices | ios (macOS only)

# Web (fe/web/) — cp .env.local.example .env.local (Mapbox token)
npm run dev                # http://localhost:${WEB_PORT:-3001}
```

Each workspace (`/`, `be/`, `fe/mobile/`, `fe/web/`) is **fully independent** — `npm install` in one never touches another. Token pipeline (from root): `npm run tokens:build` / `tokens:verify` / `test:tokens` — never hand-edit generated token files.

**Tests:** `npm test` (each workspace), `npm run test:cov` (backend, >80% required), `npm run test:e2e` (web).
**Test users:** `12345678` for all seeded accounts — e.g. `satgas1/12345678`, `admin_system_1/12345678`. Phone login also works (e.g. `081200000006/12345678`). **Exception:** the `superadmin` account uses `SEED_SUPERADMIN_PASSWORD` (falls back to `12345678` locally when unset) and is seeded with **no forced password reset**.

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

## Env file convention (dotenvx — see `specs/deployment/encrypted-secrets.md`)
**`.env.local`** = local dev, plaintext + gitignored (no key needed). **`.env.staging`** / **`.env.production`** = deploys, committed **encrypted** with [dotenvx](https://dotenvx.com) (secrets are `encrypted:…` ciphertext). The one real secret is the per-file private key in **`.env.keys`** (gitignored, **never commit**; the pre-commit hook + `.gitignore` enforce this). Committed templates: `*.example`.
- **Loaders:** be `src/config/load-env.ts` → `dotenvx.config()` (decrypts at boot; plaintext `.env.local` passes through). web → `npm run build:staging|production` / `start:*` (= `dotenvx run -f .env.<env> -- next …`). mobile → `ENVFILE` in `babel.config.js` + `scripts/decrypt-env.js` (RN-dotenv can't decrypt, so build scripts decrypt to a temp `.env.runtime`).
- **Backend _production_ env = repo-root `./.env.production`** (drives `docker-compose.prod.yml`), NOT `be/.env.production`. `be/.env.staging` is baked into the staging image.
- **Private keys at deploy:** GitHub **Environment** secrets `BE_/WEB_DOTENV_PRIVATE_KEY` (staging + production envs); the AWS staging box reads `BE_` from SSM `/sekar/staging/BE_DOTENV_PRIVATE_KEY` via instance role. Storage names are `*_DOTENV_PRIVATE_KEY`; the runtime var dotenvx needs is `DOTENV_PRIVATE_KEY_<ENV>`.
- `./scripts/setup.sh` creates the `.env.local` files and reconciles `be/.env.local` `DATABASE_PORT` to `infra/.env` `POSTGRES_PORT`. Infra keeps plain `infra/.env` (Docker-Compose convention).

## Releasing & versioning (see `specs/deployment/ci-cd.md` §5)
- **Staging is continuous** — every green push to `main` auto-deploys (SHA-pinned). No tag needed.
- **Versioned releases via `scripts/release.sh`** (bump → tag → workflow): `release.sh server X.Y.Z` (be+web coupled, one shared semver → `sekar-v*` → ECR `:X.Y.Z` images + GitHub Release, no auto-deploy) · `release.sh mobile X.Y.Z <versionCode>` (→ `mobile-v*` → signed APK/AAB + auto-publish to the download registry).
- **Build identity** is surfaced for verification: backend `GET /health/live` → `{version,gitSha,builtAt}` (baked from `GIT_SHA`/`BUILD_TIME` Docker args); web sidebar footer `v… · <sha>`; mobile in-app checker (Profil → Diagnostik) compares its `versionCode` to `GET /app-releases/latest`. Bump `versionCode` per mobile release or the checker won't detect it.
- **Mobile download** for field workers: public `sekar.wahyutrip.com/android` (backed by the `app-releases` registry).

## Backend .env essentials
`DATABASE_*` (localhost:5432, postgres/postgres, sekar_db — note `infra/.env` may pin a non-default `POSTGRES_PORT`; `setup.sh` syncs it) · `JWT_SECRET`, `JWT_EXPIRATION=7d` · Dev S3 via **MinIO** (`AWS_ENDPOINT_URL=http://localhost:9000`, `AWS_S3_FORCE_PATH_STYLE=true`, creds = `MINIO_ROOT_USER`/`PASSWORD` from `infra/.env` = `minioadmin`/`minioadmin`, bucket `sekar-media-dev`); **staging** = real AWS S3 (no endpoint); **production** = MinIO in `docker-compose.prod.yml` · `FCM_ENABLED=false` until Firebase configured. Full config: `specs/deployment/credentials-setup.md`, mobile network `specs/deployment/local-development.md`.

## Key Resources

| Topic | Path |
|-------|------|
| Project status (source of truth) | `specs/COMPLETION_STATUS.md` |
| Phase tracking | `specs/phases/phase-*/STATUS.md` |
| API contracts (~218 endpoints, 33 modules) / errors | `specs/api/contracts.md` (live: Swagger `/api/v1/docs`) · `specs/api/error-handling.md` |
| Architecture + ADRs | `specs/architecture/` · `specs/architecture/decisions/` |
| Security + dependency audit | `specs/architecture/security.md` |
| Design tokens (source of truth) | `specs/ui-ux/design-tokens.md` · `tokens.json` |
| Web PWA | `specs/phases/phase-3-plants-monitoring-rebuild/web.md` §PWA |
| **Deployment (authoritative, start-to-finish)** | `specs/deployment/deployment-guide.md` (self-hosted Docker + AWS appendix) |
| iOS / Android release runbooks | `specs/deployment/ios-release-guide.md` · `android-release-guide.md` |
| Run locally / infra / WSL2 device net | `specs/deployment/local-development.md` |
| Obtaining keys (Firebase/Maps/Mapbox/S3) | `specs/deployment/credentials-setup.md` |
| Day-2 operations / rollback / incidents | `specs/deployment/operations.md` |
| Env var catalogue | `specs/deployment/environment-variables.md` |
| **Encrypted secrets (dotenvx) — commit encrypted .env, decrypt at runtime** | `specs/deployment/encrypted-secrets.md` |
| E2E testing | `specs/testing/web-testing.md` |
| Full navigation | `specs/README.md` |

## Troubleshooting
- Port 3000 in use: `lsof -ti:3000 | xargs kill -9`. Metro cache: `npm start -- --reset-cache`. Android build: `cd android && ./gradlew clean`.
- "Cannot find eslint-plugin-sekar-design" / "tokens:build not found" / Metro "Cannot resolve @react-native/metro-config": run `npm install` from project **root** to resync tooling + workspace list.
- Full guide: `specs/deployment/local-development.md`.
