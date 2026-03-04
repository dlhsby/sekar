# Phase 2D: Monitoring Enhancements — Deployment Guide

**Status:** 🟡 PLANNED
**Target:** TBD
**Prerequisites:** Phase 2C deployed ✅

---

## 1. Pre-Deployment Checklist

- [ ] All Phase 2D backend tests passing (~1,050 tests)
- [ ] All Phase 2D mobile tests passing (~3,400 tests)
- [ ] All Phase 2D web E2E tests passing (~22 specs)
- [ ] Database migration scripts reviewed and tested
- [ ] Backfill script for `user_tracking_status` tested on staging
- [ ] Mapbox token configured for production domain
- [ ] WebSocket event handlers verified on staging
- [ ] Monitoring config seed data reviewed
- [ ] Rollback procedure documented and rehearsed

---

## 2. Database Migration

### 2.1 New Tables

**Run in order:**

```sql
-- 1. Create monitoring_configs table
CREATE TABLE monitoring_configs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key VARCHAR(100) UNIQUE NOT NULL,
    value JSONB NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Create user_tracking_status table
CREATE TABLE user_tracking_status (
    user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    shift_id UUID REFERENCES shifts(id) ON DELETE SET NULL,
    shift_definition_id UUID REFERENCES shift_definitions(id) ON DELETE SET NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'offline',
    last_latitude DECIMAL(10, 8),
    last_longitude DECIMAL(11, 8),
    last_accuracy_meters DECIMAL(6, 2),
    last_battery_level INTEGER,
    last_location_at TIMESTAMPTZ,
    is_within_area BOOLEAN DEFAULT TRUE,
    area_id UUID REFERENCES areas(id) ON DELETE SET NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT chk_tracking_status CHECK (status IN ('active','inactive','outside_area','missing','offline'))
);
```

### 2.2 Alter Existing Tables

```sql
-- 3. Add shift_definition_id to shifts table
ALTER TABLE shifts ADD COLUMN shift_definition_id UUID REFERENCES shift_definitions(id) ON DELETE SET NULL;
```

### 2.3 Create Indexes

```sql
-- 4. Indexes for user_tracking_status
CREATE INDEX idx_uts_status ON user_tracking_status(status);
CREATE INDEX idx_uts_area_id ON user_tracking_status(area_id);
CREATE INDEX idx_uts_shift_id ON user_tracking_status(shift_id);
CREATE INDEX idx_uts_updated_at ON user_tracking_status(updated_at);
CREATE INDEX idx_uts_status_area ON user_tracking_status(status, area_id);

-- 5. Index for location history queries (run CONCURRENTLY in production)
CREATE INDEX CONCURRENTLY idx_location_logs_user_shift_time
    ON location_logs(user_id, shift_id, logged_at DESC);

-- 6. GIN index for area boundary spatial queries
CREATE INDEX idx_areas_boundary_polygon ON areas USING GIN(boundary_polygon);

-- 7. Index for shifts.shift_definition_id
CREATE INDEX idx_shifts_shift_definition_id ON shifts(shift_definition_id);
```

### 2.4 Seed Monitoring Config

```sql
-- 8. Insert default monitoring configuration
INSERT INTO monitoring_configs (key, value, description) VALUES
('status_thresholds', '{"active_max_age_seconds": 300, "inactive_threshold_seconds": 900, "missing_threshold_seconds": 3600, "location_ping_interval_seconds": 60}', 'Thresholds for determining user tracking status'),
('geofencing', '{"tolerance_meters": 50, "outside_area_grace_seconds": 120}', 'Geofencing tolerance and grace period settings'),
('map_defaults', '{"center_lat": -7.2575, "center_lng": 112.7521, "default_zoom": 12, "cluster_threshold": 30}', 'Default map view configuration'),
('alerts', '{"low_battery_threshold": 15, "understaffed_notify": true, "missing_notify": true}', 'Alert notification settings');
```

### 2.5 Backfill user_tracking_status

```sql
-- 9. Backfill from current active shifts
INSERT INTO user_tracking_status (user_id, shift_id, status, area_id, updated_at)
SELECT
    s.user_id,
    s.id AS shift_id,
    'offline' AS status,
    u.area_id,
    NOW()
FROM shifts s
JOIN users u ON s.user_id = u.id
WHERE s.clock_out_time IS NULL
ON CONFLICT (user_id) DO NOTHING;

-- 10. Backfill remaining users
INSERT INTO user_tracking_status (user_id, status, area_id, updated_at)
SELECT id, 'offline', area_id, NOW()
FROM users
WHERE deleted_at IS NULL
AND id NOT IN (SELECT user_id FROM user_tracking_status)
ON CONFLICT (user_id) DO NOTHING;
```

---

## 3. Backend Deployment

### 3.1 New Services

| Service | File | Description |
|---------|------|-------------|
| StatusCalculatorService | `monitoring/services/status-calculator.service.ts` | Core status computation logic |
| MonitoringSchedulerService | `monitoring/services/monitoring-scheduler.service.ts` | `@Cron(EVERY_MINUTE)` stale status re-evaluation |
| MonitoringCacheService | `monitoring/services/monitoring-cache.service.ts` | In-memory cache (thresholds: 1min TTL, boundaries: 5min TTL) |
| MonitoringConfigService | `monitoring/services/monitoring-config.service.ts` | CRUD for monitoring_configs |
| GeoJsonValidator | `common/utils/geojson-validator.util.ts` | Polygon validation utilities |

### 3.2 New Endpoints (7)

- `GET /monitoring/users/:userId/location-history`
- `GET /monitoring/users/:userId/day-summary`
- `GET /monitoring/config`
- `PATCH /monitoring/config/:key`
- `GET /monitoring/staffing-summary`
- `GET /areas/:id/boundary`
- `PUT /areas/:id/boundary`

### 3.3 Enhanced Endpoints (4)

- `GET /monitoring/live-users` — new `status` filter, enhanced DTO
- `GET /monitoring/area/:id` — per-role staff counts
- `GET /monitoring/city` — uses user_tracking_status table
- `GET /monitoring/rayon/:id` — uses user_tracking_status table

### 3.4 WebSocket Changes

- 3 new events: `user:status-changed`, `user:left-area`, `user:entered-area`
- Enhanced `user:location` with status, is_within_area, shift_name
- Fixed room join logic (PascalCase bug)

### 3.5 Deployment Steps

```bash
# 1. Run database migrations
npm run migration:run

# 2. Run seed for monitoring configs
npm run seed:monitoring-config

# 3. Run backfill script
npm run migration:backfill-tracking-status

# 4. Deploy backend
# Via GitHub Actions (automated) or manual:
docker build -t sekar-backend .
docker tag sekar-backend:latest <ECR_URI>/sekar-backend:phase-2d
docker push <ECR_URI>/sekar-backend:phase-2d

# 5. Verify cron job is running
curl -s https://api.sekar.wahyutrip.com/api/v1/health | jq .
```

---

## 4. Web Deployment

### 4.1 Environment Variables

```env
# Mapbox (required for Phase 2D)
NEXT_PUBLIC_MAPBOX_TOKEN=pk.xxxx     # Production Mapbox GL JS token
NEXT_PUBLIC_MAPBOX_STYLE=mapbox://styles/mapbox/streets-v12

# WebSocket (existing)
NEXT_PUBLIC_WS_URL=wss://api.sekar.wahyutrip.com
```

### 4.2 New Pages

- `/monitoring` — Enhanced split layout (65% map + 35% panel)
- `/monitoring/config` — Admin threshold management (admin_system, superadmin)
- `/areas/[id]` — Updated with boundary management tab

### 4.3 Deployment Steps

```bash
cd fe/web
npm run build
# Deploy via GitHub Actions or manual rsync
```

---

## 5. Mobile Deployment

### 5.1 New Dependencies

- `@gorhom/bottom-sheet` — Bottom sheet for user details
- No new native modules required

### 5.2 Changes

- MapDashboardScreen major rewrite
- 6 new components in `components/monitoring/`
- Enhanced monitoringSlice
- New WebSocket event handlers

### 5.3 Build & Release

```bash
cd fe/mobile
npm run android       # Test build
# Release via standard app store process
```

---

## 6. Post-Deployment Verification

### 6.1 Backend API Checks

```bash
# Health check
curl -s https://api.sekar.wahyutrip.com/api/v1/health

# Login as admin
TOKEN=$(curl -s -X POST https://api.sekar.wahyutrip.com/api/v1/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"username":"admin","password":"password123"}' | jq -r '.access_token')

# Test new endpoints
curl -s -H "Authorization: Bearer $TOKEN" \
  https://api.sekar.wahyutrip.com/api/v1/monitoring/live-users?status=active

curl -s -H "Authorization: Bearer $TOKEN" \
  https://api.sekar.wahyutrip.com/api/v1/monitoring/config

curl -s -H "Authorization: Bearer $TOKEN" \
  https://api.sekar.wahyutrip.com/api/v1/monitoring/staffing-summary
```

### 6.2 Web Dashboard Checks

- [ ] `/monitoring` page loads with Mapbox map
- [ ] Area polygons render correctly
- [ ] User markers show with correct status colors
- [ ] Side panel shows user list with status filtering
- [ ] Clicking marker opens user detail panel
- [ ] WebSocket connection established (check console)
- [ ] `/monitoring/config` accessible for admin_system/superadmin
- [ ] `/monitoring/config` returns 403 for other roles

### 6.3 Database Checks

```sql
-- Verify tables created
SELECT COUNT(*) FROM monitoring_configs;  -- Should be 4
SELECT COUNT(*) FROM user_tracking_status;  -- Should match active users

-- Verify indexes
SELECT indexname FROM pg_indexes WHERE tablename = 'user_tracking_status';
SELECT indexname FROM pg_indexes WHERE tablename = 'location_logs'
  WHERE indexname LIKE '%user_shift_time%';
```

---

## 7. Rollback Procedure

### 7.1 Backend Rollback

```bash
# Revert to Phase 2C container
docker pull <ECR_URI>/sekar-backend:phase-2c
docker tag <ECR_URI>/sekar-backend:phase-2c <ECR_URI>/sekar-backend:latest
# Restart ECS service
```

### 7.2 Database Rollback

```sql
-- WARNING: This will drop Phase 2D data
DROP TABLE IF EXISTS user_tracking_status;
DROP TABLE IF EXISTS monitoring_configs;
ALTER TABLE shifts DROP COLUMN IF EXISTS shift_definition_id;

-- Drop indexes
DROP INDEX IF EXISTS idx_location_logs_user_shift_time;
DROP INDEX IF EXISTS idx_areas_boundary_polygon;
```

### 7.3 Web Rollback

```bash
# Revert to previous build
# Via GitHub Actions: re-run Phase 2C deployment
```

---

## 8. Breaking Changes

### API Changes
- `GET /monitoring/live-users` response: `total_online` deprecated (alias for `total_active`), new fields added
- `GET /monitoring/area/:id` response: staff requirements now per-role instead of aggregate
- `user:location` WebSocket event: 3 new fields (non-breaking addition)

### Mobile App Compatibility
- Mobile app must be updated to Phase 2D to use new monitoring features
- Phase 2C mobile app will continue to work with deprecated `total_online` field

### Database
- 2 new tables (additive, non-breaking)
- 1 new column on `shifts` (nullable, non-breaking)
- 8 new indexes (performance improvement, non-breaking)

---

## 9. Monitoring Health Checks

### Cron Job Verification

```bash
# Check cron job is running (logs should show every 60 seconds)
docker logs sekar-backend --since 5m | grep "MonitoringScheduler"
```

### Performance Metrics

| Metric | Target | Check |
|--------|--------|-------|
| `/monitoring/live-users` response time | < 200ms | `curl -w '%{time_total}' ...` |
| `/monitoring/city` response time | < 500ms | Was N+1, now single query |
| WebSocket event delivery | < 100ms | Check client-side timestamps |
| Cron job execution | < 10s per cycle | Check logs |
| Cache hit rate | > 90% for thresholds | Check MonitoringCacheService logs |

---

## 10. Infrastructure

| Component | Details |
|-----------|---------|
| EC2 | Existing instance (no changes) |
| RDS | PostgreSQL 14+ (2 new tables, 1 altered, 8 new indexes) |
| ECR | New image tag: `phase-2d` |
| S3 | No changes |
| Mapbox | New GL JS token required for web production domain |

---

**Document Version:** 1.0.0
**Created:** 2026-03-03
**Author:** Phase 2D Planning
