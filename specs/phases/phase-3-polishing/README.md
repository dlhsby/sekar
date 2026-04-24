# Phase 3: Production Readiness & Polishing

**Date:** March 12, 2026
**Status:** Not Started
**Priority:** High — Pre-Production Hardening
**Duration:** 52-68 developer-days estimated (7-9 weeks)
**Depends On:** Phase 2E (Complete)
**Related ADRs:** [ADR-016](../../architecture/decisions/ADR-016-redis-websocket-scaling.md), [ADR-017](../../architecture/decisions/ADR-017-maestro-mobile-e2e.md), [ADR-018](../../architecture/decisions/ADR-018-export-format-strategy.md), [ADR-019](../../architecture/decisions/ADR-019-offline-connectivity-model.md)

---

## Overview

Phase 3 transforms SEKAR from a feature-complete application into a production-hardened system. While all core features exist (18 modules, ~130 endpoints, 22 mobile screens, 24+ web pages), the codebase lacks production infrastructure: no Redis caching, no structured logging, no export functionality, incomplete offline sync, FCM wired but not activated, no E2E testing, and security gaps (no refresh tokens, no rate limiting per endpoint).

This phase addresses **12 user requirements** and **7 additional polishing areas** organized into 10 sub-phases with clear dependency ordering.

### Requirements Summary (19 Items)

| # | Requirement | Source | Sub-Phase |
|---|-------------|--------|-----------|
| 1 | Offline sync for all features (differentiate no-internet vs server-unreachable) | User | 3-2 |
| 2 | Push notification (FCM full activation) | User | 3-3 |
| 3 | Refactor (SOLID, five-lines-of-code, reusable components) | User | 3-7 |
| 4 | Optimization on all features | User | 3-7 |
| 5 | WebSocket evaluation | User | 3-1 |
| 6 | Message broker (if needed) | User | 3-1 |
| 7 | Worker reassignment (multi-area with default area) | User | 3-4 |
| 8 | Real data seeder and import | User | 3-6 |
| 9 | Import KMZ from web | User | 3-5 |
| 10 | Export and importable data for all | User | 3-5 |
| 11 | Update and sync documentation | User | 3-10 |
| 12 | UI/UX polish for all (mobile and web) | User | 3-8 |
| 13 | Security hardening (rate limiting, JWT refresh, CORS, Helmet.js) | Additional | 3-7 |
| 14 | Observability & logging (structured logging, Sentry, request tracing) | Additional | 3-1 |
| 15 | Data management (retention policy, soft-delete cleanup, index audit) | Additional | 3-6 |
| 16 | Mobile production readiness (ProGuard, crash reporting, deep linking) | Additional | 3-8 |
| 17 | Web production readiness (SEO, PWA, bundle analysis) | Additional | 3-8 |
| 18 | Timezone & localization (WIB consistency, DD/MM/YYYY format) | Additional | 3-2, 3-7 |
| 19 | Background jobs & audit (cron jobs, audit trail completeness) | Additional | 3-3, 3-4 |

---

## Current Codebase Facts (Verified March 12, 2026)

| Fact | Current State | Target State |
|------|---------------|--------------|
| Backend modules | 18 modules, ~130 endpoints | +1 ExportModule, +1 HealthModule |
| Backend tests | 1,264 tests (94.51% stmts) | >1,500 tests (>90% stmts maintained) |
| Mobile screens | 21 screens | 22 screens (+NotificationsScreen) |
| Mobile tests | 3,669+ tests (80.31%+ coverage) | >4,000 tests (>80% maintained) |
| Web pages | 21 pages (+1 config) | 24+ pages (+import, +export, +notifications) |
| Database tables | 22 tables, 6 migrations | 24 tables (+notification_preferences, +export_jobs) |
| Redis | Not installed | Redis 7 for caching, Socket.IO adapter, notification retry |
| Structured logging | console.log / Logger inconsistent | @nestjs/common Logger with JSON format |
| Sentry | Not integrated | Backend + Mobile crash reporting |
| FCM | Infrastructure complete, FCM_ENABLED=false | FCM_ENABLED=true, 8 trigger points wired |
| Export | None | CSV + Excel via exceljs for 7 entity types |
| Offline sync | 4 of 7 action types covered | All 7+ action types with connectivity indicator |
| JWT | 7-day expiry, no refresh token | Refresh token rotation with Redis blacklist |
| E2E testing | 8 Playwright specs (web), no mobile E2E | 20+ Playwright specs, 15+ Maestro flows |
| Deep linking | Not configured | Android App Links + iOS Universal Links |
| Rate limiting | Global 100 req/min only | Per-endpoint limits (file upload 10/min, export 5/min) |

---

## Implementation Phases

| Sub-Phase | Name | Effort | Dependencies | Requirements |
|-----------|------|--------|-------------|--------------|
| **3-1** | Infrastructure & Evaluation | 4-5 days | None | #5, #6, #14 |
| **3-2** | Offline Sync Completion | 4-5 days | 3-1 (health endpoint) | #1, #18 |
| **3-3** | Push Notification Activation | 5-6 days | 3-1 (Redis retry queue) | #2, #19 |
| **3-4** | Worker Reassignment Workflow | 3-4 days | None | #7, #19 |
| **3-5** | Export & Import Data | 5-7 days | None | #9, #10 |
| **3-6** | Real Data Seeder & Data Management | 4-5 days | 3-5 (CSV import) | #8, #15 |
| **3-7** | Refactor, Optimization & Security | 12-15 days | 3-1 (Redis) | #3, #4, #13, #18 |
| **3-8** | UI/UX Polish & Production Readiness | 5-7 days | None | #12, #16, #17 |
| **3-9** | E2E Testing | 7-8 days | 3-2 through 3-8 | ADR-017 |
| **3-10** | Documentation Sync | 2-3 days | All | #11 |

**Total estimated:** 52-68 developer-days

> **Note:** Estimates revised based on expert architectural review (March 2026). 3-7 increased from 7-9 to 12-15 days (3 service extractions + JWT refresh + rate limiting + timezone audit). 3-9 increased from 5-6 to 7-8 days (CI pipeline setup with KVM and emulator takes 2-3 days).

### Parallelization Opportunities

```
Week 1-2:  3-1 (Infrastructure) ──────────────┐
           3-2 (Offline Sync) ←── start early │   ← 3-4 depends on 3-2 (offlineQueue.ts)
           3-5 (Export/Import) ─────────┐     │
                                       │      │
Week 2-3:  3-2 (Offline Sync) ←───────────── 3-1
           3-3 (Push Notifications) ←──────── 3-1
           3-6 (Data Mgmt) ←────────── 3-5    │
           3-4 (Reassignment) ←── 3-2 merged  │   ← start AFTER 3-2 offlineQueue changes
                                               │
Week 3-5:  3-7 (Refactor/Security) ←──────── 3-1
           3-8 (UI/UX Polish) ─────────────────┤
                                               │
Week 6-8:  3-9 (E2E Testing) ←─── 3-2..3-8   │
           3-10 (Doc Sync) ←─── All ──────────┘
```

### Sub-Phase Dependency Notes

- **3-4 (Reassignment) has a soft dependency on 3-2 (Offline Sync):** Both sub-phases modify `offlineQueue.ts`. If run in parallel, merge conflicts are likely. **Recommendation:** Start 3-2 first; begin 3-4 only after 3-2's offlineQueue changes are merged.
- **3-1 (Infrastructure) → 3-7 (Refactoring) sequencing for Redis adapter:** The `@socket.io/redis-adapter` **cannot be activated** until `emitToUser()` is refactored to room-based emit in sub-phase 3-7 (see ADR-016 HARD DEPENDENCY). In 3-1, install Redis and use it for caching/rate-limiting/JWT blacklist only. Defer WebSocket adapter activation to 3-7 after the emit refactor is complete.

---

### 3-1: Infrastructure & Evaluation (4-5 days)

**Requirements:** #5 WebSocket eval, #6 message broker, #14 observability

| Task | Scope | Key Files |
|------|-------|-----------|
| A1. WebSocket connection stability audit | Measure reconnection rate, room join latency, memory per connection | `be/src/gateways/events.gateway.ts` |
| A2. Redis adoption decision (ADR-016) | Socket.IO adapter, notification retry queue, MonitoringCacheService externalization | New: `be/docker-compose.yml`, `be/src/config/redis.config.ts` |
| A3. Docker Compose update | Add `redis:7-alpine` service, Sentry DSN env vars | `infra/docker-compose.yml` |
| B1. Structured logging setup | `@nestjs/common Logger` with JSON format in production | `be/src/main.ts`, `be/src/common/interceptors/logging.interceptor.ts` |
| B2. Request tracing middleware | X-Request-ID generation and propagation | New: `be/src/common/middleware/request-id.middleware.ts` |
| B3. Sentry integration (backend) | Error capture, transaction tracing, source maps | `be/src/main.ts`, `be/src/common/filters/` |
| B4. Sentry integration (mobile) | Crash reporting, breadcrumbs, navigation tracing | `fe/mobile/src/App.tsx`, `fe/mobile/android/app/build.gradle` |
| B5. Slow query interceptor | Log queries >500ms with query plan | New: `be/src/common/interceptors/slow-query.interceptor.ts` |
| C1. Health module | GET /health (lightweight), GET /health/full (DB + Redis check) | New: `be/src/modules/health/` |
| C2. Redis service setup | Connection pool, graceful shutdown, health check | New: `be/src/common/services/redis.service.ts` |

**Deliverables:** ADR-016 written, Redis in docker-compose, logging middleware, health module, Sentry configured

---

### 3-2: Offline Sync Completion (4-5 days)

**Requirements:** #1 offline sync, #18 timezone consistency

| Task | Scope | Key Files |
|------|-------|-----------|
| A1. ConnectivityStatus enum (ADR-019) | ONLINE, NO_INTERNET, SERVER_UNREACHABLE | New: `fe/mobile/src/services/sync/connectivityStatus.ts` |
| A2. Network/server detection | NetInfo for internet, GET /health for server reachability | `fe/mobile/src/services/sync/syncManager.ts` |
| A3. Heartbeat polling | GET /health every 30s in degraded state | `fe/mobile/src/services/sync/syncManager.ts` |
| B1. Queue expansion — overtime | Add overtime-start, overtime-end to offline queue | `fe/mobile/src/services/sync/offlineQueue.ts` |
| B2. Queue expansion — tasks | Add task-completion to offline queue | `fe/mobile/src/services/sync/offlineQueue.ts` |
| B3. Queue expansion — reassignment | Add worker-reassignment to offline queue | `fe/mobile/src/services/sync/offlineQueue.ts` |
| C1. Connectivity UI banners | Yellow "No Internet" vs Orange "Server Unreachable" | `fe/mobile/src/components/common/ConnectivityBanner.tsx` |
| C2. Timezone verification | Verify all offline-queued timestamps use Asia/Jakarta before sync | `fe/mobile/src/services/sync/offlineQueue.ts` |
| C3. Conflict resolution | Last-write-wins with server timestamp authority | `fe/mobile/src/services/sync/syncManager.ts` |

**Deliverables:** ADR-019 written, SyncManager upgraded, 4 new queue item types, connectivity banner

---

### 3-3: Push Notification Activation (5-6 days)

**Requirements:** #2 FCM activation, #19 cron jobs

| Task | Scope | Key Files |
|------|-------|-----------|
| A1. Wire FCM triggers (8 points) | Set FCM_ENABLED=true, wire sendToUser() | `be/src/modules/notifications/notifications.service.ts` |
| A2-A9. Individual trigger wiring | Task assigned/completed/revision, Activity approved/rejected, Overtime approved/rejected, Missing alert | See [backend.md](./backend.md) section C |
| B1. Shift reminder cron | @Cron 15min before shift start → FCM | New: `be/src/modules/notifications/cron/shift-reminder.cron.ts` |
| B2. Stale status cleanup cron | Remove stale user_tracking_status entries | New: `be/src/modules/monitoring/cron/stale-status.cron.ts` |
| C1. Notification preferences table | Per-user opt-out by type | New: `be/src/modules/notifications/entities/notification-preference.entity.ts` |
| C2. Notification preferences CRUD | GET/PATCH endpoints | `be/src/modules/notifications/notifications.controller.ts` |
| D1. Mobile token registration | Register on login, deregister on logout | `fe/mobile/src/services/fcm/fcmService.ts` |
| D2. Mobile foreground handling | Toast with deep-link action | `fe/mobile/src/services/fcm/fcmService.ts` |
| D3. Mobile NotificationsScreen | List, filter, mark-read (22nd screen) | New: `fe/mobile/src/screens/notifications/NotificationsScreen.tsx` |
| E1. Web notification bell | Nav header, popover with last 5 unread | New: `fe/web/src/components/nb/NBNotificationBell.tsx` |
| E2. Web notifications page | /dashboard/notifications | New: `fe/web/src/app/(dashboard)/notifications/page.tsx` |

**Deliverables:** 8 FCM triggers, 2 cron jobs, notification_preferences table, NotificationsScreen, web notification bell + page

---

### 3-4: Worker Reassignment Workflow (3-4 days)

**Requirements:** #7 reassignment, #19 audit trail completeness

| Task | Scope | Key Files |
|------|-------|-----------|
| A1. Verify ReassignWorkerModal | Review existing untracked file, complete if needed | `fe/mobile/src/components/modals/ReassignWorkerModal.tsx` |
| A2. Mobile confirmation step | Confirm dialog before reassignment | `fe/mobile/src/components/modals/ReassignWorkerModal.tsx` |
| A3. Offline queue support | Queue reassignment when offline | `fe/mobile/src/services/sync/offlineQueue.ts` |
| A4. Reassignment history | Show in UserDetailSheet | `fe/mobile/src/components/monitoring/UserDetailSheet.tsx` |
| B1. Web bulk reassignment | Select multiple workers, assign to area | New: `fe/web/src/components/monitoring/BulkReassignModal.tsx` |
| B2. Area capacity indicator | Current/required staffing in reassignment UI | `fe/web/src/components/monitoring/MonitoringSidePanel.tsx` |
| C1. Audit trail coverage | Verify all reassignment actions logged | `be/src/modules/monitoring/monitoring.service.ts` |
| C2. Audit completeness check | All entity modifications have audit logging | `be/src/modules/audit/audit.service.ts` |

**Deliverables:** Complete reassignment flow mobile+web, audit coverage verified

---

### 3-5: Export & Import Data (5-7 days)

**Requirements:** #9 KMZ web import, #10 export/import all

| Task | Scope | Key Files |
|------|-------|-----------|
| A1. ExportModule scaffold | Module, service, controller | New: `be/src/modules/export/` |
| A2. CSV/Excel export (ADR-018) | generateCsv + generateExcel via exceljs | `be/src/modules/export/export.service.ts` |
| A3. Export endpoint | POST /export with body `{ entityType, format, filters }` — returns 202 Accepted (async) or 200 OK (sync) | `be/src/modules/export/export.controller.ts` |
| A4. Async export_jobs | Queue large exports (>5000 rows) | New: `be/src/modules/export/entities/export-job.entity.ts` |
| A5. 7 entity exporters | users, areas, rayons, tasks, activities, overtime, schedules | `be/src/modules/export/exporters/` |
| B1. CSV import endpoints | POST /import/users/csv, /areas/csv | `be/src/modules/import/import.controller.ts` |
| C1. Web KMZ import page | /dashboard/import | New: `fe/web/src/app/(dashboard)/import/page.tsx` |
| C2. Web export page | /dashboard/export | New: `fe/web/src/app/(dashboard)/export/page.tsx` |
| C3. Web CSV import page | /dashboard/import/csv | New: `fe/web/src/app/(dashboard)/import/csv/page.tsx` |

**Deliverables:** ADR-018 written, ExportModule, 3 new web pages, CSV import endpoints

---

### 3-6: Real Data Seeder & Data Management (4-5 days)

**Requirements:** #8 real seeders, #15 data management

| Task | Scope | Key Files |
|------|-------|-----------|
| A1. Production seeder | 7 real rayons, area boundaries, shift definitions | New: `be/src/database/seeds/seed-production.ts` |
| A2. CSV template parser | Bulk import utility | New: `be/src/modules/import/utils/csv-template-parser.ts` |
| B1. Location log retention cron | Purge >90 days, keep daily summary | New: `be/src/modules/location/cron/retention.cron.ts` |
| B2. Soft-delete cleanup cron | Permanent delete >180 days | New: `be/src/modules/users/cron/cleanup.cron.ts` |
| B3. Daily attendance summary cron | Per-area aggregates | New: `be/src/modules/monitoring/cron/daily-summary.cron.ts` |
| C1. Database index audit | Add missing composite indexes | New migration |
| C2. Pagination standardization | All findAll methods: default 20, max 100 | All service files |

**Deliverables:** Production seeder, 3 cron jobs, index migration, pagination standardized

---

### 3-7: Refactor, Optimization & Security (12-15 days)

**Requirements:** #3 refactor, #4 optimization, #13 security, #18 timezone

| Task | Scope | Key Files |
|------|-------|-----------|
| A1-A4. SOLID refactoring | Extract BoundaryCheckService, UserValidationService, RoomJoinService; five-lines audit | See [backend.md](./backend.md) section H |
| B1-B2. N+1 query fixes | TasksService, ActivitiesService, OvertimeService | Service files |
| C1-C2. Redis caching | Monitoring thresholds TTL 60s, staffing TTL 30s, role TTL 300s | Cache service files |
| D1-D5. Security hardening | Per-endpoint rate limiting, JWT refresh rotation, sanitization audit, CORS, Helmet.js | See [backend.md](./backend.md) section G |
| E1-E2. Timezone audit | BE UTC, FE WIB display, DD/MM/YYYY format | All date handling code |
| F1-F3. Mobile optimization | React.memo, FlatList, bundle analysis | See [mobile.md](./mobile.md) section D |
| G1-G4. Web optimization | Core Web Vitals, SSG, Mapbox lazy load, code splitting | See [web.md](./web.md) section G |

**Deliverables:** 3 extracted services, N+1 fixes, Redis caching, security middleware, timezone audit

---

### 3-8: UI/UX Polish & Production Readiness (5-7 days)

**Requirements:** #12 UI/UX polish, #16 mobile prod, #17 web prod

| Task | Scope | Key Files |
|------|-------|-----------|
| A1-A2. NB compliance audit | 22 mobile screens + 24 web pages | See [ui-ux.md](./ui-ux.md) |
| B1-B4. Empty states, skeletons, error boundaries | Web NBEmptyState, NBSkeleton, error.tsx | See [web.md](./web.md) section H |
| C1-C4. Animations | Screen transitions, button press, list stagger, modal/toast | See [ui-ux.md](./ui-ux.md) |
| D1. Accessibility gaps | aria-labels, focus traps, sort indicators | Mobile + Web |
| E1-E4. Mobile production | ProGuard, Sentry, deep linking, splash screen | See [mobile.md](./mobile.md) section E |
| F1-F4. Web production | SEO, PWA, bundle analysis, Next/Image | See [web.md](./web.md) sections E-G |

**Deliverables:** NB audit complete, empty states, skeletons, error boundaries, ProGuard, deep linking, PWA

---

### 3-9: E2E Testing (7-8 days)

**Requirements:** ADR-017 (Maestro over Detox)

| Task | Scope | Key Files |
|------|-------|-----------|
| A1. Maestro setup (ADR-017) | Install CLI, configure for RN 0.83.1 | New: `fe/mobile/.maestro/` |
| A2. 15+ Maestro flows | Login, clock-in/out, activity, task, overtime, etc. | `fe/mobile/.maestro/flows/` |
| B1-B2. Playwright expansion | 12+ new scenarios on existing 8 specs | `fe/web/e2e/` |
| C1-C2. CI integration | Maestro APK job (run on push to main + manual workflow_dispatch, NOT on every PR), Playwright Redis job. Unit tests remain on PR. | `.github/workflows/` |
| D1. Security E2E tests | Rate limiting, JWT, CORS | `fe/web/e2e/security.spec.ts` |

**Deliverables:** ADR-017 written, Maestro config, 15+ flows, 20+ Playwright specs, CI workflows

---

### 3-10: Documentation Sync (2-3 days)

**Requirements:** #11 documentation sync

| Task | Scope | Key Files |
|------|-------|-----------|
| A1-A3. Status updates | COMPLETION_STATUS.md, screen/page counts, role names | Spec files |
| B1-B3. Index updates | ADR index, specs/README.md, phases/README.md | Index files |
| C1-C3. Content updates | API contracts, database schema, stale references | Spec files |
| C4. System overview update | Update `specs/architecture/system-overview.md` to reflect Phase 3 additions (Redis, Sentry, export module, health endpoints, new tables) | `specs/architecture/system-overview.md` |

**Deliverables:** All specs accurate and consistent

---

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Redis adds infrastructure complexity | Medium | Medium | Docker Compose integration; graceful fallback to in-memory if Redis unavailable |
| Maestro flaky tests on CI | High | Medium | Retry mechanism in CI; focus on critical flows only |
| Export of large datasets blocks server | Medium | High | Async export_jobs with streaming; rate limit export endpoint |
| FCM activation triggers spam | Low | High | Notification preferences opt-out; batch throttling |
| SOLID refactoring introduces regressions | Medium | High | Refactor only with >80% test coverage; full suite after each extraction |
| Offline queue conflicts on sync | Medium | Medium | Server timestamp authority; conflict logging |
| ProGuard breaks RN production build | Medium | Medium | Incremental rules; test release build on CI |
| JWT refresh token adds auth complexity | Low | Medium | Thorough testing; fallback to full re-login |
| API versioning: JWT expiry change (7d→15m) breaks old mobile clients without refresh token support | Medium | High | Deploy refresh token support in mobile before shortening JWT expiry; staged rollout |
| Missing load test specification | Medium | Medium | Added to testing.md; define baseline throughput before production launch |

---

## What Gets Added

| Addition | Description |
|----------|-------------|
| `be/src/modules/export/` | New export module (CSV, Excel, KMZ) |
| `be/src/modules/health/` | Health check endpoints |
| `be/src/common/middleware/request-id.middleware.ts` | X-Request-ID tracing |
| `be/src/common/interceptors/logging.interceptor.ts` | Structured JSON logging |
| `be/src/common/interceptors/slow-query.interceptor.ts` | Slow query detection |
| `be/src/common/services/redis.service.ts` | Redis connection management |
| `fe/mobile/src/screens/notifications/NotificationsScreen.tsx` | 22nd mobile screen |
| `fe/mobile/.maestro/` | Maestro E2E test configuration |
| `fe/web/src/app/(dashboard)/import/page.tsx` | KMZ import page |
| `fe/web/src/app/(dashboard)/export/page.tsx` | Export page |
| `fe/web/src/app/(dashboard)/notifications/page.tsx` | Notifications page |
| `fe/web/public/sw.js` | PWA service worker |
| Redis 7 | In-memory cache, Socket.IO adapter, notification retry queue |
| Sentry | Crash reporting (backend + mobile) |

## What Gets Changed

| Current Code | Change |
|-------------|--------|
| `FCM_ENABLED=false` in .env | Set to `true`, wire 8 trigger points |
| `EventsGateway` in-memory rooms | Add `@socket.io/redis-adapter` |
| `MonitoringCacheService` in-memory loader | Swap to Redis with TTL |
| `ShiftsService` (>400 lines) | Extract BoundaryCheckService |
| `UsersService.create()` (3 concerns) | Extract UserValidationService |
| `EventsGateway.handleConnection()` (80+ lines) | Extract RoomJoinService |
| `syncManager.ts` (4 action types) | Expand to 7+ action types |
| Global rate limit (100 req/min) | Add per-endpoint limits |
| JWT 7-day expiry, no refresh | Add refresh token rotation |
| `console.log` throughout | Replace with structured Logger |

---

## File References

| Document | Purpose | Link |
|----------|---------|------|
| **README.md** | Phase overview (this file) | [View](./README.md) |
| **STATUS.md** | Implementation tracking | [View](./STATUS.md) |
| **backend.md** | Backend specs (endpoints, services, cron) | [View](./backend.md) |
| **mobile.md** | Mobile specs (screens, sync, FCM) | [View](./mobile.md) |
| **web.md** | Web specs (pages, PWA, SEO) | [View](./web.md) |
| **database.md** | Schema changes, migrations, indexes | [View](./database.md) |
| **infrastructure.md** | Redis, Docker, Sentry, CI/CD | [View](./infrastructure.md) |
| **testing.md** | Maestro + Playwright E2E specs | [View](./testing.md) |
| **ui-ux.md** | NB audit, empty states, animations | [View](./ui-ux.md) |
| **manual-testing.md** | 22 mobile + 24 web manual checklist | [View](./manual-testing.md) |
| **ADR-016** | Redis for WebSocket scaling | [View](../../architecture/decisions/ADR-016-redis-websocket-scaling.md) |
| **ADR-017** | Maestro mobile E2E | [View](../../architecture/decisions/ADR-017-maestro-mobile-e2e.md) |
| **ADR-018** | Export format strategy | [View](../../architecture/decisions/ADR-018-export-format-strategy.md) |
| **ADR-019** | Offline connectivity model | [View](../../architecture/decisions/ADR-019-offline-connectivity-model.md) |

---

**Last Updated:** 2026-03-12
