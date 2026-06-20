# Database Schema

Complete PostgreSQL database schema for SEKAR system with production-ready optimizations.

**Document Owner:** Database Engineer
**Last Updated:** 2026-06-20
**Status:** Phase 5 Complete — see `specs/COMPLETION_STATUS.md` for live table/module count; migrations in `be/src/database/migrations/`

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

Stores all system users with 8 roles (ADR-009: satgas, linmas, korlap, admin_data, kepala_rayon, top_management, admin_system, superadmin).

```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  username VARCHAR(50) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  full_name VARCHAR(100) NOT NULL,
  phone VARCHAR(20),
  role VARCHAR(20) NOT NULL, -- 8 roles: satgas, linmas, korlap, admin_data, kepala_rayon, top_management, admin_system, superadmin
  rayon_id UUID REFERENCES rayons(id) ON DELETE SET NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,

  CONSTRAINT uq_users_username UNIQUE (username),
  CONSTRAINT chk_users_role CHECK (role IN ('satgas', 'linmas', 'korlap', 'admin_data', 'kepala_rayon', 'top_management', 'admin_system', 'superadmin'))
);

-- Indexes
CREATE UNIQUE INDEX idx_users_username ON users(username) WHERE deleted_at IS NULL;
CREATE INDEX idx_users_role ON users(role) WHERE deleted_at IS NULL;
CREATE INDEX idx_users_rayon ON users(rayon_id) WHERE deleted_at IS NULL;
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
  role: 'satgas' | 'linmas' | 'korlap' | 'admin_data' | 'kepala_rayon' | 'top_management' | 'admin_system' | 'superadmin';

  @Column({ type: 'uuid', nullable: true })
  rayon_id?: string;

  @Column({ default: true })
  is_active: boolean;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  @DeleteDateColumn()
  deleted_at?: Date;

  @ManyToOne(() => Rayon)
  @JoinColumn({ name: 'rayon_id' })
  rayon?: Rayon;
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

## Phase 2 Tables - Enhanced Features

### 1. tasks

Task assignment and tracking with status workflows.

```sql
CREATE TABLE tasks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title VARCHAR(200) NOT NULL,
  description TEXT,
  assigned_to UUID REFERENCES users(id) ON DELETE SET NULL,
  assigned_by UUID REFERENCES users(id) ON DELETE SET NULL,
  area_id UUID REFERENCES areas(id) ON DELETE SET NULL,
  priority VARCHAR(20) DEFAULT 'normal',
  status VARCHAR(30) DEFAULT 'pending',
  due_date TIMESTAMPTZ,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  completion_photo_url TEXT,
  completion_notes TEXT,
  decline_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,

  CONSTRAINT chk_task_priority CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  CONSTRAINT chk_task_status CHECK (status IN ('pending', 'assigned', 'accepted', 'declined', 'in_progress', 'completed', 'cancelled')),
  CONSTRAINT chk_task_completion CHECK (
    (status = 'completed' AND completed_at IS NOT NULL) OR
    (status != 'completed' AND completed_at IS NULL)
  ),
  CONSTRAINT chk_task_decline CHECK (
    (status = 'declined' AND decline_reason IS NOT NULL) OR
    (status != 'declined')
  )
);

-- CRITICAL Indexes for task queries
CREATE INDEX idx_tasks_assigned_status ON tasks(assigned_to, status, due_date) WHERE deleted_at IS NULL;
CREATE INDEX idx_tasks_area_status ON tasks(area_id, status, created_at DESC) WHERE deleted_at IS NULL;
CREATE INDEX idx_tasks_assignee_supervisor ON tasks(assigned_by, created_at DESC) WHERE deleted_at IS NULL;
CREATE INDEX idx_tasks_overdue ON tasks(due_date, status)
  WHERE status NOT IN ('completed', 'cancelled') AND deleted_at IS NULL;
```

**TypeORM Entity Notes:**
- Status transitions: pending → assigned → accepted → in_progress → completed
- Worker can decline: assigned → declined
- Supervisor can cancel: any → cancelled
- Foreign keys use ON DELETE SET NULL (task persists if user deleted)

---

### 2. notification_tokens

FCM device tokens for push notifications.

```sql
CREATE TABLE notification_tokens (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token TEXT NOT NULL,
  platform VARCHAR(20) NOT NULL,  -- 'android', 'ios', 'web'
  device_id VARCHAR(255),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT chk_notification_platform CHECK (platform IN ('android', 'ios', 'web')),
  CONSTRAINT uq_notification_tokens_user_token UNIQUE (user_id, token)
);

-- Indexes for token lookup
CREATE INDEX idx_notification_tokens_user ON notification_tokens(user_id);
CREATE INDEX idx_notification_tokens_token ON notification_tokens(token);
```

**Rationale:**
- Multiple devices per user supported
- Unique constraint on (user_id, token) prevents duplicates
- CASCADE delete removes tokens when user deleted

---

### 3. notifications

Push notification history and in-app alerts.

```sql
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(200) NOT NULL,
  body TEXT NOT NULL,
  type VARCHAR(50) NOT NULL,
  data JSONB,
  read_at TIMESTAMPTZ,
  sent_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT chk_notification_type CHECK (type IN (
    'task_assigned', 'task_reminder', 'shift_reminder',
    'report_reviewed', 'report_comment', 'system', 'announcement'
  ))
);

-- CRITICAL Indexes for notification queries
CREATE INDEX idx_notifications_user_unread ON notifications(user_id, created_at DESC)
  WHERE read_at IS NULL;
CREATE INDEX idx_notifications_user_all ON notifications(user_id, created_at DESC);
CREATE INDEX idx_notifications_type_user ON notifications(type, user_id, created_at DESC);
CREATE INDEX idx_notifications_data ON notifications USING GIN (data);
```

**Data Structure:**
```json
// data JSONB examples
{
  "task_id": "uuid",
  "task_title": "Clean park entrance",
  "action_url": "/tasks/abc-123"
}
```

---

### 4. rayons

Organizational sectors dividing the city into 7 management areas.

```sql
CREATE TABLE rayons (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(100) NOT NULL,
  code VARCHAR(20) NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT uq_rayons_name UNIQUE (name),
  CONSTRAINT uq_rayons_code UNIQUE (code)
);

-- Indexes
CREATE UNIQUE INDEX idx_rayons_code ON rayons(code);
CREATE UNIQUE INDEX idx_rayons_name ON rayons(name);

-- Seed 7 Rayons
INSERT INTO rayons (name, code, description) VALUES
  ('Rayon Selatan', 'SELATAN', 'Wilayah Surabaya Selatan'),
  ('Rayon Utara', 'UTARA', 'Wilayah Surabaya Utara'),
  ('Rayon Pusat', 'PUSAT', 'Wilayah Surabaya Pusat'),
  ('Rayon Timur 1', 'TIMUR1', 'Wilayah Surabaya Timur bagian 1'),
  ('Rayon Timur 2', 'TIMUR2', 'Wilayah Surabaya Timur bagian 2'),
  ('Rayon Barat 1', 'BARAT1', 'Wilayah Surabaya Barat bagian 1'),
  ('Rayon Barat 2', 'BARAT2', 'Wilayah Surabaya Barat bagian 2');
```

**TypeORM Entity:**
```typescript
@Entity('rayons')
export class Rayon {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true, length: 100 })
  name: string;

  @Column({ unique: true, length: 20 })
  code: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  @OneToMany(() => Area, (area) => area.rayon)
  areas: Area[];

  @OneToMany(() => User, (user) => user.rayon)
  users: User[];
}
```

---

### 5. shift_definitions

Fixed shift time definitions (3 shifts per day).

```sql
CREATE TABLE shift_definitions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(50) NOT NULL,
  code VARCHAR(10) NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  crosses_midnight BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT uq_shift_definitions_code UNIQUE (code),
  CONSTRAINT uq_shift_definitions_name UNIQUE (name)
);

-- Indexes
CREATE UNIQUE INDEX idx_shift_definitions_code ON shift_definitions(code);

-- Seed 3 fixed shifts
INSERT INTO shift_definitions (name, code, start_time, end_time, crosses_midnight) VALUES
  ('Shift 1', 'SHIFT1', '06:00:00', '15:00:00', FALSE),
  ('Shift 2', 'SHIFT2', '15:00:00', '23:00:00', FALSE),
  ('Shift 3', 'SHIFT3', '21:00:00', '05:00:00', TRUE);
```

**TypeORM Entity:**
```typescript
@Entity('shift_definitions')
export class ShiftDefinition {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true, length: 50 })
  name: string;

  @Column({ unique: true, length: 10 })
  code: string;

  @Column({ type: 'time' })
  start_time: string;

  @Column({ type: 'time' })
  end_time: string;

  @Column({ default: false })
  crosses_midnight: boolean;

  @Column({ default: true })
  is_active: boolean;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
```

**Notes:**
- Shifts are fixed and not configurable by users
- `crosses_midnight` flag indicates shift spans two calendar days
- Shift 3 (21:00-05:00) is the only cross-midnight shift

---

### 6. activity_types

Configurable activity types for work reports, role-specific.

```sql
CREATE TABLE activity_types (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(100) NOT NULL,
  code VARCHAR(50) NOT NULL,
  description TEXT,
  applicable_roles TEXT[] NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT uq_activity_types_code UNIQUE (code),
  CONSTRAINT chk_activity_types_roles CHECK (
    applicable_roles <@ ARRAY['Worker', 'Linmas']::TEXT[]
  )
);

-- Indexes
CREATE UNIQUE INDEX idx_activity_types_code ON activity_types(code);
CREATE INDEX idx_activity_types_active ON activity_types(is_active) WHERE is_active = TRUE;

-- Seed Worker activity types
INSERT INTO activity_types (name, code, description, applicable_roles) VALUES
  ('Penyiraman', 'WATERING', 'Watering plants and grass', ARRAY['Worker']),
  ('Penanaman', 'PLANTING', 'Planting new plants or trees', ARRAY['Worker']),
  ('Pemangkasan', 'PRUNING', 'Pruning trees and bushes', ARRAY['Worker']),
  ('Pembersihan', 'CLEANING', 'Cleaning area from debris and trash', ARRAY['Worker', 'Linmas']),
  ('Pemupukan', 'FERTILIZING', 'Applying fertilizer to plants', ARRAY['Worker']),
  ('Perawatan Tanaman', 'PLANT_CARE', 'General plant maintenance', ARRAY['Worker']);

-- Seed Linmas activity types
INSERT INTO activity_types (name, code, description, applicable_roles) VALUES
  ('Patroli Keamanan', 'SECURITY_PATROL', 'Security patrol around the area', ARRAY['Linmas']),
  ('Laporan Insiden', 'INCIDENT_REPORT', 'Reporting security incidents', ARRAY['Linmas']),
  ('Pemantauan Pengunjung', 'VISITOR_MONITORING', 'Monitoring park visitors', ARRAY['Linmas']),
  ('Pengecekan Fasilitas', 'FACILITY_CHECK', 'Checking facility conditions', ARRAY['Linmas']);
```

**TypeORM Entity:**
```typescript
@Entity('activity_types')
export class ActivityType {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 100 })
  name: string;

  @Column({ unique: true, length: 50 })
  code: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({ type: 'text', array: true })
  applicable_roles: string[];

  @Column({ default: true })
  is_active: boolean;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
```

**Notes:**
- `applicable_roles` determines which user roles can use this activity type
- Some activities like 'Pembersihan' (Cleaning) are shared between Worker and Linmas
- Admin can create/modify activity types via web dashboard

---

### 7. area_staff_requirements

Staff requirements per area per shift per day type.

```sql
CREATE TABLE area_staff_requirements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  area_id UUID NOT NULL REFERENCES areas(id) ON DELETE CASCADE,
  shift_definition_id UUID NOT NULL REFERENCES shift_definitions(id) ON DELETE CASCADE,
  role VARCHAR(50) NOT NULL,
  required_count INTEGER NOT NULL DEFAULT 1,
  day_type VARCHAR(20) DEFAULT 'WEEKDAY',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT chk_staff_role CHECK (role IN ('Worker', 'Linmas')),
  CONSTRAINT chk_day_type CHECK (day_type IN ('WEEKDAY', 'WEEKEND', 'HOLIDAY')),
  CONSTRAINT chk_required_count CHECK (required_count >= 0),
  CONSTRAINT uq_area_staff_requirements UNIQUE (area_id, shift_definition_id, role, day_type)
);

-- Indexes
CREATE INDEX idx_area_staff_requirements_area ON area_staff_requirements(area_id);
CREATE INDEX idx_area_staff_requirements_shift ON area_staff_requirements(shift_definition_id);
CREATE INDEX idx_area_staff_requirements_lookup ON area_staff_requirements(area_id, shift_definition_id, day_type);
```

**TypeORM Entity:**
```typescript
@Entity('area_staff_requirements')
export class AreaStaffRequirement {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  area_id: string;

  @ManyToOne(() => Area, (area) => area.staffRequirements, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'area_id' })
  area: Area;

  @Column()
  shift_definition_id: string;

  @ManyToOne(() => ShiftDefinition, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'shift_definition_id' })
  shiftDefinition: ShiftDefinition;

  @Column({ length: 50 })
  role: 'Worker' | 'Linmas';

  @Column({ default: 1 })
  required_count: number;

  @Column({ length: 20, default: 'WEEKDAY' })
  day_type: 'WEEKDAY' | 'WEEKEND' | 'HOLIDAY';

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
```

**Example Usage:**
```sql
-- Taman Bungkul staffing requirements
-- Shift 1, Weekday: 6 Workers, 2 Linmas
INSERT INTO area_staff_requirements (area_id, shift_definition_id, role, required_count, day_type) VALUES
  ('taman-bungkul-uuid', 'shift1-uuid', 'Worker', 6, 'WEEKDAY'),
  ('taman-bungkul-uuid', 'shift1-uuid', 'Linmas', 2, 'WEEKDAY'),
  ('taman-bungkul-uuid', 'shift2-uuid', 'Worker', 9, 'WEEKDAY'),
  ('taman-bungkul-uuid', 'shift2-uuid', 'Linmas', 2, 'WEEKDAY');
```

---

### 8. special_day_overrides

Override day types for holidays and special events.

```sql
CREATE TABLE special_day_overrides (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  date DATE NOT NULL,
  day_type VARCHAR(20) NOT NULL,
  name VARCHAR(100),
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT uq_special_day_date UNIQUE (date),
  CONSTRAINT chk_special_day_type CHECK (day_type IN ('WEEKEND', 'HOLIDAY', 'SPECIAL'))
);

-- Indexes
CREATE UNIQUE INDEX idx_special_day_date ON special_day_overrides(date);
CREATE INDEX idx_special_day_range ON special_day_overrides(date, day_type);

-- Example holidays
INSERT INTO special_day_overrides (date, day_type, name) VALUES
  ('2026-08-17', 'HOLIDAY', 'Hari Kemerdekaan'),
  ('2026-12-25', 'HOLIDAY', 'Natal'),
  ('2026-01-01', 'HOLIDAY', 'Tahun Baru');
```

**TypeORM Entity:**
```typescript
@Entity('special_day_overrides')
export class SpecialDayOverride {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'date', unique: true })
  date: Date;

  @Column({ length: 20 })
  day_type: 'WEEKEND' | 'HOLIDAY' | 'SPECIAL';

  @Column({ length: 100, nullable: true })
  name?: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
```

---

### 9. worker_schedules

Assignment of workers to areas and shifts with effective dates.

```sql
CREATE TABLE worker_schedules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  area_id UUID NOT NULL REFERENCES areas(id) ON DELETE CASCADE,
  shift_definition_id UUID NOT NULL REFERENCES shift_definitions(id) ON DELETE CASCADE,
  effective_date DATE NOT NULL,
  end_date DATE,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT chk_schedule_dates CHECK (end_date IS NULL OR end_date >= effective_date),
  CONSTRAINT uq_worker_schedule_overlap UNIQUE (user_id, effective_date, shift_definition_id)
);

-- CRITICAL Indexes for schedule queries
CREATE INDEX idx_worker_schedules_user ON worker_schedules(user_id);
CREATE INDEX idx_worker_schedules_area ON worker_schedules(area_id);
CREATE INDEX idx_worker_schedules_shift ON worker_schedules(shift_definition_id);
CREATE INDEX idx_worker_schedules_date_range ON worker_schedules(effective_date, end_date);
CREATE INDEX idx_worker_schedules_active ON worker_schedules(user_id, effective_date, end_date)
  WHERE end_date IS NULL OR end_date >= CURRENT_DATE;
```

**TypeORM Entity:**
```typescript
@Entity('worker_schedules')
export class WorkerSchedule {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  user_id: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column()
  area_id: string;

  @ManyToOne(() => Area, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'area_id' })
  area: Area;

  @Column()
  shift_definition_id: string;

  @ManyToOne(() => ShiftDefinition, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'shift_definition_id' })
  shiftDefinition: ShiftDefinition;

  @Column({ type: 'date' })
  effective_date: Date;

  @Column({ type: 'date', nullable: true })
  end_date?: Date;

  @Column({ nullable: true })
  created_by?: string;

  @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'created_by' })
  creator?: User;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
```

**Business Logic:**
- `end_date = NULL` means ongoing/indefinite assignment
- Workers can have multiple schedules for different shifts
- Use `effective_date` and `end_date` for historical tracking
- Query current schedule: `WHERE effective_date <= NOW() AND (end_date IS NULL OR end_date >= NOW())`

---

## Phase 2 Schema Updates

### Update: users table

Add rayon assignment for KepalaRayon role and expand role enum.

```sql
-- Add rayon_id column
ALTER TABLE users ADD COLUMN rayon_id UUID REFERENCES rayons(id) ON DELETE SET NULL;

-- Update role constraint to include new roles
ALTER TABLE users DROP CONSTRAINT IF EXISTS chk_users_role;
ALTER TABLE users ADD CONSTRAINT chk_users_role CHECK (role IN (
  'Admin',
  'TopManagement',
  'KepalaRayon',
  'KoordinatorLapangan',
  'Worker',
  'Linmas'
));

-- Create index for rayon lookup
CREATE INDEX idx_users_rayon ON users(rayon_id) WHERE deleted_at IS NULL;
```

**Updated TypeORM Entity:**
```typescript
@Entity('users')
export class User {
  // ... existing fields ...

  @Column({
    type: 'varchar',
    length: 30,
  })
  role: 'Admin' | 'TopManagement' | 'KepalaRayon' | 'KoordinatorLapangan' | 'Worker' | 'Linmas';

  @Column({ nullable: true })
  rayon_id?: string;

  @ManyToOne(() => Rayon, (rayon) => rayon.users, { nullable: true })
  @JoinColumn({ name: 'rayon_id' })
  rayon?: Rayon;
}
```

**Role Hierarchy:**
1. **Admin** - Full system access, manages all entities
2. **TopManagement** - View all Rayons, city-wide dashboard
3. **KepalaRayon** - Manages one Rayon (assigned via `rayon_id`)
4. **KoordinatorLapangan** - Manages one Area (assigned via `area_id`)
5. **Worker** - Field worker (Satgas), uses schedules
6. **Linmas** - Security officer, uses schedules

---

### Update: area_types table

Add category column for Active/Passive grouping.

```sql
-- Add category column
ALTER TABLE area_types ADD COLUMN category VARCHAR(20) NOT NULL DEFAULT 'ACTIVE';

-- Add constraint
ALTER TABLE area_types ADD CONSTRAINT chk_area_types_category
  CHECK (category IN ('ACTIVE', 'PASSIVE'));

-- Update existing types
UPDATE area_types SET category = 'ACTIVE' WHERE code IN ('park', 'mini_garden');
UPDATE area_types SET category = 'PASSIVE' WHERE code IN ('pedestrian', 'street');
```

**Updated TypeORM Entity:**
```typescript
@Entity('area_types')
export class AreaType {
  // ... existing fields ...

  @Column({ length: 20, default: 'ACTIVE' })
  category: 'ACTIVE' | 'PASSIVE';
}
```

**Category Definitions:**
- **ACTIVE**: Areas requiring active maintenance (parks, gardens)
- **PASSIVE**: Areas with passive maintenance (sidewalks, street medians)

---

### Update: areas table

Add rayon assignment, polygon boundary, and coverage area.

```sql
-- Add new columns
ALTER TABLE areas ADD COLUMN rayon_id UUID REFERENCES rayons(id) ON DELETE SET NULL;
ALTER TABLE areas ADD COLUMN boundary_polygon JSONB;
ALTER TABLE areas ADD COLUMN coverage_area DECIMAL(12, 2);

-- Note: radius_meters kept for backward compatibility, use boundary_polygon when available

-- Create indexes
CREATE INDEX idx_areas_rayon ON areas(rayon_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_areas_polygon ON areas USING GIN (boundary_polygon);
```

**Updated TypeORM Entity:**
```typescript
@Entity('areas')
export class Area {
  // ... existing fields ...

  @Column({ nullable: true })
  rayon_id?: string;

  @ManyToOne(() => Rayon, (rayon) => rayon.areas, { nullable: true })
  @JoinColumn({ name: 'rayon_id' })
  rayon?: Rayon;

  @Column({ type: 'jsonb', nullable: true })
  boundary_polygon?: GeoJSON.Polygon;

  @Column({ type: 'decimal', precision: 12, scale: 2, nullable: true })
  coverage_area?: number;  // Square meters

  @OneToMany(() => AreaStaffRequirement, (req) => req.area)
  staffRequirements: AreaStaffRequirement[];
}
```

**Boundary Polygon GeoJSON Format:**
```json
{
  "type": "Polygon",
  "coordinates": [
    [
      [112.7398, -7.2905],
      [112.7401, -7.2905],
      [112.7401, -7.2908],
      [112.7398, -7.2908],
      [112.7398, -7.2905]
    ]
  ]
}
```

**GPS Validation Logic:**
- If `boundary_polygon` exists, use point-in-polygon algorithm
- Otherwise, fall back to `radius_meters` with Haversine distance

---

### Update: work_reports table

Add task linkage and activity type.

```sql
-- Add new columns
ALTER TABLE work_reports ADD COLUMN task_id UUID REFERENCES tasks(id) ON DELETE SET NULL;
ALTER TABLE work_reports ADD COLUMN activity_type_id UUID REFERENCES activity_types(id) ON DELETE SET NULL;

-- Create indexes
CREATE INDEX idx_work_reports_task ON work_reports(task_id) WHERE task_id IS NOT NULL AND deleted_at IS NULL;
CREATE INDEX idx_work_reports_activity ON work_reports(activity_type_id) WHERE deleted_at IS NULL;
```

**Updated TypeORM Entity:**
```typescript
@Entity('work_reports')
export class WorkReport {
  // ... existing fields ...

  @Column({ nullable: true })
  task_id?: string;

  @ManyToOne(() => Task, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'task_id' })
  task?: Task;

  @Column({ nullable: true })
  activity_type_id?: string;

  @ManyToOne(() => ActivityType, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'activity_type_id' })
  activityType?: ActivityType;
}
```

**Report Types:**
- `task_id = NULL` → Self-initiated report (worker/linmas created on their own)
- `task_id != NULL` → Task completion report (linked to assigned task)

---

## Phase 3 Tables - Analytics & Reporting

### 1. report_templates

Configurable report templates for analytics.

```sql
CREATE TABLE report_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(200) NOT NULL,
  description TEXT,
  report_type VARCHAR(50) NOT NULL,  -- 'worker_performance', 'area_coverage', 'operational'
  config JSONB NOT NULL,  -- Query parameters, filters, columns
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  is_system_template BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT chk_report_type CHECK (report_type IN (
    'worker_performance', 'area_coverage', 'operational',
    'attendance', 'task_completion', 'custom'
  ))
);

CREATE INDEX idx_report_templates_type ON report_templates(report_type, is_active);
CREATE INDEX idx_report_templates_creator ON report_templates(created_by, created_at DESC);
CREATE INDEX idx_report_templates_config ON report_templates USING GIN (config);
```

**Config JSONB Examples:**
```json
{
  "date_range": { "start": "2026-01-01", "end": "2026-01-31" },
  "filters": {
    "area_ids": ["uuid1", "uuid2"],
    "worker_ids": ["uuid3"]
  },
  "columns": ["attendance_rate", "avg_shift_hours", "reports_count"],
  "format": "pdf",
  "chart_types": ["bar", "line"]
}
```

---

### 2. generated_reports

History of generated analytics reports.

```sql
CREATE TABLE generated_reports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  template_id UUID REFERENCES report_templates(id) ON DELETE SET NULL,
  generated_by UUID REFERENCES users(id) ON DELETE SET NULL,
  file_name VARCHAR(255) NOT NULL,
  file_url TEXT NOT NULL,  -- S3 URL
  file_format VARCHAR(20) NOT NULL,  -- 'pdf', 'csv', 'xlsx'
  file_size_bytes INTEGER,
  parameters JSONB NOT NULL,  -- Runtime parameters used
  row_count INTEGER,
  generation_time_ms INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT chk_file_format CHECK (file_format IN ('pdf', 'csv', 'xlsx', 'json'))
);

CREATE INDEX idx_generated_reports_user ON generated_reports(generated_by, created_at DESC);
CREATE INDEX idx_generated_reports_template ON generated_reports(template_id, created_at DESC);
CREATE INDEX idx_generated_reports_created ON generated_reports(created_at DESC);
```

**Retention Policy:**
- Keep reports for 90 days
- Archive to cold storage after 30 days
- Implement cleanup cron job

---

### 3. scheduled_reports

Automated report generation schedules.

```sql
CREATE TABLE scheduled_reports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  template_id UUID NOT NULL REFERENCES report_templates(id) ON DELETE CASCADE,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  name VARCHAR(200) NOT NULL,
  schedule_cron VARCHAR(100) NOT NULL,  -- '0 9 * * 1' = Every Monday 9am
  recipients TEXT[] NOT NULL,  -- Array of email addresses
  is_active BOOLEAN DEFAULT TRUE,
  last_run_at TIMESTAMPTZ,
  next_run_at TIMESTAMPTZ,
  run_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_scheduled_reports_next_run ON scheduled_reports(next_run_at, is_active)
  WHERE is_active = TRUE;
CREATE INDEX idx_scheduled_reports_template ON scheduled_reports(template_id);
```

**Cron Examples:**
- `0 9 * * 1` - Every Monday at 9:00 AM
- `0 0 1 * *` - First day of every month at midnight
- `0 18 * * 5` - Every Friday at 6:00 PM

---

### 4. Database Views for Analytics

Create materialized views for performance:

```sql
-- Worker performance summary (refresh daily)
CREATE MATERIALIZED VIEW mv_worker_performance AS
SELECT
  u.id as worker_id,
  u.full_name,
  u.phone,
  wa.area_id,
  a.name as area_name,
  COUNT(DISTINCT DATE(s.clock_in_time)) as days_worked,
  AVG(EXTRACT(EPOCH FROM (s.clock_out_time - s.clock_in_time)) / 3600) as avg_shift_hours,
  COUNT(r.id) as total_reports,
  SUM(CASE WHEN r.condition = 'Baik' THEN 1 ELSE 0 END) as good_reports,
  MAX(s.clock_in_time) as last_shift_date
FROM users u
LEFT JOIN worker_assignments wa ON u.id = wa.worker_id
LEFT JOIN areas a ON wa.area_id = a.id
LEFT JOIN shifts s ON u.id = s.worker_id AND s.deleted_at IS NULL
LEFT JOIN work_reports r ON u.id = r.worker_id AND r.deleted_at IS NULL
WHERE u.role = 'worker' AND u.deleted_at IS NULL
GROUP BY u.id, u.full_name, u.phone, wa.area_id, a.name;

CREATE UNIQUE INDEX idx_mv_worker_performance ON mv_worker_performance(worker_id);

-- Refresh daily at 1 AM
-- REFRESH MATERIALIZED VIEW CONCURRENTLY mv_worker_performance;
```

```sql
-- Area coverage summary (refresh hourly)
CREATE MATERIALIZED VIEW mv_area_coverage AS
SELECT
  a.id as area_id,
  a.name,
  a.gps_lat,
  a.gps_lng,
  at.name as area_type,
  COUNT(DISTINCT wa.worker_id) as assigned_workers,
  COUNT(DISTINCT DATE(s.clock_in_time)) as days_covered,
  COUNT(r.id) as total_reports,
  AVG(CASE
    WHEN r.condition = 'Baik' THEN 3
    WHEN r.condition = 'Cukup' THEN 2
    WHEN r.condition = 'Buruk' THEN 1
  END) as avg_condition_score
FROM areas a
JOIN area_types at ON a.area_type_id = at.id
LEFT JOIN worker_assignments wa ON a.id = wa.area_id
LEFT JOIN shifts s ON a.id = s.area_id AND s.deleted_at IS NULL
LEFT JOIN work_reports r ON a.id = r.area_id AND r.deleted_at IS NULL
WHERE a.deleted_at IS NULL
GROUP BY a.id, a.name, a.gps_lat, a.gps_lng, at.name;

CREATE UNIQUE INDEX idx_mv_area_coverage ON mv_area_coverage(area_id);
```

---

## Phase 4 Tables - Asset Management

### 1. asset_types

Asset categories and specifications.

```sql
CREATE TABLE asset_types (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code VARCHAR(50) UNIQUE NOT NULL,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  requires_calibration BOOLEAN DEFAULT FALSE,
  calibration_interval_days INTEGER,
  default_warranty_months INTEGER DEFAULT 12,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX idx_asset_types_code ON asset_types(code);

-- Seed data examples
INSERT INTO asset_types (code, name, description, requires_calibration, calibration_interval_days) VALUES
('mower', 'Lawn Mower', 'Gas-powered lawn mower', FALSE, NULL),
('trimmer', 'Grass Trimmer', 'Cordless grass trimmer', FALSE, NULL),
('sprayer', 'Chemical Sprayer', 'Backpack sprayer for fertilizer/pesticide', TRUE, 90),
('rake', 'Garden Rake', 'Metal garden rake', FALSE, NULL),
('cart', 'Garden Cart', 'Wheelbarrow/garden cart', FALSE, NULL);
```

---

### 2. assets

Equipment and tool inventory with QR tracking.

```sql
CREATE TABLE assets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  asset_code VARCHAR(50) UNIQUE NOT NULL,
  name VARCHAR(200) NOT NULL,
  asset_type_id UUID NOT NULL REFERENCES asset_types(id) ON DELETE RESTRICT,
  description TEXT,
  brand VARCHAR(100),
  model VARCHAR(100),
  serial_number VARCHAR(100),
  purchase_date DATE,
  purchase_price DECIMAL(15, 2),
  warranty_expiry DATE,
  status VARCHAR(30) DEFAULT 'available',
  condition VARCHAR(20) DEFAULT 'good',
  current_holder_id UUID REFERENCES users(id) ON DELETE SET NULL,
  current_area_id UUID REFERENCES areas(id) ON DELETE SET NULL,
  last_maintenance_date DATE,
  next_maintenance_date DATE,
  gps_lat DECIMAL(10, 8),
  gps_lng DECIMAL(11, 8),
  photo_url TEXT,
  qr_code_url TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,

  CONSTRAINT chk_asset_status CHECK (status IN (
    'available', 'in_use', 'maintenance', 'retired', 'lost', 'damaged'
  )),
  CONSTRAINT chk_asset_condition CHECK (condition IN (
    'excellent', 'good', 'fair', 'poor', 'broken'
  )),
  CONSTRAINT chk_asset_location CHECK (
    (current_holder_id IS NOT NULL AND current_area_id IS NULL) OR
    (current_holder_id IS NULL AND current_area_id IS NOT NULL) OR
    (current_holder_id IS NULL AND current_area_id IS NULL)
  )
);

-- CRITICAL Indexes
CREATE UNIQUE INDEX idx_assets_code ON assets(asset_code) WHERE deleted_at IS NULL;
CREATE INDEX idx_assets_type_status ON assets(asset_type_id, status) WHERE deleted_at IS NULL;
CREATE INDEX idx_assets_available ON assets(status, asset_type_id, condition)
  WHERE status = 'available' AND deleted_at IS NULL;
CREATE INDEX idx_assets_holder ON assets(current_holder_id, status)
  WHERE current_holder_id IS NOT NULL AND deleted_at IS NULL;
CREATE INDEX idx_assets_area ON assets(current_area_id, status)
  WHERE current_area_id IS NOT NULL AND deleted_at IS NULL;
CREATE INDEX idx_assets_maintenance ON assets(next_maintenance_date)
  WHERE status != 'retired' AND deleted_at IS NULL;
```

---

### 3. asset_assignments

Asset assignment history and accountability.

```sql
CREATE TABLE asset_assignments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  asset_id UUID NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
  assigned_to UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  assigned_by UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  area_id UUID REFERENCES areas(id) ON DELETE SET NULL,
  assigned_at TIMESTAMPTZ DEFAULT NOW(),
  returned_at TIMESTAMPTZ,
  return_condition VARCHAR(20),
  return_notes TEXT,
  photo_assigned_url TEXT,
  photo_returned_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT chk_assignment_return CHECK (
    (returned_at IS NULL) OR
    (returned_at IS NOT NULL AND returned_at > assigned_at)
  ),
  CONSTRAINT chk_return_condition CHECK (
    return_condition IS NULL OR
    return_condition IN ('excellent', 'good', 'fair', 'poor', 'broken')
  )
);

CREATE INDEX idx_asset_assignments_asset ON asset_assignments(asset_id, assigned_at DESC);
CREATE INDEX idx_asset_assignments_user ON asset_assignments(assigned_to, returned_at);
CREATE INDEX idx_asset_assignments_active ON asset_assignments(asset_id, assigned_to)
  WHERE returned_at IS NULL;
```

**Business Logic:**
- One asset can only have one active (returned_at IS NULL) assignment
- Photos required for high-value assets (enforced in application)
- Return condition must be recorded on return

---

### 4. maintenance_records

Asset maintenance and repair history.

```sql
CREATE TABLE maintenance_records (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  asset_id UUID NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
  maintenance_type VARCHAR(50) NOT NULL,
  description TEXT NOT NULL,
  performed_by UUID REFERENCES users(id) ON DELETE SET NULL,
  vendor_name VARCHAR(200),
  cost DECIMAL(15, 2),
  scheduled_date DATE,
  completed_date DATE,
  status VARCHAR(30) DEFAULT 'scheduled',
  notes TEXT,
  photos_url TEXT[],  -- Array of photo URLs
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT chk_maintenance_type CHECK (maintenance_type IN (
    'routine', 'repair', 'calibration', 'inspection', 'replacement'
  )),
  CONSTRAINT chk_maintenance_status CHECK (status IN (
    'scheduled', 'in_progress', 'completed', 'cancelled'
  )),
  CONSTRAINT chk_maintenance_completed CHECK (
    (status = 'completed' AND completed_date IS NOT NULL) OR
    (status != 'completed')
  )
);

CREATE INDEX idx_maintenance_records_asset ON maintenance_records(asset_id, completed_date DESC);
CREATE INDEX idx_maintenance_records_scheduled ON maintenance_records(scheduled_date, status)
  WHERE status IN ('scheduled', 'in_progress');
CREATE INDEX idx_maintenance_records_performer ON maintenance_records(performed_by, completed_date DESC);
```

---

## Phase 6 Tables - Web Dashboard & Audit

### 1. audit_logs (Partitioned)

Comprehensive audit trail for compliance and security.

```sql
-- Parent table with monthly partitioning
CREATE TABLE audit_logs (
  id UUID NOT NULL DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  action VARCHAR(50) NOT NULL,
  entity_type VARCHAR(50) NOT NULL,
  entity_id UUID,
  entity_name VARCHAR(200),
  old_value JSONB,
  new_value JSONB,
  changed_fields TEXT[],
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT chk_audit_action CHECK (action IN (
    'create', 'update', 'delete', 'soft_delete', 'restore',
    'login', 'logout', 'login_failed', 'password_change',
    'export', 'import', 'bulk_update', 'bulk_delete'
  )),
  PRIMARY KEY (id, created_at)
) PARTITION BY RANGE (created_at);

-- Create monthly partitions (automate in production)
CREATE TABLE audit_logs_2026_01 PARTITION OF audit_logs
  FOR VALUES FROM ('2026-01-01') TO ('2026-02-01');

CREATE TABLE audit_logs_2026_02 PARTITION OF audit_logs
  FOR VALUES FROM ('2026-02-01') TO ('2026-03-01');

-- CRITICAL Indexes (apply to each partition)
CREATE INDEX idx_audit_logs_2026_01_user ON audit_logs_2026_01(user_id, created_at DESC);
CREATE INDEX idx_audit_logs_2026_01_entity ON audit_logs_2026_01(entity_type, entity_id, created_at DESC);
CREATE INDEX idx_audit_logs_2026_01_action ON audit_logs_2026_01(action, created_at DESC);

-- Partition management function
CREATE OR REPLACE FUNCTION create_audit_logs_partition()
RETURNS void AS $$
DECLARE
  next_month DATE := DATE_TRUNC('month', NOW() + INTERVAL '1 month');
  month_after DATE := next_month + INTERVAL '1 month';
  partition_name TEXT := 'audit_logs_' || TO_CHAR(next_month, 'YYYY_MM');
BEGIN
  EXECUTE format('CREATE TABLE IF NOT EXISTS %I PARTITION OF audit_logs FOR VALUES FROM (%L) TO (%L)',
    partition_name, next_month, month_after);

  EXECUTE format('CREATE INDEX idx_%I_user ON %I(user_id, created_at DESC)', partition_name, partition_name);
  EXECUTE format('CREATE INDEX idx_%I_entity ON %I(entity_type, entity_id, created_at DESC)', partition_name, partition_name);
  EXECUTE format('CREATE INDEX idx_%I_action ON %I(action, created_at DESC)', partition_name, partition_name);
END;
$$ LANGUAGE plpgsql;
```

**Retention Policy:**
- Keep for 2 years (regulatory requirement)
- Partition by month for performance
- Drop partitions older than 2 years automatically

---

### 2. system_settings

Configurable application settings.

```sql
CREATE TABLE system_settings (
  key VARCHAR(100) PRIMARY KEY,
  value TEXT NOT NULL,
  value_type VARCHAR(20) DEFAULT 'string',
  description TEXT,
  category VARCHAR(50) DEFAULT 'general',
  is_public BOOLEAN DEFAULT FALSE,  -- Can be read by non-admin users
  updated_by UUID REFERENCES users(id) ON DELETE SET NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT chk_value_type CHECK (value_type IN ('string', 'number', 'boolean', 'json'))
);

CREATE INDEX idx_system_settings_category ON system_settings(category);

-- Seed default settings
INSERT INTO system_settings (key, value, value_type, description, category, is_public) VALUES
('shift_reminder_time', '07:00', 'string', 'Time to send shift reminder notifications (HH:MM)', 'notifications', TRUE),
('max_shift_hours', '12', 'number', 'Maximum allowed shift duration in hours', 'shifts', TRUE),
('location_ping_interval', '300', 'number', 'GPS ping interval in seconds', 'location', TRUE),
('report_photo_required', 'true', 'boolean', 'Require photo for work reports', 'reports', TRUE),
('gps_tolerance_meters', '100', 'number', 'GPS validation tolerance in meters', 'location', TRUE),
('maintenance_notice_days', '7', 'number', 'Days before maintenance due to send notice', 'assets', FALSE),
('auto_logout_minutes', '480', 'number', 'Auto logout after inactivity (minutes)', 'security', TRUE);
```

**Usage in Application:**
```typescript
// settings.service.ts
async getSetting<T>(key: string): Promise<T> {
  const setting = await this.settingsRepo.findOne({ where: { key } });
  return this.parseValue(setting.value, setting.value_type);
}
```

---

### 3. bulk_operations

Track bulk operations for rollback and audit.

```sql
CREATE TABLE bulk_operations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  operation_type VARCHAR(50) NOT NULL,
  entity_type VARCHAR(50) NOT NULL,
  performed_by UUID REFERENCES users(id) ON DELETE SET NULL,
  affected_count INTEGER DEFAULT 0,
  parameters JSONB NOT NULL,
  entity_ids UUID[],
  status VARCHAR(30) DEFAULT 'pending',
  error_message TEXT,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,

  CONSTRAINT chk_bulk_operation_type CHECK (operation_type IN (
    'bulk_update', 'bulk_delete', 'bulk_import', 'bulk_export', 'bulk_assign'
  )),
  CONSTRAINT chk_bulk_status CHECK (status IN (
    'pending', 'in_progress', 'completed', 'failed', 'partial'
  ))
);

CREATE INDEX idx_bulk_operations_user ON bulk_operations(performed_by, started_at DESC);
CREATE INDEX idx_bulk_operations_status ON bulk_operations(status, started_at DESC);
CREATE INDEX idx_bulk_operations_entity ON bulk_operations(entity_type, started_at DESC);
```

**Example Usage:**
- Bulk update 50 worker assignments
- Bulk import assets from CSV
- Bulk delete old notification records

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
  target: 'https://api.sekar.wahyutrip.com'
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

---

## Phase 2C: Schema Changes (Implemented)

> **Full specification:** See [`specs/phases/phase-2-c-client-feedback/database.md`](../phases/phase-2-c-client-feedback/database.md)

### Role Enum Update (Implemented)
```sql
-- users.role CHECK constraint (8 roles):
-- 'satgas', 'linmas', 'korlap', 'admin_data',
-- 'kepala_rayon', 'top_management', 'admin_system', 'superadmin'
```

### New Column: users.area_id (Implemented)
```sql
ALTER TABLE users ADD COLUMN area_id UUID REFERENCES areas(id) ON DELETE SET NULL;
-- Used by korlap role for area scoping
CREATE INDEX idx_users_area ON users(area_id) WHERE deleted_at IS NULL;
```

### New Tables (Implemented)

**task_tags** - Many-to-many tagging for tasks (CC-like)
```sql
CREATE TABLE task_tags (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT uq_task_tags_task_user UNIQUE (task_id, user_id)
);
```

**overtimes** - Overtime requests with approval workflow
```sql
CREATE TABLE overtimes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  area_id UUID REFERENCES areas(id) ON DELETE SET NULL,
  date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  approved_by UUID REFERENCES users(id),
  approved_at TIMESTAMPTZ,
  rejection_reason TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT chk_overtime_status CHECK (status IN ('pending', 'approved', 'rejected'))
);
```

**overtime_aktivitas** - Activities performed during overtime
```sql
CREATE TABLE overtime_aktivitas (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  overtime_id UUID NOT NULL REFERENCES overtimes(id) ON DELETE CASCADE,
  activity_type_id UUID NOT NULL REFERENCES activity_types(id),
  description TEXT NOT NULL,
  photo_urls TEXT[] NOT NULL DEFAULT '{}',
  gps_lat DECIMAL(10, 7),
  gps_lng DECIMAL(10, 7),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Modified Tables (Implemented)

| Table | Changes |
|-------|---------|
| `users` | Added area_id UUID FK→areas (nullable), role CHECK updated to 8 roles |
| `shifts` | area_id now nullable (auto-detected from WorkerSchedule/WorkerAssignment) |
| `work_reports` | Added photo_urls TEXT[], gps_lat/gps_lng now nullable, report_type now nullable |
| `tasks` | Added rayon_id FK→rayons (nullable), area_id now nullable, status simplified to 4 values, removed activity_type_id/GPS completion fields/decline columns |
| `activity_types` | applicable_roles updated for Phase 2C roles (satgas, linmas, korlap, admin_data) |
| `worker_assignments` | Added deprecated BOOLEAN (default false), migrated_to_schedule_id UUID |

---

## Phase 2D: Schema Changes (Real-Time Monitoring)

> **Full specification:** See [`specs/phases/phase-2-d-monitoring/`](../phases/phase-2-d-monitoring/)

### user_tracking_status

Materialized tracking status for each user. Updated by StatusCalculatorService on location pings, clock-in/out, and periodic scheduler.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| user_id | UUID | PK, FK → users.id | One status per user |
| status | VARCHAR(20) | NOT NULL, CHECK(IN 'active','inactive','outside_area','missing','offline') | Current tracking status |
| last_location_at | TIMESTAMP | NULL | Last GPS ping timestamp |
| last_location_lat | DECIMAL(10,7) | NULL | Last known latitude |
| last_location_lng | DECIMAL(10,7) | NULL | Last known longitude |
| is_within_area | BOOLEAN | DEFAULT false | Whether inside assigned area boundary |
| current_shift_id | UUID | NULL, FK → shifts.id | Active shift reference |
| current_area_id | UUID | NULL, FK → areas.id | Currently assigned area |
| updated_at | TIMESTAMP | NOT NULL, DEFAULT NOW() | Last status update |

**Indexes:**
- `idx_uts_status` — B-tree on `status` (filter by status)
- `idx_uts_area_status` — Composite on `(current_area_id, status)` (area stats queries)
- `idx_uts_updated` — B-tree on `updated_at` (stale detection)

**Relationships:**
- user_tracking_status.user_id → users.id (1:1)
- user_tracking_status.current_shift_id → shifts.id (N:1)
- user_tracking_status.current_area_id → areas.id (N:1)

```sql
CREATE TABLE user_tracking_status (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  status VARCHAR(20) NOT NULL DEFAULT 'offline',
  last_location_at TIMESTAMPTZ,
  last_location_lat DECIMAL(10, 7),
  last_location_lng DECIMAL(10, 7),
  is_within_area BOOLEAN DEFAULT FALSE,
  current_shift_id UUID REFERENCES shifts(id) ON DELETE SET NULL,
  current_area_id UUID REFERENCES areas(id) ON DELETE SET NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT chk_uts_status CHECK (status IN ('active', 'inactive', 'outside_area', 'missing', 'offline'))
);

CREATE INDEX idx_uts_status ON user_tracking_status(status);
CREATE INDEX idx_uts_area_status ON user_tracking_status(current_area_id, status);
CREATE INDEX idx_uts_updated ON user_tracking_status(updated_at);
```

### monitoring_configs

Admin-configurable thresholds for the monitoring system. Key-value store with JSON schema validation.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| key | VARCHAR(50) | PK | Configuration key |
| value | JSONB | NOT NULL | Configuration value |
| description | TEXT | NULL | Human-readable description |
| updated_by | UUID | NULL, FK → users.id | Last admin who modified |
| updated_at | TIMESTAMP | NOT NULL, DEFAULT NOW() | Last modification |

**Default Keys:**
| Key | Default Value | Range | Description |
|-----|---------------|-------|-------------|
| active_max_age | 300 | 60-600 (seconds) | Max age of last ping to be "active" |
| inactive_threshold | 900 | 300-3600 (seconds) | Seconds without ping → "inactive" |
| missing_threshold | 3600 | 1800-7200 (seconds) | Seconds without ping → "missing" |
| min_gps_accuracy | 50 | 10-200 (meters) | Minimum acceptable GPS accuracy |
| boundary_tolerance | 100 | 0-500 (meters) | Buffer zone around area boundary |

**Access:** Read by StatusCalculatorService (cached 5min), write by admin_system/superadmin only.

```sql
CREATE TABLE monitoring_configs (
  key VARCHAR(50) PRIMARY KEY,
  value JSONB NOT NULL,
  description TEXT,
  updated_by UUID REFERENCES users(id) ON DELETE SET NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Seed default values
INSERT INTO monitoring_configs (key, value, description) VALUES
  ('active_max_age', '300', 'Max age of last ping (seconds) to be active'),
  ('inactive_threshold', '900', 'Seconds without ping to become inactive'),
  ('missing_threshold', '3600', 'Seconds without ping to become missing'),
  ('min_gps_accuracy', '50', 'Minimum acceptable GPS accuracy (meters)'),
  ('boundary_tolerance', '100', 'Buffer zone around area boundary (meters)');
```

### ERD Extensions (Phase 2D)

The two new tables connect to existing entities as follows:

```
users ─────1:1────► user_tracking_status
                        │
                        ├── N:1 ──► shifts
                        └── N:1 ──► areas

users ─────1:N────► monitoring_configs (updated_by)
```

- `user_tracking_status` is a **materialized view** pattern: one row per user, updated in real-time by StatusCalculatorService when location pings arrive, shifts start/end, or the periodic stale-check scheduler runs.
- `monitoring_configs` is a **configuration store**: read frequently (cached 5min), written rarely by admin_system/superadmin roles.

---

## Phase 2E: Schema Changes (Planned — Client Feedback II)

> **Full specification:** See [`specs/phases/phase-2-e-client-feedback-2/database.md`](../phases/phase-2-e-client-feedback-2/database.md)
> **Related ADRs:** [ADR-012](../architecture/decisions/ADR-012-phone-number-login.md), [ADR-013](../architecture/decisions/ADR-013-multi-area-assignment.md), [ADR-014](../architecture/decisions/ADR-014-overtime-clock-in-flow.md), [ADR-015](../architecture/decisions/ADR-015-audit-trail.md)

### Altered Tables

**users** — Add phone login + profile picture
```sql
ALTER TABLE users ADD COLUMN phone_number VARCHAR(20);
CREATE UNIQUE INDEX idx_users_phone_number ON users (phone_number) WHERE phone_number IS NOT NULL;
ALTER TABLE users ADD COLUMN profile_picture_url TEXT;
```

**shifts** — Flag overtime shifts
```sql
ALTER TABLE shifts ADD COLUMN is_overtime BOOLEAN NOT NULL DEFAULT false;
CREATE INDEX idx_shifts_is_overtime ON shifts (is_overtime) WHERE is_overtime = true;
```

**overtimes** — Link to overtime shift
```sql
ALTER TABLE overtimes ADD COLUMN shift_id UUID REFERENCES shifts(id) ON DELETE SET NULL;
CREATE INDEX CONCURRENTLY idx_overtimes_shift ON overtimes (shift_id) WHERE shift_id IS NOT NULL;
-- OvertimeStatus enum: add 'in_progress' value
```

**user_tracking_status** — Add rayon tracking
```sql
ALTER TABLE user_tracking_status ADD COLUMN rayon_id UUID REFERENCES rayons(id) ON DELETE SET NULL;
CREATE INDEX CONCURRENTLY idx_tracking_rayon ON user_tracking_status (rayon_id) WHERE rayon_id IS NOT NULL;
```

### New Tables

**user_areas** — Multi-area assignment junction table (korlap permanent, satgas/linmas task-based)
```sql
CREATE TABLE user_areas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    area_id UUID NOT NULL REFERENCES areas(id) ON DELETE CASCADE,
    assignment_type VARCHAR(20) NOT NULL DEFAULT 'permanent',
    assigned_at TIMESTAMPTZ DEFAULT NOW(),
    assigned_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT uq_user_area UNIQUE (user_id, area_id, assignment_type),
    CONSTRAINT chk_user_areas_assignment_type CHECK (assignment_type IN ('permanent', 'task_based'))
);
CREATE INDEX idx_user_areas_user_type ON user_areas (user_id, assignment_type);
CREATE INDEX idx_user_areas_area ON user_areas (area_id);
```

**audit_logs** — Generic audit trail for entity changes
```sql
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entity_type VARCHAR(50) NOT NULL,
    entity_id UUID NOT NULL,
    action VARCHAR(50) NOT NULL,
    actor_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    old_value JSONB,
    new_value JSONB,
    metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_audit_entity ON audit_logs (entity_type, entity_id, created_at DESC);
CREATE INDEX idx_audit_actor ON audit_logs (actor_id);
CREATE INDEX idx_audit_created ON audit_logs USING BRIN (created_at);
CREATE INDEX idx_audit_action ON audit_logs (entity_type, action);
```

### Check Constraint Updates

```sql
-- overtimes.status (Phase 2E: add in_progress)
CHECK (status IN ('in_progress', 'pending', 'approved', 'rejected'))
```

### Table Count Summary (Phase 2E)

| Phase | Tables | New/Changed |
|-------|--------|-------------|
| Phase 2E (Feedback II) | +2 | +user_areas, +audit_logs; ALTERED: users, shifts, overtimes, user_tracking_status |
| **Total** | **22** | Up from 20 in Phase 2D |

---

## Phase 3: Planned Schema Changes (Plants Management + Monitoring Rebuild + Public Intake)

> **Full specification:** See [`specs/phases/phase-3-plants-monitoring-rebuild/database.md`](../phases/phase-3-plants-monitoring-rebuild/database.md)
> **Authored:** 2026-04-24
> **Status:** Not implemented — migrations will be `17460000*-Phase3*.ts`. All additive.

### New Tables (8)

#### plant_species

Master catalog of plant species (covers trees, shrubs, small plants). Seeded with 131 species deduped from the December 2025–April 2026 pruning CSV.

```sql
CREATE TABLE plant_species (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name_id TEXT NOT NULL,
  name_latin TEXT,
  category TEXT NOT NULL, -- 'tree' | 'shrub' | 'palm' | 'grass' | 'flower' | 'other'
  default_pruning_cycle_days INT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_plant_species_name_id ON plant_species (name_id);
```

```typescript
@Entity('plant_species')
export class PlantSpecies {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column() name_id: string;
  @Column({ nullable: true }) name_latin?: string;
  @Column() category: string;
  @Column({ type: 'int', nullable: true }) default_pruning_cycle_days?: number;
  @Column({ type: 'text', nullable: true }) notes?: string;
  @CreateDateColumn() created_at: Date;
  @UpdateDateColumn() updated_at: Date;
}
```

#### area_plants

Area-aggregate inventory (species × count), drives pruning-cycle status and overdue alerts (ADR-030, ADR-034).

```sql
CREATE TABLE area_plants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  area_id UUID NOT NULL REFERENCES areas(id) ON DELETE CASCADE,
  species_id UUID NOT NULL REFERENCES plant_species(id) ON DELETE RESTRICT,
  count INT NOT NULL DEFAULT 0,
  last_pruned_at TIMESTAMPTZ,
  next_due_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'ok', -- 'ok' | 'due' | 'overdue'
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT uq_area_species UNIQUE (area_id, species_id),
  CONSTRAINT chk_area_plants_status CHECK (status IN ('ok','due','overdue'))
);
CREATE INDEX idx_area_plants_area_status ON area_plants (area_id, status);
CREATE INDEX idx_area_plants_next_due ON area_plants (next_due_at);
```

#### notable_plants

Optional individual records for heritage or flagged plants (ADR-030).

```sql
CREATE TABLE notable_plants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  area_id UUID NOT NULL REFERENCES areas(id) ON DELETE CASCADE,
  species_id UUID NOT NULL REFERENCES plant_species(id) ON DELETE RESTRICT,
  gps_lat NUMERIC(10,7),
  gps_lng NUMERIC(10,7),
  label TEXT,
  heritage BOOLEAN DEFAULT FALSE,
  photo_urls TEXT[] DEFAULT '{}',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);
CREATE INDEX idx_notable_plants_area ON notable_plants (area_id) WHERE deleted_at IS NULL;
```

#### activity_plant_items

Species line items attached to an activity (completion details for pruning tasks).

```sql
CREATE TABLE activity_plant_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  activity_id UUID NOT NULL REFERENCES activities(id) ON DELETE CASCADE,
  species_id UUID NOT NULL REFERENCES plant_species(id) ON DELETE RESTRICT,
  count INT NOT NULL,
  notes TEXT
);
CREATE INDEX idx_activity_plant_items_activity ON activity_plant_items (activity_id);
```

#### pruning_requests

Public intake from kecamatan staff (ADR-032, ADR-033).

```sql
CREATE TABLE pruning_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reference_code TEXT NOT NULL UNIQUE,
  submitted_by UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT, -- staff_kecamatan
  kecamatan_name TEXT NOT NULL,
  address TEXT NOT NULL,
  gps_lat NUMERIC(10,7),
  gps_lng NUMERIC(10,7),
  expected_date DATE,
  estimated_plant_count INT,
  photo_urls TEXT[] DEFAULT '{}',
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'submitted',
  rayon_id UUID REFERENCES rayons(id) ON DELETE SET NULL,
  reviewed_by UUID REFERENCES users(id) ON DELETE SET NULL, -- admin_data
  reviewed_at TIMESTAMPTZ,
  review_notes TEXT,
  converted_task_id UUID REFERENCES tasks(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT chk_pruning_requests_status CHECK (
    status IN ('submitted','under_review','approved','rejected','converted','in_progress','done','cancelled')
  )
);
CREATE INDEX idx_pruning_requests_status_rayon ON pruning_requests (status, rayon_id);
CREATE INDEX idx_pruning_requests_submitter ON pruning_requests (submitted_by, status);
CREATE UNIQUE INDEX idx_pruning_requests_ref ON pruning_requests (reference_code);
```

#### service_capacity

Generic weekly capacity grid, reusable for future DLH services (ADR-035).

```sql
CREATE TABLE service_capacity (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rayon_id UUID NOT NULL REFERENCES rayons(id) ON DELETE CASCADE,
  year INT NOT NULL,
  iso_week INT NOT NULL,
  service_type TEXT NOT NULL, -- 'pruning' | 'watering' | 'planting' | ...
  capacity_units INT NOT NULL DEFAULT 0,
  booked_units INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT uq_service_capacity UNIQUE (rayon_id, year, iso_week, service_type)
);
CREATE INDEX idx_service_capacity_rayon_week ON service_capacity (rayon_id, year, iso_week);
```

#### plant_seeds

Seed inventory master.

```sql
CREATE TABLE plant_seeds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name_id TEXT NOT NULL,
  species_id UUID REFERENCES plant_species(id) ON DELETE SET NULL,
  unit TEXT NOT NULL, -- 'gram' | 'piece' | 'packet'
  stock_qty NUMERIC(12,2) NOT NULL DEFAULT 0,
  last_counted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### seed_transactions

Unified ledger (purchase / distribution / adjustment).

```sql
CREATE TABLE seed_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seed_id UUID NOT NULL REFERENCES plant_seeds(id) ON DELETE RESTRICT,
  transaction_type TEXT NOT NULL, -- 'purchase' | 'distribution' | 'adjustment'
  qty NUMERIC(12,2) NOT NULL, -- signed by type
  unit_price NUMERIC(12,2),
  supplier TEXT,
  receipt_url TEXT,
  to_rayon_id UUID REFERENCES rayons(id) ON DELETE SET NULL,
  to_area_id UUID REFERENCES areas(id) ON DELETE SET NULL,
  recipient_name TEXT,
  occurred_at DATE NOT NULL,
  recorded_by UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT chk_seed_tx_type CHECK (transaction_type IN ('purchase','distribution','adjustment'))
);
CREATE INDEX idx_seed_tx_seed_date ON seed_transactions (seed_id, occurred_at);
CREATE INDEX idx_seed_tx_type_date ON seed_transactions (transaction_type, occurred_at);
```

### Altered Tables (5)

#### activities (extensions)

```sql
ALTER TABLE activities ADD COLUMN custom_fields JSONB NOT NULL DEFAULT '{}';
ALTER TABLE activities ADD COLUMN photo_before_url TEXT;
ALTER TABLE activities ADD COLUMN photo_after_url TEXT;
ALTER TABLE activities ADD COLUMN reference_code TEXT UNIQUE;
ALTER TABLE activities ADD COLUMN pruning_request_id UUID REFERENCES pruning_requests(id) ON DELETE SET NULL;
CREATE INDEX idx_activities_reference_code ON activities (reference_code);
CREATE INDEX idx_activities_pruning_request ON activities (pruning_request_id);
```

`custom_fields` keys for pruning (CSV-derived): `maintenance_type` (PC/PM/PB), `road_context` (JT/JH/ST), `handling_status`, `worker_org`, `damage_cause`.

#### tasks (extensions — ADR-031)

```sql
ALTER TABLE tasks ADD COLUMN task_type TEXT NOT NULL DEFAULT 'generic';
ALTER TABLE tasks ADD COLUMN custom_fields JSONB NOT NULL DEFAULT '{}';
ALTER TABLE tasks ADD COLUMN parent_task_id UUID REFERENCES tasks(id) ON DELETE SET NULL;
ALTER TABLE tasks ADD COLUMN target_plant_count INT;
ALTER TABLE tasks ADD COLUMN completed_plant_count INT NOT NULL DEFAULT 0;
ALTER TABLE tasks ADD CONSTRAINT chk_tasks_task_type
  CHECK (task_type IN ('generic','pruning','watering','planting','removal','inspection'));
CREATE INDEX idx_tasks_type_status ON tasks (task_type, status);
CREATE INDEX idx_tasks_parent ON tasks (parent_task_id);
```

#### users.role (enum extension — ADR-033)

```sql
ALTER TABLE users DROP CONSTRAINT IF EXISTS chk_users_role;
ALTER TABLE users ADD CONSTRAINT chk_users_role CHECK (
  role IN ('satgas','linmas','korlap','admin_data','kepala_rayon',
           'top_management','admin_system','superadmin','staff_kecamatan')
);
```

> `admin_data` is **not** being redefined as a new role — ADR-032 extends its capability (disposition authority over `pruning_requests`, scoped by `users.rayon_id`) via code/policy, not schema.

#### location_logs (missing indexes — surfaced by Phase 3 profiling)

```sql
CREATE INDEX idx_location_logs_user_time ON location_logs (user_id, logged_at DESC);
CREATE INDEX idx_location_logs_shift_time ON location_logs (shift_id, logged_at);
CREATE INDEX idx_location_logs_user_shift_time ON location_logs (user_id, shift_id, logged_at);
```

#### user_tracking_status (additional indexes)

```sql
CREATE INDEX idx_uts_area_updated ON user_tracking_status (area_id, updated_at DESC);
CREATE INDEX idx_uts_within_area ON user_tracking_status (is_within_area, area_id);
```

#### monitoring_configs (new rows)

```sql
INSERT INTO monitoring_configs (key, value, description) VALUES
  ('staffing_debounce_seconds', '30', 'Debounce window for AREA_STAFFING_CHANGED emissions'),
  ('stale_status_sweep_cron', '*/5 * * * *', 'Cron for StaleStatusSweeperService'),
  ('cluster_zoom_threshold', '14', 'Zoom level at which clusters break into individual markers'),
  ('redis_stream_max_len', '100000', 'MAXLEN approximate cap for monitoring: streams');
```

### Seed Data (Phase 3)

- `plant_species`: 131 rows from CSV column 6, deduped. `default_pruning_cycle_days = NULL` (admin fills later).
- `service_capacity`: 7 rayons × next 12 ISO weeks × `service_type='pruning'`, `capacity_units=NULL`.
- `monitoring_configs`: new rows above.
- Handling-status & worker-org lookup tables seeded with raw enum codes + `display_label` so relabeling requires no migration.

### Table Count Summary (Phase 3)

| Phase | Tables | New/Changed |
|-------|--------|-------------|
| Phase 3 (Plants/Monitoring Rebuild) | +8 | +plant_species, +area_plants, +notable_plants, +activity_plant_items, +pruning_requests, +service_capacity, +plant_seeds, +seed_transactions; ALTERED: activities, tasks, users.role, location_logs, user_tracking_status; monitoring_configs rows added |
| **Total** | **30** | Up from 22 in Phase 2E |

---

**Related Documents:**
- [ERD](./erd.md) - Entity relationship diagrams (Phase 2D + Phase 3)
- [Migrations](./migrations.md) - Migration strategy
- [Seed Data](./seed-data.md) - Test data specifications
- [Phase 2C Database](../phases/phase-2-c-client-feedback/database.md) - Phase 2C migration details
- [Phase 2E Database](../phases/phase-2-e-client-feedback-2/database.md) - Phase 2E migration details
- [Phase 3 Database](../phases/phase-3-plants-monitoring-rebuild/database.md) - Phase 3 full spec
