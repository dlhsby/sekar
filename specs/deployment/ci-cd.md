# CI/CD Pipeline

**Last Updated:** 2026-06-19

GitHub Actions for SEKAR. Auth is **GitHub OIDC** (no static AWS keys); secrets are
**dotenvx-encrypted** in git with per-environment private keys (see
[`encrypted-secrets.md`](./encrypted-secrets.md)). Staging runs on the shared AWS EC2/RDS;
production is on-prem Docker Compose (not yet deployed).

## 1. Active workflows

| Workflow (`.github/workflows/`) | Trigger | What it does |
|--------------------------------|---------|--------------|
| **`deploy-staging.yml`** | push `main` (see paths-ignore) + `workflow_dispatch` | **Gated on `quality-be` + `quality-web`** (lint/tsc/test) → build backend + web images → ECR (OIDC) → deploy to EC2 via **SSM Run Command**. Web built with `dotenvx run` + BuildKit secret; backend bakes encrypted `be/.env.staging`. Pre-deploy RDS snapshot, SHA-pinned image assertion, smoke test. |
| **`backend-quality.yml`** | PR on `be/**` | ESLint + `tsc --noEmit` + Jest. |
| **`web-quality.yml`** | PR on `fe/web/**` | ESLint (incl. design-system rules) + `tsc --noEmit` + Jest. |
| **`mobile-quality.yml`** | push/PR `main`/`staging`/`develop` on `fe/mobile/**` (+ token files) | ESLint (incl. design-system rules) + `tsc --noEmit` + Jest. Provisions `.env.local` from the example. |
| **`mobile-release.yml`** | `workflow_dispatch` (env=staging) | Build a **signed** release **APK + AAB** for staging, upload as a 30-day artifact. See [`android-release-guide.md` §F](./android-release-guide.md). |
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
- `staging`: `BE_DOTENV_PRIVATE_KEY`, `WEB_DOTENV_PRIVATE_KEY`, `MOBILE_DOTENV_PRIVATE_KEY`, `GOOGLE_SERVICES_JSON_STAGING`
- `production`: `BE_DOTENV_PRIVATE_KEY`, `WEB_DOTENV_PRIVATE_KEY`

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

**Automation options (none implemented):**
- **Keep manual dispatch** — recommended for UAT; you control timing.
- **Git tag** — `on: push: tags: ['v*']`; cut a release with `git tag v1.0.0 && git push --tags`.
- **GitHub Release** — `on: release: types: [published]`; create a Release in the UI and attach the APK.

## 4. Rollback

- **Staging app/web:** re-run `deploy-staging` via `workflow_dispatch` from an earlier commit, or
  re-tag the prior ECR image. Images are SHA-pinned; a pre-deploy RDS snapshot is taken each run.
- **Database:** restore the pre-deploy RDS snapshot. Full procedures: [`operations.md`](./operations.md).

## 5. Monorepo release strategy (3 components, 1 repo)

`be/`, `fe/web/`, `fe/mobile/` ship to **different targets at different cadences** — so they are
released **independently**, not lock-stepped into one version:

| Component | Target | Cadence | Versioning |
|-----------|--------|---------|------------|
| **Backend + Web** (coupled — web calls the API) | staging EC2 (auto), on-prem prod (manual) | **continuous** to staging on every green merge to `main` | git SHA (no semver needed server-side) |
| **Mobile** | signed APK/AAB (sideload / store) | **on demand**, slower | semver in `fe/mobile/package.json` + Android `versionCode` |

Principles:
1. **Path-filtered, independent CI** — `backend-quality` / `web-quality` / `mobile-quality` each gate
   only their component; `deploy-staging`'s `paths-ignore` skips mobile/docs/prod-only commits.
2. **Server = continuous + together.** Backend and web deploy as a pair (API contract coupling).
   Staging needs no tags. Production (on-prem) is a deliberate cutover (manual today; a `prod-v*`
   tag could trigger it later).
3. **App = independent versioned release.** Bump `fe/mobile/package.json` + `versionCode`, then run
   the mobile release. Don't tie the app version to backend deploys.
4. **Component-scoped tags** when you want traceable releases: `mobile-v1.2.0` (app), `prod-v1.2.0`
   (future on-prem be+web). Avoid a single repo-wide version — the three don't move together.
5. Heavier automation (release-please / changesets for per-component version bumps + changelogs) is
   optional; adopt only when release cadence justifies it.

### Step-by-step

**Backend + Web → staging (continuous; no manual release step):**
1. Merge / push your change to `main`.
2. CI runs `quality-be` + `quality-web`; if green, `deploy-staging` builds + deploys automatically.
3. Verify the in-CI smoke test (or `curl http://api.sekar.wahyutrip.com/api/v1/health/live` + the web).
   Rollback: re-run `deploy-staging` from an earlier SHA, or restore the pre-deploy RDS snapshot.

**Mobile app → signed build (versioned, on demand):**
1. Bump the version — `fe/mobile/package.json` `version` (semver) **and**
   `fe/mobile/android/app/build.gradle` `versionCode` (integer +1) + `versionName` (match semver).
2. Commit + push: `git commit -am "chore(mobile): release v1.1.0" && git push`.
3. (Optional, recommended) tag for traceability: `git tag mobile-v1.1.0 && git push --tags`.
4. Run the build: Actions → **"Mobile Release (Android · staging)"** → Run workflow → `staging`
   (or `gh workflow run "Mobile Release (Android · staging)" --ref main -f environment=staging`).
5. Download the signed APK/AAB artifact (`gh run download <id>`); sideload the APK to UAT testers
   (or upload the AAB to Play later).

**Production (on-prem) — deferred** until the pemkot box is ready. Then: finalize `.env.production`
values (`dotenvx set`), and on the box run
`dotenvx run -f .env.production -- docker compose -f docker-compose.prod.yml up -d --build`.

## 6. Known gaps

- **Production CI** is not wired (on-prem deploy is currently manual via
  `dotenvx run -f .env.production -- docker compose -f docker-compose.prod.yml up`).
- (Resolved 2026-06-19) `web-e2e` was red because `17-capacity.spec.ts` asserted hardcoded ISO
  weeks (`W24`/`W25`) that fell out of the rolling 12-week window as the date advanced; the mock
  data + assertions now derive from `getRolling12WeekWindow()`, and the edit test was hardened
  against a render race.
- Backend/web unit tests now gate the staging deploy (`quality-be`/`quality-web` in
  `deploy-staging.yml`) and PRs (`backend-quality`/`web-quality`) — previously ungated.
