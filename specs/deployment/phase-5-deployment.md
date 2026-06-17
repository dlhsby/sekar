# Phase 5 Deployment Record — Finishing iOS + Assets / Reporting / Analytics

> **Per-phase deployment record.** Generic deploy/operate procedures live in the consolidated [`deployment-guide.md`](deployment-guide.md) (+ [`operations.md`](operations.md), [`credentials-setup.md`](credentials-setup.md)). This file records only what **Phase 5 actually shipped** and where its canonical deploy detail lives.
>
> **History note:** an earlier draft described Phase 5 as "iOS + biometric auth + fraud detection". Fraud-detection ML and biometric auth were **not shipped** (deferred); what shipped is the **Assets / Reporting / Analytics** feature modules plus the **release-prep + iOS-prep** slice. iOS native (Apple Sign-In / biometrics / APNs / TestFlight) remains **~50% — the rest needs a Mac**.

## What Phase 5 shipped

Three new backend-first feature verticals + release/iOS prep (see `specs/phases/phase-5-finishing-ios/STATUS.md`):

- **5-3 Assets** (`be/src/modules/assets/`, ADR-026): 14 endpoints, QR-code service (PNG → MinIO/S3), maintenance-overdue cron; web pages under `fe/web/src/app/(dashboard)/assets/`; mobile screens under `fe/mobile/src/screens/assets/` (QR scanner). Migration: assets tables + 6 categories.
- **5-1 Reporting** (`be/src/modules/reporting/`, ADR-024): 8 endpoints, **puppeteer-core + handlebars** PDF pipeline, scheduler + cleanup crons. Migration: reporting tables + 6 templates.
- **5-2 Analytics** (`be/src/modules/analytics/`, ADR-025): 7 endpoints, **3 materialized views**, weighted performance-score service, nightly refresh cron.
- **5-4 iOS prep** (~50%): repo-side ready (Info.plist permissions, `GoogleService-Info.plist.example`, FCM bridge deps); native build/signing/APNs deferred to a Mac — see [`ios-release-guide.md`](ios-release-guide.md).
- **5-5 Deployment**, **5-6 Guides**, **5-7 Evaluation**, **5-8 E2E**: release-prep, doc sync, requirements traceability, web Playwright (37 green) + Maestro flows authored (on-device run pending).

### Deploy-relevant deltas (what changed for ops)

| Delta | Impact |
|-------|--------|
| New backend deps: **`puppeteer-core`**, `handlebars`, `qrcode` | The backend Docker image installs **Chromium** for PDF rendering — `apk add chromium nss freetype harfbuzz ca-certificates ttf-freefont` + `PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser` (already in `be/Dockerfile*`). |
| **3 new migrations** (assets, reporting, analytics views) | Analytics views reference the `assets` table → assets migration must run first (timestamps already ordered). Materialized views are non-transactional; nightly `REFRESH … CONCURRENTLY` cron. |
| QR PNGs + generated PDFs | Land in the media bucket (MinIO dev/prod, S3 staging) under `qr-codes/` and `reports/`. |
| Authz hardening | Per-role area/rayon scope enforced across all asset + analytics endpoints (Jun 17 strict pass). No env change. |

Run the standard deploy flow ([`deployment-guide.md`](deployment-guide.md) §E) — the three migrations apply via `migration:run:prod`; no new external credentials beyond the existing Firebase/Maps/Mapbox/S3 set in [`credentials-setup.md`](credentials-setup.md).

## Canonical Phase 5 deploy docs

| Document | Purpose |
|----------|---------|
| [`../phases/phase-5-finishing-ios/status_deployment_checklist.md`](../phases/phase-5-finishing-ios/status_deployment_checklist.md) | Phase 5 deployment checklist |
| [`../phases/phase-5-finishing-ios/infrastructure.md`](../phases/phase-5-finishing-ios/infrastructure.md) | Phase 5 infra (Chromium, materialized views, deps) |
| [`../phases/phase-5-finishing-ios/ios.md`](../phases/phase-5-finishing-ios/ios.md) | iOS prep — repo-ready vs. Mac-deferred |
| [`../phases/phase-5-finishing-ios/STATUS.md`](../phases/phase-5-finishing-ios/STATUS.md) | Implementation status (source of truth for the phase) |
| [`ios-release-guide.md`](ios-release-guide.md) | iOS Mac-execution runbook |

## See also

- Consolidated deployment: [`deployment-guide.md`](deployment-guide.md)
- Operations / rollback / incidents: [`operations.md`](operations.md)
- Prior phase record: [`phase-4-deployment.md`](phase-4-deployment.md)
