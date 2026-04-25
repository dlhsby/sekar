# Phase 5: Database Specifications

**Date:** March 13, 2026
**Status:** Not Started
**Depends On:** Phase 4 Database (Complete — 24 tables, 8 migrations)
**Related Sub-Phases:** 5-1, 5-2, 5-3

---

## Current Codebase Facts (Post-Phase 4 Expected Values)

| Fact | Value |
|------|-------|
| Tables | 24 (Phase 2E: 22 + Phase 4: notification_preferences, export_jobs, location_daily_summaries) |
| Migrations | 8 (6 from Phase 2E + Phase3Tables + Phase3Indexes) |
| ORM | TypeORM with auto-sync in dev, migrations in production |
| Indexes | Composite indexes added in Phase 4 (location_logs, shifts, activities, tasks, overtimes, audit_logs, user_tracking_status) |
| Export | export_jobs table (Phase 4) with CSV/Excel support |
| Redis | Installed — caching, Socket.IO adapter, JWT blacklist |
| Retention | Location log 90-day, soft-delete 180-day, export 30-day crons active |

---

## A. New Tables (Sub-Phase 5-1: Reporting)

### A1. report_templates

**Sub-Phase:** 5-1

```sql
CREATE TABLE report_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    slug VARCHAR(50) NOT NULL UNIQUE,
    description TEXT,
    report_type VARCHAR(30) NOT NULL,
    template_config JSONB NOT NULL DEFAULT '{}',
    is_system BOOLEAN NOT NULL DEFAULT true,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    CONSTRAINT chk_report_templates_type CHECK (report_type IN (
        'daily_operations', 'weekly_performance', 'monthly_summary',
        'worker_performance', 'area_status', 'overtime_utilization'
    ))
);

-- Note: slug used for URL-friendly identification (e.g., 'daily-operations')
-- template_config stores: sections[], filters[], chart_types[], header_logo_url
```

**Rollback SQL:**

```sql
DROP TABLE IF EXISTS report_templates;
```

### A2. generated_reports

**Sub-Phase:** 5-1

```sql
CREATE TABLE generated_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    template_id UUID NOT NULL REFERENCES report_templates(id) ON DELETE RESTRICT,
    generated_by UUID REFERENCES users(id) ON DELETE SET NULL,
    schedule_id UUID REFERENCES report_schedules(id) ON DELETE SET NULL,
    title VARCHAR(200) NOT NULL,
    report_type VARCHAR(30) NOT NULL,
    format VARCHAR(10) NOT NULL DEFAULT 'pdf',
    status VARCHAR(20) NOT NULL DEFAULT 'processing',
    file_url TEXT,
    file_size_bytes BIGINT,
    parameters JSONB DEFAULT '{}',
    error_message TEXT,
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    CONSTRAINT chk_generated_reports_format CHECK (format IN ('pdf', 'csv', 'xlsx')),
    CONSTRAINT chk_generated_reports_status CHECK (status IN ('processing', 'completed', 'failed'))
);

CREATE INDEX idx_generated_reports_user ON generated_reports(generated_by, created_at DESC);
CREATE INDEX idx_generated_reports_template ON generated_reports(template_id, created_at DESC);
CREATE INDEX idx_generated_reports_schedule ON generated_reports(schedule_id) WHERE schedule_id IS NOT NULL;

-- parameters stores: date_range, area_id, rayon_id, worker_id filters used at generation time
-- file_url stores S3 object key (presigned URL generated on access)
```

**Rollback SQL:**

```sql
DROP TABLE IF EXISTS generated_reports;
```

### A3. report_schedules

**Sub-Phase:** 5-1

```sql
CREATE TABLE report_schedules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    template_id UUID NOT NULL REFERENCES report_templates(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    frequency VARCHAR(20) NOT NULL,
    cron_expression VARCHAR(50) NOT NULL,
    timezone VARCHAR(50) NOT NULL DEFAULT 'Asia/Jakarta',
    parameters JSONB DEFAULT '{}',
    is_active BOOLEAN NOT NULL DEFAULT true,
    last_run_at TIMESTAMP WITH TIME ZONE,
    next_run_at TIMESTAMP WITH TIME ZONE,
    created_by UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    CONSTRAINT chk_report_schedules_frequency CHECK (frequency IN (
        'daily', 'weekly', 'monthly'
    ))
);

CREATE INDEX idx_report_schedules_active ON report_schedules(is_active, next_run_at)
    WHERE is_active = true;

-- cron_expression: e.g., '0 6 * * *' for daily at 06:00
-- parameters: filters to apply when generating (area_id, rayon_id, etc.)
```

**Rollback SQL:**

```sql
DROP TABLE IF EXISTS report_schedules;
```

---

## B. New Tables (Sub-Phase 5-3: Asset Management)

### B1. asset_categories

**Sub-Phase:** 5-3

```sql
CREATE TABLE asset_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL UNIQUE,
    slug VARCHAR(50) NOT NULL UNIQUE,
    description TEXT,
    icon VARCHAR(50),
    sort_order INT NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6 park-specific categories seeded:
-- 1. Alat Kebersihan (Cleaning Equipment) - sapu, cangkul, sekop
-- 2. Alat Pertamanan (Garden Tools) - gunting rumput, mesin potong
-- 3. Kendaraan Operasional (Operational Vehicles) - pickup, motor trail
-- 4. Peralatan Keamanan (Security Equipment) - HT radio, senter, rompi
-- 5. Peralatan Irigasi (Irrigation Equipment) - selang, sprinkler, pompa
-- 6. Perlengkapan Umum (General Supplies) - tenda, meja, kursi
```

**Rollback SQL:**

```sql
DROP TABLE IF EXISTS asset_categories;
```

### B2. assets

**Sub-Phase:** 5-3

```sql
CREATE TABLE assets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category_id UUID NOT NULL REFERENCES asset_categories(id) ON DELETE RESTRICT,
    area_id UUID REFERENCES areas(id) ON DELETE SET NULL,
    rayon_id UUID REFERENCES rayons(id) ON DELETE SET NULL,
    name VARCHAR(200) NOT NULL,
    asset_code VARCHAR(50) NOT NULL UNIQUE,
    description TEXT,
    status VARCHAR(20) NOT NULL DEFAULT 'available',
    condition VARCHAR(20) NOT NULL DEFAULT 'good',
    purchase_date DATE,
    purchase_price DECIMAL(15, 2),
    qr_code_url TEXT,
    photo_url TEXT,
    last_maintenance_at TIMESTAMP WITH TIME ZONE,
    next_maintenance_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE,

    CONSTRAINT chk_assets_status CHECK (status IN ('available', 'in_use', 'maintenance', 'retired', 'lost')),
    CONSTRAINT chk_assets_condition CHECK (condition IN ('good', 'fair', 'poor', 'damaged', 'unusable'))
);

CREATE INDEX idx_assets_category ON assets(category_id);
CREATE INDEX idx_assets_area ON assets(area_id) WHERE area_id IS NOT NULL;
CREATE INDEX idx_assets_rayon ON assets(rayon_id) WHERE rayon_id IS NOT NULL;
CREATE INDEX idx_assets_status ON assets(status) WHERE deleted_at IS NULL;

-- asset_code: auto-generated format: {CATEGORY_PREFIX}-{RAYON_CODE}-{SEQUENCE}
-- e.g., AK-RU-001 (Alat Kebersihan, Rayon Utara, #001)
-- qr_code_url: S3 object key for generated QR code image
```

**Rollback SQL:**

```sql
DROP TABLE IF EXISTS assets;
```

### B3. asset_assignments

**Sub-Phase:** 5-3

```sql
CREATE TABLE asset_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    asset_id UUID NOT NULL REFERENCES assets(id) ON DELETE RESTRICT,
    assigned_to UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    assigned_by UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    checked_out_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    expected_return_at TIMESTAMP WITH TIME ZONE,
    returned_at TIMESTAMP WITH TIME ZONE,
    returned_to UUID REFERENCES users(id) ON DELETE SET NULL,
    condition_at_checkout VARCHAR(20) NOT NULL,
    condition_at_return VARCHAR(20),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    CONSTRAINT chk_asset_assignments_condition_checkout CHECK (condition_at_checkout IN ('good', 'fair', 'poor', 'damaged')),
    CONSTRAINT chk_asset_assignments_condition_return CHECK (condition_at_return IS NULL OR condition_at_return IN ('good', 'fair', 'poor', 'damaged', 'unusable'))
);

CREATE INDEX idx_asset_assignments_asset ON asset_assignments(asset_id, checked_out_at DESC);
CREATE INDEX idx_asset_assignments_user ON asset_assignments(assigned_to, returned_at)
    WHERE returned_at IS NULL;

-- Active assignment: returned_at IS NULL
-- Historical assignments: returned_at IS NOT NULL
```

**Rollback SQL:**

```sql
DROP TABLE IF EXISTS asset_assignments;
```

### B4. asset_maintenances

**Sub-Phase:** 5-3

```sql
CREATE TABLE asset_maintenances (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    asset_id UUID NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
    maintenance_type VARCHAR(30) NOT NULL,
    scheduled_at TIMESTAMP WITH TIME ZONE NOT NULL,
    completed_at TIMESTAMP WITH TIME ZONE,
    performed_by UUID REFERENCES users(id) ON DELETE SET NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'scheduled',
    description TEXT,
    cost DECIMAL(15, 2),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    CONSTRAINT chk_asset_maintenances_type CHECK (maintenance_type IN (
        'routine', 'repair', 'inspection', 'replacement'
    )),
    CONSTRAINT chk_asset_maintenances_status CHECK (status IN (
        'scheduled', 'in_progress', 'completed', 'cancelled', 'overdue'
    ))
);

CREATE INDEX idx_asset_maintenances_asset ON asset_maintenances(asset_id, scheduled_at DESC);
CREATE INDEX idx_asset_maintenances_status ON asset_maintenances(status, scheduled_at)
    WHERE status IN ('scheduled', 'overdue');

-- Maintenance reminder cron updates status to 'overdue' when scheduled_at has passed
```

**Rollback SQL:**

```sql
DROP TABLE IF EXISTS asset_maintenances;
```

---

## C. Materialized Views (Sub-Phase 5-2: Analytics)

### C1. worker_performance_daily

**Sub-Phase:** 5-2

```sql
CREATE MATERIALIZED VIEW worker_performance_daily AS
SELECT
    u.id AS user_id,
    u.full_name,
    u.role,
    u.area_id,
    u.rayon_id,
    d.date,
    -- Attendance
    CASE WHEN s.id IS NOT NULL THEN 1 ELSE 0 END AS attended,
    s.clock_in_time,
    s.clock_out_time,
    CASE
        WHEN s.clock_in_time IS NOT NULL AND sd.start_time IS NOT NULL
        THEN GREATEST(0, EXTRACT(EPOCH FROM (
            (s.clock_in_time AT TIME ZONE 'Asia/Jakarta')::time - sd.start_time
        )) / 60)
        ELSE NULL
    END AS late_minutes,
    -- Tasks
    COALESCE(t.total_tasks, 0) AS total_tasks,
    COALESCE(t.completed_tasks, 0) AS completed_tasks,
    -- Activities
    COALESCE(a.total_activities, 0) AS total_activities,
    COALESCE(a.approved_activities, 0) AS approved_activities,
    -- Location compliance
    COALESCE(loc.total_pings, 0) AS total_pings,
    COALESCE(loc.within_area_pings, 0) AS within_area_pings,
    -- Overtime
    COALESCE(ot.overtime_hours, 0) AS overtime_hours
FROM users u
CROSS JOIN generate_series(
    CURRENT_DATE - INTERVAL '90 days',
    CURRENT_DATE,
    '1 day'::interval
) AS d(date)
LEFT JOIN shifts s ON s.user_id = u.id
    AND DATE(s.clock_in_time AT TIME ZONE 'Asia/Jakarta') = d.date
    AND s.deleted_at IS NULL
LEFT JOIN shift_definitions sd ON s.shift_definition_id = sd.id
LEFT JOIN LATERAL (
    SELECT COUNT(*) AS total_tasks,
           COUNT(*) FILTER (WHERE status IN ('completed', 'verified')) AS completed_tasks
    FROM tasks
    WHERE assigned_to = u.id
      AND DATE(created_at AT TIME ZONE 'Asia/Jakarta') = d.date
      AND deleted_at IS NULL
) t ON true
LEFT JOIN LATERAL (
    SELECT COUNT(*) AS total_activities,
           COUNT(*) FILTER (WHERE status = 'approved') AS approved_activities
    FROM activities
    WHERE user_id = u.id
      AND DATE(created_at AT TIME ZONE 'Asia/Jakarta') = d.date
      AND deleted_at IS NULL
) a ON true
LEFT JOIN location_daily_summaries loc ON loc.user_id = u.id AND loc.date = d.date
LEFT JOIN LATERAL (
    SELECT COALESCE(SUM(
        EXTRACT(EPOCH FROM (COALESCE(end_datetime, NOW()) - start_datetime)) / 3600
    ), 0) AS overtime_hours
    FROM overtimes
    WHERE user_id = u.id
      AND DATE(start_datetime AT TIME ZONE 'Asia/Jakarta') = d.date
      AND status = 'approved'
) ot ON true
WHERE u.deleted_at IS NULL
  AND u.role IN ('satgas', 'linmas', 'korlap', 'admin_data', 'kepala_rayon')
WITH DATA;

CREATE UNIQUE INDEX idx_wpd_user_date ON worker_performance_daily(user_id, date);
CREATE INDEX idx_wpd_area_date ON worker_performance_daily(area_id, date);
CREATE INDEX idx_wpd_rayon_date ON worker_performance_daily(rayon_id, date);
```

> **CONCURRENTLY requirement:** The unique index `idx_wpd_user_date` enables `REFRESH MATERIALIZED VIEW CONCURRENTLY` which does not block reads during refresh.

**Drop SQL:**

```sql
DROP MATERIALIZED VIEW IF EXISTS worker_performance_daily;
```

### C2. area_metrics_daily

**Sub-Phase:** 5-2

```sql
CREATE MATERIALIZED VIEW area_metrics_daily AS
SELECT
    a.id AS area_id,
    a.name AS area_name,
    a.rayon_id,
    d.date,
    -- Staffing
    COALESCE(staff.scheduled_count, 0) AS scheduled_workers,
    COALESCE(staff.attended_count, 0) AS attended_workers,
    COALESCE(sr.required_count, 0) AS required_workers,
    -- Tasks
    COALESCE(tasks.total, 0) AS total_tasks,
    COALESCE(tasks.completed, 0) AS completed_tasks,
    COALESCE(tasks.overdue, 0) AS overdue_tasks,
    -- Activities
    COALESCE(acts.total, 0) AS total_activities,
    COALESCE(acts.approved, 0) AS approved_activities,
    -- Assets
    COALESCE(assets.total, 0) AS total_assets,
    COALESCE(assets.in_maintenance, 0) AS assets_in_maintenance
FROM areas a
CROSS JOIN generate_series(
    CURRENT_DATE - INTERVAL '90 days',
    CURRENT_DATE,
    '1 day'::interval
) AS d(date)
LEFT JOIN LATERAL (
    SELECT
        COUNT(DISTINCT sch.user_id) AS scheduled_count,
        COUNT(DISTINCT s.user_id) FILTER (WHERE s.clock_in_time IS NOT NULL) AS attended_count
    FROM schedules sch
    LEFT JOIN shifts s ON s.user_id = sch.user_id
        AND DATE(s.clock_in_time AT TIME ZONE 'Asia/Jakarta') = d.date
        AND s.deleted_at IS NULL
    JOIN users u ON u.id = sch.user_id AND u.area_id = a.id AND u.deleted_at IS NULL
    WHERE sch.effective_date <= d.date
      AND (sch.end_date IS NULL OR sch.end_date >= d.date)
) staff ON true
LEFT JOIN LATERAL (
    SELECT required_count
    FROM area_staff_requirements
    WHERE area_id = a.id
      AND day_type = CASE EXTRACT(DOW FROM d.date) WHEN 0 THEN 'WEEKEND' WHEN 6 THEN 'WEEKEND' ELSE 'WEEKDAY' END
    LIMIT 1
) sr ON true
LEFT JOIN LATERAL (
    SELECT COUNT(*) AS total,
           COUNT(*) FILTER (WHERE status IN ('completed', 'verified')) AS completed,
           COUNT(*) FILTER (WHERE status NOT IN ('completed', 'verified', 'cancelled') AND deadline < d.date::timestamptz) AS overdue
    FROM tasks
    WHERE area_id = a.id
      AND DATE(created_at AT TIME ZONE 'Asia/Jakarta') = d.date
      AND deleted_at IS NULL
) tasks ON true
LEFT JOIN LATERAL (
    SELECT COUNT(*) AS total,
           COUNT(*) FILTER (WHERE status = 'approved') AS approved
    FROM activities
    WHERE area_id = a.id
      AND DATE(created_at AT TIME ZONE 'Asia/Jakarta') = d.date
      AND deleted_at IS NULL
) acts ON true
LEFT JOIN LATERAL (
    SELECT COUNT(*) AS total,
           COUNT(*) FILTER (WHERE status = 'maintenance') AS in_maintenance
    FROM assets
    WHERE area_id = a.id AND deleted_at IS NULL
) assets ON true
WHERE a.deleted_at IS NULL
WITH DATA;

CREATE UNIQUE INDEX idx_amd_area_date ON area_metrics_daily(area_id, date);
CREATE INDEX idx_amd_rayon_date ON area_metrics_daily(rayon_id, date);
```

**Drop SQL:**

```sql
DROP MATERIALIZED VIEW IF EXISTS area_metrics_daily;
```

### C3. operational_metrics_daily

**Sub-Phase:** 5-2

```sql
CREATE MATERIALIZED VIEW operational_metrics_daily AS
SELECT
    d.date,
    -- Attendance
    COALESCE(att.total_scheduled, 0) AS total_scheduled,
    COALESCE(att.total_attended, 0) AS total_attended,
    -- Tasks
    COALESCE(tasks.created, 0) AS tasks_created,
    COALESCE(tasks.completed, 0) AS tasks_completed,
    COALESCE(tasks.avg_duration_hours, 0) AS avg_task_duration_hours,
    -- Activities
    COALESCE(acts.submitted, 0) AS activities_submitted,
    COALESCE(acts.approved, 0) AS activities_approved,
    -- Overtime
    COALESCE(ot.total_requests, 0) AS overtime_requests,
    COALESCE(ot.approved_requests, 0) AS overtime_approved,
    COALESCE(ot.total_hours, 0) AS overtime_total_hours,
    -- Monitoring
    COALESCE(mon.outside_area_events, 0) AS outside_area_events,
    COALESCE(mon.missing_events, 0) AS missing_events,
    -- Workers
    COALESCE(workers.active_count, 0) AS active_workers
FROM generate_series(
    CURRENT_DATE - INTERVAL '90 days',
    CURRENT_DATE,
    '1 day'::interval
) AS d(date)
LEFT JOIN LATERAL (
    SELECT COUNT(DISTINCT user_id) AS total_scheduled,
           COUNT(DISTINCT user_id) FILTER (WHERE user_id IN (
               SELECT s.user_id FROM shifts s
               WHERE DATE(s.clock_in_time AT TIME ZONE 'Asia/Jakarta') = d.date
                 AND s.deleted_at IS NULL
           )) AS total_attended
    FROM schedules
    WHERE effective_date <= d.date
      AND (end_date IS NULL OR end_date >= d.date)
) att ON true
LEFT JOIN LATERAL (
    SELECT COUNT(*) AS created,
           COUNT(*) FILTER (WHERE status IN ('completed', 'verified')) AS completed,
           AVG(EXTRACT(EPOCH FROM (completed_at - created_at)) / 3600)
               FILTER (WHERE status IN ('completed', 'verified') AND completed_at IS NOT NULL) AS avg_duration_hours
    FROM tasks
    WHERE DATE(created_at AT TIME ZONE 'Asia/Jakarta') = d.date AND deleted_at IS NULL
) tasks ON true
LEFT JOIN LATERAL (
    SELECT COUNT(*) AS submitted,
           COUNT(*) FILTER (WHERE status = 'approved') AS approved
    FROM activities
    WHERE DATE(created_at AT TIME ZONE 'Asia/Jakarta') = d.date AND deleted_at IS NULL
) acts ON true
LEFT JOIN LATERAL (
    SELECT COUNT(*) AS total_requests,
           COUNT(*) FILTER (WHERE status = 'approved') AS approved_requests,
           COALESCE(SUM(
               EXTRACT(EPOCH FROM (COALESCE(end_datetime, NOW()) - start_datetime)) / 3600
           ) FILTER (WHERE status = 'approved'), 0) AS total_hours
    FROM overtimes
    WHERE DATE(start_datetime AT TIME ZONE 'Asia/Jakarta') = d.date
) ot ON true
LEFT JOIN LATERAL (
    SELECT COUNT(*) FILTER (WHERE action = 'status_changed'
                            AND new_value->>'status' = 'outside_area') AS outside_area_events,
           COUNT(*) FILTER (WHERE action = 'status_changed'
                            AND new_value->>'status' = 'missing') AS missing_events
    FROM audit_logs
    WHERE entity_type = 'user_tracking_status'
      AND DATE(created_at AT TIME ZONE 'Asia/Jakarta') = d.date
) mon ON true
LEFT JOIN LATERAL (
    SELECT COUNT(*) AS active_count
    FROM users
    WHERE deleted_at IS NULL AND is_active = true
      AND role IN ('satgas', 'linmas', 'korlap', 'admin_data', 'kepala_rayon')
) workers ON true
WITH DATA;

CREATE UNIQUE INDEX idx_omd_date ON operational_metrics_daily(date);
```

**Drop SQL:**

```sql
DROP MATERIALIZED VIEW IF EXISTS operational_metrics_daily;
```

---

## D. Migration Plan

### D1. Migration A — Reporting Tables (Sub-Phase 5-1)

**File:** `be/src/database/migrations/1743000000000-Phase4ReportingTables.ts`

```typescript
export class Phase4ReportingTables implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Create report_templates
    await queryRunner.query(`
      CREATE TABLE report_templates (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(100) NOT NULL,
        slug VARCHAR(50) NOT NULL UNIQUE,
        description TEXT,
        report_type VARCHAR(30) NOT NULL,
        template_config JSONB NOT NULL DEFAULT '{}',
        is_system BOOLEAN NOT NULL DEFAULT true,
        created_by UUID REFERENCES users(id) ON DELETE SET NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        CONSTRAINT chk_report_templates_type CHECK (report_type IN (
          'daily_operations', 'weekly_performance', 'monthly_summary',
          'worker_performance', 'area_status', 'overtime_utilization'
        ))
      );
    `);

    // 2. Create report_schedules (before generated_reports due to FK)
    await queryRunner.query(`
      CREATE TABLE report_schedules (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        template_id UUID NOT NULL REFERENCES report_templates(id) ON DELETE CASCADE,
        name VARCHAR(100) NOT NULL,
        frequency VARCHAR(20) NOT NULL,
        cron_expression VARCHAR(50) NOT NULL,
        timezone VARCHAR(50) NOT NULL DEFAULT 'Asia/Jakarta',
        parameters JSONB DEFAULT '{}',
        is_active BOOLEAN NOT NULL DEFAULT true,
        last_run_at TIMESTAMP WITH TIME ZONE,
        next_run_at TIMESTAMP WITH TIME ZONE,
        created_by UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        CONSTRAINT chk_report_schedules_frequency CHECK (frequency IN ('daily', 'weekly', 'monthly'))
      );
    `);

    // 3. Create generated_reports
    await queryRunner.query(`
      CREATE TABLE generated_reports (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        template_id UUID NOT NULL REFERENCES report_templates(id) ON DELETE RESTRICT,
        generated_by UUID REFERENCES users(id) ON DELETE SET NULL,
        schedule_id UUID REFERENCES report_schedules(id) ON DELETE SET NULL,
        title VARCHAR(200) NOT NULL,
        report_type VARCHAR(30) NOT NULL,
        format VARCHAR(10) NOT NULL DEFAULT 'pdf',
        status VARCHAR(20) NOT NULL DEFAULT 'processing',
        file_url TEXT,
        file_size_bytes BIGINT,
        parameters JSONB DEFAULT '{}',
        error_message TEXT,
        started_at TIMESTAMP WITH TIME ZONE,
        completed_at TIMESTAMP WITH TIME ZONE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        CONSTRAINT chk_generated_reports_format CHECK (format IN ('pdf', 'csv', 'xlsx')),
        CONSTRAINT chk_generated_reports_status CHECK (status IN ('processing', 'completed', 'failed'))
      );
    `);

    // 4. Indexes
    await queryRunner.query(`CREATE INDEX idx_generated_reports_user ON generated_reports(generated_by, created_at DESC);`);
    await queryRunner.query(`CREATE INDEX idx_generated_reports_template ON generated_reports(template_id, created_at DESC);`);
    await queryRunner.query(`CREATE INDEX idx_generated_reports_schedule ON generated_reports(schedule_id) WHERE schedule_id IS NOT NULL;`);
    await queryRunner.query(`CREATE INDEX idx_report_schedules_active ON report_schedules(is_active, next_run_at) WHERE is_active = true;`);

    // 5. Seed 6 system report templates
    await queryRunner.query(`
      INSERT INTO report_templates (name, slug, description, report_type, template_config, is_system) VALUES
      ('Laporan Operasional Harian', 'daily-operations', 'Daily operations report generated automatically at 06:00 WIB', 'daily_operations', '{"sections":["attendance","tasks","activities","incidents"]}', true),
      ('Laporan Kinerja Mingguan', 'weekly-performance', 'Weekly performance summary per rayon', 'weekly_performance', '{"sections":["attendance_trend","task_completion","worker_ranking"]}', true),
      ('Laporan Rangkuman Bulanan', 'monthly-summary', 'Monthly executive summary with KPIs', 'monthly_summary', '{"sections":["kpi_summary","attendance","tasks","overtime","area_coverage"]}', true),
      ('Laporan Kinerja Pekerja', 'worker-performance', 'Individual worker performance report', 'worker_performance', '{"sections":["attendance","punctuality","tasks","activities","compliance"]}', true),
      ('Laporan Status Area', 'area-status', 'Area-level status and metrics report', 'area_status', '{"sections":["staffing","tasks","maintenance","assets","coverage"]}', true),
      ('Laporan Utilisasi Lembur', 'overtime-utilization', 'Overtime hours and approval analysis', 'overtime_utilization', '{"sections":["hours_summary","approval_rate","worker_breakdown","cost_estimate"]}', true);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS generated_reports;`);
    await queryRunner.query(`DROP TABLE IF EXISTS report_schedules;`);
    await queryRunner.query(`DROP TABLE IF EXISTS report_templates;`);
  }
}
```

### D2. Migration B — Asset Tables (Sub-Phase 5-3)

**File:** `be/src/database/migrations/1743000001000-Phase4AssetTables.ts`

```typescript
export class Phase4AssetTables implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Create asset_categories
    await queryRunner.query(`
      CREATE TABLE asset_categories (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(100) NOT NULL UNIQUE,
        slug VARCHAR(50) NOT NULL UNIQUE,
        description TEXT,
        icon VARCHAR(50),
        sort_order INT NOT NULL DEFAULT 0,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `);

    // 2. Create assets
    await queryRunner.query(`
      CREATE TABLE assets (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        category_id UUID NOT NULL REFERENCES asset_categories(id) ON DELETE RESTRICT,
        area_id UUID REFERENCES areas(id) ON DELETE SET NULL,
        rayon_id UUID REFERENCES rayons(id) ON DELETE SET NULL,
        name VARCHAR(200) NOT NULL,
        asset_code VARCHAR(50) NOT NULL UNIQUE,
        description TEXT,
        status VARCHAR(20) NOT NULL DEFAULT 'available',
        condition VARCHAR(20) NOT NULL DEFAULT 'good',
        purchase_date DATE,
        purchase_price DECIMAL(15, 2),
        qr_code_url TEXT,
        photo_url TEXT,
        last_maintenance_at TIMESTAMP WITH TIME ZONE,
        next_maintenance_at TIMESTAMP WITH TIME ZONE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        deleted_at TIMESTAMP WITH TIME ZONE,
        CONSTRAINT chk_assets_status CHECK (status IN ('available', 'in_use', 'maintenance', 'retired', 'lost')),
        CONSTRAINT chk_assets_condition CHECK (condition IN ('good', 'fair', 'poor', 'damaged', 'unusable'))
      );
    `);

    // 3. Create asset_assignments
    await queryRunner.query(`
      CREATE TABLE asset_assignments (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        asset_id UUID NOT NULL REFERENCES assets(id) ON DELETE RESTRICT,
        assigned_to UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
        assigned_by UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
        checked_out_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        expected_return_at TIMESTAMP WITH TIME ZONE,
        returned_at TIMESTAMP WITH TIME ZONE,
        returned_to UUID REFERENCES users(id) ON DELETE SET NULL,
        condition_at_checkout VARCHAR(20) NOT NULL,
        condition_at_return VARCHAR(20),
        notes TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        CONSTRAINT chk_asset_assignments_condition_checkout CHECK (condition_at_checkout IN ('good', 'fair', 'poor', 'damaged')),
        CONSTRAINT chk_asset_assignments_condition_return CHECK (condition_at_return IS NULL OR condition_at_return IN ('good', 'fair', 'poor', 'damaged', 'unusable'))
      );
    `);

    // 4. Create asset_maintenances
    await queryRunner.query(`
      CREATE TABLE asset_maintenances (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        asset_id UUID NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
        maintenance_type VARCHAR(30) NOT NULL,
        scheduled_at TIMESTAMP WITH TIME ZONE NOT NULL,
        completed_at TIMESTAMP WITH TIME ZONE,
        performed_by UUID REFERENCES users(id) ON DELETE SET NULL,
        status VARCHAR(20) NOT NULL DEFAULT 'scheduled',
        description TEXT,
        cost DECIMAL(15, 2),
        notes TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        CONSTRAINT chk_asset_maintenances_type CHECK (maintenance_type IN ('routine', 'repair', 'inspection', 'replacement')),
        CONSTRAINT chk_asset_maintenances_status CHECK (status IN ('scheduled', 'in_progress', 'completed', 'cancelled', 'overdue'))
      );
    `);

    // 5. Indexes
    await queryRunner.query(`CREATE INDEX idx_assets_category ON assets(category_id);`);
    await queryRunner.query(`CREATE INDEX idx_assets_area ON assets(area_id) WHERE area_id IS NOT NULL;`);
    await queryRunner.query(`CREATE INDEX idx_assets_rayon ON assets(rayon_id) WHERE rayon_id IS NOT NULL;`);
    await queryRunner.query(`CREATE INDEX idx_assets_status ON assets(status) WHERE deleted_at IS NULL;`);
    await queryRunner.query(`CREATE INDEX idx_asset_assignments_asset ON asset_assignments(asset_id, checked_out_at DESC);`);
    await queryRunner.query(`CREATE INDEX idx_asset_assignments_user ON asset_assignments(assigned_to, returned_at) WHERE returned_at IS NULL;`);
    // Prevent two simultaneous active assignments for the same asset (race condition guard)
    await queryRunner.query(`CREATE UNIQUE INDEX idx_asset_assignments_one_active ON asset_assignments(asset_id) WHERE returned_at IS NULL;`);
    await queryRunner.query(`CREATE INDEX idx_asset_maintenances_asset ON asset_maintenances(asset_id, scheduled_at DESC);`);
    await queryRunner.query(`CREATE INDEX idx_asset_maintenances_status ON asset_maintenances(status, scheduled_at) WHERE status IN ('scheduled', 'overdue');`);

    // 6. Seed 6 asset categories
    await queryRunner.query(`
      INSERT INTO asset_categories (name, slug, description, icon, sort_order) VALUES
      ('Alat Kebersihan', 'cleaning-equipment', 'Sapu, cangkul, sekop, dan alat kebersihan lainnya', 'broom', 1),
      ('Alat Pertamanan', 'garden-tools', 'Gunting rumput, mesin potong, dan alat pertamanan', 'scissors', 2),
      ('Kendaraan Operasional', 'vehicles', 'Pickup, motor trail, dan kendaraan operasional', 'truck', 3),
      ('Peralatan Keamanan', 'security-equipment', 'HT radio, senter, rompi, dan peralatan keamanan', 'shield', 4),
      ('Peralatan Irigasi', 'irrigation-equipment', 'Selang, sprinkler, pompa, dan peralatan irigasi', 'droplet', 5),
      ('Perlengkapan Umum', 'general-supplies', 'Tenda, meja, kursi, dan perlengkapan umum', 'box', 6);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS asset_maintenances;`);
    await queryRunner.query(`DROP TABLE IF EXISTS asset_assignments;`);
    await queryRunner.query(`DROP TABLE IF EXISTS assets;`);
    await queryRunner.query(`DROP TABLE IF EXISTS asset_categories;`);
  }
}
```

### D3. Migration C — Analytics Materialized Views (Sub-Phase 5-2)

**File:** `be/src/database/migrations/1743000002000-Phase4AnalyticsViews.ts`

> **Note:** This migration must run AFTER asset tables (D2) because `area_metrics_daily` references the `assets` table.

```typescript
export class Phase4AnalyticsViews implements MigrationInterface {
  // Non-transactional: materialized view creation with CONCURRENTLY indexes
  public transaction = false;

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. worker_performance_daily (see SQL in section C1)
    await queryRunner.query(`CREATE MATERIALIZED VIEW worker_performance_daily AS ...`);
    await queryRunner.query(`CREATE UNIQUE INDEX idx_wpd_user_date ON worker_performance_daily(user_id, date);`);
    await queryRunner.query(`CREATE INDEX idx_wpd_area_date ON worker_performance_daily(area_id, date);`);
    await queryRunner.query(`CREATE INDEX idx_wpd_rayon_date ON worker_performance_daily(rayon_id, date);`);

    // 2. area_metrics_daily (see SQL in section C2)
    await queryRunner.query(`CREATE MATERIALIZED VIEW area_metrics_daily AS ...`);
    await queryRunner.query(`CREATE UNIQUE INDEX idx_amd_area_date ON area_metrics_daily(area_id, date);`);
    await queryRunner.query(`CREATE INDEX idx_amd_rayon_date ON area_metrics_daily(rayon_id, date);`);

    // 3. operational_metrics_daily (see SQL in section C3)
    await queryRunner.query(`CREATE MATERIALIZED VIEW operational_metrics_daily AS ...`);
    await queryRunner.query(`CREATE UNIQUE INDEX idx_omd_date ON operational_metrics_daily(date);`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP MATERIALIZED VIEW IF EXISTS operational_metrics_daily;`);
    await queryRunner.query(`DROP MATERIALIZED VIEW IF EXISTS area_metrics_daily;`);
    await queryRunner.query(`DROP MATERIALIZED VIEW IF EXISTS worker_performance_daily;`);
  }
}
```

---

## D-extra. Migration D — Apple Sign-In Column (Sub-Phase 5-4)

**File:** `be/src/database/migrations/1743000003000-Phase4AppleSignIn.ts`

> **Note:** Adds `apple_id` column to `users` table for Apple Sign-In (iOS). Independent of other Phase 5 migrations.

```typescript
export class Phase4AppleSignIn implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE users ADD COLUMN apple_id VARCHAR(255) UNIQUE;
    `);
    await queryRunner.query(`
      CREATE INDEX idx_users_apple_id ON users(apple_id) WHERE apple_id IS NOT NULL;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS idx_users_apple_id;`);
    await queryRunner.query(`ALTER TABLE users DROP COLUMN IF EXISTS apple_id;`);
  }
}
```

---

## E. Seed Data (Sub-Phase 5-3)

### E1. Asset Seed Data

Add to production seeder (`seed-production.ts`):

```typescript
// Asset categories are seeded in migration (section D2)
// Sample assets are NOT seeded in production — created via app
// Dev seeder adds sample assets for testing:

const SAMPLE_ASSETS = [
  { name: 'Sapu Lidi #1', category: 'cleaning-equipment', area: 'Taman Bungkul', code: 'AK-RU-001' },
  { name: 'Mesin Potong Rumput Honda', category: 'garden-tools', area: 'Taman Bungkul', code: 'AP-RU-001' },
  { name: 'Pickup Toyota Hilux', category: 'vehicles', area: null, rayon: 'Rayon Utara', code: 'KO-RU-001' },
  { name: 'HT Radio Motorola', category: 'security-equipment', area: 'Taman Bungkul', code: 'PK-RU-001' },
  // ... more sample assets per area
];
```

---

## F. Schema Summary (After Phase 5)

| # | Table | New? | Sub-Phase | Changes |
|---|-------|------|-----------|---------|
| 1-24 | (Phase 4 tables) | - | - | `users` +apple_id column (5-4) |
| 25 | **report_templates** | **NEW** | 5-1 | 6 built-in report templates |
| 26 | **report_schedules** | **NEW** | 5-1 | Cron-based report scheduling |
| 27 | **generated_reports** | **NEW** | 5-1 | Report archive with S3 storage |
| 28 | **asset_categories** | **NEW** | 5-3 | 6 park-specific categories |
| 29 | **assets** | **NEW** | 5-3 | Asset registry with QR codes |
| 30 | **asset_assignments** | **NEW** | 5-3 | Checkout/return tracking |
| 31 | **asset_maintenances** | **NEW** | 5-3 | Maintenance scheduling |

**Materialized Views (3):**
- `worker_performance_daily` — Worker KPIs aggregated daily
- `area_metrics_daily` — Area metrics aggregated daily
- `operational_metrics_daily` — System-wide operational metrics

**Total: 24 application tables + 7 new = 31 application tables** (+ 3 materialized views + system tables)

---

## G. Analytics View Refresh Strategy (ADR-025)

### G1. Nightly Refresh

```typescript
@Cron('0 2 * * *', { timeZone: 'Asia/Jakarta' })  // Daily at 02:00 WIB (ADR-025)
async refreshAnalyticsViews() {
  // CONCURRENTLY requires unique index — does not block reads during refresh
  await queryRunner.query('REFRESH MATERIALIZED VIEW CONCURRENTLY worker_performance_daily');
  await queryRunner.query('REFRESH MATERIALIZED VIEW CONCURRENTLY area_metrics_daily');
  await queryRunner.query('REFRESH MATERIALIZED VIEW CONCURRENTLY operational_metrics_daily');
  // Log: "Refreshed 3 materialized views in Xms"
}
```

### G2. On-Demand Refresh

`POST /analytics/refresh` — admin_system/superadmin only. Forces immediate refresh. Rate-limited to 1 per 5 minutes.

### G3. Redis Cache Layer

Analytics endpoints cache results in Redis (5-minute TTL) to avoid hitting materialized views on every request:

| Cache Key Pattern | TTL | Purpose |
|-------------------|-----|---------|
| `analytics:worker:{userId}:{dateRange}` | 5min | Worker performance data |
| `analytics:area:{areaId}:{dateRange}` | 5min | Area metrics data |
| `analytics:operational:{dateRange}` | 5min | System-wide metrics |
| `analytics:dashboard:summary` | 5min | Dashboard KPI summary |

---

## H. Retention Policy (Phase 5 Additions)

### H1. Generated Reports (90-day)

```
Weekly on Sunday at 4:00 AM WIB:
1. DELETE file from S3 for reports older than 90 days
2. DELETE FROM generated_reports WHERE created_at < NOW() - INTERVAL '90 days'
3. Log: "Purged X generated reports older than 90 days"
```

### H2. Materialized View Data Range

Materialized views cover a rolling 90-day window (matching `generate_series` in view definitions). Older data is not included in views but remains available via raw table queries.

---

**Last Updated:** 2026-03-13
