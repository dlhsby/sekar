# Phase 2D: Real-Time Monitoring Reimplementation

**Date:** March 3, 2026
**Status:** Planning
**Priority:** High
**Duration:** 17-24 developer-days (estimated)
**Depends On:** Phase 2C (Complete)
**Related ADRs:** [ADR-005](../../architecture/decisions/ADR-005-gps-boundary-tolerance.md), [ADR-009](../../architecture/decisions/ADR-009-role-system-redesign.md), [ADR-010](../../architecture/decisions/ADR-010-phase2c-terminology-cleanup.md), ADR-011 (new, this phase)

---

## Overview

Phase 2D is a comprehensive reimplementation of the SEKAR real-time monitoring system. The current monitoring implementation has several critical gaps: the web map is a placeholder (no Mapbox rendering), `is_within_area` is hardcoded to `true`, `shift_name` is hardcoded to `'Active Shift'`, WebSocket role checks use legacy PascalCase values, staff requirements are not broken down by role, and there is no location history playback.

This phase addresses all gaps by introducing a proper four-status tracking system backed by a materialized `user_tracking_status` table, replacing N+1 monitoring queries with efficient single-join queries, implementing the Mapbox map on web and polygon rendering on mobile, adding location history playback, user detail modals with WhatsApp deeplinks, configurable monitoring thresholds, and a comprehensive filter system with staffing summaries.

### Key Changes Summary

1. **Four-Status Tracking System** -- Replace the binary online/offline model with Active (green), Idle (amber), Outside Area (purple), and Offline/Missing (red) statuses
2. **Materialized Status Table** -- New `user_tracking_status` table for O(1) lookups instead of N+1 queries per dashboard load
3. **Configurable Thresholds** -- New `monitoring_configs` table for runtime-adjustable status thresholds without redeployment
4. **Web Map Implementation** -- Full Mapbox GL JS integration on the monitoring page with markers, polygons, clustering, and popups
5. **Mobile Map Enhancement** -- Polygon rendering (replacing radius circles), four-status colors, enhanced markers with role icons and labels
6. **Location History Playback** -- GPS trail visualization on map with timeline, clickable points, and first/last highlighting
7. **User Detail Modal** -- Rich bottom sheet (mobile) / side panel (web) with shift info, activities, WhatsApp deeplinks
8. **Filter System with Staffing Summary** -- Searchable rayon/area/user filters with per-role status breakdown showing active/idle/outside/offline counts
9. **WebSocket Fixes** -- Fix legacy PascalCase role checks, add new events (status changed, area enter/exit)
10. **Area Boundary Management** -- Web CRUD for area boundaries with polygon editor and KMZ import (review existing)
11. **Per-Role Staff Requirements** -- Break down staffing counts by role (satgas vs linmas) instead of aggregate totals
12. **Role-Scoped Monitoring** -- Enforce hierarchy: top_management (all), kepala_rayon (own rayon), korlap (own area)

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

## Status System

### Four-Status Model

| Status | Color | Hex | Condition | Action Required |
|--------|-------|-----|-----------|-----------------|
| **Active** | Dark Green | `#15803D` | Active shift + GPS ping <= 5 min + inside area boundary | None |
| **Idle** | Amber | `#D97706` | Active shift + GPS ping > 5 min but <= 15 min (configurable) | Check on worker |
| **Outside Area** | Purple | `#9333EA` | Active shift + GPS ping <= 5 min + outside area boundary | Investigate |
| **Missing/Offline** | Red | `#DC2626` | Scheduled but no clock-in, OR active shift but GPS > 1 hr | Urgent action |

### Status Resolution Priority

```
1. No active shift + not scheduled now → offline (gray, not shown on map)
2. No active shift + scheduled now → missing (red)
3. Active shift + no GPS data ever → missing (red)
4. Active shift + GPS age > 1 hour → missing (red)
5. Active shift + GPS age > 15 min → idle (amber)
6. Active shift + GPS age <= 5 min + outside boundary → outside_area (purple)
7. Active shift + GPS age <= 5 min + inside boundary → active (green)
8. Active shift + GPS age 5-15 min → idle (amber)
```

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

## Implementation Phases

> **Priority:** Mobile-first implementation. The mobile app is the primary tool used by field supervisors (korlap, kepala_rayon) for real-time monitoring in the field. Web follows as the desktop companion for top_management and admin roles.

| Sub-Phase | Scope | Effort | Dependencies |
|-----------|-------|--------|--------------|
| **2D-1: Foundation** | DB migration, entities, `user_tracking_status`, `monitoring_configs`, status calculator, cron scheduler, cache service | 3-4 days | None |
| **2D-2: Fix Hardcodes** | Fix `is_within_area`, `shift_name`, WebSocket roles, per-role staff counts | 1-2 days | 2D-1 |
| **2D-3: New Endpoints** | Location history, day summary, config CRUD, boundary CRUD, staffing summary | 2-3 days | 2D-1 |
| **2D-4: WebSocket Enhancements** | Fix auto-join rooms, add `user:status-changed` / `user:left-area` / `user:entered-area` events, enhance `user:location` with status/is_within_area/shift_name, integrate emission in StatusCalculatorService | 1-2 days | 2D-2 |
| **2D-5: Mobile Monitoring** | Polygon rendering, four-status colors, enhanced UserMarker, StatusSummaryBar, UserListStrip, UserDetailSheet, LocationTrail, MonitoringFilterModal, WebSocket event handlers | 3-4 days | 2D-3, 2D-4 |
| **2D-6: Web Monitoring** | Mapbox GL JS integration, MonitoringMap, MonitoringSidePanel, UserDetailPanel, LocationTimeline, StatusCards, `/monitoring/config` page, polygon editor, TanStack Query hooks | 4-5 days | 2D-3, 2D-4 |
| **2D-7: Testing** | Unit tests (>80%), integration tests, E2E (Playwright web, manual mobile) | 3-4 days | All above |

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
| `calculateUserStatus()` 3-status model in mobile | Update | 4-status model |
| `validateClockInLocation()` hard-reject logic | Remove | Already superseded by Phase 2C soft geofencing |
| Radius circle rendering on mobile map | Replace | Polygon rendering with radius fallback |

---

## Related Documents

- [Backend Requirements](./backend.md) -- API endpoints, DTOs, services, WebSocket events
- [Database Schema](./database.md) -- Migration SQL, new tables, indexes
- [Mobile Requirements](./mobile.md) -- Map screen, markers, detail sheet, filter, trail
- [Web Requirements](./web.md) -- Mapbox integration, side panel, detail view, polygon editor
- [Testing Plan](./testing.md) -- Test stubs, coverage targets, E2E scenarios
- [UI/UX Design](./ui-ux.md) -- Colors, icons, layouts, accessibility, micro-interactions

---

**Last Updated:** 2026-03-03
