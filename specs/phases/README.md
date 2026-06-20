# SEKAR Development Phases

Comprehensive implementation guides for each development phase of the SEKAR project.

---

## Phase Overview

| Phase | Name | Duration | Status | Focus |
|-------|------|----------|--------|-------|
| 1 | [MVP - Core Tracking](./phase-1-mvp/) | 2 weeks | ✅ COMPLETE | Clock-in/out, Reports, GPS |
| 2A | [Enhanced Features](./phase-2-a-enhanced/) | 2 weeks | ✅ COMPLETE | Tasks, Notifications, KMZ, Web |
| 2B | [UI/UX Revamp](./phase-2-b-ui-ux-revamp/) | 3-4 weeks | ✅ COMPLETE | Neo Brutalism 2.0, Design Tokens |
| **2C** | **[Client Feedback](./phase-2-c-client-feedback/)** | **4-6 weeks** | **✅ COMPLETE & DEPLOYED** | **Role overhaul, Overtime, Aktivitas** |
| **2D** | **[Real-Time Monitoring](./phase-2-d-monitoring/)** | **1 week** | **✅ COMPLETE & DEPLOYED** | **Five-status tracking, Mapbox, location history** |
| **2E** | **[Client Feedback II](./phase-2-e-client-feedback-2/)** | **1 day** | **✅ COMPLETE & DEPLOYED** | **Phone login, multi-area, overtime redesign, audit trail** |
| **3** | **[Plants Management + Monitoring Rebuild + Public Intake](./phase-3-plants-monitoring-rebuild/)** | **5-7 weeks (73 dev-days)** | **✅ CLOSED (Jun 11, 2026)** | **M1-R Redesign Foundation, Monitoring v2 (Redis), plants catalog, typed tasks, pruning intake, service capacity, seeds — all 21 sub-phases shipped** |
| **4** | **[Production Readiness & Rebrand](./phase-4-production-readiness/)** | **10-12 weeks (67-87 d)** | **~98% (code-side Jun 11; on-device testing ⏳)** | **FCM full, offline sync, JWT rotation, Sentry, export/import, Maestro/Playwright E2E, WCAG-AA a11y gate, security hardened** |
| **5** | **[Finishing, Release & iOS](./phase-5-finishing-ios/)** | **7-9 weeks** | **release-prep ✅ + features shipped (Jun 17)** | **Assets/Reporting/Analytics modules (backend + web + mobile); export/import; iOS prep; guides + evaluation pending** |

**Actual Duration (to date):** ~24 weeks (Jan 7 – Jun 20, 2026)

> **Note:** Phase structure was reorganized on January 30, 2026 (Phases 3-6 consolidated into 3-4) and again on April 24, 2026 (new Phase 3: Plants Management inserted; prior Phase 3-4 renumbered to 4-5). Phase 2 was split into 2A (Enhanced), 2B (UI/UX), 2C (Client Feedback), and 2E (Client Feedback II) based on client meetings (Feb 10, Mar 10, 2026). Phase 4 spec re-baselined May 22, 2026 (expanded from 52-68 d polish to 67-87 d rebrand+hardening).

### Quick Reference

- **[DEPENDENCY_MATRIX.md](./DEPENDENCY_MATRIX.md)** - Cross-phase dependencies and critical path
- **[Completion Status](../COMPLETION_STATUS.md)** - Single source of truth for all metrics

---

## Document Structure

Each phase folder contains standardized documents:

| File | Purpose | Audience |
|------|---------|----------|
| `README.md` | Overview, goals, success criteria | Everyone |
| `STATUS.md` | Progress tracking checklist | Project Manager |
| `backend.md` | NestJS implementation guide | Backend Developer |
| `mobile.md` | React Native implementation guide | Mobile Developer |
| `web.md` | Next.js implementation guide | Web Developer |
| `timeline.md` | Day-by-day breakdown | Project Manager |
| `testing.md` | Test plans and acceptance criteria | QA Engineer |

---

## Phase 1: MVP - Core Tracking

**Duration:** 2 weeks | **Status:** ✅ COMPLETE (Jan 7-19, 2026)

Core worker tracking system with GPS-verified attendance and work reporting.

**Verified Metrics:**
- Backend: 40 endpoints, 401 tests, 84.23% coverage
- Mobile: 14 screens, 14 components, 1,086 tests, 100% pass rate
- Error Codes: 31 standardized codes

### Key Deliverables
- JWT authentication with role-based access
- Clock-in/out with GPS validation and selfie
- Work reports with photo evidence
- Background location tracking
- Supervisor dashboard with live map

### Documents
- [Overview](./phase-1-mvp/README.md)
- [Status](./phase-1-mvp/STATUS.md)
- [Backend Guide](./phase-1-mvp/backend.md)
- [Mobile Guide](./phase-1-mvp/mobile.md)
- [Timeline](./phase-1-mvp/timeline.md)

---

## Phase 2A: Enhanced Features

**Duration:** 2 weeks | **Status:** ✅ COMPLETE (Jan 20-27, 2026)

Task assignment system, push notifications, KMZ import, and full web dashboard.

**Verified Metrics:**
- Backend: 83 endpoints (+43), 845 tests, 84.23% coverage
- Mobile: 17 screens (+3), 2,057 tests, 100% pass rate, WCAG 2.1 AA
- Web: 18 pages, 11 NB components, Next.js 16.1.4
- DevOps: 3 CI/CD pipelines, 1,215 lines

### Key Deliverables
- Rayons (7), Shift Definitions (3), Activity Types (10)
- Task module with assignment workflow
- FCM push notifications (backend ready, mobile packages added)
- KMZ file import for area boundaries
- Full web dashboard with Neo Brutalism design
- WebSocket real-time events

### Documents
- [Overview](./phase-2-a-enhanced/README.md)
- [Status](./phase-2-a-enhanced/STATUS.md)
- [Backend Guide](./phase-2-a-enhanced/backend.md)
- [Mobile Guide](./phase-2-a-enhanced/mobile.md)
- [Web Guide](./phase-2-a-enhanced/web.md)
- [Timeline](./phase-2-a-enhanced/timeline.md)
- [Testing](./phase-2-a-enhanced/testing.md)

---

## Phase 2B: UI/UX Revamp

**Duration:** 3-4 weeks | **Status:** ✅ COMPLETE

Neo Brutalism 2.0 design system applied across web and mobile platforms.

### Key Deliverables
- Design token updates (colors, borders, shadows, radius)
- 26 component updates (16 web + 10 mobile)
- 22 web page styling updates
- 17 mobile screen styling updates
- Accessibility compliance verification
- Mobile-web design parity

### Documents
- [Overview](./phase-2-b-ui-ux-revamp/README.md)
- [Status](./phase-2-b-ui-ux-revamp/STATUS.md)
- [Components](./phase-2-b-ui-ux-revamp/components.md)
- [Web Pages](./phase-2-b-ui-ux-revamp/web.md)
- [Mobile Screens](./phase-2-b-ui-ux-revamp/mobile.md)
- [Timeline](./phase-2-b-ui-ux-revamp/timeline.md)

---

## Phase 2C: Client Feedback

**Duration:** 4-6 weeks | **Status:** ✅ COMPLETE (Feb 2026)

Breaking changes based on client feedback from February 10, 2026 meeting.

### Key Deliverables
- Role system overhaul (7 → 8 roles: satgas, linmas, korlap, admin_data, kepala_rayon, top_management, admin_system, superadmin)
- GPS boundary removal (clock-in from anywhere)
- Reports → Activities rename with multi-photo (max 3, camera only)
- Task hierarchy (downward assignment) with tagging (CC-like)
- New overtime module (submit + korlap approval)
- Activity types update (20 types across 4 roles)
- Monitoring access scope changes

### Documents
- [Overview](./phase-2-c-client-feedback/README.md)
- [Status](./phase-2-c-client-feedback/STATUS.md)
- [Database Guide](./phase-2-c-client-feedback/database.md)
- [Backend Guide](./phase-2-c-client-feedback/backend.md)
- [Mobile Guide](./phase-2-c-client-feedback/mobile.md)
- [Web Guide](./phase-2-c-client-feedback/web.md)
- [Testing](./phase-2-c-client-feedback/testing.md)

---

## Phase 2D: Real-Time Monitoring

**Duration:** 1 week | **Status:** ✅ COMPLETE & DEPLOYED (Mar 7, 2026)

Comprehensive reimplementation of the monitoring system with five-status tracking, full Mapbox integration, and location history playback.

**Verified Metrics:**
- Backend: 122 endpoints, 1,204 tests (94.55% coverage)
- Mobile: 3,669 tests, enhanced MapDashboard
- Web: Full Mapbox GL map, filter sidebar, worker detail panel
- 2 migrations, 5 new WebSocket events, 3 new services

### Documents
- [Overview](./phase-2-d-monitoring/README.md)
- [Status](./phase-2-d-monitoring/STATUS.md)
- [Database Guide](./phase-2-d-monitoring/database.md)
- [Backend Guide](./phase-2-d-monitoring/backend.md)
- [Mobile Guide](./phase-2-d-monitoring/mobile.md)
- [Web Guide](./phase-2-d-monitoring/web.md)
- [UI/UX Design](./phase-2-d-monitoring/ui-ux.md)
- [Testing](./phase-2-d-monitoring/testing.md)

---

## Phase 2E: Client Feedback II

**Duration:** 1 day | **Status:** ✅ COMPLETE (Mar 11, 2026)

Breaking changes from March 10, 2026 client meeting: phone login, multi-area korlap, overtime redesign, audit trail.

**Verified Metrics:**
- Backend: 18 modules, ~130 endpoints, 1,264 tests (94.51% stmts)
- 2 new tables (user_areas, audit_logs), 4 new ADRs (012-015)
- Mobile + Web: identifier login, optional selfie, overtime API

### Documents
- [Overview](./phase-2-e-client-feedback-2/README.md)
- [Status](./phase-2-e-client-feedback-2/STATUS.md)
- [Database Guide](./phase-2-e-client-feedback-2/database.md)
- [Backend Guide](./phase-2-e-client-feedback-2/backend.md)
- [Mobile Guide](./phase-2-e-client-feedback-2/mobile.md)
- [Web Guide](./phase-2-e-client-feedback-2/web.md)
- [Testing](./phase-2-e-client-feedback-2/testing.md)

---

## Phase 3: Plants Management + Monitoring Rebuild + Public Intake

**Duration:** 5-7 weeks (73 dev-days) | **Status:** ✅ CLOSED (June 11, 2026) — All 21 sub-phases shipped (specs authored 2026-04-24)

Full rewrite of monitoring subsystem (Redis-backed event sourcing) plus new plants management, typed tasks, public pruning intake from kecamatan staff, generic service-capacity calendar, plant-seed inventory, **and M1-R Redesign Foundation that unifies the design tokens across mobile native + mobile-responsive web PWA + desktop web before any feature work begins**. 9 new ADRs (029–037), 8 new tables, 5 extended tables, ~35 new endpoints + push subscription, CSV backfill of 5,008 historical pruning records.

### Milestone Plan

| Milestone | Sub-phases | Effort | Goal |
|-----------|-----------|--------|------|
| **M1-R Redesign Foundation** | 3-R1, 3-R2, 3-R3, 3-R4, 3-R5 | 14 d | Unified token pipeline + brand fonts + NB primitives migration + NBModal/NBToast/NBText + Web PWA + mobile-web responsive + full sweep on every non-rewritten screen |
| **M1-S Schema + Spec Sync** | 3-1, 3-2 | 6 d | DB migrations + role extension + obsolete-info cleanup |
| **M2 Monitoring v2** | 3-3, 3-4, 3-5, 3-14 | 21 d | Redis Streams pipeline + supercluster + virtualized list + k6 load test |
| **M3 Plants & Typed Tasks** | 3-6, 3-7, 3-8, 3-13 | 15 d | Pruning task form + due-date forecast + CSV backfill |
| **M4 Public Intake + Capacity + Seeds** | 3-9, 3-10, 3-11, 3-12 | 16 d | Kecamatan submit → admin_data review → convert → outcome + capacity calendar + seed ledger |
| **M5 Documentation + Deploy** | 3-15 + rollout | 2 d + rollout | Pilot Selatan → all rayons |

### Key Deliverables
- **M1-R Redesign Foundation** (ADR-036, ADR-037): `scripts/build-tokens.ts` JSON-to-(CSS,TS) generator + `tokens-verify` CI gate + ESLint hex/shadow rules; Space Grotesk + Inter + JetBrains Mono brand fonts on both platforms; new `NBModal`/`NBToast`/`NBText` mobile components; Web installable PWA with offline shell + push subscription + `MobileInstallPush` banner directing satgas/linmas/korlap on phone browsers to native app; `ResponsiveShell` driving 375 / 768 / 1280 px layouts on every Phase-3 page; `(kecamatan)` minimal layout for `staff_kecamatan` role; full sweep migrating every existing non-Phase-3 screen onto the unified tokens (promoted from prior Phase 4 backlog)
- **Monitoring v2** (ADR-029): Redis Streams + Socket.IO Redis adapter, StatusProjectorService, StaffingDebouncerService, StaleStatusSweeperService, supercluster rendering (web + mobile), virtualized worker list, incremental WS patches
- **Plants catalog** (ADR-030): `plant_species` (131-species seed from CSV), `area_plants` aggregate inventory, optional `notable_plants`, due/overdue status
- **Task typing** (ADR-031): `task_type` enum + JSONB `custom_fields` schema registry, `parent_task_id` resume-tomorrow lineage, `target_plant_count`/`completed_plant_count` partial completion
- **Pruning-request workflow** (ADR-032): `staff_kecamatan` role (ADR-033), `admin_data` disposition authority (scoped by `users.rayon_id`), review → convert-to-task → outcome visibility
- **Pruning cycle prediction** (ADR-034): species × area_type lookup, deterministic with manual override
- **Service capacity** (ADR-035): generic `service_capacity` (rayon × ISO-week × service_type), implicit booking on task conversion
- **Plant-seed ledger**: `plant_seeds` + `seed_transactions` (purchase / distribution / adjustment)
- **CSV backfill**: 5,008 rows into `activities` + `activity_plant_items`, photo rehosting S3
- **k6 load test**: 500-worker simulation, SLO validation

### Documents
- [Overview](./phase-3-plants-monitoring-rebuild/README.md)
- [Status](./phase-3-plants-monitoring-rebuild/STATUS.md)
- [Backend Guide](./phase-3-plants-monitoring-rebuild/backend.md)
- [Mobile Guide](./phase-3-plants-monitoring-rebuild/mobile.md)
- [Web Guide](./phase-3-plants-monitoring-rebuild/web.md)
- [Database Guide](./phase-3-plants-monitoring-rebuild/database.md)
- [Infrastructure](./phase-3-plants-monitoring-rebuild/infrastructure.md)
- [Testing](./phase-3-plants-monitoring-rebuild/testing.md)
- [UI/UX](./phase-3-plants-monitoring-rebuild/ui-ux.md)
- [Implementation Journal](./phase-3-plants-monitoring-rebuild/status_progress.md)
- [Implementation Reviews](./phase-3-plants-monitoring-rebuild/status_reviews.md)
- [Deployment Checklist](./phase-3-plants-monitoring-rebuild/status_deployment_checklist.md)

---

## Phase 4: Production Readiness, Rebrand & UI/UX Revamp

**Duration:** 10-12 weeks (67-87 dev-days) | **Status:** ~98% code-side complete (Jun 11, 2026); on-device Maestro pending (no device access); iOS background-location deferred to Phase 5

Production hardening + **complete rebrand on Design System v2.1** (sage primary + warm stone canvas + pinwheel logo) + **production-readiness gap audit** (offline / push / background-location / broker). **13 sub-phases** — three new (4-0 Token Re-baseline 3-4 d, 4-R UI/UX Revamp Sweep 15-18 d, 4-V Gap Audit 4-5 d) plus the original ten 4-1…4-10 (trimmed). Trimmed 4-1 / 4-3 / 4-8 against Phase 3 deliveries (FCM live, Socket.IO Redis adapter live, web PWA shipped, generated tokens live). New ADRs 040 (Design System v2.1), 041 (Forgot-password contact-admin), 042 (Onboarding flow), 043 (Production gap-closure). Original 19 requirements + 4 new ones (#20 v2.1 adoption, #21 rebrand assets, #22 missing entry-flow screens, #23 gap audit).

### Key Deliverables
- Redis already adopted in Phase 3 (ADR-016 / ADR-029); Phase 4 inherits caching + JWT blacklist usage
- FCM activation with 8 trigger points, notification preferences
- Export module (CSV + Excel via exceljs for 7 entity types, ADR-018)
- Maestro mobile E2E (15+ flows, ADR-017), Playwright web E2E (20+ specs)
- JWT refresh token rotation, per-endpoint rate limiting, Helmet.js
- Offline sync completion with two-tier connectivity model (ADR-019)
- ProGuard, deep linking, PWA, SEO, NB compliance audit
- Task-status simplification (ADR-009 debt, 8 → 4) — backlog item inherited from Phase 3

### Documents
- [Overview](./phase-4-production-readiness/README.md)
- [Status](./phase-4-production-readiness/STATUS.md)
- [Backend Guide](./phase-4-production-readiness/backend.md)
- [Mobile Guide](./phase-4-production-readiness/mobile.md)
- [Web Guide](./phase-4-production-readiness/web.md)
- [Database Guide](./phase-4-production-readiness/database.md)
- [Infrastructure](./phase-4-production-readiness/infrastructure.md)
- [Testing](./phase-4-production-readiness/testing.md)
- [UI/UX](./phase-4-production-readiness/ui-ux.md)
- [Manual Testing](./phase-4-production-readiness/manual-testing.md)

---

## Phase 5: Finishing, Release & iOS

**Duration:** 7-9 weeks (49-64 dev-days) | **Status:** Release-prep ✅ (Jun 16); Feature modules (5-1 Reporting, 5-2 Analytics, 5-3 Assets) shipped code-side (Jun 17); 5-4 iOS prep done; remaining: export/import, guides, evaluation, E2E

8 sub-phases covering reporting, analytics, asset management, iOS platform, release/deployment, user documentation, evaluation, and E2E testing extension. 5 ADRs (024-028).

### Sub-Phases
- **5-1: Reporting Module** (10-13 days) — PDF/CSV/Excel reports, Puppeteer (ADR-024), 6 report types, scheduled generation
- **5-2: Analytics Module** (8-10 days) — 19 KPIs, materialized views (ADR-025), Redis cache, dashboards
- **5-3: Asset Management** (8-10 days) — QR codes (ADR-026), 6 categories, checkout/return, maintenance
- **5-4: iOS Platform** (8-10 days) — Apple Sign-In, biometrics, APNs, App Store (ADR-027)
- **5-5: Release & Deployment** (5-7 days) — Staging environment (ADR-028), production deployment
- **5-6: User Guides & Documentation** (5-7 days) — Web + mobile user guides, maintenance guide
- **5-7: Evaluation & Final Polish** (4-5 days) — Cross-phase review, sign-off
- **5-8: E2E Testing Extension** (5-7 days) — 13 Maestro + 11 Playwright new specs

### Key Deliverables
- 3 new backend modules (~25 new endpoints), 7 new DB tables, 3 materialized views
- 11 new web pages, 8 new mobile screens
- iOS App Store submission
- Staging + production deployment
- Comprehensive user guides and maintenance documentation

### Documents
- [Overview](./phase-5-finishing-ios/README.md)
- [Status](./phase-5-finishing-ios/STATUS.md)
- [Database Guide](./phase-5-finishing-ios/database.md)
- [Backend Guide](./phase-5-finishing-ios/backend.md)
- [Reporting Deep Dive](./phase-5-finishing-ios/reporting.md)
- [Analytics Deep Dive](./phase-5-finishing-ios/analytics.md)
- [Assets Deep Dive](./phase-5-finishing-ios/assets.md)
- [Web Guide](./phase-5-finishing-ios/web.md)
- [Mobile Guide](./phase-5-finishing-ios/mobile.md)
- [iOS Guide](./phase-5-finishing-ios/ios.md)
- [Infrastructure](./phase-5-finishing-ios/infrastructure.md)
- [Testing](./phase-5-finishing-ios/testing.md)
- [User Guide (Web)](./phase-5-finishing-ios/user-guide-web.md)
- [User Guide (Mobile)](./phase-5-finishing-ios/user-guide-mobile.md)
- [Maintenance](./phase-5-finishing-ios/maintenance.md)
- [Evaluation](./phase-5-finishing-ios/evaluation.md)

---

## Archived Phases

The following folders contain original specifications before the January 30, 2026 restructuring:

- `phase-3-analytics-ARCHIVED/` - Original Phase 3 (merged into Phase 4A)
- `phase-4-assets-ARCHIVED/` - Original Phase 4 (merged into Phase 4B)
- `phase-5-ios-ARCHIVED/` - Original Phase 5 (merged into Phase 4C)
- `phase-6-web-ARCHIVED/` - Original Phase 6 (merged into Phase 2D)

---

## Dependencies Between Phases

```
                Phase 1 (MVP)
                     |
                     v
           Phase 2A (Enhanced)
                     |
                     v
           Phase 2B (UI/UX Revamp)
                     |
                     v
       Phase 2C (Client Feedback) ✅
                     |
                     v
       Phase 2D (Monitoring Reimpl) ✅
                     |
                     v
       Phase 2E (Client Feedback II) ✅
                     |
                     v
   Phase 3 (Plants/Monitoring Rebuild) ← CURRENT
                     |
                     v
   Phase 4 (Production Readiness)
                     |
        +------+------+------+------+
        |      |      |      |      |
        v      v      v      v      v
      5-1    5-2    5-3    5-4    5-5..5-8
   (Report)(Anal.)(Asset) (iOS) (Release+)
```

**Critical Dependencies:**
- **Phase 1 → Phase 2A:** Phase 1 MVP must complete before Phase 2A
- **Phase 2A → Phase 2B:** Phase 2A implementation provides components to revamp
- **Phase 2B → Phase 2C:** Design system established before client feedback changes
- **Phase 2C → Phase 2D:** Monitoring reimplementation builds on Phase 2C role system
- **Phase 2D → Phase 2E:** Monitoring must be stable before client feedback changes
- **Phase 2E → Phase 3:** Plants/Monitoring Rebuild extends role system + activities from Phase 2E
- **Phase 3 → Phase 4:** Monitoring v2 + Redis infrastructure unblocks production hardening
- **Phase 4 → Phase 5:** Production readiness should complete before adding new features
- **Phase 5 sub-phases:** Can run in parallel with separate teams

**Recommended Sequence:**
1. **Phase 1** (Weeks 1-2) - MVP foundation ✅
2. **Phase 2A** (Weeks 3-4) - Enhanced features + Web ✅
3. **Phase 2B** (Weeks 5-8) - UI/UX Revamp ✅
4. **Phase 2C** (Weeks 9-14) - Client Feedback ✅
5. **Phase 2D** (Weeks 15-18) - Monitoring Reimplementation ✅
6. **Phase 2E** (Week 19) - Client Feedback II ✅
7. **Phase 3** (Weeks 20-23) - Plants/Monitoring Rebuild ← CURRENT
8. **Phase 4** (Weeks 24-31) - Production Readiness & Polishing
9. **Phase 5-1+5-2** (Weeks 32-35) - Reporting + Analytics (parallel)
10. **Phase 5-3+5-4** (Weeks 36-39) - Assets + iOS (parallel)
11. **Phase 5-5..5-8** (Weeks 40-42) - Release, docs, evaluation, E2E

---

## Related Documentation

- [Tech Specs Overview](../README.md)
- [Architecture](../architecture/)
- [API Contracts](../api/)
- [Database Schema](../database/)
- [UI/UX Design](../ui-ux/)
- [Testing Strategy](../testing/)
- [Deployment](../deployment/)

---

**Last Updated:** 2026-06-20
