# CI/CD Pipeline

**Last Updated:** 2026-06-25

GitHub Actions for SEKAR. Auth is **GitHub OIDC** (no static AWS keys); secrets are
**dotenvx-encrypted** in git with per-environment private keys (see
[`encrypted-secrets.md`](./encrypted-secrets.md)). Staging runs on the **dlhsby** AWS EC2/RDS
box (SEKAR is the **sole tenant** since project KPI was decommissioned, 2026-06); production is
on-prem Docker Compose (not yet deployed).

## 0. Release model & Actions cost (read this first)

Deploys are **deliberate, not every-push** — the staging deploy builds 3 Docker images, so it
runs only on an actual release. This keeps GitHub Actions within the free-tier minutes:

- **Push to `main` does NOT deploy.** `main` is the integration branch; PRs into it run the
  path-filtered quality gates (and superseded runs auto-cancel).
- **Release to staging** by either:
  - opening a PR from **`main` into `staging`** and merging it (rebase/squash — linear history), or
  - running **`deploy-staging`** manually from the Actions tab (`workflow_dispatch`).
- Both the **`staging`** and **`production`** GitHub Environments require a **single manual
  approval** (reviewer: repo owner) before anything is built/deployed — a confirmation on top of the
  deliberate trigger. For staging it gates at the **`build-push`** job (the `deploy` job is
  intentionally not environment-scoped, so a release is approved **once**, not twice). Approve from
  the run page or `gh run` / the Environments UI.

**Day-to-day:** feature branch → PR → `main` (quality gates) → when `main` is UAT-ready,
open a PR `main → staging` and merge it → approve → it builds + deploys. **No direct commits to
either branch — everything is a feature branch → PR.**

**Branch protection** — enforced via a **repository ruleset** (`protected-branches (main + staging)`),
not classic branch protection. The same ruleset is on `dlhsby/sekar` and `dlhsby/swat`, targeting
`refs/heads/main` + `refs/heads/staging`, enforcement **active** (available while public / on a paid
plan; inactive on the Free **private** plan until restored). Rules:
- **PR required** (0 approvals — you can merge your own) + the **`gate`** status check must pass
  (`gate` is the `pr-gate` aggregator — see §1: always runs, runs only the changed components' suites,
  **deadlock-proof** for path-filtered checks).
- **Linear history** (rebase/squash from `main`), **no force-push** (`non_fast_forward`),
  **no deletion**, conversation-resolution required.
- A `staging` release is a **PR `main → staging`** — **no direct commits** to either branch.

> **Break-glass = an auditable bypass, not a toggle.** The ruleset's **bypass actor is the Repository
> admin role** (`bypass_mode: always`), so an admin *can* push/merge past the rules in a genuine
> emergency — and **every bypass is recorded** under **Settings → Rules → Rule Insights** (who/when).
> No disabling of protection needed; just bypass, and it's logged. Day-to-day still goes through PRs.

**Repo visibility:** the repo is currently **public** (temporary) so Actions uses the unlimited
free-tier minutes while a GitHub **billing** issue on the `dlhsby` org is resolved; it reverts to
**private** next billing cycle. This is safe — every committed `.env.*` is dotenvx-**encrypted**
and the decrypting `.env.keys` are **never committed** (see [`encrypted-secrets.md`](./encrypted-secrets.md)).

## 1. Active workflows

| Workflow (`.github/workflows/`) | Trigger | What it does |
|--------------------------------|---------|--------------|
| **`deploy-staging.yml`** | push `staging` branch + `workflow_dispatch` · **`staging` env approval-gated** | **Gated on `quality-be` + `quality-web`** (lint/tsc/test) → build backend + web + docs images (with `GIT_SHA`/`BUILD_TIME` build args) → ECR (OIDC) → deploy to EC2 via **SSM Run Command** (also recreates `sekar-caddy`). Web built with `dotenvx run` + BuildKit secret; backend bakes encrypted `apps/be/.env.staging`. Pre-deploy RDS snapshot, SHA-pinned image assertion, smoke test. |
| **`pr-gate.yml`** | **PR** to `main`/`staging`/`develop` (always runs) | **The single REQUIRED merge check (`gate`).** Detects changed components (`dorny/paths-filter`) → runs only the relevant reusable suites below → the `gate` job aggregates (unchanged components are `skipped` = pass; any failed suite = red). Deadlock-proof replacement for path-filtered required checks. |
| **`release-server.yml`** | push tag `sekar-v*` | Versioned **be+web** release (coupled). Validates the tag matches both `package.json`, builds + pushes `:X.Y.Z` ECR images (web production-configured), creates a GitHub Release with notes. Does **not** deploy (on-prem promotion is manual). |
| **`backend-quality.yml`** | **reusable** (`workflow_call`) | ESLint + `tsc --noEmit` + Jest. Called by `pr-gate` (when `apps/be/**` changes) and by `deploy-staging` (release gate). |
| **`web-quality.yml`** | **reusable** (`workflow_call`) | ESLint (incl. design-system rules) + `tsc --noEmit` + Jest. Called by `pr-gate` (when `apps/web/**` changes) and by `deploy-staging`. |
| **`mobile-quality.yml`** | **reusable** (`workflow_call`) | ESLint (incl. design-system rules) + `tsc --noEmit` + Jest. Called by `pr-gate` when `apps/mobile/**` (or design tokens) change. Provisions `.env.local` from the example. |
| **`mobile-release.yml`** | tag `mobile-v*` + `workflow_dispatch` (env=staging) | Build a **signed** release **APK + AAB** for staging, upload a 30-day artifact, and auto-publish to the download registry (S3 + `POST /app-releases`). Tag pushes validate the tag matches `package.json`. See [`android-release-guide.md` §F](./android-release-guide.md). |
| **`mobile-e2e.yml`** | `workflow_dispatch` | Maestro device flows. |
| **`web-e2e.yml`** | **`workflow_dispatch`** (manual-only) | Playwright E2E. Manual-only — it installs a browser and is the heaviest job; run before a release or locally (`npm run test:e2e`). |
| **`tokens-verify.yml`** | PR + push `main` on token files | Verifies generated design tokens are in sync with `tokens.json` (drift gate). |

**Why these triggers:** the staging deploy is the only minute-heavy job (3 image builds), so it
runs **only on an explicit release** (push to `staging` / manual), never on a `main` push — see
[§0](#0-release-model--actions-cost-read-this-first). The quality gates run on **PRs** (path-filtered,
`cancel-in-progress`), and the deploy re-runs `quality-be`/`quality-web` as a final gate on the
release commit.

### Disabled (legacy — superseded, kept for reference)
`backend-ci-cd.yml.disabled`, `mobile-ci-cd.yml.disabled`, `web-ci-cd.yml.disabled` — the old
Elastic Beanstalk / SSH pipeline on the **expired** AWS account (static keys, EB blue-green).
Replaced by the OIDC + SSM + dotenvx model above. Safe to delete.

## 2. Secrets & variables

Full detail + rationale in [`encrypted-secrets.md`](./encrypted-secrets.md). Summary:

**GitHub Environment secrets** (a job selects the set via `environment:`):
- `staging`: `BE_DOTENV_PRIVATE_KEY`, `WEB_DOTENV_PRIVATE_KEY`, `MOBILE_DOTENV_PRIVATE_KEY`, `GOOGLE_SERVICES_JSON_STAGING`, `APP_RELEASE_PUBLISH_TOKEN`
- `production`: `BE_DOTENV_PRIVATE_KEY`, `WEB_DOTENV_PRIVATE_KEY`

`APP_RELEASE_PUBLISH_TOKEN` authorizes `mobile-release.yml` to register a build in the backend
release registry (`POST /app-releases`, `X-Publish-Token`); it must equal the encrypted
`APP_RELEASE_PUBLISH_TOKEN` in `apps/be/.env.staging`. The `sekar-gha-deploy` OIDC role also has
`s3:PutObject` on `sekar-media-staging/app-releases/*` so the workflow can upload the APK.

**Repo-level secrets:** `ANDROID_KEYSTORE_BASE64`, `ANDROID_KEYSTORE_PASSWORD`, `ANDROID_KEY_ALIAS`,
`ANDROID_KEY_PASSWORD` (+ legacy `ANDROID_SIGNING_KEY`).

**Repo variables:** `AWS_REGION`, `AWS_ROLE_ARN`, `ECR_BACKEND`, `ECR_WEB`, `EC2_INSTANCE_ID`,
`RDS_INSTANCE_ID`.

The backend's **staging** key also lives in SSM (`/sekar/staging/BE_DOTENV_PRIVATE_KEY`) — the live
source the AWS box reads via its instance role; the GitHub `staging` copy is parity.

## 3. Releasing the mobile app

**Manual (current):**
```bash
# UI: Actions → "Mobile Release (Android · staging)" → Run workflow → staging
gh workflow run "Mobile Release (Android · staging)" --ref main -f environment=staging
gh run download <run-id> -D ~/sekar-release   # signed app-release.apk + app-release.aab
```
Build time: ~30 min cold, ~10–15 min on a `.cxx` cache hit (the build caches Gradle deps + the
native CMake build and skips `clean` in CI).

**Auto-publish to the download registry.** After the signed build, `mobile-release.yml` uploads
the APK to `s3://sekar-media-staging/app-releases/android/…` and registers it via
`POST /app-releases` (publish token). That powers the dynamic, always-current download links on
web — the public **`sekar.wahyutrip.com/android`** page, the login-page button, and the dashboard
user-menu item, all showing the live version. The step skips gracefully (build still succeeds) if
`APP_RELEASE_PUBLISH_TOKEN` / `AWS_ROLE_ARN` aren't set. See the backend `app-releases` module:
`GET /app-releases/latest` (metadata) + `GET /app-releases/latest/download` (302 → presigned S3).

After the ARM publish the workflow also rebuilds the APK with `reactNativeArchitectures=x86_64`
and registers it as **`platform=android_x86`** (`s3://…/app-releases/android-x86/…`), served at the
separate **`sekar.wahyutrip.com/android_x86`** page — for emulators / WSA / PC only; real phones use
the ARM `/android` build. So one release run publishes two APKs.

**Tag-driven (implemented).** `mobile-release.yml` also triggers on a **`mobile-v*`** tag and
validates the tag matches `apps/mobile/package.json`. Cut one with the helper:
```bash
scripts/release.sh mobile 0.1.0 2     # bumps package.json + versionName + versionCode(2), tags, pushes
```
Manual `workflow_dispatch` stays as a fallback.

## 4. Rollback

- **Staging app/web:** re-run `deploy-staging` via `workflow_dispatch` from an earlier commit, or
  re-tag the prior ECR image. Images are SHA-pinned; a pre-deploy RDS snapshot is taken each run.
- **Database:** restore the pre-deploy RDS snapshot. Full procedures: [`operations.md`](./operations.md).

## 5. Monorepo release strategy (3 components, 1 repo)

`apps/be/`, `apps/web/`, `apps/mobile/` ship to **different targets at different cadences** — so they are
released **independently**, not lock-stepped into one version:

Two cadences, two tag lines (no single repo-wide version — the components don't move together):

| Component | Continuous (staging) | Versioned release | Versioning |
|-----------|----------------------|-------------------|------------|
| **Backend + Web** (coupled — web calls the API) | release to `staging` branch (or manual) → `deploy-staging` (SHA-pinned, approval-gated) | **`sekar-vX.Y.Z`** tag → `release-server.yml` | one shared semver (`apps/be/package.json` == `apps/web/package.json`) |
| **Mobile** | — (built on demand) | **`mobile-vX.Y.Z`** tag → `mobile-release.yml` (dispatch = fallback) | semver in `apps/mobile/package.json` + Android `versionCode` |

Principles:
1. **Path-filtered, independent CI** — `backend-quality` / `web-quality` / `mobile-quality` gate only
   their component on PRs; the staging deploy runs only on a `staging`-branch release / manual dispatch.
2. **Staging is released deliberately + SHA-pinned** — push `main → staging` (or dispatch) to deploy;
   the deployed SHA is whatever `staging` points at. (Previously every `main` push auto-deployed; that
   was changed to conserve Actions minutes — see [§0](#0-release-model--actions-cost-read-this-first).)
3. **A semver tag = a named, promotable, documented release** (built from the tagged commit, with a
   GitHub Release + notes), separate from the continuous staging stream.
4. **Server be+web share one version** (they deploy as a pair). `sekar-vX.Y.Z` builds + ECR-tags
   **`:X.Y.Z`** images (web built **production-configured**) and cuts a GitHub Release. It does **not**
   auto-deploy — production (on-prem) is a deliberate promotion.
5. **Which build is live** is observable: backend `GET /health/live` returns `{version,gitSha,builtAt}`;
   web shows `v… · <sha>` in the sidebar footer (baked from `GIT_SHA`/`BUILD_TIME` build args).
6. Heavier automation (release-please / changesets) stays optional — adopt at higher cadence.

### Step-by-step

**Backend + Web → staging (deliberate release):** open a PR `main → staging` and merge it (or run
`deploy-staging` via `workflow_dispatch`) → **approve** the `staging` environment → `quality-be`+
`quality-web` gate → `deploy-staging` builds + deploys. Verify `curl .../health/live` (shows the SHA).
Rollback: re-run `deploy-staging` from an earlier SHA, or restore the pre-deploy RDS snapshot.

```bash
gh pr create --base staging --head main --title "release: staging" --fill
gh pr merge --rebase --auto    # linear history; auto-merges when `gate` is green — then approve the run
```

**Backend + Web → versioned release:**
```bash
scripts/release.sh server 0.1.0    # bumps be + apps/web package.json, commits, tags sekar-v0.1.0, pushes
```
`release-server.yml` then validates the versions match, builds + pushes `:0.1.0` images to ECR
(web = production-configured), and creates the GitHub Release. **Promote to on-prem prod** (when the
box is ready): `git checkout sekar-v0.1.0` → `dotenvx run -f .env.production -- docker compose -f
docker-compose.prod.yml up -d --build` → `migration:run:prod` (or pull the `:0.1.0` images if the box
has ECR access).

**Mobile app → versioned release:**
```bash
scripts/release.sh mobile 0.1.0 2  # bumps package.json + versionName + versionCode(2), tags mobile-v0.1.0, pushes
```
`mobile-release.yml` builds the signed APK/AAB and auto-publishes to the download registry (§3) —
the web download links + the in-app checker pick it up automatically.

## 6. Known gaps

- **Production CI** is not wired (on-prem deploy is currently manual via
  `dotenvx run -f .env.production -- docker compose -f docker-compose.prod.yml up`).
- (Resolved 2026-06-19) `web-e2e` was red because `17-capacity.spec.ts` asserted hardcoded ISO
  weeks (`W24`/`W25`) that fell out of the rolling 12-week window as the date advanced; the mock
  data + assertions now derive from `getRolling12WeekWindow()`, and the edit test was hardened
  against a render race.
- Backend/web unit tests now gate the staging deploy (`quality-be`/`quality-web` in
  `deploy-staging.yml`) and PRs (`backend-quality`/`web-quality`) — previously ungated.
