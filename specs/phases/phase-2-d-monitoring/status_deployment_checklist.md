# Phase 2D - Deployment & Testing Checklist

**Purpose:** Comprehensive deployment procedures and manual testing checklist for Phase 2D verification.
**Last Updated:** March 5, 2026
**Deployment Status:** ⏳ PENDING — Code-complete on `f/phase-2-d-monitoring`, awaiting merge & deploy
**Related ADRs:** [ADR-005](../../architecture/decisions/ADR-005-gps-boundary-tolerance.md), [ADR-009](../../architecture/decisions/ADR-009-phase2c-role-system-overhaul.md), [ADR-011](../../architecture/decisions/ADR-011-phase2d-monitoring-status-model.md)

---

## Legend

| Symbol | Status | Description |
|--------|--------|-------------|
| `[ ]` | Not tested | Test case not yet executed |
| `[x]` | Passed | Test case passed |
| `[!]` | Failed | Test case failed (needs fix) |
| `[-]` | Skipped | Test case skipped (not applicable) |

---

## Pre-Deployment Steps

### 1. Merge Branch

```bash
git checkout main
git merge f/phase-2-d-monitoring
git push origin main
```

### 2. Database Migration

```bash
# Run Phase 2D migration (creates user_tracking_status + monitoring_configs tables)
cd be && npm run typeorm migration:run

# OR if using DATABASE_SYNCHRONIZE=true (dev/staging only):
# Tables auto-created on startup
```

**New Tables:**
- `user_tracking_status` — Real-time worker status (one row per user)
- `monitoring_configs` — Configurable thresholds and settings

**New Indexes:**
- `user_tracking_status(user_id)` — Unique, fast lookup per user
- `user_tracking_status(area_id, status)` — Area-based status queries

### 3. Seed Monitoring Configuration

```bash
cd be && npm run seed:phase2d
```

**Seeds 5 config entries:**
| Key | Description |
|-----|-------------|
| `status_thresholds` | `active_max_age_seconds: 600`, `inactive_threshold_seconds: 1800`, `missing_threshold_seconds: 3600` |
| `geofencing` | `boundary_tolerance_meters: 50`, `grace_period_seconds: 300` |
| `map_defaults` | `zoom: 13`, `cluster_zoom_threshold: 14`, `center: [-7.2756, 112.7522]` |
| `alerts` | `battery_low_threshold: 20`, `enable_boundary_alerts: true` |
| `location_ping` | `interval_seconds: 300`, `batch_size: 10` |

### 4. Environment Variables

No new environment variables required for Phase 2D. WebSocket and JWT auth use existing configuration.

### 5. Build & Deploy

```bash
# Backend
cd be && npm run build
# Deploy container (same as Phase 2C)

# Web
cd fe/web && npm run build
# Deploy container

# Mobile
cd fe/mobile
# Build APK/IPA for distribution
```

---

## Test Environment Setup

### Test Credentials

| Role | Username | Password | Scope |
|------|----------|----------|-------|
| superadmin | admin | password123 | All endpoints |
| admin_system | admin_system1 | password123 | Config, boundary |
| top_management | top_mgmt1 | password123 | City-wide monitoring |
| kepala_rayon | kepalarayon1 | password123 | Rayon-scoped monitoring |
| korlap | korlap1 | password123 | Area-scoped monitoring |
| satgas | satgas1 | password123 | Worker (tracked) |
| linmas | linmas1 | password123 | Worker (tracked) |

### API Testing Tools

- **Swagger UI:** http://localhost:3000/api/docs
- **Postman:** `postman/SEKAR.postman_collection.json` (118 endpoints)
- **Adminer (DB):** http://localhost:8080
- **WebSocket:** ws://localhost:3000/events (JWT auth required)

### Setup Commands

```bash
# Start infrastructure
./infra/start.sh

# Backend
cd be && npm run start:dev

# Seed all data (Phase 1 + Phase 2 + Phase 2D)
cd be && npm run seed && npm run seed:phase2d

# Web dashboard
cd fe/web && npm run dev

# Mobile app
cd fe/mobile && npm run android
```

---

## Automated Test Verification

```bash
# Backend — all 1,095 tests must pass
cd be && npm test
# Expected: 1,095 passing, 0 failing

# Backend coverage
cd be && npm run test:cov
# Expected: >92% stmt, >80% branch

# Mobile — all 3,493 tests must pass
cd fe/mobile && npm test
# Expected: 3,493 passing

# Web — monitoring tests
cd fe/web && npm test -- --testPathPatterns monitoring
# Expected: all monitoring tests passing
```

---

## Manual Testing Checklist

### Section 1: Database

- [ ] `user_tracking_status` table exists with columns: `id`, `user_id`, `area_id`, `shift_id`, `status`, `is_within_area`, `latitude`, `longitude`, `battery_level`, `accuracy`, `updated_at`
- [ ] `monitoring_configs` table exists with 5 seed entries (status_thresholds, geofencing, map_defaults, alerts, location_ping)
- [ ] Index on `user_tracking_status(user_id)` exists
- [ ] Index on `user_tracking_status(area_id, status)` exists
- [ ] `shifts` table has `shift_definition_id` column (nullable UUID FK)

### Section 2: Monitoring API Endpoints

#### 2.1 Existing Endpoints (Phase 2D Enhanced)

- [ ] `GET /monitoring/city` — returns flat CityStats with `workers_online`, `linmas_online`, `areas` array
  - [ ] Logged in as `top_management` — ✅ 200
  - [ ] Logged in as `satgas` — ❌ 403
- [ ] `GET /monitoring/rayon/:id` — returns flat RayonMonitoringStats with per-area breakdown
  - [ ] Logged in as `kepala_rayon` (own rayon) — ✅ 200
  - [ ] Logged in as `kepala_rayon` (other rayon) — ❌ 403
- [ ] `GET /monitoring/area/:id` — returns flat AreaMonitoringStats with `users` array
  - [ ] Logged in as `korlap` (own area) — ✅ 200
  - [ ] Logged in as `korlap` (other area) — ❌ 403
- [ ] `GET /monitoring/live-users` — returns LiveUsersResponse with `total_active`, `total_inactive`, `total_outside_area`, `total_missing`, `total_offline`
  - [ ] Each user has `status`, `is_within_area`, `shift_name`, `phone`, `accuracy`
  - [ ] Filter by `?status=active` works
  - [ ] Filter by `?area_id=...` works

#### 2.2 New Phase 2D Endpoints

- [ ] `GET /monitoring/users/:id/location-history?date=2026-03-05`
  - [ ] Returns `points` array with `latitude`, `longitude`, `accuracy`, `logged_at`, `is_within_area`
  - [ ] Returns trail analytics: `total_distance_meters`, `total_points`, `time_inside_area_minutes`, `time_outside_area_minutes`
  - [ ] `?shift_id=...` filter works
  - [ ] Scoped: korlap can only view own area users

- [ ] `GET /monitoring/users/:id/day-summary`
  - [ ] Returns `user`, `shift` (with shift_definition name), `last_location`
  - [ ] Returns `today_activities` array, `today_tasks` array
  - [ ] Returns `whatsapp_links` with `{ chat, call }` URLs
  - [ ] Scoped: korlap can only view own area users

- [ ] `GET /monitoring/staffing-summary`
  - [ ] Returns areas grouped by rayon
  - [ ] Each area has `roles` array of `RoleStaffingDto` with `role`, `required`, `active`, `inactive`, `outside_area`, `missing`, `offline`
  - [ ] `?rayon_id=...` filter works
  - [ ] `?area_id=...` filter works

- [ ] `GET /monitoring/config` (admin_system/superadmin only)
  - [ ] Returns array of 5 config entries with `key`, `value`, `description`, `updated_at`
  - [ ] Non-admin role — ❌ 403

- [ ] `PATCH /monitoring/config/:key` (admin_system/superadmin only)
  - [ ] Update `status_thresholds` — ✅ 200, cache invalidated
  - [ ] Update with invalid value — ❌ 400 (Zod validation error)
  - [ ] Non-admin role — ❌ 403

#### 2.3 Area Boundary Endpoints

- [ ] `GET /areas/:id/boundary`
  - [ ] Returns `boundary_polygon` (GeoJSON), `gps_lat`, `gps_lng`, `radius_meters`, `coverage_area`
  - [ ] Returns `boundary_polygon: null` if no polygon set
- [ ] `PUT /areas/:id/boundary`
  - [ ] Send valid GeoJSON Polygon — ✅ 200, boundary saved
  - [ ] Send invalid GeoJSON (< 4 coordinates) — ❌ 400
  - [ ] Cache invalidated after update

### Section 3: WebSocket Events

- [ ] Connect to `ws://localhost:3000/events` with `auth: { token: <JWT> }`
  - [ ] Connection accepted with valid token
  - [ ] Connection rejected without token
- [ ] `user:location` event fires on location batch upload
  - [ ] Includes `user_id`, `latitude`, `longitude`, `status`, `is_within_area`, `shift_name`, `battery_level`
- [ ] `user:status-changed` event fires on status transitions
  - [ ] Includes `user_id`, `old_status`, `new_status`, `area_id`
- [ ] `user:left-area` event fires when worker leaves area boundary
  - [ ] Includes `user_id`, `area_id`, `area_name`
- [ ] `user:entered-area` event fires when worker enters area boundary
  - [ ] Includes `user_id`, `area_id`, `area_name`
- [ ] Scheduler cron (60s) recalculates stale users and emits status changes

### Section 4: Clock-In Integration

- [ ] Clock in as `satgas1`
  - [ ] `shift_definition_id` is populated on the created shift (check DB)
  - [ ] `user_tracking_status` row created/updated for this user
  - [ ] Status set to `active` initially
- [ ] Clock out as `satgas1`
  - [ ] `user_tracking_status` row updated: `status` → `offline`, `shift_id` → null

### Section 5: Web Dashboard

- [ ] `/monitoring` page loads with Mapbox map (65% map + 35% panel)
- [ ] Status cards show correct counts (Active, Inactive, Outside Area, Missing)
- [ ] Status cards are clickable filters (toggle on/off)
- [ ] User list displays with status dots, battery level, role badge
- [ ] Search bar filters users by name
- [ ] Click user → detail panel opens with:
  - [ ] Shift info (definition name, clock_in time)
  - [ ] Today's activities list
  - [ ] Today's tasks list
  - [ ] WhatsApp chat/call links
- [ ] Location timeline renders GPS trail for selected user
- [ ] Map shows area polygons with boundary overlay
- [ ] Map markers show correct five-status colors (green/amber/purple/red/gray)
- [ ] Real-time updates: move worker → marker updates without page refresh
- [ ] `/monitoring/config` page (admin only):
  - [ ] Shows all 5 config entries
  - [ ] Edit threshold values → save → verify updated in DB
  - [ ] Non-admin sees 403 or redirect

### Section 6: Mobile Dashboard

- [ ] MapDashboardScreen shows Google Maps with area polygons
- [ ] Five-status markers: active=green (#15803D), inactive=amber (#D97706), outside_area=purple (#9333EA), missing=red (#DC2626), offline=gray (#6B7280)
- [ ] StatusSummaryBar shows counts for each status
- [ ] UserListStrip horizontal scroll works
- [ ] Press marker → UserDetailSheet opens with:
  - [ ] Shift info
  - [ ] Activities list
  - [ ] Tasks list
- [ ] LocationTrail shows polyline with inside/outside color segments
- [ ] MonitoringFilterModal opens and cascading filters work:
  - [ ] Filter by rayon → areas update
  - [ ] Filter by role
  - [ ] Filter by status
- [ ] WebSocket real-time: move worker → marker updates without manual refresh
- [ ] Cluster markers appear when zoomed out (multiple workers in same area)
- [ ] FAB buttons work (zoom to bounds, open filter, center on user location)

---

## Post-Deployment Verification

After deploying to production:

1. [ ] `GET /monitoring/live-users` returns consistent counts with `GET /monitoring/city`
2. [ ] Clock in a worker → `shift_definition_id` populated, monitoring status updates
3. [ ] Upload location batch → real-time marker update on web + mobile dashboards
4. [ ] `GET /monitoring/config` returns 5 config entries (admin only)
5. [ ] Scheduler runs every 60s: stale workers transition to inactive → missing
6. [ ] All spec cross-references in `specs/` resolve correctly

---

## Rollback Procedure

If critical issues are found after deployment:

```bash
# Revert to Phase 2C
git revert <merge-commit-hash>
git push origin main

# Database: Drop new tables (if needed)
# Note: user_tracking_status and monitoring_configs can be dropped safely
# as they don't affect Phase 2C functionality
DROP TABLE IF EXISTS user_tracking_status;
DROP TABLE IF EXISTS monitoring_configs;
ALTER TABLE shifts DROP COLUMN IF EXISTS shift_definition_id;
```

---

*Phase 2D Real-Time Monitoring: Deployment & Testing Checklist*
*Last Updated: March 5, 2026*
