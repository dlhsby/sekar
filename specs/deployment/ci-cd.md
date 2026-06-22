# CI/CD Pipeline

**Last Updated:** 2026-06-19

GitHub Actions for SEKAR. Auth is **GitHub OIDC** (no static AWS keys); secrets are
**dotenvx-encrypted** in git with per-environment private keys (see
[`encrypted-secrets.md`](./encrypted-secrets.md)). Staging runs on the shared AWS EC2/RDS;
production is on-prem Docker Compose (not yet deployed).

## 1. Active workflows

| Workflow (`.github/workflows/`) | Trigger | What it does |
|--------------------------------|---------|--------------|
| **`deploy-staging.yml`** | push `main` (see paths-ignore) + `workflow_dispatch` | **Gated on `quality-be` + `quality-web`** (lint/tsc/test) → build backend + web images (with `GIT_SHA`/`BUILD_TIME` build args) → ECR (OIDC) → deploy to EC2 via **SSM Run Command**. Web built with `dotenvx run` + BuildKit secret; backend bakes encrypted `be/.env.staging`. Pre-deploy RDS snapshot, SHA-pinned image assertion, smoke test. |
| **`release-server.yml`** | push tag `sekar-v*` | Versioned **be+web** release (coupled). Validates the tag matches both `package.json`, builds + pushes `:X.Y.Z` ECR images (web production-configured), creates a GitHub Release with notes. Does **not** deploy (on-prem promotion is manual). |
| **`backend-quality.yml`** | PR on `be/**` | ESLint + `tsc --noEmit` + Jest. |
| **`web-quality.yml`** | PR on `fe/web/**` | ESLint (incl. design-system rules) + `tsc --noEmit` + Jest. |
| **`mobile-quality.yml`** | push/PR `main`/`staging`/`develop` on `fe/mobile/**` (+ token files) | ESLint (incl. design-system rules) + `tsc --noEmit` + Jest. Provisions `.env.local` from the example. |
| **`mobile-release.yml`** | tag `mobile-v*` + `workflow_dispatch` (env=staging) | Build a **signed** release **APK + AAB** for staging, upload a 30-day artifact, and auto-publish to the download registry (S3 + `POST /app-releases`). Tag pushes validate the tag matches `package.json`. See [`android-release-guide.md` §F](./android-release-guide.md). |
| **`mobile-e2e.yml`** | `workflow_dispatch` | Maestro device flows. |
| **`web-e2e.yml`** | push `main` on `fe/web/**` + dispatch | Playwright E2E. ✅ green (capacity spec made date-independent 2026-06-19). |
| **`tokens-verify.yml`** | PR + push `main` on token files | Verifies generated design tokens are in sync with `tokens.json` (drift gate). |

`deploy-staging.yml` **`paths-ignore`** (so unrelated commits don't redeploy staging):
`**.md`, `specs/**`, `fe/mobile/**`, `.github/workflows/mobile-*.yml`, `.env.production`,
`docker-compose.prod.yml`. `workflow_dispatch` always runs regardless.

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
`APP_RELEASE_PUBLISH_TOKEN` in `be/.env.staging`. The `sekar-gha-deploy` OIDC role also has
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
validates the tag matches `fe/mobile/package.json`. Cut one with the helper:
```bash
scripts/release.sh mobile 0.1.0 2     # bumps package.json + versionName + versionCode(2), tags, pushes
```
Manual `workflow_dispatch` stays as a fallback.

## 4. Rollback

- **Staging app/web:** re-run `deploy-staging` via `workflow_dispatch` from an earlier commit, or
  re-tag the prior ECR image. Images are SHA-pinned; a pre-deploy RDS snapshot is taken each run.
- **Database:** restore the pre-deploy RDS snapshot. Full procedures: [`operations.md`](./operations.md).

## 5. Monorepo release strategy (3 components, 1 repo)

`be/`, `fe/web/`, `fe/mobile/` ship to **different targets at different cadences** — so they are
released **independently**, not lock-stepped into one version:

Two cadences, two tag lines (no single repo-wide version — the components don't move together):

| Component | Continuous (staging) | Versioned release | Versioning |
|-----------|----------------------|-------------------|------------|
| **Backend + Web** (coupled — web calls the API) | every green merge to `main` → `deploy-staging` (SHA-pinned) | **`sekar-vX.Y.Z`** tag → `release-server.yml` | one shared semver (`be/package.json` == `fe/web/package.json`) |
| **Mobile** | — (built on demand) | **`mobile-vX.Y.Z`** tag → `mobile-release.yml` (dispatch = fallback) | semver in `fe/mobile/package.json` + Android `versionCode` |

Principles:
1. **Path-filtered, independent CI** — `backend-quality` / `web-quality` / `mobile-quality` gate only
   their component; `deploy-staging`'s `paths-ignore` skips mobile/docs/prod-only commits.
2. **Staging stays continuous + SHA-pinned** — no tags needed; it's always the latest `main`.
3. **A semver tag = a named, promotable, documented release** (built from the tagged commit, with a
   GitHub Release + notes), separate from the continuous staging stream.
4. **Server be+web share one version** (they deploy as a pair). `sekar-vX.Y.Z` builds + ECR-tags
   **`:X.Y.Z`** images (web built **production-configured**) and cuts a GitHub Release. It does **not**
   auto-deploy — production (on-prem) is a deliberate promotion.
5. **Which build is live** is observable: backend `GET /health/live` returns `{version,gitSha,builtAt}`;
   web shows `v… · <sha>` in the sidebar footer (baked from `GIT_SHA`/`BUILD_TIME` build args).
6. Heavier automation (release-please / changesets) stays optional — adopt at higher cadence.

### Step-by-step

**Backend + Web → staging (continuous; no release step):** merge to `main` → `quality-be`+`quality-web`
gate → `deploy-staging` builds + deploys. Verify `curl .../health/live` (shows the SHA). Rollback:
re-run `deploy-staging` from an earlier SHA, or restore the pre-deploy RDS snapshot.

**Backend + Web → versioned release:**
```bash
scripts/release.sh server 0.1.0    # bumps be + fe/web package.json, commits, tags sekar-v0.1.0, pushes
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
