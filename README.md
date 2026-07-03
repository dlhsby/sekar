# SEKAR — Sistem Evaluasi Kinerja Satgas RTH

**Worker tracking & task management for DLH Surabaya** (the municipal parks & green-spaces department).
Field workers (satgas) are tracked by GPS and clock in with a selfie; supervisors assign tasks and
watch a live map; everyone works against one set of data across a mobile app and a web dashboard.

This is the **monorepo** for all three components. New here? Read this file top-to-bottom — it covers
the project, local setup, contributing, deploying, and releasing, and links to the deep-dive specs.

---

## 🚀 Release runbook (TL;DR)

> Everything goes through a **feature branch → PR**. Both `main` and `staging` are PR-only
> (no direct commits). Pushing to `main` does **not** deploy; staging deploys are **deliberate** + **approval-gated**.

**Deploy current `main` to staging (AWS UAT)** — open a PR from `main` into `staging` and merge it:
```bash
gh pr create --base staging --head main --title "release: staging" --fill
gh pr merge --rebase --auto    # linear history → rebase/squash, not a merge commit; auto-merges when `gate` is green
```
Then **approve**: Actions → the *Deploy staging (AWS)* run → **Review deployments → Approve**.
(UI alt: open the PR `base=staging ← head=main` on GitHub and merge; or Actions → *Deploy staging (AWS)* → **Run workflow** → approve.)
CI then: quality gate → build 3 images → ECR → RDS snapshot → migrate → `up --wait` → smoke test.
**Verify:** `curl https://api.sekar.wahyutrip.com/api/v1/health/live` shows the new `gitSha`.

**Cut a versioned release** (named, documented; not auto-deployed to prod):
```bash
scripts/release.sh server 0.1.0     # be+web → tag sekar-v0.1.0 → :0.1.0 images + GitHub Release (approve production)
scripts/release.sh mobile 0.1.0 2   # mobile → tag mobile-v0.1.0 → signed APK/AAB, auto-published to the download page
```

| | Automated (CI) | You do |
|--|----------------|--------|
| **PR → `main`** | quality gates (lint/tsc/tests, path-filtered) | open/merge the PR |
| **Deploy staging** | build + ECR + snapshot + migrate + deploy + smoke | PR `main → staging` + merge (or dispatch) → **approve** |
| **Versioned release** | build `:X.Y.Z` images + GitHub Release / signed APK | run `release.sh`, approve `production` |
| **Prod (on-prem)** | — | manual promotion of a `sekar-v*` tag |
| **E2E** (`web-e2e`/`mobile-e2e`) | — | run manually when needed |

Full details: [`specs/deployment/ci-cd.md`](specs/deployment/ci-cd.md) · [`deployment-guide.md`](specs/deployment/deployment-guide.md).

---

## What's inside

| Path | Component | Stack |
|------|-----------|-------|
| **`be/`** | Backend API | NestJS 11 · TypeScript · PostgreSQL · TypeORM · JWT · WebSocket · Redis · S3 |
| **`fe/web/`** | Web dashboard (supervisors/admins) | Next.js 16 · React 19 · Tailwind 4 · Google Maps · Playwright |
| **`fe/mobile/`** | Mobile app (field workers) | React Native 0.83 · React 19 · Redux Toolkit · FCM · Neo Brutalism (WCAG 2.1 AA) |
| **`infra/`** | Local Docker infra | PostgreSQL · MinIO (S3) · Redis · Adminer |
| **`specs/`** | All documentation | Architecture, ADRs, API contracts, deployment, UI/UX |
| **`scripts/`** | Dev + release scripts | `setup` · `start` · `stop` · `release` |

Each workspace (`/`, `be/`, `fe/web/`, `fe/mobile/`) is **fully independent** — `npm install` in one
never touches another. The repo root holds only cross-workspace tooling (design-token pipeline +
ESLint plugin).

**Core features:** real-time GPS + geofence monitoring · selfie clock-in/out · photo/video work
reports (offline-capable) · task assignment & workflow · 7-Rayon structure with 8-role RBAC (+
`staff_kecamatan` external role) · plant/pruning management · FCM push · shift scheduling · assets,
reporting & analytics. Requirements: **Node ≥ 24.13**, **npm ≥ 10**, Docker.

---

## Quick start (local dev)

```bash
# From the repo root — one-command setup + run:
npm install            # once per checkout: cross-workspace tooling (token pipeline, ESLint plugin)
./scripts/setup.sh     # creates .env.local files, installs all workspaces, starts infra, runs migrations (+ optional seed)
./scripts/start.sh     # backend + web in the background, Metro in the foreground (--no-mobile to skip)
./scripts/stop.sh      # stop services (--infra to also stop Docker)
```

Then open:

| Service | URL |
|---------|-----|
| Web dashboard | http://localhost:3001 |
| Backend API | http://localhost:3000/api/v1 |
| API docs (Swagger) | http://localhost:3000/api/v1/docs |
| Adminer (DB UI) | http://localhost:8080 |

**Log in** with any seeded user — all passwords are `Password123!` (e.g. `admin`, `satgas1`; phone
login works too, e.g. `081200000006`). Full list: [`be/src/database/seeds/README.md`](be/src/database/seeds/README.md).

**Two values you must fill** — `setup.sh` creates the files; edit these **before `start.sh`** (or
restart the affected service after). Everything else defaults to local infra:

| Workspace | Variable | Where to get it |
|-----------|----------|-----------------|
| `fe/web/.env.local` | `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` | <https://console.cloud.google.com/google/maps-apis> (the map is blank without it) |
| `fe/mobile/.env.local` | `API_BASE_URL` | `http://10.0.2.2:3000` (Android emulator) or `http://<YOUR_LAN_IP>:3000` (physical device) |

Single services: `./scripts/start-be.sh` · `start-web.sh` · `start-mobile.sh [--android]`. Ports are
per-workspace — `be/.env.local` `PORT` (3000), `fe/web/.env.local` `WEB_PORT` (3001) — change them if
they collide. More detail (infra, MinIO, WSL2 device networking, troubleshooting):
[`specs/deployment/local-development.md`](specs/deployment/local-development.md).

---

## Developing & contributing

**Conventions** (enforced by review + CI — see [`CLAUDE.md`](CLAUDE.md) for the full set):
- **Role values are always lowercase**, matching the backend enum: `satgas`, `linmas`, `korlap`,
  `admin_data`, `kepala_rayon`, `top_management`, `admin_system`, `superadmin`, `staff_kecamatan`
  (ADR-009/032). Never PascalCase.
- **Code is English; Indonesian only for UI labels / user messages** (ADR-010).
- **i18n every UI string (MANDATORY):** web + mobile are bilingual (**Indonesian default + English**)
  via `react-i18next`. Whenever you touch the UI, localize with `t('<ns>:<key>')` and add the key to
  BOTH `id`/`en` JSON (web `fe/web/src/lib/i18n/locales`, mobile `fe/mobile/src/i18n/locales`). The API
  stays **English-canonical**; frontends localize by error `code`. Canonical terms:
  [`specs/ui-ux/GLOSSARY.md`](specs/ui-ux/GLOSSARY.md). Verify with `npm run i18n:check`. Full rules in
  [`CLAUDE.md`](CLAUDE.md) §Internationalization.
- **Commits:** `<type>: <description>` — `feat`/`fix`/`refactor`/`docs`/`test`/`chore`/`perf`/`ci`.
- Check the **ADRs** in [`specs/architecture/decisions/`](specs/architecture/decisions/) before major changes.
- Backend module pattern: controller → service → repository → entity → DTOs, guarded with
  `@UseGuards(JwtAuthGuard, RolesGuard)` + `@Roles(...)`.

**Design tokens** are single-source-of-truth across mobile + web. Edit
[`specs/ui-ux/tokens.json`](specs/ui-ux/tokens.json) → `npm run tokens:build` (from root) → commit the
regenerated files. **Never** hand-edit `generated/tokens.*` or use inline hex literals (an ESLint rule
blocks PRs). Verify with `npm run tokens:verify`.

**Tests** (TDD; ≥ 80% backend coverage):
```bash
cd be       && npm run test:cov     # Jest unit/integration + coverage gate
cd fe/web   && npm test             # Jest unit;  npm run test:e2e → Playwright
cd fe/mobile && npm test            # Jest unit
npm run test:tokens                 # (root) design-token generator + lint rules
```

**Quality gates** run on **PRs** (path-filtered; superseded runs auto-cancel): lint + `tsc --noEmit` +
tests per component (`backend-quality` · `web-quality` · `mobile-quality`) and design-token drift
(`tokens-verify`); Playwright (`web-e2e`) is **manual**. **Pushing to `main` does not deploy** — staging
deploys are deliberate (push the `staging` branch or run `deploy-staging` manually, then approve) and
re-run the backend + web suites as a final gate. See [`specs/deployment/ci-cd.md`](specs/deployment/ci-cd.md).

**Environment files** use [dotenvx](https://dotenvx.com): `.env.local` is your plaintext, gitignored
dev file; the deploy files `.env.staging` / `.env.production` are committed **encrypted** (every secret
is `encrypted:…`), and the only real secret — the per-file private key in `.env.keys` — is **never
committed**. Templates are `*.example`. Full model: [`specs/deployment/encrypted-secrets.md`](specs/deployment/encrypted-secrets.md).

---

## Deploying

Two targets, same application images, detailed start-to-finish in the **authoritative guide,
[`specs/deployment/deployment-guide.md`](specs/deployment/deployment-guide.md)**:

| | **Staging / UAT** | **Production** |
|--|-------------------|----------------|
| Where | **AWS** — the **dlhsby** `t3.micro` (SEKAR sole tenant since KPI was decommissioned), behind SEKAR's Caddy | **On-prem** (pemkot) server, platform-agnostic Docker Compose |
| How | **Deliberate release:** push `main → staging` (or run [`deploy-staging.yml`](.github/workflows/deploy-staging.yml) manually) → **approve** → OIDC → ECR → SSM. A `main` push does **not** deploy. | **Manual** promotion of a tagged release (`docker-compose.prod.yml`); **not yet deployed** |
| URLs | https://api.sekar.wahyutrip.com · https://sekar.wahyutrip.com (TLS via Caddy) | TBD |
| Object storage | AWS S3 (instance role) | MinIO (in-stack) |

**Staging tooling:** Swagger `…/api/v1/docs` · Adminer `https://adminer.wahyutrip.com` (HTTP basic-auth) ·
error tracking wired (Sentry, dormant until a DSN is set).

---

## Releasing

Staging is released **deliberately** — open a PR from `main` into `staging` and merge it (or run
`deploy-staging` manually), then **approve** the run; the deployed build is pinned by git SHA. For
**named, versioned releases**, bump → tag → a workflow builds and publishes. Use the helper:

```bash
scripts/release.sh server 0.1.0      # backend + web (coupled) → tag sekar-v0.1.0
scripts/release.sh mobile 0.1.0 2    # mobile app → tag mobile-v0.1.0 (2 = Android versionCode)
```

| Release | Tag | What the workflow does |
|---------|-----|------------------------|
| **Server** (be + web, one shared version) | `sekar-v*` | Validates the tag matches both `package.json`, builds + pushes `:X.Y.Z` ECR images, cuts a GitHub Release. Does **not** auto-deploy — production is a manual promotion. |
| **Mobile** | `mobile-v*` | Builds the signed **APK + AAB** and **auto-publishes** to the download registry (the web download links + the in-app update checker update themselves). |

**Which build is live** is always visible: backend `GET /api/v1/health/live` returns
`{version, gitSha, builtAt}`; the web shows `v… · <sha>` in the sidebar footer; the mobile app checks
its version against the registry (Profil → Diagnostik). Field workers install the app from
**`sekar.wahyutrip.com/android`** (ARM phones); an **`/android_x86`** page serves the x86_64 build for
emulators / WSA / PC. Full runbook + rollback: [`specs/deployment/ci-cd.md`](specs/deployment/ci-cd.md) §5
and [`specs/deployment/android-release-guide.md`](specs/deployment/android-release-guide.md).

---

## Status & documentation

Current status, metrics, and history live in **[`specs/COMPLETION_STATUS.md`](specs/COMPLETION_STATUS.md)**
(the single source of truth) — not duplicated here.

| Topic | Doc |
|-------|-----|
| Project guide for contributors + Claude Code | [`CLAUDE.md`](CLAUDE.md) |
| All specs (navigation hub) | [`specs/README.md`](specs/README.md) |
| Architecture + ADRs | [`specs/architecture/`](specs/architecture/) · [`decisions/`](specs/architecture/decisions/) |
| API contracts (~218 endpoints, 33 modules) | [`specs/api/contracts.md`](specs/api/contracts.md) · live: Swagger `/api/v1/docs` |
| **Deploy from scratch** (local → staging → prod) | [`specs/deployment/deployment-guide.md`](specs/deployment/deployment-guide.md) |
| CI/CD + release strategy | [`specs/deployment/ci-cd.md`](specs/deployment/ci-cd.md) |
| Obtaining keys (Firebase/Maps/S3) | [`specs/deployment/credentials-setup.md`](specs/deployment/credentials-setup.md) |
| Encrypted secrets (dotenvx) | [`specs/deployment/encrypted-secrets.md`](specs/deployment/encrypted-secrets.md) |
| Design tokens (source of truth) | [`specs/ui-ux/design-tokens.md`](specs/ui-ux/design-tokens.md) · [`tokens.json`](specs/ui-ux/tokens.json) |
| Database seeding | [`be/src/database/seeds/README.md`](be/src/database/seeds/README.md) |

---

## License

UNLICENSED — proprietary project for DLH Surabaya.
