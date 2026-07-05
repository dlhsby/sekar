# Phase 4: Database Specifications

**Date:** March 12, 2026
**Status:** Not Started
**Depends On:** Phase 2E Database (Complete — 22 tables, 6 migrations)
**Related Sub-Phases:** 4-3, 4-5, 4-6

---

## Current Codebase Facts (Verified March 12, 2026)

| Fact | Value |
|------|-------|
| Tables | 22 (users, areas, rayons, shifts, shift_definitions, schedules, activities, activity_types, tasks, overtime, location_logs, notifications, special_day_overrides, monitoring_configs, staff_requirements, user_tracking_status, user_areas, audit_logs, + 4 system tables) |
| Migrations | 6 (InitialSchema, Phase2DatabaseSchema, Phase2BSchema, Phase2CBreakingChanges, Phase2DMonitoringSchema, Phase2EClientFeedback) |
| ORM | TypeORM with auto-sync in dev, migrations in production |
| Indexes | Basic single-column indexes, missing composite indexes for common queries |
| Retention | No location log cleanup, no soft-delete cleanup |
| Export | No export_jobs table |
| Notification prefs | No notification_preferences table |

---

## A. New Tables

### A1. notification_preferences

**Sub-Phase:** 4-3

```sql
CREATE TABLE notification_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    notification_type VARCHAR(50) NOT NULL,
    enabled BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    CONSTRAINT uq_notification_pref_user_type UNIQUE (user_id, notification_type),
    CONSTRAINT chk_notification_pref_type CHECK (notification_type IN (
      'task_assigned', 'task_completed', 'task_revision',
      'activity_approved', 'activity_rejected', 'overtime_approved', 'overtime_rejected',
      'missing_worker_alert', 'shift_reminder'
    ))
);

-- Note: idx_notification_pref_user removed — the UNIQUE(user_id, notification_type)
-- constraint already creates an implicit index covering user_id lookups.
-- Having both is redundant and wastes write I/O.

-- Note: notification_type values: 'task_assigned', 'task_completed', 'task_revision',
-- 'activity_approved', 'activity_rejected', 'overtime_approved', 'overtime_rejected',
-- 'missing_worker_alert', 'shift_reminder'
```

**Rollback SQL:**

```sql
DROP TABLE IF EXISTS notification_preferences;
```

### A2. export_jobs

**Sub-Phase:** 4-5

```sql
CREATE TABLE export_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    -- Rationale: when a user is hard-deleted (if ever permitted), their export jobs have no value
    entity_type VARCHAR(30) NOT NULL,
    format VARCHAR(10) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'processing',
    file_url TEXT,
    row_count INT DEFAULT 0,
    error_message TEXT,
    retry_count INT NOT NULL DEFAULT 0,
    filters JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    CONSTRAINT chk_export_jobs_status CHECK (status IN ('processing', 'completed', 'failed')),
    CONSTRAINT chk_export_jobs_format CHECK (format IN ('csv', 'xlsx', 'kmz')),
    CONSTRAINT chk_export_jobs_entity_type CHECK (entity_type IN ('users', 'areas', 'rayons', 'tasks', 'activities', 'overtime', 'schedules'))
);

CREATE INDEX idx_export_jobs_user_status ON export_jobs(user_id, status);

-- Note: filters stores the query parameters used (date range, area, rayon) for audit
```

**Rollback SQL:**

```sql
DROP TABLE IF EXISTS export_jobs;
```

### A3. location_daily_summaries (Optional — for retention)

**Sub-Phase:** 4-6

```sql
CREATE TABLE location_daily_summaries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id),
    date DATE NOT NULL,
    total_pings INT DEFAULT 0,
    first_ping_at TIMESTAMP WITH TIME ZONE,
    last_ping_at TIMESTAMP WITH TIME ZONE,
    avg_latitude DECIMAL(10, 7),
    avg_longitude DECIMAL(10, 7),
    within_area_pings INT DEFAULT 0,
    outside_area_pings INT DEFAULT 0,
    area_id UUID REFERENCES areas(id) ON DELETE SET NULL,
    rayon_id UUID REFERENCES rayons(id) ON DELETE SET NULL,
    -- Rationale: enables rayon-level aggregation queries without JOINing through areas
    is_backfilled BOOLEAN DEFAULT false,
    -- Distinguishes backfilled from live-computed summaries (see H13 note below)
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    CONSTRAINT uq_location_summary_user_date UNIQUE (user_id, date)
);

CREATE INDEX idx_location_summary_user_date ON location_daily_summaries(user_id, date DESC);

-- Note: This table preserves aggregated location data after detailed location_logs are purged (90-day retention)
```

**Rollback SQL:**

```sql
DROP TABLE IF EXISTS location_daily_summaries;
```

---

## A4. Soft-Delete Query Convention

All repository methods and TypeORM `find*` calls must filter out soft-deleted rows. The ORM's `@DeleteDateColumn()` decorator on entities configured with `withDeleted: false` (the default) handles this automatically for TypeORM queries.

**Raw SQL in cron jobs and custom query builders MUST include the filter explicitly:**

```sql
-- Correct: explicit soft-delete guard in raw SQL
SELECT * FROM users
WHERE deleted_at IS NULL
  AND ...;

-- Correct: explicit soft-delete guard in QueryBuilder
.where('user.deleted_at IS NULL')

-- Wrong: omitting the guard in raw SQL silently includes deleted rows
SELECT * FROM users WHERE ...;
```

**Rules:**
- All TypeORM repository `find*` methods use soft-delete by default via `@DeleteDateColumn()` — no explicit filter needed in ORM queries
- All `queryRunner.query()` raw SQL statements in crons (retention, cleanup, stale-status) MUST include `WHERE deleted_at IS NULL` (or `AND deleted_at IS NULL`) explicitly
- All `createQueryBuilder()` chains MUST include `.where('entity.deleted_at IS NULL')` unless intentionally querying deleted records (e.g., hard-delete cleanup cron)
- Exception: hard-delete cleanup crons that specifically target soft-deleted rows use `WHERE deleted_at IS NOT NULL AND deleted_at < NOW() - INTERVAL '...'`

---

## B. Index Audit (Sub-Phase 4-6)

### B1. Missing Composite Indexes

```sql
-- location_logs: frequently queried by user + date range
-- Note: column is logged_at (not created_at) — established in Phase 1
CREATE INDEX IF NOT EXISTS idx_location_logs_user_logged
    ON location_logs(user_id, logged_at DESC);

-- shifts: clock-in time lookups per user
CREATE INDEX IF NOT EXISTS idx_shifts_user_clockin
    ON shifts(user_id, clock_in_time DESC);

-- activities: filter by user and status
CREATE INDEX IF NOT EXISTS idx_activities_user_status
    ON activities(user_id, status);

-- tasks: filter by area and status
CREATE INDEX IF NOT EXISTS idx_tasks_area_status
    ON tasks(area_id, status);

-- overtimes: filter by user and status
CREATE INDEX IF NOT EXISTS idx_overtimes_user_status
    ON overtimes(user_id, status);

-- audit_logs: entity lookup — Phase 2E created idx_audit_entity(entity_type, entity_id, created_at DESC)
-- which is a superset of what we need; no new index required. SKIP.
-- (Phase 2E migration already covers this with a more useful 3-column index.)

-- audit_logs: actor lookup — Phase 2E created idx_audit_actor(actor_id) (single column).
-- Phase 4 needs the composite (actor_id, created_at DESC) for efficient actor timeline queries.
-- Must DROP the existing single-column index first, then CREATE the composite replacement.
DROP INDEX IF EXISTS idx_audit_actor;
CREATE INDEX IF NOT EXISTS idx_audit_actor
    ON audit_logs(actor_id, created_at DESC);

-- user_tracking_status: area lookups for monitoring
CREATE INDEX IF NOT EXISTS idx_tracking_area
    ON user_tracking_status(area_id);

-- user_tracking_status: rayon lookup — SKIP, already created in Phase 2E migration
-- (idx_tracking_rayon ON user_tracking_status(rayon_id) WHERE rayon_id IS NOT NULL)
```

**Rollback SQL:**

```sql
DROP INDEX IF EXISTS idx_location_logs_user_logged;
DROP INDEX IF EXISTS idx_shifts_user_clockin;
DROP INDEX IF EXISTS idx_activities_user_status;
DROP INDEX IF EXISTS idx_tasks_area_status;
DROP INDEX IF EXISTS idx_overtimes_user_status;
-- Restore Phase 2E single-column idx_audit_actor
DROP INDEX IF EXISTS idx_audit_actor;
CREATE INDEX IF NOT EXISTS idx_audit_actor ON audit_logs(actor_id);
DROP INDEX IF EXISTS idx_tracking_area;
-- Note: idx_audit_entity and idx_tracking_rayon are owned by Phase 2E — do not drop
```

### B2. Existing Indexes to Verify

| Table | Expected Index | Purpose |
|-------|---------------|---------|
| `users` | `phone_number` (unique partial) | Login by phone |
| `users` | `username` (unique) | Login by username |
| `users` | `area_id` | Filter by area |
| `users` | `rayon_id` | Filter by rayon |
| `user_areas` | `(user_id, area_id)` unique | Junction table |
| `schedules` | `(user_id, date)` | Daily schedule lookup |
| `user_tracking_status` | `user_id` unique | Status lookup |
| `monitoring_configs` | `key` unique | Config lookup |
| `staff_requirements` | `(area_id, day_type)` | Staffing queries |

---

## C. Migration Plan

### C1a. Migration A — Tables & Constraints (Transactional)

**File:** `apps/be/src/database/migrations/1742000000000-Phase3Tables.ts`

```typescript
export class Phase3Tables implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Create notification_preferences table
    // Note: no separate idx_notification_pref_user — the UNIQUE constraint provides it
    await queryRunner.query(`
      CREATE TABLE notification_preferences (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        notification_type VARCHAR(50) NOT NULL,
        enabled BOOLEAN NOT NULL DEFAULT true,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        CONSTRAINT uq_notification_pref_user_type UNIQUE (user_id, notification_type),
        CONSTRAINT chk_notification_pref_type CHECK (notification_type IN (
          'task_assigned', 'task_completed', 'task_revision',
          'activity_approved', 'activity_rejected', 'overtime_approved', 'overtime_rejected',
          'missing_worker_alert', 'shift_reminder'
        ))
      );
    `);

    // 2. Create export_jobs table
    await queryRunner.query(`
      CREATE TABLE export_jobs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        entity_type VARCHAR(30) NOT NULL,
        format VARCHAR(10) NOT NULL,
        status VARCHAR(20) NOT NULL DEFAULT 'processing',
        file_url TEXT,
        row_count INT DEFAULT 0,
        error_message TEXT,
        retry_count INT NOT NULL DEFAULT 0,
        filters JSONB,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        CONSTRAINT chk_export_jobs_status CHECK (status IN ('processing', 'completed', 'failed')),
        CONSTRAINT chk_export_jobs_format CHECK (format IN ('csv', 'xlsx', 'kmz')),
        CONSTRAINT chk_export_jobs_entity_type CHECK (entity_type IN ('users', 'areas', 'rayons', 'tasks', 'activities', 'overtime', 'schedules'))
      );
    `);

    // 3. Create location_daily_summaries table
    await queryRunner.query(`
      CREATE TABLE location_daily_summaries (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id),
        date DATE NOT NULL,
        total_pings INT DEFAULT 0,
        first_ping_at TIMESTAMP WITH TIME ZONE,
        last_ping_at TIMESTAMP WITH TIME ZONE,
        avg_latitude DECIMAL(10, 7),
        avg_longitude DECIMAL(10, 7),
        within_area_pings INT DEFAULT 0,
        outside_area_pings INT DEFAULT 0,
        area_id UUID REFERENCES areas(id) ON DELETE SET NULL,
        rayon_id UUID REFERENCES rayons(id) ON DELETE SET NULL,
        is_backfilled BOOLEAN DEFAULT false,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        CONSTRAINT uq_location_summary_user_date UNIQUE (user_id, date)
      );
    `);

    // 4. Inline indexes for new tables (small tables, safe in transaction)
    await queryRunner.query(`CREATE INDEX idx_export_jobs_user_status ON export_jobs(user_id, status);`);
    await queryRunner.query(`CREATE INDEX idx_location_summary_user_date ON location_daily_summaries(user_id, date DESC);`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop tables in reverse dependency order
    // (indexes are dropped automatically when tables are dropped)
    await queryRunner.query(`DROP TABLE IF EXISTS location_daily_summaries;`);
    await queryRunner.query(`DROP TABLE IF EXISTS export_jobs;`);
    await queryRunner.query(`DROP TABLE IF EXISTS notification_preferences;`);
  }
}
```

### C1b. Migration B — Indexes on Existing Tables (Non-Transactional)

**File:** `apps/be/src/database/migrations/1742000001000-Phase3Indexes.ts`

> **Note:** Migration B timestamp (`1742000001000`) must be greater than Migration A's (`1742000000000`) to ensure correct execution order.

**Rationale:** `CREATE INDEX CONCURRENTLY` cannot run inside a transaction. Indexes on large tables
(location_logs with ~21M rows, audit_logs) would lock the table for the full duration of index
creation if not using CONCURRENTLY. Splitting into a separate non-transactional migration avoids this.

```typescript
export class Phase3Indexes implements MigrationInterface {
  // Required for CONCURRENTLY — TypeORM must not wrap this in a transaction
  public transaction = false;

  public async up(queryRunner: QueryRunner): Promise<void> {
    // location_logs: user + date range (column is logged_at, not created_at)
    await queryRunner.query(`CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_location_logs_user_logged ON location_logs(user_id, logged_at DESC);`);

    // shifts: clock-in time lookups per user
    await queryRunner.query(`CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_shifts_user_clockin ON shifts(user_id, clock_in_time DESC);`);

    // activities: filter by user and status
    await queryRunner.query(`CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_activities_user_status ON activities(user_id, status);`);

    // tasks: filter by area and status
    await queryRunner.query(`CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_tasks_area_status ON tasks(area_id, status);`);

    // overtimes: filter by user and status
    await queryRunner.query(`CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_overtimes_user_status ON overtimes(user_id, status);`);

    // audit_logs: actor lookup — Phase 2E created idx_audit_actor(actor_id) single-column.
    // Phase 4 replaces it with composite (actor_id, created_at DESC) for actor timeline queries.
    // DROP first because IF NOT EXISTS would skip creation if the old name already exists.
    await queryRunner.query(`DROP INDEX IF EXISTS idx_audit_actor;`);
    await queryRunner.query(`CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_audit_actor ON audit_logs(actor_id, created_at DESC);`);

    // audit_logs: entity lookup — SKIP, Phase 2E already created
    //   idx_audit_entity(entity_type, entity_id, created_at DESC) which is a superset

    // user_tracking_status: area lookup
    await queryRunner.query(`CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_tracking_area ON user_tracking_status(area_id);`);

    // user_tracking_status: rayon lookup — SKIP, Phase 2E already created
    //   idx_tracking_rayon(rayon_id) WHERE rayon_id IS NOT NULL
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS idx_tracking_area;`);
    // Restore Phase 2E single-column idx_audit_actor
    await queryRunner.query(`DROP INDEX IF EXISTS idx_audit_actor;`);
    await queryRunner.query(`CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_audit_actor ON audit_logs(actor_id);`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_overtimes_user_status;`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_tasks_area_status;`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_activities_user_status;`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_shifts_user_clockin;`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_location_logs_user_logged;`);
    // Note: idx_audit_entity and idx_tracking_rayon are owned by Phase 2E — do not drop
  }
}
```

### C2. Data Migration Strategy

1. **notification_preferences**: No data migration needed — defaults generated on first user access
2. **export_jobs**: No data migration — starts empty
3. **location_daily_summaries**: Backfill from existing location_logs before enabling retention cron:

```sql
-- Backfill daily summaries for last 90 days (run once after migration)
-- IMPORTANT: within_area_pings and outside_area_pings will be 0 for backfilled data
-- because raw location_logs don't store boundary check results.
-- Only total_pings can be computed from historical data.
-- These columns are only accurate from Phase 4 go-live date forward.
-- area_id and rayon_id derived from users table at backfill time; may not reflect historical area assignments
INSERT INTO location_daily_summaries (user_id, date, total_pings, first_ping_at, last_ping_at, avg_latitude, avg_longitude, area_id, rayon_id, is_backfilled)
SELECT
    ll.user_id,
    DATE(ll.logged_at AT TIME ZONE 'Asia/Jakarta') as date,
    COUNT(*) as total_pings,
    MIN(ll.logged_at) as first_ping_at,
    MAX(ll.logged_at) as last_ping_at,
    AVG(ll.latitude) as avg_latitude,
    AVG(ll.longitude) as avg_longitude,
    (SELECT u.area_id FROM users u WHERE u.id = ll.user_id LIMIT 1) as area_id,
    (SELECT a.rayon_id FROM areas a JOIN users u ON u.area_id = a.id WHERE u.id = ll.user_id LIMIT 1) as rayon_id,
    true as is_backfilled
FROM location_logs ll
WHERE ll.logged_at > NOW() - INTERVAL '90 days'
GROUP BY ll.user_id, DATE(ll.logged_at AT TIME ZONE 'Asia/Jakarta')
ON CONFLICT (user_id, date) DO NOTHING;
```

---

## D. Production Seeder (Sub-Phase 4-6)

### D1. seed-production.ts Structure

**File:** `apps/be/src/database/seeds/seed-production.ts`

```
seed-production.ts
├── Upsert 7 rayons (real names: Utara, Selatan, Timur, Barat, Tengah, Tenggara, Barat Daya)
├── Upsert areas per rayon (from reference KMZ with real boundaries)
├── Upsert 3 shift definitions (Pagi 06-14, Siang 14-22, Malam 22-06)
├── Upsert 20 activity types (existing Phase 2C types)
├── Create admin accounts (admin_system + superadmin from env vars)
├── Skip if data already exists (upsert, not truncate)
└── Log summary: "Seeded X rayons, Y areas, Z shift definitions"
```

### D2. Differences from Dev Seeder

| Aspect | Dev Seeder (seed-phase1/2) | Production Seeder |
|--------|--------------------------|-------------------|
| Data wipe | Truncates all tables | Never wipes — upsert only |
| Users | 30+ test users with `Password123!` | Only admin accounts from env vars |
| Rayons | "Rayon 1" through "Rayon 7" | Real names (Rayon Utara, etc.) |
| Areas | Generic test areas | Real park/area names from KMZ |
| Boundaries | Sample polygons | Real GPS polygons from reference data |
| Shifts | Sample data | No shift records (created via app) |
| Activities | Sample submissions | None (created via app) |

---

## E. Retention Policy (Sub-Phase 4-6)

### E1. Location Logs (90-day)

```
Daily at 2:00 AM WIB:
1. Compute daily summaries for logs about to be purged (day 91)
2. INSERT INTO location_daily_summaries (aggregated data, is_backfilled = false)
3. DELETE FROM location_logs WHERE logged_at < NOW() - INTERVAL '90 days'
4. VACUUM ANALYZE location_logs
```

**Expected volume:**
- 500 active workers × 1 ping/min × 8 hours/day = 240,000 rows/day
- 90 days = ~21.6M rows retained
- After purge: ~21.6M rows (steady state)

### E2. Soft-Deleted Users & Retention Constraints

**FK constraint analysis:**
- `shifts.user_id` → RESTRICT (implicit, no ON DELETE clause)
- `audit_logs.actor_id` → `ON DELETE RESTRICT` (explicit in Phase 2E)
- `user_areas.user_id` → `ON DELETE CASCADE`
- `export_jobs.user_id` → `ON DELETE CASCADE`

**Hard-delete of users is NOT possible** if they have `audit_logs` records (FK RESTRICT).
This is intentional: municipal accountability requires preserving the audit trail.

**Retention policy for users:** NEVER permanently delete users with audit trail.
Soft-deleted users remain with `deleted_at` set indefinitely.

**For other entities** (application-level ordered deletion sequence):

```
Weekly on Sunday at 3:00 AM WIB (for orphaned data cleanup):
1. DELETE location_logs for soft-deleted users older than 180 days (no FK dependencies)
2. DELETE location_daily_summaries for soft-deleted users older than 180 days (no FK dependencies)
3. export_jobs auto-cascade on user delete (ON DELETE CASCADE) — see E3 for S3 cleanup
4. DELETE notification records for soft-deleted users older than 180 days
5. Soft-deleted users remain with deleted_at set — permanent deletion blocked by audit_logs FK
6. Log: "Cleaned up data for X soft-deleted users (users retained for audit trail)"
```

**Note:** If a future requirement demands hard-deleting users, the audit_logs FK must be
changed to `ON DELETE SET NULL` (preserving the log but anonymizing the actor). This requires
an explicit ADR and stakeholder approval.

### E3. Export Jobs (30-day)

```
Daily at 4:00 AM WIB:
1. DELETE file from S3 for expired export jobs
2. DELETE FROM export_jobs WHERE created_at < NOW() - INTERVAL '30 days'
```

### E4. Location Daily Summaries (2-year)

```
Monthly on 1st at 3:00 AM WIB:
1. DELETE FROM location_daily_summaries WHERE date < NOW() - INTERVAL '730 days'
2. VACUUM ANALYZE location_daily_summaries
```

**Rationale:** Summaries are the long-term replacement for raw location_logs (which have
90-day retention). Two years provides sufficient historical data for annual reporting while
keeping the table size manageable.

### E5. Notifications (Read: 90-day, Unread: 180-day)

```
Weekly on Saturday at 3:00 AM WIB:
1. Force-mark as read: UPDATE notifications SET read_at = NOW() WHERE read_at IS NULL AND created_at < NOW() - INTERVAL '90 days'
2. Soft-delete read notifications: UPDATE notifications SET deleted_at = NOW() WHERE read_at IS NOT NULL AND read_at < NOW() - INTERVAL '90 days' AND deleted_at IS NULL
3. Hard-delete: DELETE FROM notifications WHERE deleted_at < NOW() - INTERVAL '7 days'
4. Log: "Cleaned up X read, Y force-read notifications"
```

**Policy:**
- Read notifications: 90-day retention (soft delete, then hard delete after 7 days)
- Unread notifications: force-marked as read at 90 days, then follow read retention
- Effective max lifetime for any notification: ~187 days

---

## F. Schema Summary (After Phase 4)

| # | Table | New? | Changes |
|---|-------|------|---------|
| 1 | users | - | No schema changes |
| 2 | areas | - | No schema changes |
| 3 | rayons | - | No schema changes |
| 4 | shifts | - | No schema changes |
| 5 | shift_definitions | - | No schema changes |
| 6 | schedules | - | No schema changes |
| 7 | activities | - | No schema changes |
| 8 | activity_types | - | No schema changes |
| 9 | tasks | - | No schema changes |
| 10 | overtimes | - | No schema changes |
| 11 | location_logs | - | +composite index |
| 12 | notifications | - | No schema changes |
| 13 | special_day_overrides | - | No schema changes |
| 14 | monitoring_configs | - | No schema changes |
| 15 | staff_requirements | - | No schema changes |
| 16 | user_tracking_status | - | +area_id index (rayon_id index already in Phase 2E) |
| 17 | user_areas | - | No schema changes |
| 18 | audit_logs | - | Replace idx_audit_actor with composite (entity index kept from Phase 2E) |
| 19 | **notification_preferences** | **NEW** | Per-user notification opt-out |
| 20 | **export_jobs** | **NEW** | Async export tracking |
| 21 | **location_daily_summaries** | **NEW** | Aggregated location data for retention |

**Total: 21 application tables + 3 new = 24 application tables** (+ system tables)

---

## G. Query Optimization Notes

### G1. Pagination Override for Monitoring

- Default pagination max: **100 items per page** (project-wide default)
- Override for monitoring endpoints: **max 500 items per page**
- Rationale: monitoring dashboard needs to load all workers in an area (could be 200+) in a single request to render map markers
- Implementation: custom `@MaxPageSize(500)` decorator on monitoring controller endpoints, or per-endpoint DTO override with `@Max(500)` on the `limit` field

### G2. Cursor Pagination for location_logs

`location_logs` must use **keyset/cursor pagination** (not offset-based):

- Cursor key: `(logged_at, id)` composite for deterministic ordering
- Reason: offset pagination degrades on large tables (millions of rows) — `OFFSET 100000` scans and discards 100K rows before returning results
- API: `GET /location?cursor={encodedCursor}&limit=100`
- Response includes `nextCursor` for the next page
- Cursor encoding: Base64-encoded JSON `{"logged_at":"2026-03-01T00:00:00Z","id":"uuid"}`
- Query pattern:
  ```sql
  SELECT * FROM location_logs
  WHERE (logged_at, id) < (:cursorLoggedAt, :cursorId)
  ORDER BY logged_at DESC, id DESC
  LIMIT :limit;
  ```

---

## H. Convention & Validation Notes

### H1. Column Naming Convention

All timestamp columns must use consistent naming:
- `created_at`, `updated_at`, `deleted_at` — standard across all tables
- **Exception:** `location_logs.logged_at` (domain-specific, established in Phase 1)
- New tables must follow convention: `created_at` (not `created`, not `timestamp`)

### H2. boundary_polygon GeoJSON Validation

`boundary_polygon` (JSONB) validation is **application-level only**:
- PostgreSQL `jsonb` type cannot validate JSON structure without custom functions
- TypeORM `@Check` decorator cannot express GeoJSON structural constraints
- Validate in service layer: must be valid GeoJSON Polygon with >= 3 coordinates
- No database-level CHECK constraint needed

### H3. Migration Rollback Order

All `down()` migrations must drop tables in **reverse dependency order**:
1. `location_daily_summaries` first (references users, areas, rayons)
2. `export_jobs` second (references users)
3. `notification_preferences` last (references users)

Indexes on these tables are dropped automatically when tables are dropped.
Indexes on existing tables (from Migration B) must be explicitly dropped in `down()`.

---

---

## I. Timezone Convention

### I1. Storage

All timestamp columns across all tables use `TIMESTAMP WITH TIME ZONE` (PostgreSQL `timestamptz`). Values are stored in UTC internally by PostgreSQL regardless of the timezone offset provided by the application.

**Conventions:**
- Application layer sends timestamps as ISO 8601 UTC strings (e.g., `2026-03-12T10:00:00.000Z`)
- TypeORM `@CreateDateColumn()` and `@UpdateDateColumn()` produce UTC by default — no override needed
- Raw SQL inserts use `NOW()` (returns UTC) or explicit UTC string literals

### I2. Display

Conversion from UTC to WIB (Asia/Jakarta, UTC+7) is **frontend responsibility only**:
- Mobile (React Native): `date.toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })`
- Web (Next.js): same locale format, or a date formatting library like `date-fns-tz`
- Backend MUST NOT convert timestamps to WIB before returning them in API responses
- Backend MUST NOT store WIB-offset timestamps in the database

### I3. Cron Timezone

Cron expressions use `{ timeZone: 'Asia/Jakarta' }` in NestJS `@Cron()` decorator so scheduled jobs fire at the correct local time (e.g., 2 AM WIB for nightly retention). The underlying database operation still works in UTC.

### I4. Date-Only Fields

`DATE` columns (e.g., `location_daily_summaries.date`, `schedules.effective_date`) store calendar dates without time. When deriving a `DATE` from a `timestamptz`, always use the WIB timezone to get the correct calendar day:

```sql
DATE(logged_at AT TIME ZONE 'Asia/Jakarta')  -- correct: gets WIB calendar day
DATE(logged_at)                              -- wrong: uses server/session timezone
```

---

**Last Updated:** 2026-03-12
