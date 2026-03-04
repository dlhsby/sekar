# Phase 2D: Real-Time Monitoring - Implementation Status

**Status:** Planning
**Last Updated:** March 3, 2026
**Overall Progress:** 0% (Planning Phase)
**Branch:** `f/phase-2-d-monitoring` (to be created)
**Related ADRs:** [ADR-005](../../architecture/decisions/ADR-005-gps-boundary-tolerance.md), [ADR-009](../../architecture/decisions/ADR-009-phase2c-role-system-overhaul.md), ADR-011 (new)

---

## Document Structure

### Specification Documents

| Document | Purpose | Link |
|----------|---------|------|
| **README.md** | Phase overview, status system, role matrix, implementation phases | [View](./README.md) |
| **database.md** | Migration SQL, new tables (user_tracking_status, monitoring_configs), indexes | [View](./database.md) |
| **backend.md** | New entities, services, endpoints, WebSocket enhancements | [View](./backend.md) |
| **mobile.md** | Map enhancement, markers, detail sheet, filter modal, location trail | [View](./mobile.md) |
| **web.md** | Mapbox integration, split layout, detail panel, timeline, config page | [View](./web.md) |
| **ui-ux.md** | Status colors, marker design, layouts, accessibility, micro-interactions | [View](./ui-ux.md) |
| **testing.md** | Test stubs, coverage targets, E2E scenarios, seed data | [View](./testing.md) |

### Architecture & Schema

| Document | Purpose | Link |
|----------|---------|------|
| **ADR-005** | GPS boundary tolerance decision | [View](../../architecture/decisions/ADR-005-gps-boundary-tolerance.md) |
| **ADR-009** | Role system overhaul (8 roles) | [View](../../architecture/decisions/ADR-009-phase2c-role-system-overhaul.md) |
| **ADR-011** | Monitoring reimplementation decision (new, this phase) | To be created |
| **schema.md** | Full database schema DDL | [View](../../database/schema.md) |

---

## Implementation Progress

### Sub-Phase 2D-1: Foundation (3-4 days)

| Task | Status | Notes |
|------|--------|-------|
| Create `MonitoringConfig` entity | ⬜ Pending | |
| Create `UserTrackingStatus` entity | ⬜ Pending | |
| Write database migration (tables, indexes) | ⬜ Pending | |
| Implement `StatusCalculatorService` | ⬜ Pending | Core status algorithm |
| Unit tests for `StatusCalculatorService` | ⬜ Pending | >90% coverage target |
| Implement `MonitoringSchedulerService` | ⬜ Pending | 60-second cron job |
| Unit tests for `MonitoringSchedulerService` | ⬜ Pending | |
| Implement `MonitoringCacheService` | ⬜ Pending | In-memory cache with TTL |
| Unit tests for `MonitoringCacheService` | ⬜ Pending | |
| Implement `MonitoringConfigService` | ⬜ Pending | CRUD with Zod validation |
| Unit tests for `MonitoringConfigService` | ⬜ Pending | |
| Add `shift_definition_id` to Shift entity | ⬜ Pending | |
| Run backfill scripts | ⬜ Pending | |

### Sub-Phase 2D-2: Fix Hardcodes (1-2 days)

| Task | Status | Notes |
|------|--------|-------|
| Fix `is_within_area` computation | ⬜ Pending | Replace hardcoded `true` |
| Fix `shift_name` to use ShiftDefinition join | ⬜ Pending | Replace hardcoded `'Active Shift'` |
| Fix WebSocket role checks (PascalCase → lowercase) | ⬜ Pending | `'Admin'` → `UserRole.SUPERADMIN` etc. |
| Fix per-role staff requirement counting | ⬜ Pending | Count by `user.role` |

### Sub-Phase 2D-3: New Endpoints (2-3 days)

| Task | Status | Notes |
|------|--------|-------|
| Implement location history endpoint | ⬜ Pending | `GET /monitoring/users/:userId/location-history` |
| Unit tests for location history | ⬜ Pending | |
| Implement user day summary endpoint | ⬜ Pending | `GET /monitoring/users/:userId/day-summary` |
| Unit tests for day summary | ⬜ Pending | |
| Implement monitoring config CRUD | ⬜ Pending | `GET/PATCH /monitoring/config` |
| Unit tests for config CRUD | ⬜ Pending | |
| Implement area boundary CRUD | ⬜ Pending | `GET/PUT /areas/:id/boundary` |
| Unit tests for boundary CRUD | ⬜ Pending | |
| Implement staffing summary endpoint | ⬜ Pending | `GET /monitoring/staffing-summary` |
| Unit tests for staffing summary | ⬜ Pending | |
| Add GeoJSON validator utility | ⬜ Pending | |
| Unit tests for GeoJSON validator | ⬜ Pending | >95% target |

### Sub-Phase 2D-4: WebSocket Enhancements (1-2 days)

> **Critical:** WebSocket events must be implemented before mobile/web frontends. Both platforms depend on real-time status updates.

| Task | Status | Notes |
|------|--------|-------|
| Fix `handleConnection` auto-join logic | ⬜ Pending | PascalCase → lowercase enum |
| Add `USER_STATUS_CHANGED` event | ⬜ Pending | Emitted on status transitions |
| Add `USER_LEFT_AREA` / `USER_ENTERED_AREA` events | ⬜ Pending | Emitted on boundary crossing |
| Enhance `USER_LOCATION` event with new fields | ⬜ Pending | status, is_within_area, shift_name |
| Integrate event emission in StatusCalculatorService | ⬜ Pending | Called on every location ping + cron |
| Unit tests for WebSocket event emission | ⬜ Pending | Verify correct rooms receive events |
| Integration test: location ping → status change → WS event | ⬜ Pending | End-to-end flow |

### Sub-Phase 2D-5: Mobile Monitoring (3-4 days) — **Priority: Implement First**

> **Mobile-first:** Field supervisors (korlap, kepala_rayon) use mobile as their primary monitoring tool. Delivering mobile first provides immediate field value.

| Task | Status | Notes |
|------|--------|-------|
| Update `mapUtils.ts` with four-status model | ⬜ Pending | Replace 3-status `calculateUserStatus()` |
| Update types in `models.types.ts` | ⬜ Pending | TrackingStatus enum, enhanced DTOs |
| Update `monitoringSlice.ts` | ⬜ Pending | filters, selectedUser, statusCounts, per-op loading |
| Update `monitoringApi.ts` | ⬜ Pending | New API calls for day-summary, location-history, staffing |
| Enhance `UserMarker` component | ⬜ Pending | Role icons, status colors, labels |
| Add polygon rendering to `MapDashboardScreen` | ⬜ Pending | Polygon with radius fallback |
| Add `StatusSummaryBar` component | ⬜ Pending | Four status chips with counts |
| Add `UserListStrip` and `UserListCard` | ⬜ Pending | Horizontal scroll at map bottom |
| Add FAB control column | ⬜ Pending | filter/location/zoom+/zoom-/refresh |
| Implement `UserDetailSheet` | ⬜ Pending | @gorhom/bottom-sheet, day-summary API |
| Implement `LocationTrail` | ⬜ Pending | Polyline overlay, green/purple segments |
| Implement `MonitoringFilterModal` | ⬜ Pending | Cascading filters, staffing summary |
| Add WebSocket event handlers | ⬜ Pending | status-changed, left-area, entered-area |
| Manual testing on Android device | ⬜ Pending | Field-condition testing |

### Sub-Phase 2D-6: Web Monitoring (4-5 days)

| Task | Status | Notes |
|------|--------|-------|
| Create `MonitoringMap` component (Mapbox GL) | ⬜ Pending | |
| Implement marker rendering with clustering | ⬜ Pending | |
| Implement area polygon rendering | ⬜ Pending | |
| Create `MonitoringSidePanel` with filters | ⬜ Pending | |
| Create status cards (2×2 grid) | ⬜ Pending | |
| Rewrite `/monitoring` page with split layout | ⬜ Pending | 65% map + 35% panel |
| Implement responsive breakpoints | ⬜ Pending | xl/lg → side-by-side, md/sm → stacked |
| Create `UserDetailPanel` | ⬜ Pending | Push navigation in side panel |
| Create `LocationTimeline` | ⬜ Pending | Vertical timeline with map sync |
| Add WebSocket integration | ⬜ Pending | Cache invalidation on WS events |
| Create `/monitoring/config` page | ⬜ Pending | admin_system/superadmin only |
| Enhance `/areas/[id]` with boundary tab | ⬜ Pending | Mapbox Draw polygon editor |
| Add new TanStack Query hooks | ⬜ Pending | 8 new hooks |
| Update type definitions | ⬜ Pending | TrackingStatus, enhanced DTOs |

### Sub-Phase 2D-7: Testing (3-4 days)

| Task | Status | Notes |
|------|--------|-------|
| Backend unit tests (>85% coverage) | ⬜ Pending | |
| Backend integration tests | ⬜ Pending | Status flow: location → status → WebSocket |
| Mobile component tests (>80% coverage) | ⬜ Pending | |
| Web Playwright E2E tests (+8 specs) | ⬜ Pending | |
| Manual testing on Android device | ⬜ Pending | |
| Manual testing on web browsers | ⬜ Pending | |

---

## Quality Summary

| Metric | Target | Current |
|--------|--------|---------|
| Backend test coverage (stmts) | >85% | -- |
| Backend test coverage (branch) | >80% | -- |
| Mobile test coverage | >80% | -- |
| Web E2E specs | +8 | -- |
| New backend endpoints | 7 | 0 |
| Modified backend endpoints | 4 | 0 |
| New mobile components | 6 | 0 |
| Modified mobile components | 6 | 0 |
| New web components | 7 | 0 |
| Modified web files | 3 | 0 |

---

## Component Summary

| Component | Phase 2C Baseline | Phase 2D Target |
|-----------|-------------------|-----------------|
| **Backend** | 16 modules, 113 endpoints, 888 tests | 16 modules, 120 endpoints (+7), ~1050 tests |
| **Mobile** | 17 screens, 3,264 tests | 17 screens (1 major rewrite), ~3,400 tests |
| **Web** | 20 pages, 1,336 tests | 21 pages (+1), ~1,400 tests |
| **Database** | 18 tables | 20 tables (+2: user_tracking_status, monitoring_configs) |

---

## Test Commands

```bash
# Backend
cd be
npm test                          # All tests
npm run test:cov                  # With coverage (>85% required)
npm test -- --testPathPattern monitoring  # Monitoring module only

# Mobile
cd fe/mobile
npm test                          # All tests
npm test -- --testPathPattern monitoring  # Monitoring only

# Web
cd fe/web
npm run test:e2e                  # All Playwright tests
npm run test:e2e -- --grep monitoring  # Monitoring E2E only
```

---

## Risk Tracking

| Risk | Status | Notes |
|------|--------|-------|
| Stale `user_tracking_status` data | ⬜ Monitoring | 60s cron mitigates |
| Map performance with 500+ markers | ⬜ Monitoring | Clustering mitigates |
| WebSocket room leak | ⬜ Monitoring | Existing cleanup + audit |
| Config change mass recalculation | ⬜ Monitoring | Batch processing + debounce |

---

**Last Updated:** 2026-03-03
