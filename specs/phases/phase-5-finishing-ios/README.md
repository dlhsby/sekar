# Phase 5: Finishing, Release & iOS

**Date:** March 13, 2026
**Status:** Not Started
**Priority:** High — Feature Completion & Release
**Duration:** 49-64 developer-days estimated (7-9 weeks)
**Depends On:** Phase 4 (Complete)
**Related ADRs:** [ADR-024](../../architecture/decisions/ADR-024-pdf-report-generation.md), [ADR-025](../../architecture/decisions/ADR-025-analytics-materialized-views.md), [ADR-026](../../architecture/decisions/ADR-026-asset-qr-code-strategy.md), [ADR-027](../../architecture/decisions/ADR-027-ios-build-distribution.md), [ADR-028](../../architecture/decisions/ADR-028-staging-environment.md)

---

## Overview

Phase 5 completes SEKAR from a production-hardened application (post-Phase 4) into a fully featured, released product. While Phase 4 adds infrastructure (Redis, Sentry, export module, E2E testing), Phase 5 delivers the remaining business features: reporting with PDF/CSV/Excel generation, analytics dashboards with KPIs, asset management with QR codes, iOS platform support, and comprehensive documentation.

This phase addresses **12 user requirements** organized into 8 sub-phases with clear dependency ordering.

### Requirements Summary (12 Items)

| # | Requirement | Source | Sub-Phase |
|---|-------------|--------|-----------|
| 1 | Reporting module with PDF/CSV/Excel export | User | 5-1 |
| 2 | KPI recommendations for worker/area/operational metrics | User | 5-1, 5-2 |
| 3 | Analytics dashboards (web + mobile) | User | 5-2 |
| 4 | Asset management scoped to rayon/area | User | 5-3 |
| 5 | iOS platform support (Apple Sign-In, biometrics, App Store) | User | 5-4 |
| 6 | Multi-environment release coordination (staging + production) | User | 5-5 |
| 7 | User guide for web (markdown) | User | 5-6 |
| 8 | User guide for mobile (markdown) | User | 5-6 |
| 9 | Maintenance documentation | User | 5-6 |
| 10 | Phase 1-4 evaluation framework | User | 5-7 |
| 11 | Suggested features for application completion | User | 5-7 |
| 12 | E2E testing extension for Phase 5 features | User | 5-8 |

---

## Current Codebase Facts (Post-Phase 4 Expected Values)

| Fact | Post-Phase 4 State | Phase 5 Target |
|------|-------------------|----------------|
| Backend modules | 20 modules (+export, +health), ~145 endpoints | +3 modules (reporting, analytics, assets), ~185 endpoints |
| Backend tests | >1,500 tests (>90% stmts) | >2,000 tests (>90% maintained) |
| Mobile screens | 22 screens (+NotificationsScreen) | 32-35 screens (+reports, +analytics, +assets, +QR) |
| Mobile tests | >4,000 tests (>80% coverage) | >5,000 tests (>80% maintained) |
| Web pages | 24+ pages (+import, +export, +notifications) | 36-39 pages (+reports, +analytics, +assets) |
| Database tables | 24 tables (+notification_preferences, +export_jobs, +location_daily_summaries) | 31-33 tables (+7-9 new tables) |
| Redis | Installed (cache, Socket.IO adapter, JWT blacklist) | Extended (analytics cache, report job queue) |
| Export module | CSV + Excel via exceljs for 7 entity types | Extended with Puppeteer PDF, scheduled reports |
| iOS | Not configured | Full iOS build, Apple Sign-In, biometrics, App Store |
| Staging env | Not configured | Full staging environment with CI/CD |
| E2E tests | 20+ Playwright specs, 15+ Maestro flows | 30+ Playwright, 25+ Maestro flows |
| Documentation | Specs updated in Phase 4-10 | User guides, maintenance docs, evaluation |

---

## Implementation Phases

| Sub-Phase | Name | Effort | Dependencies | Requirements |
|-----------|------|--------|-------------|--------------|
| **5-1** | Reporting Module | 10-13 days | Phase 4 ExportModule | #1, #2 |
| **5-2** | Analytics Module | 8-10 days | Phase 4 Redis cache | #2, #3 |
| **5-3** | Asset Management | 8-10 days | Phase 4 infrastructure | #4 |
| **5-4** | iOS Platform | 8-10 days | Independent | #5 |
| **5-5** | Release & Deployment | 5-7 days | 5-1..5-4 complete | #6 |
| **5-6** | User Guides & Documentation | 5-7 days | 5-1..5-5 complete | #7, #8, #9 |
| **5-7** | Evaluation & Final Polish | 4-5 days | All complete | #10, #11 |
| **5-8** | E2E Testing Extension | 5-7 days | 5-1..5-4 features | #12 |

**Total estimated:** 49-64 developer-days (7-9 weeks)

### Parallelization Opportunities

```
Week 1-2:   5-1 (Reporting) ─────────────────────┐
            5-2 (Analytics) ─────────────────────┤  <- Parallel
                                                  |
Week 3-4:   5-3 (Asset Management) ──────────────┤
            5-1 (Report scheduler + tests)       |
                                                  |
Week 5-6:   5-4 (iOS Platform) ──────────────────┤  <- Independent
            5-5 (Release prep, staging) ─────────┤
                                                  |
Week 7-8:   5-8 (E2E Testing) <── 5-1..5-4      |
            5-6 (User Guides) <── 5-1..5-5       |
Week 9:     5-7 (Evaluation) <── All ────────────┘
```

### Sub-Phase Dependency Notes

- **5-1 (Reporting) extends Phase 4 ExportModule:** The ExportModule from Phase 4 (sub-phase 4-5) provides CSV/Excel generation. Phase 5 adds Puppeteer PDF, report templates, scheduled reports, and report archive. Do NOT duplicate export infrastructure — extend `export.service.ts` and add `reporting.module.ts` as a consumer.
- **5-2 (Analytics) depends on Phase 4 Redis:** Analytics materialized views use Redis for caching aggregated metrics (TTL 5min). Without Redis, analytics queries hit raw tables and may exceed 2s response threshold.
- **5-4 (iOS) is fully independent:** Can start any time after Phase 4. No backend or database dependencies beyond existing auth system.

---

### 5-1: Reporting Module (10-13 days)

**Requirements:** #1 reporting, #2 KPIs

| Task | Scope | Key Files |
|------|-------|-----------|
| A1. ReportingModule scaffold | Module, service, controller | New: `apps/be/src/modules/reporting/` |
| A2. report_templates table + entity | 6 built-in templates | New: `apps/be/src/modules/reporting/entities/report-template.entity.ts` |
| A3. generated_reports table + entity | Archive with S3 storage | New: `apps/be/src/modules/reporting/entities/generated-report.entity.ts` |
| A4. report_schedules table + entity | Cron-based scheduled reports | New: `apps/be/src/modules/reporting/entities/report-schedule.entity.ts` |
| A5. Puppeteer PDF generator (ADR-024) | Handlebars templates -> PDF | New: `apps/be/src/modules/reporting/generators/pdf.generator.ts` |
| A6. 6 report type implementations | Daily ops, weekly perf, monthly summary, worker, area, overtime | `apps/be/src/modules/reporting/reports/` |
| A7. Report scheduler cron | Daily 06:00 WIB, weekly Mon 07:00, monthly 1st 08:00 | New: `apps/be/src/modules/reporting/cron/report-scheduler.cron.ts` |
| B1. Mobile ReportsScreen | List + download reports | New: `apps/mobile/src/screens/reports/ReportsScreen.tsx` |
| B2. Mobile ReportDetailScreen | View report with charts | New: `apps/mobile/src/screens/reports/ReportDetailScreen.tsx` |
| C1. Web reports dashboard page | /dashboard/reports | New: `apps/web/src/app/(dashboard)/reports/page.tsx` |
| C2. Web report builder page | /dashboard/reports/builder | New: `apps/web/src/app/(dashboard)/reports/builder/page.tsx` |
| C3. Web report schedules page | /dashboard/reports/schedules | New: `apps/web/src/app/(dashboard)/reports/schedules/page.tsx` |
| D1. Unit + integration tests | >80% coverage for reporting module | Test files |

**Deliverables:** ADR-024 written, ReportingModule with 6 report types, PDF generation, scheduled reports, 2 mobile screens, 3 web pages

---

### 5-2: Analytics Module (8-10 days)

**Requirements:** #2 KPIs, #3 dashboards

| Task | Scope | Key Files |
|------|-------|-----------|
| A1. AnalyticsModule scaffold | Module, service, controller | New: `apps/be/src/modules/analytics/` |
| A2. Materialized views (ADR-025) | 3 views: worker_performance_daily, area_metrics_daily, operational_metrics_daily | Migration |
| A3. Worker analytics endpoints | 8 worker KPIs with filters | `apps/be/src/modules/analytics/analytics.controller.ts` |
| A4. Area analytics endpoints | 5 area KPIs with filters | `apps/be/src/modules/analytics/analytics.controller.ts` |
| A5. Operational analytics endpoints | 6 operational KPIs | `apps/be/src/modules/analytics/analytics.controller.ts` |
| A6. Analytics refresh cron | Refresh materialized views daily at 05:00 WIB | New: `apps/be/src/modules/analytics/cron/analytics-refresh.cron.ts` |
| B1. Mobile WorkerAnalyticsScreen | Personal performance metrics | New: `apps/mobile/src/screens/analytics/WorkerAnalyticsScreen.tsx` |
| B2. Mobile TeamAnalyticsScreen | Supervisor team overview | New: `apps/mobile/src/screens/analytics/TeamAnalyticsScreen.tsx` |
| C1. Web analytics dashboard page | /dashboard/analytics | New: `apps/web/src/app/(dashboard)/analytics/page.tsx` |
| C2. Web worker analytics page | /dashboard/analytics/workers | New: `apps/web/src/app/(dashboard)/analytics/workers/page.tsx` |
| C3. Web area analytics page | /dashboard/analytics/areas | New: `apps/web/src/app/(dashboard)/analytics/areas/page.tsx` |
| D1. Unit + integration tests | >80% coverage | Test files |

**Deliverables:** ADR-025 written, AnalyticsModule with 19 KPIs, 3 materialized views, 2 mobile screens, 3 web pages

---

### 5-3: Asset Management (8-10 days)

**Requirements:** #4 asset management

| Task | Scope | Key Files |
|------|-------|-----------|
| A1. AssetsModule scaffold | Module, service, controller | New: `apps/be/src/modules/assets/` |
| A2. assets + asset_categories tables | 6 park-specific categories | New migration |
| A3. asset_assignments table | Checkout/return tracking | New migration |
| A4. asset_maintenances table | Maintenance scheduling | New migration |
| A5. QR code service (ADR-026) | Generate + decode QR codes | New: `apps/be/src/modules/assets/services/qr-code.service.ts` |
| A6. Assets CRUD endpoints | Scoped to rayon/area | `apps/be/src/modules/assets/assets.controller.ts` |
| A7. Assignment/return endpoints | Checkout/return workflow | `apps/be/src/modules/assets/assets.controller.ts` |
| A8. Maintenance endpoints | Schedule + complete maintenance | `apps/be/src/modules/assets/assets.controller.ts` |
| B1. Mobile AssetListScreen | Browse assets in assigned area | New: `apps/mobile/src/screens/assets/AssetListScreen.tsx` |
| B2. Mobile AssetDetailScreen | View asset + history | New: `apps/mobile/src/screens/assets/AssetDetailScreen.tsx` |
| B3. Mobile QRScannerScreen | Scan QR to view/checkout asset | New: `apps/mobile/src/screens/assets/QRScannerScreen.tsx` |
| B4. Mobile AssetCheckoutScreen | Checkout workflow | New: `apps/mobile/src/screens/assets/AssetCheckoutScreen.tsx` |
| C1. Web assets list page | /dashboard/assets | New: `apps/web/src/app/(dashboard)/assets/page.tsx` |
| C2. Web asset detail page | /dashboard/assets/[id] | New: `apps/web/src/app/(dashboard)/assets/[id]/page.tsx` |
| C3. Web asset form page | /dashboard/assets/new | New: `apps/web/src/app/(dashboard)/assets/new/page.tsx` |
| C4. Web QR generator page | /dashboard/assets/qr | New: `apps/web/src/app/(dashboard)/assets/qr/page.tsx` |
| C5. Web maintenance calendar | /dashboard/assets/maintenance | New: `apps/web/src/app/(dashboard)/assets/maintenance/page.tsx` |
| D1. Unit + integration tests | >80% coverage | Test files |

**Deliverables:** ADR-026 written, AssetsModule, QR code service, 4 mobile screens, 5 web pages

---

### 5-4: iOS Platform (8-10 days)

**Requirements:** #5 iOS support

| Task | Scope | Key Files |
|------|-------|-----------|
| A1. Xcode project setup | Bundle ID, signing, capabilities | `apps/mobile/ios/` |
| A2. CocoaPods configuration | iOS dependencies | `apps/mobile/ios/Podfile` |
| A3. Apple Sign-In integration (ADR-027) | @invertase/react-native-apple-authentication | `apps/mobile/src/services/auth/appleAuth.ts` |
| A4. Backend Apple token verification | POST /auth/apple endpoint | `apps/be/src/modules/auth/strategies/apple.strategy.ts` |
| A5. Biometric authentication | Face ID / Touch ID | New: `apps/mobile/src/services/auth/biometricAuth.ts` |
| A6. APNs configuration | Push notification certificates | `apps/mobile/ios/` |
| A7. Platform parity checklist | Verify all Android features on iOS | Test matrix |
| A8. TestFlight setup | Internal + external testing | Xcode / App Store Connect |
| A9. App Store submission preparation | Screenshots, descriptions, privacy policy | App Store Connect |
| B1. CI/CD iOS pipeline | Xcode build + TestFlight upload | `.github/workflows/ios.yml` |
| C1. Unit + integration tests | iOS-specific tests | Test files |

**Deliverables:** ADR-027 written, iOS build, Apple Sign-In, biometrics, TestFlight, App Store submission

---

### 5-5: Release & Deployment (5-7 days)

**Requirements:** #6 multi-environment release

| Task | Scope | Key Files |
|------|-------|-----------|
| A1. Staging environment setup (ADR-028) | Separate DB, Redis, S3 bucket | `infra/docker-compose.staging.yml` |
| A2. Environment configuration | Staging vs production env vars | `.env.staging`, `.env.production` |
| A3. CI/CD pipeline updates | Staging auto-deploy, production manual | `.github/workflows/` |
| A4. Database migration procedure | Staging first, then production | Runbook |
| A5. Backend deployment | Rolling update with health checks | Deployment scripts |
| A6. Web deployment | Next.js production build + CDN | Deployment scripts |
| A7. Mobile release (Android) | Play Store update | Release process |
| A8. Mobile release (iOS) | App Store submission | Release process |
| A9. Monitoring & alerting | Sentry alerts, uptime monitoring | Infrastructure config |

**Deliverables:** ADR-028 written, staging environment, CI/CD updates, production deployment

---

### 5-6: User Guides & Documentation (5-7 days)

**Requirements:** #7 web guide, #8 mobile guide, #9 maintenance docs

| Task | Scope | Key Files |
|------|-------|-----------|
| A1. Web user guide | 14 sections by role | `specs/phases/phase-5-finishing-ios/user-guide-web.md` |
| A2. Mobile user guide | 9 sections by role | `specs/phases/phase-5-finishing-ios/user-guide-mobile.md` |
| A3. Maintenance documentation | 10 sections for system admin | `specs/phases/phase-5-finishing-ios/maintenance.md` |
| A4. API documentation update | Swagger annotations for new endpoints | `apps/be/src/modules/*/` |
| A5. Architecture diagrams update | C4 diagrams with Phase 5 additions | `specs/architecture/` |

**Deliverables:** Web user guide, mobile user guide, maintenance manual, updated API docs

---

### 5-7: Evaluation & Final Polish (4-5 days)

**Requirements:** #10 evaluation, #11 suggested features

| Task | Scope | Key Files |
|------|-------|-----------|
| A1. Cross-phase evaluation | Phase 1-4 requirements vs delivered | `specs/phases/phase-5-finishing-ios/evaluation.md` |
| A2. Metrics summary | Test coverage, endpoint count, screen count | `specs/COMPLETION_STATUS.md` |
| A3. Architecture audit | Review against ADRs, identify tech debt | Evaluation document |
| A4. Performance audit | Response times, memory usage, bundle size | Evaluation document |
| A5. Security audit | OWASP top 10 checklist | Evaluation document |
| A6. Phase 5 recommendations | Suggested features with effort estimates | Evaluation document |
| A7. Final documentation sync | All specs current and consistent | All spec files |

**Deliverables:** Evaluation report, Phase 5 feature candidates, final documentation

---

### 5-8: E2E Testing Extension (5-7 days)

**Requirements:** #12 E2E testing

| Task | Scope | Key Files |
|------|-------|-----------|
| A1. Maestro flows for reporting | Generate report, view report, download | `apps/mobile/.maestro/flows/` |
| A2. Maestro flows for analytics | View worker analytics, team analytics | `apps/mobile/.maestro/flows/` |
| A3. Maestro flows for assets | Scan QR, checkout, return, maintenance | `apps/mobile/.maestro/flows/` |
| A4. Maestro flows for iOS | Apple Sign-In, biometrics | `apps/mobile/.maestro/flows/` |
| B1. Playwright specs for reporting | Report builder, schedules, archive | `apps/web/e2e/` |
| B2. Playwright specs for analytics | Dashboard, worker, area analytics | `apps/web/e2e/` |
| B3. Playwright specs for assets | CRUD, QR generator, maintenance calendar | `apps/web/e2e/` |
| C1. Performance testing | Report generation <30s, analytics <2s | Performance tests |
| C2. iOS device testing matrix | iPhone 14 Pro, iPhone SE, iPad | Device tests |

**Deliverables:** 10+ new Maestro flows, 10+ new Playwright specs, performance benchmarks

---

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Puppeteer resource consumption on server | High | Medium | Limit concurrent PDF generations to 3; use connection pool |
| Analytics queries slow on large datasets | Medium | High | Materialized views with nightly refresh; Redis cache (5min TTL) |
| QR scanning accuracy in low light | Low | Medium | Manual code entry fallback; torch mode toggle |
| Apple Sign-In complexity and Apple review | Medium | High | Follow official Apple docs; allow 2-week review buffer |
| App Store rejection | Medium | High | Privacy policy, screenshots, test account ready; thorough review notes |
| Staging environment cost | Low | Low | Use smaller instances; auto-shutdown when idle |
| Report scheduler overloading server at 06:00 WIB | Medium | Medium | Stagger report generation; use Bull queue with concurrency=2 |
| Asset QR codes unreadable after printing | Low | Medium | Test print quality; include human-readable code below QR |
| Materialized view refresh blocks read queries | Low | High | Use `REFRESH MATERIALIZED VIEW CONCURRENTLY` (requires unique index) |
| iOS build environment not available in CI | Medium | Medium | Use macos-latest runner; cache CocoaPods; budget for Apple CI minutes |

---

## What Gets Added

| Addition | Description |
|----------|-------------|
| `apps/be/src/modules/reporting/` | Report generation (PDF, CSV, Excel), templates, scheduling |
| `apps/be/src/modules/analytics/` | KPI calculations, materialized view management |
| `apps/be/src/modules/assets/` | Asset CRUD, QR codes, assignments, maintenance |
| `apps/be/src/modules/auth/strategies/apple.strategy.ts` | Apple Sign-In token verification |
| `apps/mobile/src/screens/reports/` | 2 new screens (list + detail) |
| `apps/mobile/src/screens/analytics/` | 2 new screens (worker + team) |
| `apps/mobile/src/screens/assets/` | 4 new screens (list, detail, QR scanner, checkout) |
| `apps/mobile/src/services/auth/appleAuth.ts` | Apple Sign-In service |
| `apps/mobile/src/services/auth/biometricAuth.ts` | Face ID / Touch ID service |
| `apps/web/src/app/(dashboard)/reports/` | 3 new pages (dashboard, builder, schedules) |
| `apps/web/src/app/(dashboard)/analytics/` | 3 new pages (dashboard, workers, areas) |
| `apps/web/src/app/(dashboard)/assets/` | 5 new pages (list, detail, form, QR, maintenance) |
| `apps/mobile/ios/` | Complete iOS build configuration |
| `infra/docker-compose.staging.yml` | Staging environment |
| 3 materialized views | worker_performance_daily, area_metrics_daily, operational_metrics_daily |
| 7-9 new database tables | report_templates, generated_reports, report_schedules, assets, asset_categories, asset_assignments, asset_maintenances |

## What Gets Changed

| Current Code | Change |
|-------------|--------|
| `apps/be/src/modules/export/` (Phase 4) | Extended with Puppeteer PDF generator |
| `@nestjs/schedule` cron jobs (Phase 4) | +3 cron jobs (report scheduler, analytics refresh, maintenance reminders) |
| `apps/mobile/src/navigation/` | +8-10 new screen routes (reports, analytics, assets) |
| `apps/mobile/src/store/slices/` | +3 Redux slices (reports, analytics, assets) |
| `apps/web/src/app/(dashboard)/` layout | +11 new navigation items |
| `apps/be/src/modules/auth/` | +Apple Sign-In strategy |
| `.github/workflows/` | +iOS CI/CD pipeline, staging deployment |
| `infra/docker-compose.yml` | Staging environment variant |

---

## Suggested Features (Deferred to Phase 5)

Per user decision, Phase 5 focuses on core features. These are documented as Phase 5 candidates:

| Feature | Effort | Description |
|---------|--------|-------------|
| Weather Integration | 2-3 days | OpenWeatherMap/BMKG API, current + forecast, rain advisory for outdoor workers |
| Leave/Absence Management | 3-4 days | Request workflow with approval, balance tracking, schedule integration |
| Incident Reporting | 2-3 days | Equipment damage, safety hazard, vandalism reporting with resolution tracking |
| Shift Handover Notes | 1-2 days | End-of-shift notes passed to incoming worker at same location |
| Communication/Messaging | 5-7 days | In-app messaging between korlap and workers, broadcast announcements |

> **Note:** These features are NOT included in Phase 5 scope or effort estimates. They require separate approval and planning.

---

## File References

| Document | Purpose | Link |
|----------|---------|------|
| **README.md** | Phase overview (this file) | [View](./README.md) |
| **STATUS.md** | Implementation tracking | [View](./STATUS.md) |
| **backend.md** | Backend specs (3 new modules, ~40 endpoints) | [View](./backend.md) |
| **mobile.md** | Mobile specs (8-10 new screens) | [View](./mobile.md) |
| **web.md** | Web specs (11-13 new pages) | [View](./web.md) |
| **ios.md** | iOS platform (Apple Sign-In, biometrics, App Store) | [View](./ios.md) |
| **database.md** | Schema changes (7-9 new tables, 3 materialized views) | [View](./database.md) |
| **infrastructure.md** | Staging, deployment, CI/CD, monitoring | [View](./infrastructure.md) |
| **testing.md** | E2E testing extension (Maestro + Playwright) | [View](./testing.md) |
| **reporting.md** | Deep dive: 6 report types, KPIs, PDF templates | [View](./reporting.md) |
| **analytics.md** | Deep dive: dashboards, performance algorithm, aggregation | [View](./analytics.md) |
| **assets.md** | Deep dive: asset lifecycle, QR codes, maintenance | [View](./assets.md) |
| **user-guide-web.md** | Web user guide (14 sections by role) | [View](./user-guide-web.md) |
| **user-guide-mobile.md** | Mobile user guide (9 sections by role) | [View](./user-guide-mobile.md) |
| **maintenance.md** | Operational guide (10 sections) | [View](./maintenance.md) |
| **evaluation.md** | Cross-phase review (Phase 1-4) | [View](./evaluation.md) |
| **status_deployment_checklist.md** | Pre/post-deployment checklist | [View](./status_deployment_checklist.md) |
| **status_reviews.md** | Expert review findings | [View](./status_reviews.md) |
| **ADR-024** | PDF report generation (Puppeteer) | [View](../../architecture/decisions/ADR-024-pdf-report-generation.md) |
| **ADR-025** | Analytics materialized views | [View](../../architecture/decisions/ADR-025-analytics-materialized-views.md) |
| **ADR-026** | Asset QR code strategy | [View](../../architecture/decisions/ADR-026-asset-qr-code-strategy.md) |
| **ADR-027** | iOS build & distribution | [View](../../architecture/decisions/ADR-027-ios-build-distribution.md) |
| **ADR-028** | Staging environment | [View](../../architecture/decisions/ADR-028-staging-environment.md) |

---

**Last Updated:** 2026-03-13
