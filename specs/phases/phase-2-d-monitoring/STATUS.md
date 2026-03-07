# Phase 2D: Real-Time Monitoring - Implementation Status

**Status:** ✅ COMPLETE (pending merge & deploy)
**Last Updated:** March 7, 2026
**Overall Progress:** 98% (2D-1 → 2D-10 complete; 2D-11 not started)
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

### Sub-Phase 2D-5: Mobile Monitoring ✅ COMPLETE

| Task | Status | Notes |
|------|--------|-------|
| Update `mapUtils.ts` with five-status model | ✅ Done | getStatusColor, getStatusLabel, getRoleIcon (8 roles) |
| Update types in `models.types.ts` | ✅ Done | LiveUser, TrackingStatus, MonitoringFilters |
| Create `monitoringSlice.ts` (new) | ✅ Done | liveUsers, statusCounts, selectedUser, filters |
| Update `monitoringApi.ts` | ✅ Done | getLiveUsers, getDaySummary, getLocationHistory, getStaffingSummary |
| Enhance `UserMarker` component | ✅ Done | LiveUser type, role icons, five-status colors |
| Add polygon rendering to `MapDashboardScreen` | ✅ Done | Redux-based, Polygon + Circle area boundaries |
| Add `StatusSummaryBar` component | ✅ Done | Five status chips with counts |
| Add `UserListStrip` and `UserListCard` | ✅ Done | Horizontal scroll strip |
| Add FAB control column | ✅ Done | Zoom, filter, location FABs |
| Implement `UserDetailSheet` | ✅ Done | Bottom sheet with shift/activities/tasks |
| Implement `LocationTrail` | ✅ Done | Polyline with inside/outside segments |
| Implement `MonitoringFilterModal` | ✅ Done | Cascading rayon/area/role/status filters |
| Add WebSocket event handlers | ✅ Done | status-changed, left-area, entered-area |

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

### Sub-Phase 2D-7: Testing ✅ COMPLETE

| Task | Status | Notes |
|------|--------|-------|
| Backend unit tests (>85% coverage) | ✅ Done | 1,088 passing, 80.64% branch, 92.15% stmt |
| Mobile component tests (>80% coverage) | ✅ Done | 3,281 passing |
| Update mobile mapUtils tests | ✅ Done | Five-status model tested |
| Rewrite MapDashboardScreen tests for Redux | ✅ Done | 9 tests with mocked store |
| Rewrite UserMarker tests for LiveUser type | ✅ Done | 23 tests, role icons, five statuses |
| Add 13 new monitoring service tests | ✅ Done | getLocationHistory, getUserDaySummary, getStaffingSummary |

---

## Post-Review Refactoring ✅ COMPLETE (March 5, 2026)

| Task | Status | Notes |
|------|--------|-------|
| Fix data inconsistency (city/rayon stats) | ✅ Done | `countWorkersByAreaIds()` now queries `user_tracking_status` instead of `shifts` |
| Upgrade error logging | ✅ Done | StatusCalculator `.catch()` handlers upgraded from `warn` to `error` with stack trace |
| Complete DTO barrel exports | ✅ Done | Added 5 missing exports to `dto/index.ts` |
| Refactor MonitoringService | ✅ Done | Split 1,136→220 lines; extracted `MonitoringStatsService` (549), `MonitoringUserService` (458) |
| Verify Postman collection | ✅ Done | All 9 endpoints present with examples |
| Update specs/documentation | ✅ Done | Endpoint counts, test counts verified |

## Web Review & Refactoring ✅ COMPLETE (March 5, 2026)

| Task | Status | Notes |
|------|--------|-------|
| Create shared constants file (`monitoring.ts`) | ✅ Done | WCAG 2.1 AA colors, labels, icons, Tailwind class maps |
| Add CSS variables to `globals.css` | ✅ Done | `--color-status-*` vars in `@theme` block |
| Extract shared utilities | ✅ Done | `useDebounce` hook, `formatters.ts` (6 functions) |
| Fix status colors & labels (WCAG compliance) | ✅ Done | All 5 components updated to CSS variables |
| Enhanced map markers | ✅ Done | 36px markers, role SVG icons, name labels, per-status animations, 44px touch targets |
| Config page restructure | ✅ Done | JSON textarea → structured form with sections, validation, toggles |
| Create `StaffingSummaryCard` component | ✅ Done | Per-role progress bars, understaffing warnings |
| Add toast notifications (sonner) | ✅ Done | Missing status, left-area, entered-area events |
| Map enhancements | ✅ Done | FullscreenControl, style toggle (streets/satellite), trail polylines |
| Update test assertions | ✅ Done | 6 test files updated for new CSS classes and labels |

## Mobile Review & Refactoring ✅ COMPLETE (March 5, 2026)

| Task | Status | Notes |
|------|--------|-------|
| Register `monitoringReducer` in Redux store | ✅ Done | CRITICAL: store.ts was missing monitoring slice |
| Fix type safety in MapDashboardScreen | ✅ Done | Replace `as any` casts, string dispatch, stale closure |
| Update barrel exports for Phase 2D components | ✅ Done | 6 new exports, deprecated `UserInfoCard` |
| Register `AttendanceScreen` in navigation | ✅ Done | Hidden tab with `tabBarButton: () => null` |
| Fix `UserListCard` relative time format | ✅ Done | Indonesian: `baru saja`, `dtk lalu`, `mnt lalu`, `jam lalu` |
| Add Phase 2D component tests (~212 new) | ✅ Done | monitoringSlice, StatusSummaryBar, UserListStrip, UserListCard, UserDetailSheet, LocationTrail, MonitoringFilterModal, monitoringApi |
| Extract monitoring role constants | ✅ Done | `ROLES_WITH_RAYON`, `ROLES_WITH_FIXED_RAYON`, `ROLES_WITHOUT_RAYON` |
| Consolidate duplicate `LiveUsersResponse` type | ✅ Done | Re-export from `models.types` in `api.types` |

### Sub-Phase 2D-10: Gap Fixes & Spec Alignment ✅ COMPLETE (March 7, 2026)

| Task | Status | Notes |
|------|--------|-------|
| Wire RayonBoundaryService into AreasService | ✅ Done | `forwardRef(() => MonitoringModule)` + `@Optional() @Inject()` |
| Fix ReassignWorkerDto (6 fields, schedule mgmt) | ✅ Done | Added shift_definition_id, effective_date, end_current_schedule, reason |
| Fix ReassignWorkerResponseDto | ✅ Done | Added new_schedule_id, effective_date; kept reassigned_at |
| Enhance ReassignService with schedule creation | ✅ Done | Creates Schedule, ends current schedules, returns new_schedule_id |
| Fix BoundariesResponseDto (hierarchical + new fields) | ✅ Done | AreaBoundaryDto: rayon_id/name, radius_meters, staffing_summary; RayonBoundaryDto: is_understaffed, understaffed_area_count |
| Add AREA_STAFFING_CHANGED event | ✅ Done | Emitted when status change crosses staffing threshold |
| Fix onClockIn boundary check | ✅ Done | Passes GPS coords, computes is_within_area dynamically |
| Fix seed cluster_zoom_threshold | ✅ Done | 13 → 14 |
| Add 77 new tests | ✅ Done | Total: 1,172 tests, 62 suites, 91.81% stmt, 80.37% branch |

### Sub-Phase 2D-11: Home Screen Location Card - NOT STARTED

| Task | Status | Notes |
|------|--------|-------|
| Create `useHomeLocation` hook | Not Started | Hook to fetch current user location status for home screen |
| Create `LocationStatusCard` component | Not Started | Card showing current location, status, and area info |
| HomeScreen layout integration | Not Started | Integrate LocationStatusCard into worker/supervisor home screens |
| Specs update (mobile.md, screens.md) | Not Started | Update mobile specs to document new home screen card |

---

## Quality Summary

| Metric | Target | Current |
|--------|--------|---------|
| Backend test coverage (stmts) | >85% | 91.81% ✅ |
| Backend test coverage (branch) | >80% | 80.37% ✅ |
| Backend tests | >1,050 | 1,172 passing ✅ |
| Backend suites | - | 62 suites ✅ |
| Mobile tests | >3,400 | 3,493 passing ✅ |
| New backend endpoints | 9 | 9 ✅ |
| New web components | 7 | 7 ✅ |
| New mobile components | 6 | 7 ✅ |

---

## Component Summary

| Component | Phase 2C Baseline | Phase 2D Current |
|-----------|-------------------|-----------------|
| **Backend** | 16 modules, 113 endpoints, 888 tests | 16 modules, 122 endpoints, 1,172 tests (62 suites) |
| **Mobile** | 17 screens, 3,264 tests | 21 screens, 3,493 tests |
| **Web** | 20 pages, 1,336 tests | 21 pages (+1 config), all components done |
| **Database** | 18 tables | 20 tables (+2: user_tracking_status, monitoring_configs) |

---

## Test Commands

```bash
# Backend
cd be
npm test                          # All tests (1,172 passing)
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

## Manual Verification Checklist

### Database
- [ ] `user_tracking_status` table exists with correct columns
- [ ] `monitoring_configs` table exists with seed data (4 config keys)
- [ ] Indexes on `user_tracking_status(user_id)`, `user_tracking_status(area_id, status)` exist

### API Endpoints
- [ ] `GET /monitoring/city` — returns flat CityStats
- [ ] `GET /monitoring/rayon/:id` — returns flat RayonMonitoringStats
- [ ] `GET /monitoring/area/:id` — returns flat AreaMonitoringStats
- [ ] `GET /monitoring/live-users` — returns LiveUsersResponse with total_active/inactive/outside_area/missing/offline
- [ ] `GET /monitoring/users/:id/day-summary` — returns UserDaySummary
- [ ] `GET /monitoring/users/:id/location-history` — returns LocationHistory
- [ ] `GET /monitoring/staffing-summary` — returns StaffingSummaryResponse
- [ ] `GET /monitoring/config` — returns all config items (admin only)
- [ ] `PATCH /monitoring/config/:key` — updates config item (admin only)
- [ ] `GET /monitoring/boundaries` — returns hierarchical rayons[].areas[] with staffing_summary
- [ ] `POST /monitoring/reassign` — reassigns worker, creates schedule if shift_definition_id provided

### WebSocket Events
- [ ] `user:location` event fires on location ping (includes status, is_within_area)
- [ ] `user:status-changed` event fires on status transitions
- [ ] `user:left-area` / `user:entered-area` events fire on boundary crossings
- [ ] `area:staffing-changed` event fires when status change crosses staffing threshold
- [ ] JWT auth required for WebSocket connection

### Web UI
- [ ] `/monitoring` page loads with Mapbox map (65% map + 35% panel)
- [ ] Status cards show correct counts and are clickable filters
- [ ] User list displays with status dots, battery, role
- [ ] Click user → detail panel with shift info, activities, WhatsApp links
- [ ] Location timeline renders GPS trail
- [ ] `/monitoring/config` page allows threshold editing (admin only)

### Mobile UI
- [ ] MapDashboardScreen shows Google Maps with area polygons
- [ ] Five-status markers (active=#15803D green, inactive=#D97706 amber, outside_area=#9333EA purple, missing=#DC2626 red, offline=#6B7280 gray)
- [ ] StatusSummaryBar shows counts for each status
- [ ] UserListStrip horizontal scroll
- [ ] UserDetailSheet opens on marker press
- [ ] LocationTrail shows polyline with inside/outside segments
- [ ] MonitoringFilterModal cascading filters work
- [ ] WebSocket real-time updates reflect on markers
- [ ] Cluster markers appear when zoomed out

---

**Last Updated:** 2026-03-07
