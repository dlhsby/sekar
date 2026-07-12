# CLAUDE.md

Guidance for Claude Code. Docs are **product/feature-organized** — nav hub `specs/README.md`; status SoT `specs/COMPLETION_STATUS.md`; history `git log` + `specs/history/CHANGELOG.md`.

## Working here
- Be brief. Use `specs/` for technical detail; **update existing docs, never create parallel ones**.
- **Keep specs in sync (MANDATE).** Any feature work must update, in the same PR:
  - `specs/features/<feature>/README.md` — its `## Changelog` tail (1 line, newest-first) + any changed decisions/links. A revamp fills the "Revamp notes" placeholder.
  - `specs/COMPLETION_STATUS.md` — only if status/metrics/live-URLs change.
  - New cross-cutting decision → add an ADR under `specs/architecture/decisions/` + a row in its `README.md` index. Parking/removing/promoting a feature → update `specs/features/_archived/`.
- **Dev flow:** feature branch → PR → `main` (PR-gated CI). Release = merge `main` → `staging` + approve. Commit `<type>: <desc>` (feat/fix/refactor/docs/test/chore/perf/ci). Branch first if on `main`.

## Project Overview

**SEKAR** (Sistem Evaluasi Kinerja Satgas RTH; "SEKAR" is retained as the brand acronym) — worker tracking + task management for DLH Surabaya parks dept. Real-time GPS, clock-in/out with photo verification, work reports with media, supervisor dashboards, 7 Rayon structure, shift scheduling, task workflow, push notifications.

**Stack:** Backend NestJS 11 / TS 5.9 / PostgreSQL / TypeORM / JWT / WebSocket / AWS S3 · Mobile React Native 0.83 / React 19 / Redux Toolkit / FCM / Neo Brutalism (WCAG 2.1 AA) · Web Next.js 16 / React 19 / Tailwind 4 / Google Maps / Playwright · Node >=24.13, npm >=10.

## Quick Start

```bash
# One-command flow (recommended) — run from project root
./scripts/setup.sh          # env files, all installs, infra, migrations (+ optional destructive seed)
./scripts/start.sh          # backend + web in background, Metro foreground; web is also LAN-reachable by default (same-origin proxy, safe for localhost — prints the phone URL). Flags: --no-mobile (skip Metro) · --local (localhost only) · [IP] (force advertised LAN IP)
./scripts/stop.sh           # stop services (--infra to also stop Docker)
# Single services: ./scripts/start-be.sh · start-web.sh · start-mobile.sh [--android]
# Ports: apps/be/.env.local PORT (default 3000) · apps/web/.env.local WEB_PORT (default 3001)
# infra only: ./scripts/infra.sh start  (Postgres · Adminer:8080 · MinIO:9000/9001 · Redis)
# mobile: cd apps/mobile && npm run android  (set API_BASE_URL=http://10.0.2.2:<BE_PORT> emu / http://<IP>:<BE_PORT> device)
```

Manual per-workspace setup, WSL2 device networking, ports: **`specs/deployment/local-development.md`**.
Each workspace (`/`, `apps/{be,mobile,web}/`) is **fully independent** — `npm install` in one never touches another. Token pipeline (root): `npm run tokens:build`/`tokens:verify`/`test:tokens` — never hand-edit generated token files.

**Tests:** `npm test` (each workspace), `npm run test:cov` (backend, >80% required), `npm run test:e2e` (web).
**Test users:** `12345678` for all seeded accounts — e.g. `satgas1/12345678`, `admin_system_1/12345678`. Phone login also works (e.g. `081200000006/12345678`). **Exception:** the `superadmin` account uses `SEED_SUPERADMIN_PASSWORD` (falls back to `12345678` locally when unset) and is seeded with **no forced password reset**.

## Role Values Convention

**CRITICAL: always lowercase, matching backend enum. Never Pascal case** (`'Worker'`, `'Admin'`).

8 roles (ADR-009): `satgas` (field worker), `linmas` (security), `korlap` (field coordinator), `admin_rayon`, `kepala_rayon`, `management`, `admin_system`, `superadmin`. **Removed:** `worker`, `supervisor`, `admin`, `koordinator_lapangan`.

Phase 3 additions (ADR-032/033): `staff_kecamatan` (external, non-clockable, submits pruning requests); `admin_rayon` (formerly `admin_data`) gains narrow `pruning_requests` disposition scoped by `users.rayon_id`.

**UAT revamp (ADR-044, in progress):** roles become **data-driven** (`roles`/`permissions`/`role_permissions`) with per-role `monitoring_scope` (`city|district|region|location|none`) + map marker; operators can create custom roles. Role **codes stay lowercase**; the UAT revamp **renamed two codes** (data migration, forced re-login): `top_management` → `management`, `admin_data` → `admin_rayon` (access equalized to `kepala_rayon`). Codes stay stable going forward (JWT + guards). Guards migrate `@Roles(...)` → `@RequirePermissions('resource:action')` (flat colon keys + wildcard) incrementally via a compat shim. **Only `satgas`+`linmas` are scheduled/understaffed**; other clock-in roles are monitorable but not counted. See `specs/features/access-control/README.md`.

## Terminology Convention (ADR-010)

Code uses English; Indonesian only for UI labels / user-facing messages. `Activity`/`/activities` = Aktivitas · `Schedule`/`/schedules` = Jadwal · `Overtime`/`/overtime` = Lembur. **Dropped:** `WorkerAssignment`, `OvertimeAktivitas`, `Report` entity, `/aktivitas`, `/worker-schedules`.

## Internationalization (i18n) — MANDATORY when touching the UI

Web + mobile are bilingual: **Indonesian (`id`, default) + English (`en`)** via `react-i18next`. **Whenever you add or change any user-facing UI string, you MUST localize it** — never hardcode a display string.

- **Never** hardcode a user-facing string (JSX text, `label`/`placeholder`/`title`/`aria-label`, toast/`Alert`/`NBToast` text, empty/error states, table headers, option labels, zod messages). Use `t('<namespace>:<key>')`.
- Add the key to **both** `id` and `en` JSON with identical key sets — web: `apps/web/src/lib/i18n/locales/{id,en}/<ns>.json`; mobile: `apps/mobile/src/i18n/locales/{id,en}/<ns>.json`. `id` = the Indonesian copy, `en` = a natural English translation.
- Reuse shared namespaces: `common` (actions/entities/empty), `status`, `roles`, `validation`, `errors`. **`errors` mirrors the backend `ApiErrorCode` enum** — the API stays **English-canonical**; frontends localize by error `code`. Canonical terms: `specs/design-system/GLOSSARY.md`.
- Components: `const { t } = useTranslation()`. Non-component modules/hooks: `import i18n from '<...>/i18n/config'` then `i18n.t(...)`. Zod schemas: build in-component via `useMemo(() => z.object(...), [t])`.
- New namespace? Register it in **both** platforms' `resources.ts` (the parity guardrail requires the same namespace set on both).
- **Verify before commit:** `npm run i18n:check` (root — enforces enum coverage + `id`/`en` parity), `npx tsc --noEmit`, and `npm run lint` (the ESLint rule `sekar-design/no-untranslated-literal` fails on any hardcoded user-facing string) in the changed workspace.

## Conventions
- Module pattern: controller → service → repository → entity → DTOs. Auth via `@UseGuards(JwtAuthGuard, RolesGuard)`, `@Roles(...)`, `@GetUser()`. Swagger `@Api*` decorators.
- Check ADRs in `specs/architecture/decisions/` before major changes. SOLID, concise TypeScript, descriptive names.
- Security: bcrypt (10 rounds), GPS validation (±100m), class-validator input validation, rate limiting (100 req/min global, 5 req/min login). Never commit secrets.
- Testing: >80% coverage, Arrange-Act-Assert, mock external deps.
- DB: dev TypeORM auto-sync; prod migrations; soft delete via `deleted_at`.
- **Deprecated:** the `supervisor` module is superseded by `monitoring` — don't extend it; use `monitoring`. **Parked** (built, hidden from web nav, revisit later): assets, analytics, reporting builder/schedules, import/export, seeds — see `specs/features/_archived/`.

## Env file convention (dotenvx — see `specs/deployment/encrypted-secrets.md`)
**`.env.local`** = local dev, plaintext + gitignored (no key needed). **`.env.staging`** / **`.env.production`** = deploys, committed **encrypted** with [dotenvx](https://dotenvx.com) (secrets are `encrypted:…` ciphertext). The one real secret is the per-file private key in **`.env.keys`** (gitignored, **never commit**; the pre-commit hook + `.gitignore` enforce this). Committed templates: `*.example`.
- **Loaders:** be `src/config/load-env.ts` → `dotenvx.config()` (decrypts at boot; plaintext `.env.local` passes through). web → `npm run build:staging|production` / `start:*` (= `dotenvx run -f .env.<env> -- next …`). mobile → `ENVFILE` in `babel.config.js` + `scripts/decrypt-env.js` (RN-dotenv can't decrypt, so build scripts decrypt to a temp `.env.runtime`).
- **Backend _production_ env = repo-root `./.env.production`** (drives `docker-compose.prod.yml`), NOT `apps/be/.env.production`. `apps/be/.env.staging` is baked into the staging image.
- **Private keys at deploy:** GitHub **Environment** secrets `BE_/WEB_DOTENV_PRIVATE_KEY` (staging + production envs); the AWS staging box reads `BE_` from SSM `/sekar/staging/BE_DOTENV_PRIVATE_KEY` via instance role. Storage names are `*_DOTENV_PRIVATE_KEY`; the runtime var dotenvx needs is `DOTENV_PRIVATE_KEY_<ENV>`.
- `./scripts/setup.sh` creates the `.env.local` files and reconciles `apps/be/.env.local` `DATABASE_PORT` to `infra/.env` `POSTGRES_PORT`. Infra keeps plain `infra/.env` (Docker-Compose convention).

## Releasing & versioning (see `specs/deployment/ci-cd.md` §5)
- **Staging deploys are deliberate** — `deploy-staging.yml` runs only on a push to the `staging` branch (i.e. merge `main` → `staging`) or a manual `workflow_dispatch`; **pushing/merging to `main` does NOT deploy** (keeps GitHub Actions minutes down, since the job builds 3 Docker images). SHA-pinned. No tag needed.
- **Versioned releases via `scripts/release.sh`** (bump → tag → workflow): `release.sh server X.Y.Z` (be+web coupled, one shared semver → `sekar-v*` → ECR `:X.Y.Z` images + GitHub Release, no auto-deploy) · `release.sh mobile X.Y.Z <versionCode>` (→ `mobile-v*` → signed APK/AAB + auto-publish to the download registry).
- **Build identity** is surfaced for verification: backend `GET /health/live` → `{version,gitSha,builtAt}` (baked from `GIT_SHA`/`BUILD_TIME` Docker args); web sidebar footer `v… · <sha>`; mobile in-app checker (Profil → Diagnostik) compares its `versionCode` to `GET /app-releases/latest`. Bump `versionCode` per mobile release or the checker won't detect it.
- **Mobile download** for field workers: public `sekar.wahyutrip.com/android` (backed by the `app-releases` registry).

## Backend .env essentials
`DATABASE_*` (localhost:5432, postgres/postgres, sekar_db — note `infra/.env` may pin a non-default `POSTGRES_PORT`; `setup.sh` syncs it) · `JWT_SECRET`, `JWT_EXPIRATION=7d` · Dev S3 via **MinIO** (`AWS_ENDPOINT_URL=http://localhost:9000`, `AWS_S3_FORCE_PATH_STYLE=true`, creds = `MINIO_ROOT_USER`/`PASSWORD` from `infra/.env` = `minioadmin`/`minioadmin`, bucket `sekar-media-dev`); **staging** = real AWS S3 (no endpoint); **production** = MinIO in `docker-compose.prod.yml` · `FCM_ENABLED=false` until Firebase configured. Full config: `specs/deployment/credentials-setup.md`, mobile network `specs/deployment/local-development.md`.

## Key Resources

Full navigation is **[`specs/README.md`](specs/README.md)**; specs are organized by **feature**
([`specs/features/`](specs/features/README.md)) and concern. The most-used entries:

| Topic | Path |
|-------|------|
| Project status (source of truth) | `specs/COMPLETION_STATUS.md` · history: `specs/history/CHANGELOG.md` |
| Feature specs (product model) | `specs/features/` (auth, scheduling, monitoring, pruning, …) |
| API contracts (~246 handlers, 34 modules) / errors | `specs/api/contracts.md` (live Swagger `/api/v1/docs`) · `specs/api/error-handling.md` |
| Architecture + ADRs (index) | `specs/architecture/` · `specs/architecture/decisions/README.md` |
| Design system + tokens (SoT) | `specs/design-system/` · `specs/design-system/design-tokens.md` · `tokens.json` |
| **i18n (id/en) + glossary** | `specs/design-system/i18n.md` · `specs/design-system/GLOSSARY.md` · locales `apps/{web,mobile}/src/**/i18n/locales` · `npm run i18n:check` |
| Web / mobile platform specs | `specs/platforms/web/` · `specs/platforms/mobile/` |
| **Deployment (from scratch)** | `specs/deployment/README.md` (guide + infra, CI/CD, secrets, operations, releases) |
| Testing | `specs/testing/` |

## Troubleshooting
- Port 3000 in use: `lsof -ti:3000 | xargs kill -9`. Metro cache: `npm start -- --reset-cache`. Android build: `cd android && ./gradlew clean`.
- "Cannot find eslint-plugin-sekar-design" / "tokens:build not found" / Metro "Cannot resolve @react-native/metro-config": run `npm install` from project **root** to resync tooling + workspace list.
- Full guide: `specs/deployment/local-development.md`.
