# SEKAR Phase Dependency Matrix

**Document Owner:** Project Manager
**Created:** 2026-01-21
**Last Updated:** 2026-06-20
**Purpose:** Map dependencies across all development phases for effective planning and risk management

> **Note (2026-06-20):** Phase structure finalized as of June 2026: Phases 1-3 shipped/closed; Phase 4 ~98% code-side; Phase 5 feature-modules shipped, release-prep + guides pending. The legacy "Phase 3 = Analytics" / "Phase 4 = Assets" / "Phase 5 = iOS" section headers pre-date the January 30 & April 24, 2026 reorganizations — they are retained for historical context only. Current authoritative status: **`specs/COMPLETION_STATUS.md`**.

---

## Executive Summary

This document provides a comprehensive analysis of dependencies between SEKAR development phases. Understanding these dependencies is critical for:
- Proper sequencing of development work
- Resource allocation and team coordination
- Risk identification and mitigation
- Parallel development opportunities

**Key Finding:** Phase 1 MVP is the foundation for all subsequent phases. Phases 3-5 have a linear dependency chain, while Phase 6 (Web Dashboard) can proceed in parallel after Phase 2.

---

## Phase Overview

| Phase | Name | Duration | Status | Prerequisites |
|-------|------|----------|--------|---------------|
| 1 | MVP - Core Tracking | 2 weeks | **✅ COMPLETE** | None |
| 2A | Enhanced Features | 2 weeks | **✅ COMPLETE** | Phase 1 100% |
| 2B | UI/UX Revamp | 3-4 weeks | **✅ COMPLETE** | Phase 2A complete |
| 2C | Client Feedback | 4-6 weeks | **✅ COMPLETE & DEPLOYED** | Phase 2B complete |
| 2D | Real-Time Monitoring | 1 week | **✅ COMPLETE & DEPLOYED** | Phase 2C complete |
| 2E | Client Feedback II | 1 day | **✅ COMPLETE & DEPLOYED** | Phase 2D complete |
| 3 | Plants Management + Monitoring Rebuild + Public Intake | 5-7 weeks (73 dev-days) | **✅ CLOSED (Jun 11, 2026)** — All 21 sub-phases shipped | Phase 2E complete |
| 4 | Production Readiness, Rebrand & UI/UX Revamp | 10-12 weeks (67-87 d) | **~98% code-side (Jun 11); on-device Maestro ⏳** | Phase 3 complete (inherits Redis + monitoring v2 + FCM + PWA + tokens) |
| 5 | Finishing, Release & iOS | 7-9 weeks | **release-prep ✅ (Jun 16); features shipped (Jun 17); remaining: guides + eval** | Phase 4 code-side; iOS native + guides pending |

**Phase 3 Dependency Notes (closed 2026-06-11):**
- Depended on Phase 2E: consumed 8-role system (added `staff_kecamatan`, extended `admin_data` via ADR-032), `user_areas` multi-area model, `activities` table (extended with `custom_fields`, `plant_items`, `reference_code`, `pruning_request_id`), `audit_logs`.
- **Delivered:** M1-R Redesign Foundation (token pipeline + CI + ESLint + values + fonts + NB primitives + PWA + ResponsiveShell + full token-migration sweep), M1-S (spec sync + schema/roles), M2 (Redis Streams monitoring), M3 (plants + typed tasks), M4 (pruning intake + capacity + seeds), M5 (documentation + CSV backfill locally, prod cutover = manual step).
- **Unblocked Phase 4:** Redis 7 infrastructure (ADR-029), Socket.IO Redis adapter, caching layer, unified token pipeline all inherited. Task-status simplification debt (ADR-009, 8→4 statuses) handed to Phase 4 backlog.
- **Delivered to Phase 4 scope:** Load-testing baseline (k6 harness, 500-worker scenario validated May 29), security audit foundation, offline-sync groundwork.
- Critical path executed: Phase 2E → Phase 3 (M1-R + M1-S parallel → M2/M3/M4 parallel → M5) → Phase 4 → Phase 5.

---

## Phase-to-Phase Dependency Graph

```
                    ┌─────────────────────────────────────────────────┐
                    │                                                 │
                    │              PHASE 1 (MVP)                      │
                    │         ✅ COMPLETE - Foundation                │
                    │   Auth, Users, Areas, Shifts, Activities        │
                    │   Location, Supervisor Dashboard                │
                    │                                                 │
                    └───────────────────┬─────────────────────────────┘
                                        │
                                        ▼
                    ┌─────────────────────────────────────────────────┐
                    │                                                 │
                    │              PHASE 2A (Enhanced)                │
                    │         ✅ COMPLETE - Features                  │
                    │   Tasks, Notifications, KMZ, Web Dashboard      │
                    │   83 endpoints                                  │
                    │                                                 │
                    └───────────────────┬─────────────────────────────┘
                                        │
                                        ▼
                    ┌─────────────────────────────────────────────────┐
                    │                                                 │
                    │            PHASE 2B (UI/UX Revamp)              │
                    │         ✅ COMPLETE - Design System             │
                    │   Neo Brutalism 2.0, Design Tokens              │
                    │   26 Components, 39 Pages/Screens               │
                    │                                                 │
                    └───────────────────┬─────────────────────────────┘
            ┌───────────────┬─────────────────┬───────────────┐
            │               │                 │               │
            ▼               ▼                 ▼               ▼
        PHASE 2C        PHASE 2D         PHASE 2E         PHASE 3
      (Feedback I)   (Real-Time Mon)   (Feedback II)  (Plants/Mon v2)
       ✅ COMPLETE   ✅ COMPLETE &    ✅ COMPLETE &    ✅ CLOSED
                        DEPLOYED        DEPLOYED      (Jun 11, 2026)
                                                          │
                                                          ▼
                    ┌─────────────────────────────────────────────────┐
                    │                                                 │
                    │      PHASE 4 (Production Readiness)             │
                    │      ~98% (code-side Jun 11)                    │
                    │   FCM full, E2E, Security, Offline              │
                    │   Rebrand + UI/UX revamp (hifi v2.1)            │
                    │                                                 │
                    └───────────────────┬─────────────────────────────┘
                                        │
                                        ▼
                    ┌─────────────────────────────────────────────────┐
                    │                                                 │
                    │      PHASE 5 (Finishing, Release & iOS)         │
                    │      Release-prep ✅, Features ✅               │
                    │   Reporting, Analytics, Assets (5-1/2/3 done)   │
                    │   5-4 iOS prep done; 5-5/6/7/8 pending          │
                    │                                                 │
                    └─────────────────────────────────────────────────┘
```

---

## Detailed Feature Dependencies

### Phase 1 (MVP) - Foundation Components

**Provides to ALL phases:**

| Component | Used By | Dependency Type |
|-----------|---------|-----------------|
| JWT Authentication | All phases | **Hard** - Required |
| Users Module (CRUD, Roles) | All phases | **Hard** - Required |
| Areas Module (GPS boundaries) | Phase 2-6 | **Hard** - Required |
| Shifts Module (Clock-in/out) | Phase 2-5 | **Hard** - Required |
| Reports Module | Phase 2-6 | **Hard** - Required |
| Location Module | Phase 2-5 | **Hard** - Required |
| Supervisor Module | Phase 3, 6 | **Hard** - Required |
| S3 Service (photo uploads) | Phase 2-6 | **Hard** - Required |
| Mobile Navigation Structure | Phase 2-5 | **Soft** - Reusable |
| Redux Store Setup | Phase 2-5 | **Soft** - Extendable |

---

### Phase 2 (Enhanced Features) Dependencies

**Requires from Phase 1:**

| Dependency | Source | Type | Notes |
|------------|--------|------|-------|
| Authentication system | Auth Module | Hard | FCM token tied to user |
| User management | Users Module | Hard | Task assignment to workers |
| Area management | Areas Module | Hard | Tasks linked to areas |
| Shift context | Shifts Module | Hard | Tasks during active shifts |
| GPS validation | Location Module | Hard | Polygon boundary validation |
| S3 service | Shared Module | Hard | Task completion photos |

**Provides to Phase 3:**

| Component | Consumer | Notes |
|-----------|----------|-------|
| Tasks Module | Analytics | Task metrics, completion rates |
| Notifications Module | Analytics | Alert system for scheduled reports |
| FCM Infrastructure | Report Scheduler | Email/push report delivery |

**Provides to Phase 6:**

| Component | Consumer | Notes |
|-----------|----------|-------|
| Tasks Module | Web Dashboard | Task management UI |
| KMZ Import | Web Dashboard | Area boundary editor |

---

### Phase 2A (UI/UX Revamp) Dependencies

**Requires from Phase 2:**

| Dependency | Source | Type | Notes |
|------------|--------|------|-------|
| All web components | `apps/web/src/components/` | Hard | Components to update |
| All mobile components | `apps/mobile/src/components/nb/` | Hard | Components to update |
| Design token files | CSS/TypeScript | Hard | Token sources to update |
| All web pages | `apps/web/src/app/` | Hard | Pages to update |
| All mobile screens | `apps/mobile/src/screens/` | Hard | Screens to update |

**Provides to Phase 3:**

| Component | Consumer | Notes |
|-----------|----------|-------|
| Updated design tokens | E2E visual tests | Consistent styling |
| Updated components | Manual testing | Visual consistency |
| Accessibility fixes | E2E accessibility tests | WCAG compliance |
| Mobile-web parity | Cross-platform testing | Consistent UX |

**Key Deliverables:**

| Deliverable | Quantity | Notes |
|-------------|----------|-------|
| Design token updates | 2 files | globals.css, nbTokens.ts |
| Web component updates | 16 | NB components |
| Mobile component updates | 10 | NB components |
| Web page updates | 22 | Dashboard pages |
| Mobile screen updates | 17 | App screens |
| Accessibility fixes | 18 | ARIA, focus, roles |

**Non-Breaking Updates:**
- Visual-only changes (colors, borders, shadows, radius)
- No API changes
- No navigation changes
- No database changes

---

### Phase 3 (Plants Management + Monitoring Rebuild) Dependencies — ✅ CLOSED

**Consumed from Phase 2E:**

| Dependency | Source | Type | Status |
|------------|--------|------|--------|
| 8-role system + `staff_kecamatan` | Users Module | Hard | ✅ Shipped |
| `user_areas` multi-area model | Users Module | Hard | ✅ Shipped |
| `activities` (extended) | Activities Module | Hard | ✅ Extended with `custom_fields`, `plant_items`, `pruning_request_id` |
| `audit_logs` | Audit Module | Hard | ✅ Shipped |
| Redis Streams infrastructure | Monitoring v2 | Hard | ✅ Delivered (ADR-029) |

**Delivered to Phase 4:**

| Component | Consumer | Notes |
|-----------|----------|-------|
| Redis 7 + Socket.IO Redis adapter | Monitoring, caching | Inherited by Phase 4 |
| Token pipeline (generated/) | All UI layers | Inherited by Phase 4 + Phase 5 |
| Load-test baseline (k6) | Phase 4+ releases | 500-worker scenario validated May 29 |
| Monitoring v2 event sourcing | Phase 4 enhancements | Redis Streams + status calculation stable |
| Task-status debt (8→4 simplification) | Phase 4 backlog | ADR-009 deferred |

---

### Phase 4 (Production Readiness & Rebrand) Dependencies

**Inherits from Phase 3:**

| Inheritance | Source | Type | Status |
|-------------|--------|------|--------|
| Redis 7 + Socket.IO Redis adapter | Phase 3 Monitoring v2 | Hard | ✅ In use |
| Token pipeline (generated/) | Phase 3 M1-R | Hard | ✅ All 3 platforms |
| Security + offline-sync groundwork | Phase 3 foundations | Hard | ✅ Leveraged |

**Delivers to Phase 5:**

| Component | Consumer | Notes |
|-----------|----------|-------|
| Sentry + structured logging | All platforms | Observability inherited |
| JWT rotation + refresh-token model | Auth system | Inherited by Phase 5 |
| Maestro E2E harness | Phase 5-8 | 15 flows authored; on-device pending |
| WCAG-AA a11y gate | Phase 5+ releases | CI gate in place |
| Design System v2.1 (rebrand) | All screens | Pinwheel brand + sage/stone palette |

---

### Phase 5 (Finishing, Release & iOS) Dependencies

**Inherited from Phase 4:**

| Inheritance | Source | Type | Status (code-side Jun 17) |
|-------------|--------|------|--------|
| Sentry + structured logging | Phase 4 observability | Hard | ✅ Integrated mobile/web |
| JWT rotation + refresh model | Phase 4 auth | Hard | ✅ Code-side |
| Design System v2.1 | Phase 4 rebrand | Hard | ✅ Tokens migrated; screens updated |

**Feature Modules (5-1/5-2/5-3) — ✅ Code-side Complete (Jun 17):**

| Module | Backend | Web | Mobile | Status |
|--------|---------|-----|--------|--------|
| **5-1 Reporting** | 8 endpoints (sync/async/export) + puppeteer-core + handlebars | 4 pages (builder/schedules/detail/history) | 1 screen (Reports list/detail) | ✅ Built |
| **5-2 Analytics** | 7 endpoints + 3 materialized views + WeightedScoreService + nightly cron | 5 pages (dashboards + Recharts charts) | 2 screens (Worker/Team analytics) | ✅ Built |
| **5-3 Assets** | 14 endpoints (CRUD/QR/maintenance) + QR code service (ADR-026) + overdue cron | 5 pages (list/new/detail/QR/maintenance) | 5 screens (list/detail/scanner/checkout/return) | ✅ Built |

**Remaining Phase 5 Work:**

| Sub-phase | Task | Dependencies | Status |
|-----------|------|--------------|--------|
| **5-4** | iOS native (Apple Sign-In, biometrics, APNs) | Needs Mac (unavailable) | ⏳ Prep done; native execution deferred |
| **5-5** | Release & Deployment (staging→prod) | Phase 4 code + release.sh script | ⏳ Documented; execution pending UAT |
| **5-6** | User Guides (web + mobile) | Feature-complete code | ⏳ Content authoring pending |
| **5-7** | Evaluation & Final Polish | All prior phases | ⏳ Cross-phase review pending |
| **5-8** | E2E Testing Extension | Maestro + Playwright infrastructure | ⏳ 13 Maestro + 11 Playwright specs pending device/automation |

---

### Phase 6 (Web Dashboard) Dependencies

**Requires from Phase 1:**

| Dependency | Source | Type | Notes |
|------------|--------|------|-------|
| All backend APIs | Backend Modules | Hard | CRUD operations |
| Authentication | Auth Module | Hard | Web JWT handling |
| User management | Users Module | Hard | User CRUD UI |
| Area management | Areas Module | Hard | Map-based area editor |
| Supervisor APIs | Supervisor Module | Hard | Dashboard data |

**Requires from Phase 2:**

| Dependency | Source | Type | Notes |
|------------|--------|------|-------|
| Task management | Tasks Module | Soft | Task CRUD UI |
| KMZ import | Import Module | Soft | Area boundary import |

**Requires from Phase 3 (Soft):**

| Dependency | Source | Type | Notes |
|------------|--------|------|-------|
| Analytics endpoints | Analytics Module | Soft | Dashboard charts |
| Report builder | Report Builder | Soft | Custom reports |

**Note:** Phase 6 can start after Phase 2 with basic functionality. Phase 3 dependencies are soft - analytics features can be added incrementally.

---

## Database Schema Dependencies

### Phase 1 Core Tables (Foundation)

```
users              ◄─── All phases depend on this
area_types         ◄─── Phase 1, 2, 4
areas              ◄─── Phase 1-6
worker_assignments ◄─── Phase 1-5
shifts             ◄─── Phase 1-5
work_reports       ◄─── Phase 1-6
location_logs      ◄─── Phase 1-5 (partitioned)
```

### Phase 2 New Tables

```
tasks              ► Requires: users, areas
notification_tokens ► Requires: users
notifications      ► Requires: users
```

**Schema Change:** `areas.boundary_polygon` (JSONB) - Polygon support for KMZ import

### Phase 3 New Tables

```
report_templates   ► Requires: users
generated_reports  ► Requires: report_templates, users
```

**Database Views:**
- `worker_performance_metrics` - Aggregates shifts, reports, tasks

### Phase 4 New Tables

```
assets             ► Requires: users, areas
asset_types        ► Standalone lookup
asset_assignments  ► Requires: assets, users, areas
maintenance_records ► Requires: assets, users
```

### Phase 6 New Tables

```
audit_logs         ► Requires: users (partitioned)
scheduled_reports  ► Requires: users, report_templates
system_settings    ► Standalone config
```

---

## API Endpoint Dependencies

### Phase 1 Endpoints (Foundation) - 37 endpoints

All subsequent phases extend these base endpoints.

### Phase 2 New Endpoints

| Module | Endpoints | Depends On |
|--------|-----------|------------|
| Tasks | 11 | users, areas, shifts |
| Notifications | 5 | users |
| Import | 3 | areas |
| **Total** | **19** | |

### Phase 3 New Endpoints

| Module | Endpoints | Depends On |
|--------|-----------|------------|
| Analytics | 7 | users, shifts, reports, tasks |
| Report Builder | 7 | users, all data tables |
| WebSocket | 6 events | location, shifts |
| **Total** | **14+** | |

### Phase 4 New Endpoints

| Module | Endpoints | Depends On |
|--------|-----------|------------|
| Assets | 11 | users, areas |
| Asset Types | 5 | none |
| Maintenance | 10 | assets, users |
| **Total** | **26** | |

### Phase 5 Backend Additions

| Module | Endpoints | Depends On |
|--------|-----------|------------|
| Auth (Apple) | 2 | auth module |
| Attestation | 2 | auth module |
| **Total** | **4** | |

### Phase 6 New Endpoints

| Module | Endpoints | Depends On |
|--------|-----------|------------|
| Bulk Operations | 6 | users, areas, assets |
| Audit Logs | 2 | users |
| System Settings | 2 | none |
| **Total** | **10** | |

---

## Mobile Component Dependencies

### Phase 1 Base Components (Reused in all phases)

| Component | Type | Used By |
|-----------|------|---------|
| Button | UI | All phases |
| Card | UI | All phases |
| TextInput | UI | All phases |
| LoadingSpinner | UI | All phases |
| ErrorBanner | UI | All phases |
| Header | Layout | All phases |
| MapView | Map | Phase 2-5 |
| PhotoPicker | Media | Phase 2-5 |
| ShiftTimer | Feature | Phase 2-5 |
| ReportCard | Feature | Phase 2-6 |
| SyncStatusIndicator | Offline | Phase 2-5 |

### Phase 2 New Components

| Component | Dependencies |
|-----------|--------------|
| TaskCard | Card, Button |
| TaskDetailView | MapView, PhotoPicker |
| NotificationBadge | None |
| PushNotificationHandler | FCM SDK |

### Phase 4 New Components

| Component | Dependencies |
|-----------|--------------|
| QRScannerView | Camera SDK |
| AssetCard | Card |
| MaintenanceForm | TextInput, PhotoPicker |

### Phase 5 Platform-Specific

| Component | Platform | Dependencies |
|-----------|----------|--------------|
| AppleSignInButton | iOS | Native SDK |
| SiriShortcutDonator | iOS | Native SDK |
| BiometricPrompt | Both | react-native-biometrics |

---

## Critical Path Analysis

### Fastest Path to Production (All Features)

```
Week 1-2:   Phase 1 (MVP)         ✅ COMPLETE
Week 3-4:   Phase 2 (Enhanced)    ── Start immediately
Week 5-6:   Phase 3 (Analytics)   \
                                   } Can run in parallel with separate teams
Week 5-7:   Phase 6 (Web)         /
Week 7-8:   Phase 4 (Assets)
Week 9-10:  Phase 5 (iOS)
───────────────────────────────────
Total: ~10 weeks (with parallel tracks)
```

### Blockers and Risk Points

| Phase | Blocker Risk | Impact | Mitigation |
|-------|-------------|--------|------------|
| Phase 2 | FCM configuration | High | Test on real devices early |
| Phase 2 | KMZ parsing edge cases | Medium | Use actual DLH KMZ files |
| Phase 3 | Analytics query performance | Medium | Index optimization, caching |
| Phase 4 | QR scanner compatibility | Medium | Test on multiple devices |
| Phase 5 | App Store review | High | Plan 2-week buffer |
| Phase 6 | Scope creep | Medium | Strict MVP scope for web |

---

## Parallel Development Opportunities

### Track A: Mobile Development

```
Phase 1 ► Phase 2 ► Phase 4 ► Phase 5
(Mobile foundation expands incrementally)
```

### Track B: Backend Development

```
Phase 1 ► Phase 2 ► Phase 3 ► Phase 4
(Backend modules with analytics)
```

### Track C: Web Development (Independent after Phase 2)

```
Phase 2 ───► Phase 6
(Can start once Tasks/Notifications APIs available)
```

### Team Allocation Recommendation

| Week | Backend Team | Mobile Team | Web Team |
|------|-------------|-------------|----------|
| 1-2 | Phase 1 | Phase 1 | - |
| 3-4 | Phase 2 | Phase 2 | - |
| 5-6 | Phase 3 | Phase 2 polish | Phase 6 (start) |
| 7-8 | Phase 4 | Phase 4 | Phase 6 |
| 9-10 | Phase 5 support | Phase 5 | Phase 6 polish |

---

## Documentation Completeness Assessment

### Phase 1 (MVP) - COMPLETE

| File | Status | Quality |
|------|--------|---------|
| README.md | Complete | Comprehensive |
| STATUS.md | Complete | Consolidated with IMPLEMENTATION_SUMMARY |
| backend.md | Complete | Implementation guide |
| mobile.md | Complete | Implementation guide |
| timeline.md | Complete | Day-by-day |

**Note:** `IMPLEMENTATION_SUMMARY.md` merged into `STATUS.md`. Testing covered in STATUS.md.

### Phase 2 (Enhanced Features)

| File | Status | Quality |
|------|--------|---------|
| README.md | Complete | Goals, features, schema |
| STATUS.md | Complete | Tracking template ready |
| backend.md | Complete | Detailed implementation |
| mobile.md | Stub | Needs implementation guide |
| web.md | Stub | Needs implementation guide |
| timeline.md | Stub | Needs day-by-day breakdown |
| testing.md | Stub | Needs test scenarios |

**Assessment:** Backend guide is solid; mobile/web/timeline need expansion.

### Phase 3 (Analytics & Reporting)

| File | Status | Quality |
|------|--------|---------|
| README.md | Complete | Comprehensive features |
| STATUS.md | Complete | Tracking template ready |
| backend.md | Complete | Detailed implementation |
| mobile.md | Stub | Needs implementation guide |
| web.md | Stub | Needs implementation guide |
| timeline.md | Stub | Needs day-by-day breakdown |
| testing.md | Stub | Needs test scenarios |

**Assessment:** Backend guide is strong; other docs need expansion.

### Phase 4 (Asset Management)

| File | Status | Quality |
|------|--------|---------|
| README.md | Complete | Features and specs |
| STATUS.md | Complete | Tracking template ready |
| backend.md | Complete | Detailed entities and endpoints |
| mobile.md | Stub | Needs implementation guide |
| web.md | Stub | Needs implementation guide |
| timeline.md | Stub | Needs day-by-day breakdown |
| testing.md | Stub | Needs test scenarios |

**Assessment:** Backend spec is excellent; mobile/web need work.

### Phase 5 (iOS & Advanced)

| File | Status | Quality |
|------|--------|---------|
| README.md | Complete | Features and platform details |
| STATUS.md | Complete | Tracking template ready |
| backend.md | Stub | Needs Apple Auth details |
| mobile.md | Stub | Needs iOS implementation guide |
| web.md | N/A | Not applicable |
| timeline.md | Stub | Needs day-by-day breakdown |
| testing.md | Stub | Needs iOS test scenarios |

**Assessment:** README has good overview; implementation details sparse.

### Phase 6 (Web Dashboard)

| File | Status | Quality |
|------|--------|---------|
| README.md | Complete | Features and code samples |
| STATUS.md | Complete | Tracking template ready |
| backend.md | Stub | Needs audit/bulk details |
| mobile.md | N/A | Not applicable |
| web.md | Stub | Needs Next.js implementation |
| timeline.md | Stub | Needs day-by-day breakdown |
| testing.md | Stub | Needs E2E test scenarios |

**Assessment:** README has good code samples; implementation docs need expansion.

---

## Documentation Priority Matrix

Files that need immediate attention before Phase 2 starts:

| Priority | Phase | File | Effort |
|----------|-------|------|--------|
| P0 | Phase 2 | mobile.md | High |
| P0 | Phase 2 | timeline.md | Medium |
| P1 | Phase 2 | testing.md | Medium |
| P1 | Phase 2 | web.md | Medium |
| P2 | Phase 3 | mobile.md | Medium |
| P2 | Phase 3 | timeline.md | Medium |

---

## Recommendations

### Immediate Actions (Before Phase 2)

1. **Complete Phase 2 mobile.md** - FCM integration and task screens
2. **Complete Phase 2 timeline.md** - Day-by-day task breakdown
3. **Validate Phase 1 deployment** - Ensure all MVP features work

### Risk Mitigations

1. **FCM Setup Risk:** Create a test Firebase project in Week 1 of Phase 2
2. **KMZ Parsing Risk:** Obtain sample KMZ files from DLH immediately
3. **iOS App Store Risk:** Start Apple Developer enrollment during Phase 3

### Team Coordination

1. **Backend-Mobile Sync:** API contracts must be finalized at Phase start
2. **Design-Development Sync:** Mockups for new screens due 3 days before implementation
3. **QA Integration:** QA engineer reviews STATUS.md daily during active phases

---

## Version History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2026-01-21 | Project Manager | Initial creation |

---

**Related Documents:**
- [Phases Overview](./README.md)
- [Phase 1 Status](./phase-1-mvp/STATUS.md)
- [API Contracts](../api/contracts.md)
- [Database Schema](../database/schema.md)
- [Completion Status](../COMPLETION_STATUS.md)
