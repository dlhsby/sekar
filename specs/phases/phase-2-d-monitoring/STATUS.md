# Phase 2D: Real-Time Monitoring - Implementation Status

**Status:** In Progress
**Last Updated:** March 4, 2026
**Overall Progress:** 85% (2D-1 → 2D-6 complete; 2D-5 in progress; 2D-7 pending)
**Branch:** `f/phase-2-d-monitoring`
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

---

## Implementation Progress

### Sub-Phase 2D-1: Foundation ✅ COMPLETE

| Task | Status | Notes |
|------|--------|-------|
| Create `MonitoringConfig` entity | ✅ Done | |
| Create `UserTrackingStatus` entity | ✅ Done | |
| Write database migration (tables, indexes) | ✅ Done | `1741000000000-Phase2DMonitoringSchema.ts` |
| Implement `StatusCalculatorService` | ✅ Done | Core status algorithm + WS broadcast |
| Unit tests for `StatusCalculatorService` | ✅ Done | 16 tests |
| Implement `MonitoringSchedulerService` | ✅ Done | 60-second cron job |
| Unit tests for `MonitoringSchedulerService` | ✅ Done | |
| Implement `MonitoringCacheService` | ✅ Done | In-memory cache with TTL |
| Unit tests for `MonitoringCacheService` | ✅ Done | |
| Implement `MonitoringConfigService` | ✅ Done | CRUD with Zod validation |
| Unit tests for `MonitoringConfigService` | ✅ Done | |
| Add `shift_definition_id` to Shift entity | ✅ Done | |
| Seed `monitoring_configs` defaults | ✅ Done | `seed-phase2d.ts` |

### Sub-Phase 2D-2: Fix Hardcodes ✅ COMPLETE

| Task | Status | Notes |
|------|--------|-------|
| Fix `is_within_area` computation | ✅ Done | From `user_tracking_status.is_within_area` |
| Fix `shift_name` to use ShiftDefinition join | ✅ Done | Via `shift_definition` relation |
| Fix WebSocket role checks (PascalCase → lowercase) | ✅ Done | Full enum usage + scoped room auto-join |
| Fix per-role staff requirement counting | ✅ Done | Count by `user.role` |

### Sub-Phase 2D-3: New Endpoints ✅ COMPLETE

| Task | Status | Notes |
|------|--------|-------|
| Implement location history endpoint | ✅ Done | `GET /monitoring/users/:userId/location-history` |
| Implement user day summary endpoint | ✅ Done | `GET /monitoring/users/:userId/day-summary` |
| Implement monitoring config CRUD | ✅ Done | `GET/PATCH /monitoring/config` |
| Implement area boundary CRUD | ✅ Done | `GET/PUT /areas/:id/boundary` |
| Implement staffing summary endpoint | ✅ Done | `GET /monitoring/staffing-summary` |
| Add GeoJSON validator utility | ✅ Done | `geojson-validator.util.ts`, 28 tests, >95% coverage |

### Sub-Phase 2D-4: WebSocket Enhancements ✅ COMPLETE

| Task | Status | Notes |
|------|--------|-------|
| Fix `handleConnection` auto-join logic | ✅ Done | Enum-based role checks |
| Add `USER_STATUS_CHANGED` event | ✅ Done | Emitted on status transitions |
| Add `USER_LEFT_AREA` / `USER_ENTERED_AREA` events | ✅ Done | Emitted on boundary crossing |
| Enhance `USER_LOCATION` event with new fields | ✅ Done | status, is_within_area, shift_name |
| Integrate event emission in StatusCalculatorService | ✅ Done | Called on every location ping + cron |
| Unit tests for new gateway emitters | ✅ Done | Updated gateway spec |

### Sub-Phase 2D-5: Mobile Monitoring 🔄 IN PROGRESS

| Task | Status | Notes |
|------|--------|-------|
| Update `mapUtils.ts` with four-status model | 🔄 In Progress | |
| Update types in `models.types.ts` | 🔄 In Progress | |
| Create `monitoringSlice.ts` (new) | 🔄 In Progress | |
| Update `monitoringApi.ts` | 🔄 In Progress | |
| Enhance `UserMarker` component | 🔄 In Progress | |
| Add polygon rendering to `MapDashboardScreen` | 🔄 In Progress | |
| Add `StatusSummaryBar` component | 🔄 In Progress | |
| Add `UserListStrip` and `UserListCard` | 🔄 In Progress | |
| Add FAB control column | 🔄 In Progress | |
| Implement `UserDetailSheet` | 🔄 In Progress | |
| Implement `LocationTrail` | 🔄 In Progress | |
| Implement `MonitoringFilterModal` | 🔄 In Progress | |
| Add WebSocket event handlers | 🔄 In Progress | |

### Sub-Phase 2D-6: Web Monitoring ✅ COMPLETE

| Task | Status | Notes |
|------|--------|-------|
| Create `MonitoringMap` component (Mapbox GL) | ✅ Done | Custom HTML markers, polygon overlay |
| Create `MonitoringSidePanel` | ✅ Done | Filters + status cards + user list |
| Rewrite `/monitoring` page with split layout | ✅ Done | 65% map + 35% panel, responsive |
| Create `UserDetailPanel` | ✅ Done | Shift info, activities, tasks, WA buttons |
| Create `LocationTimeline` | ✅ Done | Vertical timeline with GPS trail |
| Create `StatusCard` | ✅ Done | Clickable filter toggle with counts |
| Create `UserListItem` | ✅ Done | Status dot, name, role, battery |
| Create `/monitoring/config` page | ✅ Done | Admin threshold settings |
| Add WebSocket integration | ✅ Done | socket.io-client, optimistic cache updates |
| Add new TanStack Query hooks | ✅ Done | 8 hooks (day-summary, history, staffing, config) |
| Add `useAreaBoundary` to areas API | ✅ Done | |
| Add boundary tab to `/areas/[id]` | ✅ Done | |

### Sub-Phase 2D-7: Testing ⬜ PENDING

| Task | Status | Notes |
|------|--------|-------|
| Backend unit tests (>85% coverage) | ⬜ Pending | Target: 1,075+ tests |
| Mobile component tests (>80% coverage) | ⬜ Pending | |
| Update mobile mapUtils tests | ⬜ Pending | |

---

## Quality Summary

| Metric | Target | Current |
|--------|--------|---------|
| Backend test coverage (stmts) | >85% | 89.57% (Phase 2C baseline) |
| Backend tests | >1,050 | 1,075 passing ✅ |
| Mobile tests | >3,400 | 3,264 (pre-2D-5) |
| New backend endpoints | 7 | 7 ✅ |
| New web components | 7 | 7 ✅ |
| New mobile components | 6 | 🔄 In Progress |

---

## Component Summary

| Component | Phase 2C Baseline | Phase 2D Current |
|-----------|-------------------|-----------------|
| **Backend** | 16 modules, 113 endpoints, 888 tests | 16 modules, 120 endpoints, 1,075 tests |
| **Mobile** | 17 screens, 3,264 tests | 🔄 2D-5 in progress |
| **Web** | 20 pages, 1,336 tests | 21 pages (+1 config), all components done |
| **Database** | 18 tables | 20 tables (+2: user_tracking_status, monitoring_configs) |

---

## Test Commands

```bash
# Backend
cd be
npm test                          # All tests (1,075 passing)
npm run test:cov                  # With coverage
npm test -- --testPathPattern monitoring  # Monitoring module only

# Mobile
cd fe/mobile
npm test                          # All tests
npm test -- --testPathPattern monitoring  # Monitoring only

# Web
cd fe/web
npm run test:e2e                  # All Playwright tests
```

---

## Recent Commits

| Commit | Description |
|--------|-------------|
| `3acc0df` | feat(monitoring): add Phase 2D foundation (2D-1) |
| `14f79de` | fix(monitoring): replace hardcoded values and fix WebSocket role checks (2D-2) |
| `feat 2D-3` | feat(monitoring): add Phase 2D-3 new endpoints and GeoJSON boundary support |
| `404a357` | feat(monitoring): add Phase 2D-4 WebSocket enhancements (2D-4) |
| `b115bb8` | feat(web/monitoring): complete Phase 2D-6 web monitoring enhancements |

---

**Last Updated:** 2026-03-04
