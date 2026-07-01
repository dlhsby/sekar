# Staging / UAT Deployment Status (detailed)

> Part of the SEKAR status docs — see [COMPLETION_STATUS.md](../COMPLETION_STATUS.md).

## 🚀 Staging / UAT Deployment Status (AWS — rebuilt 2026-06-18 · **UAT sign-off 2026-06-22**)

Environment model: **production → on-prem (pemkot) Docker Compose, platform-agnostic**;
**staging/UAT → AWS**, sole tenant (SEKAR-only as of 2026-06) on a `t3.micro` EC2. See
[ADR-028 addendum](../architecture/decisions/ADR-028-staging-environment.md) +
`specs/deployment/deployment-guide.md` §D.

| Aspect | Status | Details |
|--------|--------|---------|
| **Backend API** | ✅ Live | `https://api.sekar.wahyutrip.com` (HTTPS via Caddy auto-HTTPS) |
| **Web dashboard** | ✅ Live | `https://sekar.wahyutrip.com` (Mapbox baked, monitoring map OK) |
| **Database** | ✅ Seeded | `sekar_staging` on shared RDS `dlhsby` (SSL); staging seed = **85 users** |
| **Migrations** | ✅ Executed | full TypeORM migration set (`migration:run:prod`) |
| **Auth** | ✅ Working | `superadmin/Password123!` verified (JWT) |
| **Object storage** | ✅ S3 | `sekar-media-staging` via **EC2 instance role** (no static keys) |
| **Redis** | ✅ In-stack | `redis:7-alpine` container (DB+Redis health `/ready` ok) |
| **Edge / TLS** | ✅ HTTPS | SEKAR-owned Caddy service (`sekar-caddy`); bare-hostname blocks → Let's Encrypt auto-HTTPS + HTTP→HTTPS redirect |
| **FCM** | ✅ On | `FCM_ENABLED=true` — encrypted Firebase service-account creds (project `dlhsby-sekar-staging`) |
| **Secrets** | ✅ dotenvx | encrypted `be/.env.staging` baked into the image; only the private key (`DOTENV_PRIVATE_KEY_STAGING`) is pulled from SSM `/sekar/staging/BE_DOTENV_PRIVATE_KEY` into `/opt/sekar/.env` at deploy |
| **CI/CD** | ✅ Wired | 8 active workflows (`deploy-staging` test-gated OIDC→ECR→SSM + RDS snapshot · `backend-quality`/`web-quality`/`mobile-quality` lint+tsc+test · `mobile-release` signed APK/AAB · `tokens-verify` · `web-e2e`/`mobile-e2e`). dotenvx-encrypted env per environment; manual mobile release dispatch. web-e2e green (capacity spec made date-independent Jun 19). See `specs/deployment/ci-cd.md` |
| **Error tracking** | ✅ Wired (dormant) | Sentry on web (`instrumentation*.ts` + `global-error.tsx`, `withSentryConfig`) + mobile (`MapErrorBoundary`→`captureException`); no-ops until `NEXT_PUBLIC_SENTRY_DSN` / `SENTRY_DSN_MOBILE` set |
| **Tooling** | ✅ Live | **Swagger** `https://api.sekar.wahyutrip.com/api/v1/docs` (not env-gated) · **Adminer** `https://adminer.wahyutrip.com` behind Caddy HTTP basic-auth (user `sekar`; own container in `compose.staging.yml`, Caddy block in `infra/Caddyfile.staging`) |
| **Mobile distribution** | ✅ Live | ARM build at `https://sekar.wahyutrip.com/android` (arm64-v8a+armeabi-v7a, real phones) · x86_64 build at `/android_x86` (`platform=android_x86`, emulators/WSA/PC). `mobile-release.yml` builds + publishes both APKs per release; `downloadUrl` is https (Express `trust proxy`) |
| **User manual (docs)** | ✅ Live | Public no-login Docusaurus site (`fe/docs/`) → `https://docs.sekar.wahyutrip.com` (Bahasa default + English `/en`, offline search, real web + mobile screenshots). `sekar-docs` service in `compose.staging.yml` + Caddy block; built/pushed/smoke-tested by `deploy-staging`. ECR repo + `ECR_DOCS` var + DNS A `docs.sekar.wahyutrip.com → 16.79.124.63` all in place. In-app **Panduan** sidebar link (`NEXT_PUBLIC_DOCS_URL`). Content edits ship on the next staging release (merge `main → staging`), like the app |
| **Releases** | ✅ First cut | **`sekar-v0.1.0`** (coupled be+web, `:0.1.0` ECR images + GitHub Release, no auto-deploy). Staging is **release-gated**: deploys on merge `main → staging` (SHA-pinned), not on every push to `main` |

**AWS account:** 659828096624 · **region:** ap-southeast-3 · **EC2:** i-08edccdc966c0985e (EIP 16.79.124.63).
**Rebuild date:** June 18, 2026 (prior account's free tier expired; re-provisioned from scratch).

**UAT prep (June 30, 2026 — staging release + reseed):** be/web staging confirmed live on latest `main` (`0347b42b` via `deploy-staging`; `/health/live` gitSha + web footer SHA verified — no redeploy needed). **First mobile release cut: `mobile-v0.1.0` (versionCode 2)** — version bump merged via PR #121 (`main`→`63f63408`), tag built by `mobile-release.yml` (signed APK+AAB + x86_64 variant), auto-published to S3 + `app-releases` registry; `GET /app-releases/latest` now serves `0.1.0`/vc2/build `202606300732` for both `android` and `android_x86`. Destructive staging reseed executed (`seed-staging.yml`, pre-seed RDS snapshot taken): 640 areas, 350 users, today's daily roster materialized (`satgas_pusat_1` = demo sick-leave). Local pre-UAT gates re-run: root tokens 40/40 + no drift; be `tsc` 0 + 2173 jest pass (`test:cov` branches 77.2% < 79% local-only gate, CI runs plain `npm test`); web `tsc` 0 + 1796 jest pass; mobile green via CI PR-gate. NOTE: web Playwright E2E = **114/129 pass, 14 pre-existing failures** (visreg baseline drift ×4, a11y users/areas/rayons ×3, seeds ×4, analytics ×2, forgot-password ×1) — matches the `web-e2e` CI baseline red since ~Jun 21; not a release regression (this change touched only `fe/mobile`). First raw run showed 63 fails, inflated by cold-Next-compile flakiness under parallel load. Superadmin staging password was rotated off the seeded temp during verification.

**Seed correction (June 23, 2026 — dev + staging):** Rayon Pusat field users (`satgas_pusat_*`, `korlap_pusat_*`, `linmas_pusat_*`) no longer anchor on **Taman Bungkul** (which belongs to **Rayon Taman Aktif**) — they now sit on Rayon Pusat (Darmo Pulau) areas. New `satgas_taman_bungkul_1` covers Taman Bungkul; the real Bungkul staff (`edi_santoso`/`jihan_nabila_safitri`/`deni_purwanto`/`agus_ramadhan`) moved to rayon Taman Aktif. New **Taman Flora** park (Rayon Taman Aktif) at `-7.295479, 112.762227` with a city-wide boundary (convex hull of all rayon polygons); Rayon Taman Aktif center is now its office (`-7.294832, 112.762078`, inside Taman Flora). Also fixed a mobile bug where the clock-out screen judged lateness against the roster shift instead of the shift actually clocked into (diverged from the home hero + attendance history).

---
