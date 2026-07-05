# Phase 2D: Real-Time Monitoring Reimplementation

**Date:** March 7, 2026
**Status:** ✅ COMPLETE (Implementation + Gap Fixes)
**Priority:** High
**Duration:** 17-24 developer-days (estimated)
**Depends On:** Phase 2C (Complete)
**Related ADRs:** [ADR-005](../../architecture/decisions/ADR-005-gps-boundary-tolerance.md), [ADR-009](../../architecture/decisions/ADR-009-phase2c-role-system-overhaul.md), [ADR-010](../../architecture/decisions/ADR-010-phase2c-terminology-cleanup.md), [ADR-011](../../architecture/decisions/ADR-011-phase2d-monitoring-status-model.md) (this phase)

---

## Overview

Phase 2D is a comprehensive reimplementation of the SEKAR real-time monitoring system. The current monitoring implementation has several critical gaps: the web map is a placeholder (no Google Maps rendering), `is_within_area` is hardcoded to `true`, `shift_name` is hardcoded to `'Active Shift'`, WebSocket role checks use legacy PascalCase values, staff requirements are not broken down by role, and there is no location history playback.

This phase addresses all gaps by introducing a proper five-status (four visible on map) tracking system backed by a materialized `user_tracking_status` table, replacing N+1 monitoring queries with efficient single-join queries, implementing the Google Maps map on web and polygon rendering on mobile, adding location history playback, user detail modals with WhatsApp deeplinks, configurable monitoring thresholds, and a comprehensive filter system with staffing summaries.

### Key Changes Summary

1. **Five-Status Tracking System (four visible on map)** -- Replace the binary online/offline model with Active (green), Idle (amber), Outside Area (purple), Missing (red), and Offline (gray, not shown on map) statuses
2. **Materialized Status Table** -- New `user_tracking_status` table for O(1) lookups instead of N+1 queries per dashboard load
3. **Configurable Thresholds** -- New `monitoring_configs` table for runtime-adjustable status thresholds without redeployment
4. **Web Map Implementation** -- Full Google Maps integration on the monitoring page with markers, polygons, clustering, and popups
5. **Mobile Map Enhancement** -- Polygon rendering (replacing radius circles), five-status colors (four visible on map), enhanced markers with role icons and labels
6. **Location History Playback** -- GPS trail visualization on map with timeline, clickable points, and first/last highlighting
7. **User Detail Modal** -- Rich bottom sheet (mobile) / side panel (web) with shift info, activities, WhatsApp deeplinks
8. **Filter System with Staffing Summary** -- Searchable rayon/area/user filters with per-role status breakdown showing active/idle/outside/offline counts
9. **WebSocket Fixes** -- Fix legacy PascalCase role checks, add new events (status changed, area enter/exit)
10. **Area Boundary Management** -- Web CRUD for area boundaries with polygon editor and KMZ import (review existing)
11. **Per-Role Staff Requirements** -- Break down staffing counts by role (satgas vs linmas) instead of aggregate totals
12. **Role-Scoped Monitoring** -- Enforce hierarchy: top_management (all), kepala_rayon (own rayon), korlap (own area)
13. **Day-Type Staffing Resolution** -- All staffing queries filter by current day type (weekday/weekend/holiday) using `special_day_overrides` table; show day-type context in staffing displays
14. **Rayon Boundary Polygons** -- Auto-computed convex hull from child area polygons, with configurable center markers and understaffed indicators
15. **Map Auto-Focus** -- Map viewport automatically adjusts when rayon/area/user filters are applied
16. **Worker Reassignment** -- Supervisors can reassign workers from nearby/overstaffed areas to understaffed areas via monitoring dashboard
17. **Enhanced Location History** -- Clickable trail points, first/last markers, date picker, shift filter, hide other users during trail view
18. **Standardized Icon/Color System** -- Comprehensive visual system for all entity types (rayon polygons, area polygons, center markers, user markers) with dual encoding for accessibility

---

## Role Access Matrix

| Feature | korlap | kepala_rayon | top_management | admin_system | superadmin |
|---------|--------|-------------|----------------|-------------|------------|
| View Map | Y (own area) | Y (own rayon) | Y (all) | Y (all) | Y (all) |
| View User Markers | Y (subordinates) | Y (rayon workers) | Y (all) | Y (all) | Y (all) |
| View Location History | Y (subordinates) | Y (rayon workers) | Y (all) | Y (all) | Y (all) |
| Filter by Rayon | - (preset) | - (preset) | Y | Y | Y |
| Filter by Area | Y (within rayon) | Y (within rayon) | Y | Y | Y |
| Filter by User | Y (subordinates) | Y (rayon workers) | Y (all) | Y (all) | Y |
| View Staffing Summary | Y (own area) | Y (own rayon) | Y (all) | Y (all) | Y |
| Area CRUD (Web) | - | - | - | Y | Y |
| Polygon Editor (Web) | - | - | - | Y | Y |
| KMZ Import (Web) | - | - | - | Y | Y |
| Configure Thresholds | - | - | - | Y | Y |
| WhatsApp Deeplinks | Y | Y | Y | Y | Y |
| Reassign Workers | - | Y (within rayon) | - | Y | Y |
| View Rayon Boundaries | Y | Y | Y | Y | Y |

**Legend:** `Y` = Full access, `Y (scope)` = Scoped to organizational unit, `-` = No access

---

## Monitoring Hierarchy

```
top_management / admin_system / superadmin
    +-- Can monitor ALL rayons (7)
        +-- All areas within each rayon
            +-- All satgas/linmas/korlap in each area

kepala_rayon
    +-- Can monitor OWN rayon only
        +-- All areas within own rayon
            +-- All korlap + satgas/linmas under those areas

korlap
    +-- Can monitor OWN area only
        +-- All satgas/linmas assigned to own area
```

---

## City-Level Monitoring View (top_management)

The `top_management` role has a city-wide monitoring view that aggregates data across all 7 rayons. This is the highest-level dashboard in the monitoring hierarchy.

### What top_management Sees

- **All rayons visible** on the map as convex-hull polygons (auto-computed from child area polygons)
- **All areas visible** within each rayon, rendered as boundary polygons or radius circles
- **All workers visible** as status-colored markers (active/inactive/outside_area/missing; offline workers hidden)
- **Aggregated city stats** displayed in the staffing summary header:
  - Total Active, Inactive, Outside Area, Missing, Offline counts across the entire city
  - Per-rayon breakdown available by expanding rayon cards
  - Per-area breakdown available by drilling into a rayon

### Operational Health Score

```
Operational Health Score = (areas with >= minimum staffing / total areas) * 100%
```

- **Minimum staffing** is determined by `staff_requirements` for the current day type (weekday/weekend/holiday)
- An area meets minimum staffing if `active_worker_count >= required_count` for each required role (satgas, linmas)
- Displayed as a percentage badge in the city-wide summary (e.g., "87% Operational")
- Color coding: >= 90% green, 70-89% amber, < 70% red

### Drill-Down Navigation

1. **City view** -- See all rayons with aggregated stats and health score
2. **Rayon view** -- Click a rayon polygon or card to zoom in; see all areas within that rayon
3. **Area view** -- Click an area to see individual worker markers and area-specific staffing
4. **Worker view** -- Click a worker marker to open UserDetailPanel/UserDetailSheet with shift info, activities, WhatsApp deeplink

### Endpoint

- `GET /monitoring/live-users` with no rayon/area filter returns city-wide data (requires `top_management`, `admin_system`, or `superadmin` role)
- `GET /monitoring/staffing-summary` returns per-rayon and per-area staffing with health score

---

## Status System

### Five-Status Model (Four Visible on Map)

> **Enum vs UI Label Clarification:** The code uses English enum values (`TrackingStatus` in `user-tracking-status.entity.ts`). "Idle" is the **UI label** displayed to users for the `inactive` enum value. Always use the enum value in code; use the UI label in frontend display and Indonesian translations.

| Enum Value | UI Label (EN) | UI Label (ID) | Color | Hex | Condition | Action Required |
|------------|--------------|----------------|-------|-----|-----------|-----------------|
| `active` | Active | Aktif | Dark Green | `#15803D` | Active shift + GPS ping <= 5 min + inside area boundary | None |
| `inactive` | Idle | Idle | Amber | `#D97706` | Active shift + GPS ping > 5 min but <= 15 min (configurable) | Check on worker |
| `outside_area` | Outside Area | Di Luar Area | Purple | `#9333EA` | Active shift + GPS ping <= 5 min + outside area boundary | Investigate |
| `missing` | Missing | Tidak Terdeteksi | Red | `#DC2626` | Scheduled but no clock-in, OR active shift but GPS > 1 hr | Urgent action |
| `offline` | Offline | Offline | Gray | `#6B7280` | No active shift | Not shown on map |

### Status Resolution Priority

The `StatusCalculatorService.calculateStatus()` method uses the following `StatusInput` interface:

```typescript
interface StatusInput {
  hasActiveShift: boolean;
  lastLocationAt: Date | null;
  isWithinArea: boolean;
}
```

**Algorithm (evaluated top-to-bottom, first match wins):**

```
1. !hasActiveShift                                    → OFFLINE  (gray, not shown on map)
2. lastLocationAt is null OR age > missing_threshold   → MISSING  (red)
3. lastLocationAt age > inactive_threshold             → INACTIVE (amber)
4. !isWithinArea                                       → OUTSIDE_AREA (purple)
5. Otherwise                                           → ACTIVE   (green)
```

**Key difference from earlier spec:** The algorithm no longer checks `isScheduledNow`. The `hasActiveShift` field (derived from an actual clocked-in shift record) is the sole gate for OFFLINE vs. on-duty statuses. Workers who are scheduled but have not clocked in do not appear on the map at all -- they are OFFLINE until they clock in, at which point `hasActiveShift` becomes `true` and subsequent status depends on GPS recency and boundary position.

### Configurable Thresholds (via `monitoring_configs` table)

| Parameter | Default | Range | Description |
|-----------|---------|-------|-------------|
| `active_max_age_seconds` | 300 (5 min) | 60-600 | Max GPS ping age for "active" status |
| `inactive_threshold_seconds` | 900 (15 min) | 300-3600 | Threshold for "idle" status |
| `missing_threshold_seconds` | 3600 (1 hr) | 1800-7200 | Threshold for "missing" status |
| `location_ping_interval_seconds` | 60 | 30-300 | Expected GPS upload interval |
| `geofencing_tolerance_meters` | 50 | 0-500 | Extra tolerance for boundary checks |
| `outside_area_grace_seconds` | 120 | 0-600 | Grace period before "outside" triggers |

---

## Geofencing Logic

**Priority order for boundary checking:**
1. **Polygon** (boundary_polygon JSONB) -- Ray casting algorithm, used when `boundary_polygon.coordinates` has >= 3 points
2. **Radius** (radius_meters) -- Haversine distance from area center, fallback when no polygon exists
3. **No boundary** -- If neither polygon nor radius is defined, user is always considered "inside"

This preserves the Phase 2C soft geofencing approach (never block clock-in, just flag).

---

## WebSocket Room Broadcasting

The backend uses Socket.IO rooms to scope real-time monitoring events to the appropriate audience. Clients auto-join rooms on connection based on their JWT role and organizational assignment.

### Room Structure

| Room | Audience | Payload Scope |
|------|----------|---------------|
| `monitoring:city` | `top_management`, `admin_system`, `superadmin` | All status changes and staffing events city-wide |
| `monitoring:rayon:{rayonId}` | `kepala_rayon` assigned to that rayon | Status changes for workers within the rayon |
| `monitoring:area:{areaId}` | `korlap` assigned to that area | Status changes for workers within the area |

### Events

| Event | Trigger | Payload |
|-------|---------|---------|
| `USER_STATUS_CHANGED` | `StatusCalculatorService` computes a new status different from previous | `{ userId, previousStatus, newStatus, timestamp, areaId, rayonId }` |
| `USER_LEFT_AREA` | Worker GPS ping falls outside assigned area boundary | `{ userId, areaId, rayonId, latitude, longitude, timestamp }` |
| `USER_ENTERED_AREA` | Worker GPS ping returns inside assigned area boundary (after being outside) | `{ userId, areaId, rayonId, latitude, longitude, timestamp }` |
| `AREA_STAFFING_CHANGED` | Any status change causes an area's active count to cross the staffing threshold | `{ area_id, rayon_id, active_count, required_count, is_met, timestamp }` |

### Broadcasting Rules

- Events are emitted to **all matching rooms** simultaneously (e.g., a status change in Rayon 3, Area 12 is sent to `monitoring:city`, `monitoring:rayon:3`, and `monitoring:area:12`)
- Room membership is managed in `EventsGateway.handleConnection()` using the authenticated user's role and assignments
- Clients that disconnect are automatically removed from all rooms by Socket.IO

---

## Gap Analysis (March 5, 2026)

Post-implementation review identified 9 gaps between the original brief and the delivered specs. All gaps have been addressed in spec revisions below.

| # | Gap | Severity | Resolution |
|---|-----|----------|-----------|
| 1 | Day-type bug in staffing queries | CRITICAL | All staffing queries now filter by `getCurrentDayType()` |
| 2 | Rayon + Area polygons & center markers on map | HIGH | New `GET /monitoring/boundaries` endpoint + map rendering specs |
| 3 | Map auto-focus on filter selection | HIGH | Auto-viewport adjustment on filter change |
| 4 | Staff requirements by schedule type | HIGH | Day-type context in staffing displays with comparison table |
| 5 | Worker reassignment from monitoring | HIGH | New `POST /monitoring/reassign` endpoint + ReassignWorkerModal |
| 6 | Location history UX enhancements | MEDIUM | Clickable points, first/last markers, date picker, shift filter |
| 7 | User marker "role - name" format | MEDIUM | Zoom-dependent label format: STG - Ahmad / Satgas - Ahmad Wijaya |
| 8 | Enhanced filter modal with prominent staffing | MEDIUM | Always-visible staffing, NB components, bottom-sheet pattern |
| 9 | Standardized icon/color system across entities | MEDIUM | Complete visual system for polygons, markers, and labels |

---

## Implementation Phases

> **Priority:** Mobile-first implementation. The mobile app is the primary tool used by field supervisors (korlap, kepala_rayon) for real-time monitoring in the field. Web follows as the desktop companion for top_management and admin roles.

| Sub-Phase | Scope | Effort | Dependencies |
|-----------|-------|--------|--------------|
| **2D-1: Foundation** | DB migration, entities, `user_tracking_status`, `monitoring_configs`, status calculator, cron scheduler, cache service | 3-4 days | None |
| **2D-2: Fix Hardcodes** | Fix `is_within_area`, `shift_name`, WebSocket roles, per-role staff counts | 1-2 days | 2D-1 |
| **2D-3: New Endpoints** | Location history, day summary, config CRUD, boundary CRUD, staffing summary | 2-3 days | 2D-1 |
| **2D-4: WebSocket Enhancements** | Fix auto-join rooms, add `user:status-changed` / `user:left-area` / `user:entered-area` events, enhance `user:location` with status/is_within_area/shift_name, integrate emission in StatusCalculatorService | 1-2 days | 2D-2 |
| **2D-5: Mobile Monitoring** | Polygon rendering, five-status colors (four visible on map), enhanced UserMarker, StatusSummaryBar, UserListStrip, UserDetailSheet, LocationTrail, MonitoringFilterModal, WebSocket event handlers | 3-4 days | 2D-3, 2D-4 |
| **2D-6: Web Monitoring** | Google Maps integration, MonitoringMap, MonitoringSidePanel, UserDetailPanel, LocationTimeline, StatusCards, `/monitoring/config` page, polygon editor, TanStack Query hooks | 4-5 days | 2D-3, 2D-4 |
| **2D-7: Testing** | Unit tests (>80%), integration tests, E2E (Playwright web, manual mobile) | 3-4 days | All above |
| **2D-10: Gap Fixes** | Day-type filtering, rayon boundaries, map auto-focus, worker reassignment, enhanced location history, marker labels, filter modal, visual system (see sub-items below) | 5-7 days | 2D-7 |
| **2D-11: Home Screen Location Card** | LocationStatusCard on HomeScreen, useHomeLocation hook, GPS coords + accuracy display, area boundary status, force-sync button | 1-2 days | 2D-5 |

#### 2D-10 Sub-Items

| # | Sub-Item | Key Files |
|---|----------|-----------|
| 10a | Day-type filtering in staffing queries | `apps/be/src/modules/monitoring/monitoring.service.ts`, `apps/be/src/modules/schedules/schedules.service.ts` |
| 10b | Rayon convex-hull boundary computation | `apps/be/src/modules/monitoring/utils/convex-hull.util.ts`, `apps/be/src/modules/rayons/rayons.service.ts` |
| 10c | Map auto-focus on filter selection | `apps/web/src/components/monitoring/MonitoringMap.tsx`, `apps/mobile/src/screens/supervisor/MapDashboardScreen.tsx` |
| 10d | Worker reassignment modal and endpoint | `apps/be/src/modules/monitoring/monitoring.controller.ts` (`POST /monitoring/reassign`), `apps/web/src/components/monitoring/ReassignWorkerModal.tsx` |
| 10e | Location history UX (clickable points, date picker, shift filter) | `apps/web/src/components/monitoring/LocationTimeline.tsx`, `apps/mobile/src/components/monitoring/LocationTrail.tsx` |
| 10f | Zoom-dependent marker labels (role - name) | `apps/mobile/src/components/monitoring/UserMarker.tsx`, `apps/web/src/components/monitoring/MarkerLayer.tsx` |
| 10g | Enhanced filter modal with staffing summary | `apps/mobile/src/components/monitoring/MonitoringFilterModal.tsx`, `apps/web/src/components/monitoring/MonitoringSidePanel.tsx` |
| 10h | Standardized icon/color system | `apps/mobile/src/constants/monitoringColors.ts`, `apps/web/src/lib/monitoring-colors.ts`, `specs/phases/phase-2-d-monitoring/ui-ux.md` |
| 10i | Operational Health Score computation | `apps/be/src/modules/monitoring/monitoring.service.ts` (`getStaffingSummary`), `apps/web/src/components/monitoring/HealthScoreBadge.tsx` |

### 2D-11: Home Screen Location Card

A new `LocationStatusCard` component on the worker HomeScreen that provides at-a-glance GPS and area status feedback. This gives field workers (satgas, linmas) visibility into their own tracking state without navigating to the map.

**Components:**

- **`LocationStatusCard`** (`apps/mobile/src/components/home/LocationStatusCard.tsx`) -- Displays current GPS coordinates, accuracy in meters, area boundary status (inside/outside/unknown), and last sync timestamp. Uses Neo Brutalism card styling consistent with other HomeScreen cards.
- **`useHomeLocation` hook** (`apps/mobile/src/hooks/useHomeLocation.ts`) -- Manages location state for the HomeScreen. Subscribes to the location service's last known position, computes whether the user is within their assigned area boundary, and exposes a `refreshLocation()` method.

**Behavior:**

- Only visible when the user has an active shift (clocked in). Hidden otherwise to avoid confusion.
- Shows a color-coded boundary indicator: green "Inside Area" / purple "Outside Area" / gray "No Boundary Defined"
- **Force-sync refresh button** -- Tapping the refresh icon triggers `LocationService.captureNow()` followed by `SyncService.forceUpload()`, immediately sending the latest GPS position to the backend. Useful when a worker notices their status is stale.
- Accuracy warning: if GPS accuracy > 50m, shows an amber warning icon with "Low GPS Accuracy" text.

**Dependencies:** Requires 2D-5 (mobile monitoring infrastructure, status colors, location service enhancements).

### Implementation Order Rationale

1. **Backend foundation first** (2D-1 → 2D-3) — All frontend work depends on working APIs
2. **WebSocket in parallel with endpoints** (2D-4) — Real-time events are critical for both mobile and web; must be done before any frontend
3. **Mobile before web** (2D-5 before 2D-6) — Field supervisors use mobile as primary monitoring tool; delivers value sooner
4. **Web after mobile** (2D-6) — Desktop dashboard used by office-based roles; can iterate while mobile is field-tested
5. **Testing spans all** (2D-7) — Unit tests written alongside each sub-phase; E2E and integration tests at the end

---

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Stale `user_tracking_status` data showing wrong status | Medium | High | 60-second cron job ensures max 60s staleness; status recomputed on every location ping |
| Polygon validation rejects valid boundaries | Low | Medium | Generous Surabaya bounding box; admin override flag |
| WebSocket room leak (clients not disconnecting) | Low | Medium | Existing `handleDisconnect` cleanup; periodic audit log |
| Location history endpoint abused for large date ranges | Medium | Medium | Restrict to single-day queries; add rate limit |
| Config change causes mass status recalculation | Low | Low | Debounce; recalculate in batches of 50 |
| Map performance with 500+ markers on web | Medium | Medium | Marker clustering; viewport-based rendering |
| Mobile map janky with polygon rendering | Low | Medium | `tracksViewChanges={false}`; pre-compute polygon paths |

---

## What Gets Deprecated

| Current Code | Status | Replacement |
|-------------|--------|-------------|
| `ONLINE_THRESHOLD_MS = 10 * 60 * 1000` (hardcoded) | Remove | `MonitoringCacheService.getThresholds()` |
| `is_within_area: true` (hardcoded in MonitoringService) | Remove | `GpsUtil.isWithinAreaBoundary()` computation |
| `shift_name: 'Active Shift'` (hardcoded) | Remove | `shift.shiftDefinition.name` join |
| `payload.role === 'Admin'` in EventsGateway | Fix | `UserRole.SUPERADMIN` enum values |
| N+1 queries in `getLiveUsers()` | Remove | Single join on `user_tracking_status` |
| `getAreaStaffRequirements()` total count | Fix | Count by `user.role` in join |
| `supervisor/active-workers` endpoint (Phase 1) | Deprecate | Use `monitoring/live-users` with filters |
| `calculateUserStatus()` 3-status model in mobile | Update | 5-status model (4 visible on map) |
| `validateClockInLocation()` hard-reject logic | Remove | Already superseded by Phase 2C soft geofencing |
| Radius circle rendering on mobile map | Replace | Polygon rendering with radius fallback |

---

## Related Documents

- [Backend Requirements](./backend.md) -- API endpoints, DTOs, services, WebSocket events
- [Database Schema](./database.md) -- Migration SQL, new tables, indexes
- [Mobile Requirements](./mobile.md) -- Map screen, markers, detail sheet, filter, trail
- [Web Requirements](./web.md) -- Google Maps integration, side panel, detail view, polygon editor
- [Testing Plan](./testing.md) -- Test stubs, coverage targets, E2E scenarios
- [UI/UX Design](./ui-ux.md) -- Colors, icons, layouts, accessibility, micro-interactions

---

**Last Updated:** 2026-03-07
