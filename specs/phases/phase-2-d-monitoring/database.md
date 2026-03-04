# Phase 2D: Database Schema Changes

**Last Updated:** 2026-03-03
**Status:** Planning
**Migration Strategy:** Single atomic migration with rollback support
**Related ADR:** [ADR-005](../../architecture/decisions/ADR-005-gps-boundary-tolerance.md), ADR-011 (new)
**See also:** [Backend Requirements](./backend.md), [README](./README.md)

---

## Current Codebase Facts (Verified)

| Fact | Actual Value | File |
|------|-------------|------|
| `location_logs` table | UUID PK, user_id, shift_id, gps_lat/lng, accuracy_meters, battery_level, logged_at | `be/src/modules/location/entities/location-log.entity.ts` |
| `shifts` table | UUID PK, user_id, area_id (nullable), clock_in/out timestamps, GPS, outside_boundary flags | `be/src/modules/shifts/entities/shift.entity.ts` |
| `areas` table | UUID PK, name, gps_lat/lng, radius_meters, boundary_polygon JSONB, rayon_id | `be/src/modules/areas/entities/area.entity.ts` |
| `shift_definitions` table | UUID PK, name, start_time, end_time, area_id, is_active | `be/src/modules/shifts/entities/shift-definition.entity.ts` |
| `users` table | UUID PK, role (VARCHAR), area_id, rayon_id, phone (nullable) | `be/src/modules/users/entities/user.entity.ts` |
| Online threshold | Hardcoded `ONLINE_THRESHOLD_MS = 10 * 60 * 1000` in monitoring service | `be/src/modules/monitoring/monitoring.service.ts` |
| Location partitioning | Range partitioned by `logged_at` month (ADR-006) | `specs/database/schema.md` |
| Existing indexes | `idx_shifts_worker_date`, `idx_shifts_active`, `idx_shifts_date_range` | `specs/database/schema.md` |

---

## Migration Overview

| Change | Type | Details |
|--------|------|---------|
| New table: `user_tracking_status` | CREATE | Materialized live status per user |
| New table: `monitoring_configs` | CREATE | Configurable threshold key-value store |
| Alter table: `shifts` | ADD COLUMN | `shift_definition_id UUID` FK |
| New index: `location_logs` | CREATE INDEX | Composite for history query |
| New index: `areas` | CREATE INDEX | GIN on boundary_polygon |
| New indexes: `user_tracking_status` | CREATE INDEX | status, area_id, shift_id, updated_at |

---

## Migration 1: New Tables

### 1A. `monitoring_configs` Table

Runtime-configurable thresholds for the monitoring system. Stored as JSONB for structured values with Zod validation on update.

```sql
CREATE TABLE monitoring_configs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key VARCHAR(100) UNIQUE NOT NULL,
    value JSONB NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed default configurations
INSERT INTO monitoring_configs (key, value, description) VALUES
('status_thresholds', '{
    "active_max_age_seconds": 300,
    "inactive_threshold_seconds": 900,
    "missing_threshold_seconds": 3600,
    "location_ping_interval_seconds": 60
}'::jsonb, 'User tracking status thresholds. Active: GPS within 5min. Idle: 5-15min. Missing: >1hr or no clock-in.'),

('geofencing', '{
    "tolerance_meters": 50,
    "outside_area_grace_seconds": 120
}'::jsonb, 'Geofencing tolerance for boundary checking. Grace period before outside_area status triggers.'),

('map_defaults', '{
    "center_lat": -7.2575,
    "center_lng": 112.7521,
    "zoom": 12,
    "cluster_threshold": 30,
    "cluster_zoom_delta": 0.05
}'::jsonb, 'Default map view settings for Surabaya area.'),

('alerts', '{
    "low_battery_threshold": 15,
    "understaffed_notify": true,
    "missing_user_notify": true
}'::jsonb, 'Alert trigger settings for monitoring dashboard.');
```

**Rationale:** A key-value config table rather than environment variables because:
- Thresholds need to be adjustable at runtime by admin_system/superadmin without redeployment
- JSONB allows structured values while keeping the schema flat
- Zod validation on the backend prevents invalid configurations

### 1B. `user_tracking_status` Table

Materialized live status for each user. Updated on every location ping and by a 60-second cron job. Eliminates N+1 query patterns in `MonitoringService.getLiveUsers()`.

```sql
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

    CONSTRAINT chk_tracking_status CHECK (
        status IN ('active', 'inactive', 'outside_area', 'missing', 'offline')
    )
);

-- Performance indexes
CREATE INDEX idx_uts_status ON user_tracking_status(status);
CREATE INDEX idx_uts_area_id ON user_tracking_status(area_id);
CREATE INDEX idx_uts_shift_id ON user_tracking_status(shift_id);
CREATE INDEX idx_uts_updated_at ON user_tracking_status(updated_at);
CREATE INDEX idx_uts_status_area ON user_tracking_status(status, area_id);
```

**Column descriptions:**

| Column | Type | Purpose |
|--------|------|---------|
| `user_id` | UUID PK | One row per user, FK to users |
| `shift_id` | UUID nullable | Current active shift (null if not clocked in) |
| `shift_definition_id` | UUID nullable | Links to shift type/schedule definition |
| `status` | VARCHAR(20) | Current tracking status: active, inactive, outside_area, missing, offline |
| `last_latitude` | DECIMAL(10,8) | Most recent GPS latitude |
| `last_longitude` | DECIMAL(11,8) | Most recent GPS longitude |
| `last_accuracy_meters` | DECIMAL(6,2) | GPS accuracy of last ping |
| `last_battery_level` | INTEGER | Battery % (0-100) of last ping |
| `last_location_at` | TIMESTAMPTZ | Timestamp of most recent GPS ping |
| `is_within_area` | BOOLEAN | Whether last position is inside assigned area boundary |
| `area_id` | UUID nullable | Current assigned area (for quick filtering) |
| `updated_at` | TIMESTAMPTZ | Last status recalculation time |

**Query optimization comparison:**

Before (current, N+1):
```sql
-- For each active shift:
SELECT * FROM shifts WHERE clock_out_time IS NULL;
-- Then for EACH user in result:
SELECT * FROM location_logs WHERE user_id = ? ORDER BY logged_at DESC LIMIT 1;
SELECT * FROM tasks WHERE assigned_to = ? AND status = 'in_progress';
-- = 3 queries per user x 200 users = 600+ queries per dashboard load
```

After (Phase 2D, single query):
```sql
SELECT uts.*, u.full_name, u.role, u.phone,
       a.name AS area_name, r.name AS rayon_name, r.id AS rayon_id,
       s.clock_in_time, sd.name AS shift_name
FROM user_tracking_status uts
INNER JOIN users u ON uts.user_id = u.id
LEFT JOIN areas a ON uts.area_id = a.id
LEFT JOIN rayons r ON a.rayon_id = r.id
LEFT JOIN shifts s ON uts.shift_id = s.id
LEFT JOIN shift_definitions sd ON uts.shift_definition_id = sd.id
WHERE uts.status != 'offline'
  AND ($1::uuid IS NULL OR a.rayon_id = $1)
  AND ($2::uuid IS NULL OR uts.area_id = $2);
-- = 1 query for entire dashboard
```

---

## Migration 2: Alter Existing Tables

### 2A. Add `shift_definition_id` to `shifts`

Resolves the hardcoded `shift_name: 'Active Shift'` issue by linking each shift to its definition.

```sql
ALTER TABLE shifts
    ADD COLUMN shift_definition_id UUID REFERENCES shift_definitions(id) ON DELETE SET NULL;

CREATE INDEX idx_shifts_shift_definition_id ON shifts(shift_definition_id);
```

### 2B. Add Composite Index to `location_logs`

Optimizes the location history playback query.

```sql
CREATE INDEX CONCURRENTLY idx_location_logs_user_shift_time
    ON location_logs(user_id, shift_id, logged_at DESC);
```

**Note:** `CONCURRENTLY` avoids locking the table during index creation. Essential since `location_logs` is a high-write table.

### 2C. Add GIN Index to `areas.boundary_polygon`

Enables future spatial queries on polygon data.

```sql
CREATE INDEX idx_areas_boundary_polygon ON areas USING GIN (boundary_polygon);
```

---

## Migration 3: Backfill Data

### 3A. Populate `user_tracking_status` for Existing Users

One-time backfill script that creates status rows for all clockable users.

```sql
-- Insert tracking status for all clockable users
INSERT INTO user_tracking_status (user_id, shift_id, area_id, status, updated_at)
SELECT
    u.id AS user_id,
    s.id AS shift_id,
    COALESCE(s.area_id, u.area_id) AS area_id,
    CASE
        WHEN s.id IS NULL THEN 'offline'
        ELSE 'active'
    END AS status,
    NOW() AS updated_at
FROM users u
LEFT JOIN shifts s ON s.user_id = u.id AND s.clock_out_time IS NULL AND s.deleted_at IS NULL
WHERE u.role IN ('satgas', 'linmas', 'korlap')
  AND u.deleted_at IS NULL
ON CONFLICT (user_id) DO NOTHING;
```

### 3B. Backfill `shifts.shift_definition_id`

Match existing active shifts to their definitions based on clock-in time and area.

```sql
UPDATE shifts s
SET shift_definition_id = sd.id
FROM shift_definitions sd
WHERE s.area_id = sd.area_id
  AND s.shift_definition_id IS NULL
  AND s.clock_out_time IS NULL
  AND sd.is_active = true
  AND s.clock_in_time::time BETWEEN sd.start_time AND sd.end_time;
```

---

## Rollback Script

```sql
-- Rollback Migration 3
DELETE FROM user_tracking_status;
UPDATE shifts SET shift_definition_id = NULL;

-- Rollback Migration 2
DROP INDEX IF EXISTS idx_location_logs_user_shift_time;
DROP INDEX IF EXISTS idx_areas_boundary_polygon;
ALTER TABLE shifts DROP COLUMN IF EXISTS shift_definition_id;

-- Rollback Migration 1
DROP TABLE IF EXISTS user_tracking_status;
DROP TABLE IF EXISTS monitoring_configs;
```

---

## Entity Relationship Diagram (Phase 2D additions highlighted)

```
users 1──1 user_tracking_status (NEW: live status cache)
  |
  +──* shifts ──1 shift_definitions (NEW FK: shift_definition_id)
  |     |
  |     +──* location_logs (ENHANCED: new composite index)
  |
  +──? areas ──* rayons
         |
         +── boundary_polygon JSONB (ENHANCED: GIN index)

monitoring_configs (NEW: standalone config table)
```

---

## Performance Estimates

| Table | Expected Rows | Growth Rate | Index Strategy |
|-------|--------------|-------------|----------------|
| `user_tracking_status` | ~500 (one per clockable user) | Stable | Btree on status, area_id |
| `monitoring_configs` | ~4 rows | Static | Unique on key |
| `location_logs` | ~480,000/month | ~16,000/day | Partitioned by month, composite index |
| `shifts` | ~500/day new | Grows daily | Existing indexes + new shift_definition_id |

---

**Last Updated:** 2026-03-03
