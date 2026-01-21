# Database Schema

Complete PostgreSQL database schema for SEKAR system with production-ready optimizations.

**Document Owner:** Database Engineer
**Last Updated:** 2026-01-16
**Status:** Phase 1 Complete + Production Hardening Required

---

## Overview

- **DBMS:** PostgreSQL 14+
- **ORM:** TypeORM 0.3.x
- **Character Set:** UTF-8
- **Primary Keys:** UUID (all tables)
- **Soft Delete:** users, areas, shifts, reports (deleted_at column)
- **Partitioning:** location_logs (by month), audit_logs (Phase 6)

---

## Core Tables (Phase 1)

### 1. users

Stores all system users (workers, supervisors, admins).

```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  username VARCHAR(50) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  full_name VARCHAR(100) NOT NULL,
  phone VARCHAR(20),
  role VARCHAR(20) NOT NULL, -- 'worker', 'supervisor', 'admin'
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,

  CONSTRAINT uq_users_username UNIQUE (username),
  CONSTRAINT chk_users_role CHECK (role IN ('worker', 'supervisor', 'admin'))
);

-- Indexes
CREATE UNIQUE INDEX idx_users_username ON users(username) WHERE deleted_at IS NULL;
CREATE INDEX idx_users_role ON users(role) WHERE deleted_at IS NULL;
CREATE INDEX idx_users_active ON users(is_active) WHERE deleted_at IS NULL;
```

**TypeORM Entity:**
```typescript
@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true, length: 50 })
  username: string;

  @Column({ length: 255 })
  password_hash: string;

  @Column({ length: 100 })
  full_name: string;

  @Column({ length: 20, nullable: true })
  phone?: string;

  @Column({ type: 'varchar', length: 20 })
  role: 'worker' | 'supervisor' | 'admin';

  @Column({ default: true })
  is_active: boolean;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  @DeleteDateColumn()
  deleted_at?: Date;
}
```

---

### 2. area_types

Lookup table for area types (park, pedestrian, mini_garden, street).

```sql
CREATE TABLE area_types (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code VARCHAR(20) NOT NULL,
  name VARCHAR(50) NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT uq_area_types_code UNIQUE (code)
);

-- Indexes
CREATE UNIQUE INDEX idx_area_types_code ON area_types(code);

-- Seed data
INSERT INTO area_types (code, name, description) VALUES
('park', 'Taman', 'Taman kota (city park)'),
('pedestrian', 'Jalur Pedestrian', 'Trotoar dan jalur pejalan kaki'),
('mini_garden', 'Taman Mini', 'Taman kecil di perumahan'),
('street', 'Median Jalan', 'Median jalan dan taman jalan');
```

---

### 3. areas

Work areas with GPS boundaries.

```sql
CREATE TABLE areas (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(100) NOT NULL,
  area_type_id UUID NOT NULL REFERENCES area_types(id) ON DELETE RESTRICT,
  gps_lat DECIMAL(10, 8) NOT NULL,
  gps_lng DECIMAL(11, 8) NOT NULL,
  radius_meters INTEGER DEFAULT 100,
  address TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,

  CONSTRAINT chk_areas_gps_lat CHECK (gps_lat BETWEEN -90 AND 90),
  CONSTRAINT chk_areas_gps_lng CHECK (gps_lng BETWEEN -180 AND 180),
  CONSTRAINT chk_areas_radius CHECK (radius_meters BETWEEN 1 AND 10000)
);

-- Indexes
CREATE INDEX idx_areas_type ON areas(area_type_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_areas_active ON areas(is_active) WHERE deleted_at IS NULL AND is_active = TRUE;
```

---

### 4. worker_assignments

One-to-one mapping of workers to their assigned areas.

```sql
CREATE TABLE worker_assignments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  worker_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  area_id UUID NOT NULL REFERENCES areas(id) ON DELETE RESTRICT,
  assigned_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT uq_worker_assignments_worker UNIQUE (worker_id)
);

-- Indexes
CREATE UNIQUE INDEX idx_worker_assignments_worker ON worker_assignments(worker_id);
CREATE INDEX idx_worker_assignments_area ON worker_assignments(area_id);
```

---

### 5. shifts

Clock-in and clock-out records with GPS validation.

```sql
CREATE TABLE shifts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  worker_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  area_id UUID NOT NULL REFERENCES areas(id) ON DELETE RESTRICT,
  clock_in_time TIMESTAMPTZ NOT NULL,
  clock_in_gps_lat DECIMAL(10, 8) NOT NULL,
  clock_in_gps_lng DECIMAL(11, 8) NOT NULL,
  clock_in_photo_url TEXT,
  clock_out_time TIMESTAMPTZ,
  clock_out_gps_lat DECIMAL(10, 8),
  clock_out_gps_lng DECIMAL(11, 8),
  clock_out_photo_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,

  CONSTRAINT chk_shifts_times CHECK (clock_out_time IS NULL OR clock_out_time > clock_in_time),
  CONSTRAINT chk_shifts_clock_in_lat CHECK (clock_in_gps_lat BETWEEN -90 AND 90),
  CONSTRAINT chk_shifts_clock_in_lng CHECK (clock_in_gps_lng BETWEEN -180 AND 180)
);

-- CRITICAL Indexes for performance
CREATE INDEX idx_shifts_worker_date ON shifts(worker_id, clock_in_time DESC) WHERE deleted_at IS NULL;
CREATE INDEX idx_shifts_area_date ON shifts(area_id, clock_in_time DESC) WHERE deleted_at IS NULL;
CREATE INDEX idx_shifts_active ON shifts(worker_id) WHERE clock_out_time IS NULL AND deleted_at IS NULL;
CREATE INDEX idx_shifts_date_range ON shifts(clock_in_time DESC) WHERE deleted_at IS NULL;
```

---

### 6. work_reports

Daily work reports with photos and GPS tracking.

```sql
CREATE TABLE work_reports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  shift_id UUID NOT NULL REFERENCES shifts(id) ON DELETE RESTRICT,
  worker_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  area_id UUID NOT NULL REFERENCES areas(id) ON DELETE RESTRICT,
  report_type VARCHAR(50) NOT NULL,
  description TEXT NOT NULL,
  condition VARCHAR(20),
  gps_lat DECIMAL(10, 8) NOT NULL,
  gps_lng DECIMAL(11, 8) NOT NULL,
  photo_url TEXT,
  is_reviewed BOOLEAN DEFAULT FALSE,
  reviewed_by UUID REFERENCES users(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,

  CONSTRAINT chk_reports_type CHECK (report_type IN ('task_completion', 'incident', 'maintenance_request')),
  CONSTRAINT chk_reports_condition CHECK (condition IS NULL OR condition IN ('Baik', 'Cukup', 'Buruk')),
  CONSTRAINT chk_reports_gps_lat CHECK (gps_lat BETWEEN -90 AND 90),
  CONSTRAINT chk_reports_gps_lng CHECK (gps_lng BETWEEN -180 AND 180)
);

-- CRITICAL Indexes
CREATE INDEX idx_reports_shift_created ON work_reports(shift_id, created_at DESC) WHERE deleted_at IS NULL;
CREATE INDEX idx_reports_worker_date ON work_reports(worker_id, created_at DESC) WHERE deleted_at IS NULL;
CREATE INDEX idx_reports_type_date ON work_reports(report_type, created_at DESC) WHERE deleted_at IS NULL;
CREATE INDEX idx_reports_unreviewed ON work_reports(is_reviewed, created_at DESC) WHERE is_reviewed = FALSE AND deleted_at IS NULL;
```

---

### 7. location_logs (Partitioned)

GPS location pings every 5 minutes during shifts - **HIGH VOLUME TABLE**.

```sql
-- Parent table with partitioning
CREATE TABLE location_logs (
  id UUID NOT NULL DEFAULT uuid_generate_v4(),
  worker_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  shift_id UUID NOT NULL REFERENCES shifts(id) ON DELETE CASCADE,
  gps_lat DECIMAL(10, 8) NOT NULL,
  gps_lng DECIMAL(11, 8) NOT NULL,
  accuracy_meters DECIMAL(6, 2),
  battery_level INTEGER,
  logged_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT chk_location_logs_gps_lat CHECK (gps_lat BETWEEN -90 AND 90),
  CONSTRAINT chk_location_logs_gps_lng CHECK (gps_lng BETWEEN -180 AND 180),
  CONSTRAINT chk_location_logs_battery CHECK (battery_level IS NULL OR battery_level BETWEEN 0 AND 100),

  PRIMARY KEY (id, logged_at)
) PARTITION BY RANGE (logged_at);

-- Create monthly partitions (automate in production)
CREATE TABLE location_logs_2026_01 PARTITION OF location_logs
  FOR VALUES FROM ('2026-01-01') TO ('2026-02-01');

CREATE TABLE location_logs_2026_02 PARTITION OF location_logs
  FOR VALUES FROM ('2026-02-01') TO ('2026-03-01');

-- CRITICAL Indexes (apply to each partition)
CREATE INDEX idx_location_logs_2026_01_worker_latest
  ON location_logs_2026_01(worker_id, logged_at DESC);
CREATE INDEX idx_location_logs_2026_01_shift_time
  ON location_logs_2026_01(shift_id, logged_at DESC);

-- Repeat for each partition...
```

**Partition Management Script:**
```sql
-- Run monthly to create next month's partition
CREATE OR REPLACE FUNCTION create_next_month_partition()
RETURNS void AS $$
DECLARE
  next_month DATE := DATE_TRUNC('month', NOW() + INTERVAL '1 month');
  month_after DATE := next_month + INTERVAL '1 month';
  partition_name TEXT := 'location_logs_' || TO_CHAR(next_month, 'YYYY_MM');
BEGIN
  EXECUTE format('CREATE TABLE IF NOT EXISTS %I PARTITION OF location_logs FOR VALUES FROM (%L) TO (%L)',
    partition_name, next_month, month_after);

  EXECUTE format('CREATE INDEX idx_%I_worker_latest ON %I(worker_id, logged_at DESC)',
    partition_name, partition_name);
  EXECUTE format('CREATE INDEX idx_%I_shift_time ON %I(shift_id, logged_at DESC)',
    partition_name, partition_name);
END;
$$ LANGUAGE plpgsql;

-- Schedule with pg_cron or run via application
-- DROP partitions older than 1 year
```

---

## Phase 2+ Tables

### tasks (Phase 2)

Task assignment and tracking.

```sql
CREATE TABLE tasks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title VARCHAR(100) NOT NULL,
  description TEXT,
  assigned_to UUID REFERENCES users(id) ON DELETE SET NULL,
  assigned_by UUID REFERENCES users(id) ON DELETE SET NULL,
  area_id UUID REFERENCES areas(id) ON DELETE SET NULL,
  priority VARCHAR(20) DEFAULT 'normal',
  status VARCHAR(20) DEFAULT 'pending',
  due_date TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,

  CONSTRAINT chk_task_priority CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  CONSTRAINT chk_task_status CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled')),
  CONSTRAINT chk_task_completed CHECK (
    (status = 'completed' AND completed_at IS NOT NULL) OR
    (status != 'completed' AND completed_at IS NULL)
  )
);

CREATE INDEX idx_tasks_assigned_status ON tasks(assigned_to, status, due_date) WHERE deleted_at IS NULL;
CREATE INDEX idx_tasks_area ON tasks(area_id, status) WHERE deleted_at IS NULL;
```

### notifications (Phase 2)

Push notifications and in-app alerts.

```sql
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(100) NOT NULL,
  body TEXT NOT NULL,
  type VARCHAR(50) NOT NULL,
  data JSONB,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT chk_notification_type CHECK (type IN ('task_assigned', 'shift_reminder', 'report_reviewed', 'system'))
);

CREATE INDEX idx_notifications_user_unread ON notifications(user_id, created_at DESC) WHERE read_at IS NULL;
CREATE INDEX idx_notifications_type_user ON notifications(type, user_id, created_at DESC);
CREATE INDEX idx_notifications_data ON notifications USING GIN (data);
```

### assets (Phase 4)

Equipment and tool tracking with QR codes.

```sql
CREATE TABLE assets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  asset_code VARCHAR(50) UNIQUE NOT NULL,
  name VARCHAR(100) NOT NULL,
  asset_type VARCHAR(50) NOT NULL,
  description TEXT,
  purchase_date DATE,
  warranty_expiry DATE,
  status VARCHAR(20) DEFAULT 'available',
  current_holder_id UUID REFERENCES users(id) ON DELETE SET NULL,
  current_area_id UUID REFERENCES areas(id) ON DELETE SET NULL,
  photo_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,

  CONSTRAINT chk_asset_status CHECK (status IN ('available', 'in-use', 'maintenance', 'retired')),
  CONSTRAINT chk_asset_assignment CHECK (current_holder_id IS NULL OR current_area_id IS NULL)
);

CREATE UNIQUE INDEX idx_assets_code ON assets(asset_code);
CREATE INDEX idx_assets_available ON assets(status, asset_type)
  WHERE status = 'available' AND deleted_at IS NULL;
CREATE INDEX idx_assets_holder ON assets(current_holder_id)
  WHERE current_holder_id IS NOT NULL;
```

### audit_logs (Phase 6) - Partitioned

Track all admin actions for compliance.

```sql
CREATE TABLE audit_logs (
  id UUID NOT NULL DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  action VARCHAR(50) NOT NULL,
  entity_type VARCHAR(50) NOT NULL,
  entity_id UUID,
  old_value JSONB,
  new_value JSONB,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  PRIMARY KEY (id, created_at)
) PARTITION BY RANGE (created_at);

CREATE INDEX idx_audit_logs_user ON audit_logs(user_id, created_at DESC);
CREATE INDEX idx_audit_logs_entity ON audit_logs(entity_type, entity_id, created_at DESC);
```

---

## Performance Optimizations

### Connection Pooling

**Philosophy:** Proper connection pool tuning prevents exhaustion under load while avoiding waste of database resources.

#### Development Configuration

**Target:** Single developer, low concurrency

```typescript
// be/src/config/typeorm.config.ts (development)
export const typeOrmConfig: TypeOrmModuleOptions = {
  // ... other config
  extra: {
    max: 10,                    // Max connections per app instance
    min: 2,                     // Min idle connections
    idleTimeoutMillis: 30000,   // Close idle connections after 30s
    connectionTimeoutMillis: 2000,
  },
  poolSize: 10,
  maxQueryExecutionTime: 1000,  // Log queries > 1s
  logging: ['error', 'warn', 'migration'],
};
```

**Rationale:**
- 10 connections sufficient for local testing
- Low min (2) reduces database resource usage when idle
- 30s idle timeout keeps connections fresh

---

#### Production Configuration

**Target:** 500 workers, 100-150 concurrent API requests, 4 backend instances

```typescript
// be/src/config/typeorm.config.ts (production)
export const typeOrmConfig: TypeOrmModuleOptions = {
  type: 'postgres',
  host: process.env.DATABASE_HOST,
  port: parseInt(process.env.DATABASE_PORT, 10),
  username: process.env.DATABASE_USER,
  password: process.env.DATABASE_PASSWORD,
  database: process.env.DATABASE_NAME,

  // Connection Pool Settings
  extra: {
    max: 15,                    // Max connections per app instance
    min: 5,                     // Min idle connections (always warm)
    idleTimeoutMillis: 60000,   // Close idle after 60s
    connectionTimeoutMillis: 3000,  // Wait up to 3s for connection

    // PostgreSQL-specific optimizations
    statement_timeout: 30000,   // Kill queries after 30s
    query_timeout: 30000,

    // SSL for RDS
    ssl: {
      rejectUnauthorized: true,
      ca: process.env.RDS_CA_CERT,
    },
  },

  poolSize: 15,                 // Deprecated but kept for compatibility
  maxQueryExecutionTime: 1000,  // Log slow queries (>1s)

  // Production logging (errors only)
  logging: ['error', 'migration'],

  // Performance
  cache: {
    type: 'redis',
    options: {
      host: process.env.REDIS_HOST,
      port: 6379,
    },
    duration: 300000,           // 5-minute cache TTL
  },
};
```

**Pool Sizing Calculation:**

```
Total Concurrent Requests: 150 (peak)
Backend Instances: 4
Connections Per Instance: 150 / 4 = 37.5 → round up to 40

HOWEVER: Set to 15 per instance (60 total) because:
1. Most requests share connections (quick queries)
2. Connection reuse via pooling
3. Buffer for burst traffic (60 → 150 capacity with queueing)
4. Avoid exhausting RDS max_connections

RDS max_connections = 150
Reserved for system: 90 (60%)
Available for app: 60
Per instance: 60 / 4 = 15 ✅
```

**AWS RDS Configuration:**

```sql
-- On RDS instance (requires restart)
ALTER SYSTEM SET max_connections = 150;
ALTER SYSTEM SET shared_buffers = '256MB';
ALTER SYSTEM SET effective_cache_size = '1GB';
ALTER SYSTEM SET maintenance_work_mem = '128MB';
ALTER SYSTEM SET work_mem = '8MB';
ALTER SYSTEM SET random_page_cost = 1.1;  -- For SSD storage

-- Apply changes
SELECT pg_reload_conf();
```

**Monitoring RDS Parameter Group:**
- `max_connections`: 150 (for db.t3.small)
- Scale to 300 if upgrading to db.t3.medium
- Scale to 600 if upgrading to db.m5.large

---

#### Connection Pool Monitoring

**Check Active Connections:**

```sql
-- Current connection count by state
SELECT
  state,
  COUNT(*) as count,
  MAX(NOW() - state_change) as max_duration
FROM pg_stat_activity
WHERE datname = 'sekar_db'
GROUP BY state
ORDER BY count DESC;

-- Example output:
-- state      | count | max_duration
-- -----------|-------|-------------
-- active     | 12    | 00:00:02.5
-- idle       | 3     | 00:01:30
-- (blank)    | 1     | -
```

**Check Pool Exhaustion:**

```sql
-- Queries waiting for connections
SELECT
  pid,
  usename,
  application_name,
  state,
  wait_event,
  wait_event_type,
  NOW() - state_change as wait_duration
FROM pg_stat_activity
WHERE wait_event = 'ClientRead'
  AND state = 'idle in transaction'
  AND NOW() - state_change > INTERVAL '5 seconds'
ORDER BY wait_duration DESC;
```

**Backend Application Metrics:**

```typescript
// Add to MetricsInterceptor (cross-cutting-concerns.md)
import { getManager } from 'typeorm';

const connectionPool = getManager().connection.driver.pool;

const metrics = {
  total: connectionPool.totalCount,      // Total connections
  idle: connectionPool.idleCount,        // Idle connections
  waiting: connectionPool.waitingCount,  // Requests waiting for connection
};

// Alert if waiting > 5 for more than 10 seconds
if (metrics.waiting > 5) {
  logger.warn('[ConnectionPool] High wait count', metrics);
}
```

---

#### Scaling Connection Pools

**When to Increase Pool Size:**

| Symptom | Cause | Solution |
|---------|-------|----------|
| API timeouts (>3s) | Pool exhaustion | Increase `max` by 5-10 per instance |
| "sorry, too many clients" | Exceeded RDS max_connections | Increase RDS max_connections OR reduce pool size |
| High `waiting` count (>10) | More concurrent requests than pool | Scale horizontally (add instances) OR increase pool |
| Connection churn (new conn/s > 50) | Pool too small, frequent recreate | Increase `min` to keep more connections warm |
| Idle connections (>50%) | Pool too large | Reduce `max` to free RDS resources |

**Progressive Scaling Strategy:**

```typescript
// Phase 1: 30 workers
max: 10 per instance × 1 instance = 10 total connections

// Phase 2: 100 workers
max: 12 per instance × 2 instances = 24 total connections

// Phase 3: 300 workers
max: 15 per instance × 3 instances = 45 total connections

// Production: 500 workers
max: 15 per instance × 4 instances = 60 total connections

// Scale: 1000+ workers
max: 20 per instance × 5 instances = 100 total connections
+ Consider read replicas for dashboard queries
```

---

#### Connection Pool Troubleshooting

**Problem 1: "Connection timeout" errors**

```bash
# Symptom
Error: Connection timeout. Could not get connection from the pool within 3000ms

# Check pool settings
SELECT name, setting FROM pg_settings WHERE name LIKE '%timeout%';

# Solution
1. Increase connectionTimeoutMillis: 3000 → 5000
2. Check for connection leaks (queries not releasing)
3. Scale horizontally (add instances)
```

**Problem 2: "Too many clients already"**

```bash
# Symptom
Error: FATAL: sorry, too many clients already

# Check current connections
SELECT COUNT(*) FROM pg_stat_activity;

# Solution
1. Reduce max per instance (15 → 12)
2. Increase RDS max_connections (requires restart)
3. Find and kill idle connections:
   SELECT pg_terminate_backend(pid)
   FROM pg_stat_activity
   WHERE state = 'idle'
   AND state_change < NOW() - INTERVAL '10 minutes';
```

**Problem 3: Connection leaks**

```sql
-- Find long-running queries holding connections
SELECT
  pid,
  usename,
  application_name,
  query_start,
  NOW() - query_start as duration,
  LEFT(query, 100) as query_snippet
FROM pg_stat_activity
WHERE state = 'active'
  AND NOW() - query_start > INTERVAL '30 seconds'
ORDER BY duration DESC;

-- Kill if necessary
SELECT pg_terminate_backend(<pid>);
```

**Problem 4: Connection churn (frequent reconnects)**

```typescript
// Monitor connection creation rate
const connectionMetrics = {
  createdLast1Min: 0,  // Should be <10/min normally
  destroyedLast1Min: 0,
};

// If churn is high (>50/min):
// 1. Increase min connections (5 → 8)
// 2. Increase idleTimeoutMillis (60000 → 120000)
// 3. Check for connection leaks in application code
```

---

#### Environment-Specific Settings

```bash
# .env.development
DATABASE_MAX_CONNECTIONS=10
DATABASE_MIN_CONNECTIONS=2
DATABASE_CONNECTION_TIMEOUT=2000
DATABASE_IDLE_TIMEOUT=30000

# .env.production
DATABASE_MAX_CONNECTIONS=15
DATABASE_MIN_CONNECTIONS=5
DATABASE_CONNECTION_TIMEOUT=3000
DATABASE_IDLE_TIMEOUT=60000
RDS_MAX_CONNECTIONS=150  # AWS RDS setting

# Load in TypeORM config
extra: {
  max: parseInt(process.env.DATABASE_MAX_CONNECTIONS, 10) || 10,
  min: parseInt(process.env.DATABASE_MIN_CONNECTIONS, 10) || 2,
  connectionTimeoutMillis: parseInt(process.env.DATABASE_CONNECTION_TIMEOUT, 10) || 2000,
  idleTimeoutMillis: parseInt(process.env.DATABASE_IDLE_TIMEOUT, 10) || 30000,
}
```

---

#### Load Testing Connection Pools

**Artillery Test:**

```yaml
# artillery-load-test.yml
config:
  target: 'https://api.sekar.dlhsurabaya.go.id'
  phases:
    - duration: 60
      arrivalRate: 10    # 10 requests/sec
      name: "Warm up"
    - duration: 300
      arrivalRate: 50    # 50 requests/sec (150 concurrent)
      name: "Sustained load"
    - duration: 60
      arrivalRate: 100   # Spike to 100 req/sec
      name: "Spike test"

scenarios:
  - name: "Mixed workload"
    flow:
      - get:
          url: "/api/v1/areas"
      - think: 2
      - post:
          url: "/api/v1/shifts/clock-in"
          json:
            gps_lat: -7.250445
            gps_lng: 112.768845
            selfie_url: "https://..."
```

**Expected Results:**

| Phase | Requests/sec | Concurrent | Response Time (p95) | Connection Pool Usage | Outcome |
|-------|--------------|------------|---------------------|----------------------|---------|
| Warm up | 10 | 30 | <100ms | 20% (3/15) | ✅ Pass |
| Sustained | 50 | 150 | <500ms | 80% (12/15) | ✅ Pass |
| Spike | 100 | 300 | <1s | 100% (15/15 + queue) | ⚠️ Some queueing acceptable |

**Alert if:**
- p95 response time > 1s sustained
- Connection pool exhaustion > 30s
- Error rate > 1%

### Query Optimization

```sql
-- Enable pg_stat_statements for monitoring
CREATE EXTENSION IF NOT EXISTS pg_stat_statements;

-- Find slow queries
SELECT
  query,
  calls,
  mean_exec_time,
  max_exec_time
FROM pg_stat_statements
WHERE mean_exec_time > 1000  -- Over 1 second
ORDER BY mean_exec_time DESC
LIMIT 20;
```

### Vacuum Strategy

```sql
-- Aggressive autovacuum for high-churn tables
ALTER TABLE location_logs SET (
  autovacuum_vacuum_scale_factor = 0.05,
  autovacuum_analyze_scale_factor = 0.05
);

ALTER TABLE work_reports SET (
  autovacuum_vacuum_scale_factor = 0.1
);
```

---

## Database Constraints Summary

| Constraint Type | Usage | Example |
|----------------|-------|---------|
| PRIMARY KEY | All tables | UUID with uuid_generate_v4() |
| FOREIGN KEY | All relationships | ON DELETE RESTRICT (default), CASCADE (logs), SET NULL (optional refs) |
| UNIQUE | Username, asset codes | UNIQUE indexes with WHERE deleted_at IS NULL |
| CHECK | Enums, ranges, logic | Role enum, GPS ranges, status values |
| NOT NULL | Required fields | username, gps coordinates, timestamps |

---

## Migration Checklist

Before deploying to production:

- [ ] Run EXPLAIN ANALYZE on all supervisor dashboard queries
- [ ] Ensure all indexes exist (check with `\di` in psql)
- [ ] Test partition creation script
- [ ] Verify cascade rules (don't accidentally delete data)
- [ ] Load test with 500-worker simulation
- [ ] Enable pg_stat_statements extension
- [ ] Configure connection pooling
- [ ] Set up automated backups (RDS automated backups)
- [ ] Test restoration from backup

---

## Scalability Targets

| Metric | 30 Workers (Pilot) | 500 Workers (Scale) |
|--------|-------------------|---------------------|
| Daily location logs | 2,880 | 48,000 |
| Daily shifts | 30 | 500 |
| Daily reports | ~60 | ~1,000 |
| Query response time | <500ms | <1s (with indexes) |
| Database size (monthly) | ~50 MB | ~800 MB |
| Database size (yearly) | ~600 MB | ~10 GB |

**Conclusion:** With proper indexing and partitioning, PostgreSQL can easily handle 500 workers. At 5,000+ workers, consider read replicas.

---

**Related Documents:**
- [ERD](./erd.md) - Entity relationship diagrams
- [Migrations](./migrations.md) - Migration strategy
- [Seed Data](./seed-data.md) - Test data specifications
