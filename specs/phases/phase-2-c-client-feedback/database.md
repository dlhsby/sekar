# Phase 2C: Database Schema Changes

**Last Updated:** 2026-02-10
**Status:** Planning
**Migration Strategy:** Multi-step with rollback support

---

## Current Codebase Facts (Verified)

> These are verified against the actual codebase and MUST be kept accurate for AI agent implementation.

| Fact | Actual Value | File |
|------|-------------|------|
| `activity_types` role column | `applicable_roles TEXT[]` (array, NOT single `role`) | `be/src/modules/activity-types/entities/activity-type.entity.ts:58` |
| Current seed role format | PascalCase in ARRAY: `ARRAY['Worker']`, `ARRAY['Linmas']`, `ARRAY['Worker', 'Linmas']` | `be/src/database/seeds/seed-phase2.ts:81-86` |
| `work_reports.shift_id` | **ALREADY EXISTS** (UUID, NOT NULL, FK to shifts) | `be/src/modules/reports/entities/report.entity.ts:54` |
| `work_reports.worker_id` | Column name is `worker_id` (NOT `user_id`) | `be/src/modules/reports/entities/report.entity.ts:50` |
| `users.area_id` | **DOES NOT EXIST** — users only have `rayon_id` | `be/src/modules/users/entities/user.entity.ts:64` |
| `worker_schedules` date field | `effective_date` (NOT `start_date`), has `user_id` (NOT `worker_id`) | `be/src/modules/worker-schedules/entities/worker-schedule.entity.ts:59` |
| `tasks.area_id` | **REQUIRED** (NOT NULL), FK to areas | `be/src/modules/tasks/entities/task.entity.ts:78` |
| TaskStatus enum | 6 values: `pending, assigned, accepted, in_progress, completed, declined` | `be/src/modules/tasks/entities/task.entity.ts:19-26` |
| TaskPriority enum | 4 values: `low, medium, high, urgent` | `be/src/modules/tasks/entities/task.entity.ts:31-36` |
| `tasks.activity_type_id` | EXISTS, nullable, FK to activity_types | `be/src/modules/tasks/entities/task.entity.ts:81` |
| `tasks.completion_gps_lat/lng` | EXISTS, nullable decimal columns | `be/src/modules/tasks/entities/task.entity.ts:101,104` |
| `tasks.decline_reason` | EXISTS, nullable text column | `be/src/modules/tasks/entities/task.entity.ts:108` |
| CompleteTaskDto | `completion_photo_url` (optional), `completion_notes` (optional), `gps_lat` (REQUIRED), `gps_lng` (REQUIRED) | `be/src/modules/tasks/dto/complete-task.dto.ts:6-48` |
| ClockInDto | `area_id` (REQUIRED UUID), `gps_lat`, `gps_lng`, `selfie_photo` (base64, 10MB max) | `be/src/modules/shifts/dto/clock-in.dto.ts:9-50` |
| Report entity class | Named `Report` (NOT `WorkReport`), table `work_reports` | `be/src/modules/reports/entities/report.entity.ts:43` |
| ReportType enum | 7 values: cleaning, planting, maintenance, inspection, task_completion, incident, maintenance_request | `be/src/modules/reports/entities/report.entity.ts:18-28` |
| ReportCondition enum | 3 values: Baik, Cukup, Buruk | `be/src/modules/reports/entities/report.entity.ts:30-34` |

---

## Migration Order

Migrations MUST be executed in this order due to foreign key dependencies:

1. **Migration 0:** Role enum update + add `area_id` to users (prerequisite for all other changes)
2. **Migration 1:** Activity types update (new seed data using `applicable_roles TEXT[]`)
3. **Migration 2:** Reports → Aktivitas schema transformation
4. **Migration 3:** Tasks schema update (rayon_id, status simplification, task_tags table)
5. **Migration 4:** New overtime tables (overtimes, overtime_aktivitas)
6. **Migration 5:** Worker assignment deprecation flags

---

## Migration 0: Role Enum Update + Users Schema (PREREQUISITE)

### users table - role column

**Current CHECK constraint:**
```sql
CHECK (role IN ('worker', 'linmas', 'supervisor', 'admin', 'koordinator_lapangan', 'kepala_rayon', 'top_management'))
```

**Target CHECK constraint:**
```sql
CHECK (role IN ('satgas', 'linmas', 'korlap', 'admin_data', 'kepala_rayon', 'top_management', 'admin_system', 'superadmin'))
```

### users table - add area_id column

**IMPORTANT:** The `area_id` column does NOT currently exist on the users table. It must be ADDED for korlap role association.

```sql
-- Add area_id column to users table (for korlap → area association)
ALTER TABLE users ADD COLUMN area_id UUID REFERENCES areas(id) ON DELETE SET NULL;
CREATE INDEX idx_users_area_id ON users(area_id);
```

### Migration Script

```sql
-- Step 1: Drop old constraint
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;

-- Step 2: Add area_id column
ALTER TABLE users ADD COLUMN IF NOT EXISTS area_id UUID REFERENCES areas(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_users_area_id ON users(area_id);

-- Step 3: Migrate existing role values
UPDATE users SET role = 'satgas' WHERE role = 'worker';
UPDATE users SET role = 'korlap' WHERE role = 'koordinator_lapangan';
UPDATE users SET role = 'korlap' WHERE role = 'supervisor';
UPDATE users SET role = 'superadmin' WHERE role = 'admin';

-- Step 4: Add new constraint
ALTER TABLE users ADD CONSTRAINT users_role_check
  CHECK (role IN ('satgas', 'linmas', 'korlap', 'admin_data', 'kepala_rayon', 'top_management', 'admin_system', 'superadmin'));
```

### TypeORM Entity Change Required

**File:** `be/src/modules/users/entities/user.entity.ts`

Add after the `rayon_id` property (line ~64):
```typescript
@ApiProperty({
  description: 'Area ID for Korlap role',
  example: 'c3d4e5f6-a7b8-9012-cdef-123456789012',
  required: false,
})
@Column({ type: 'uuid', nullable: true })
area_id?: string;

@ManyToOne(() => Area, { nullable: true, onDelete: 'SET NULL' })
@JoinColumn({ name: 'area_id' })
area?: Area;
```

### Rollback Script

```sql
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
UPDATE users SET role = 'worker' WHERE role = 'satgas';
UPDATE users SET role = 'koordinator_lapangan' WHERE role = 'korlap';
UPDATE users SET role = 'admin' WHERE role = 'superadmin';
-- Note: admin_data and admin_system users would need manual handling
ALTER TABLE users DROP COLUMN IF EXISTS area_id;
ALTER TABLE users ADD CONSTRAINT users_role_check
  CHECK (role IN ('worker', 'linmas', 'supervisor', 'admin', 'koordinator_lapangan', 'kepala_rayon', 'top_management'));
```

### Impact Assessment

- **Rows affected:** All users table rows with roles worker, koordinator_lapangan, supervisor, admin
- **Downtime:** Requires maintenance window (all active JWT tokens will reference old roles)
- **Post-migration:** Force all users to re-authenticate (invalidate all refresh tokens)
- **New column:** area_id added as nullable — existing korlap users need area_id populated manually

---

## Migration 1: Activity Types Update

### IMPORTANT: Column is `applicable_roles TEXT[]` (NOT `role`)

The `activity_types` table uses `applicable_roles` as a TEXT array column (`text[]`), NOT a single `role` column.

**Current entity:** `be/src/modules/activity-types/entities/activity-type.entity.ts`
```typescript
@Column({ type: 'text', array: true })
applicable_roles: string[];
```

**Current seed format** (PascalCase role values):
```sql
INSERT INTO activity_types (id, name, code, description, applicable_roles, is_active) VALUES
  ('...', 'Penyiraman', 'WATERING', '...', ARRAY['Worker'], TRUE),
  ('...', 'Pembersihan', 'CLEANING', '...', ARRAY['Worker', 'Linmas'], TRUE);
```

### Phase 2C Decision: Role value case in applicable_roles

The current seeds use PascalCase (`'Worker'`, `'Linmas'`) in the `applicable_roles` array, matching the OLD UserRole enum values used internally. With Phase 2C, new role values are lowercase (`'satgas'`, `'linmas'`, `'korlap'`, `'admin_data'`).

**Two options:**
1. **Keep PascalCase** in applicable_roles (use `'Satgas'`, `'Linmas'`, `'Korlap'`, `'AdminData'`) — requires mapping layer
2. **Switch to lowercase** (use `'satgas'`, `'linmas'`, `'korlap'`, `'admin_data'`) — cleaner, matches DB role column

**Recommendation:** Switch to lowercase to match the users.role column values. This requires updating the service layer `findByRole()` method.

### Migration Script

```sql
-- Step 1: Update existing applicable_roles values from PascalCase to lowercase
UPDATE activity_types SET applicable_roles = ARRAY(
  SELECT CASE
    WHEN elem = 'Worker' THEN 'satgas'
    WHEN elem = 'Linmas' THEN 'linmas'
    ELSE lower(elem)
  END
  FROM unnest(applicable_roles) AS elem
) WHERE applicable_roles IS NOT NULL;

-- Step 2: Soft-delete old activity types
UPDATE activity_types SET deleted_at = NOW()
WHERE deleted_at IS NULL;

-- Step 3: Insert new satgas activities
INSERT INTO activity_types (id, name, code, description, applicable_roles, is_active) VALUES
  (gen_random_uuid(), 'Perawatan', 'perawatan', 'Perawatan tanaman dan area', ARRAY['satgas'], true),
  (gen_random_uuid(), 'Penanaman', 'penanaman', 'Penanaman tanaman baru', ARRAY['satgas'], true),
  (gen_random_uuid(), 'Perantingan', 'perantingan', 'Pemangkasan ranting pohon', ARRAY['satgas'], true),
  (gen_random_uuid(), 'Penyiraman', 'penyiraman', 'Penyiraman tanaman', ARRAY['satgas'], true),
  (gen_random_uuid(), 'Penyulaman', 'penyulaman', 'Penggantian tanaman mati', ARRAY['satgas'], true),
  (gen_random_uuid(), 'Potong Rumput', 'potong_rumput', 'Pemotongan rumput', ARRAY['satgas'], true),
  (gen_random_uuid(), 'Angkut Sampah', 'angkut_sampah', 'Pengangkutan sampah', ARRAY['satgas'], true),
  (gen_random_uuid(), 'Lainnya', 'lainnya_satgas', 'Aktivitas satgas lainnya', ARRAY['satgas'], true);

-- Step 4: Insert new linmas activities
INSERT INTO activity_types (id, name, code, description, applicable_roles, is_active) VALUES
  (gen_random_uuid(), 'Patroli', 'patroli', 'Patroli keamanan area', ARRAY['linmas'], true),
  (gen_random_uuid(), 'Insiden', 'insiden', 'Pelaporan insiden keamanan', ARRAY['linmas'], true),
  (gen_random_uuid(), 'Memeriksa Kondisi Fasilitas', 'periksa_fasilitas', 'Pemeriksaan kondisi fasilitas', ARRAY['linmas'], true),
  (gen_random_uuid(), 'Halau PKL', 'halau_pkl', 'Penertiban pedagang kaki lima', ARRAY['linmas'], true),
  (gen_random_uuid(), 'Lainnya', 'lainnya_linmas', 'Aktivitas linmas lainnya', ARRAY['linmas'], true);

-- Step 5: Insert new korlap activities
INSERT INTO activity_types (id, name, code, description, applicable_roles, is_active) VALUES
  (gen_random_uuid(), 'Pengecekan Kendaraan', 'cek_kendaraan', 'Pemeriksaan kendaraan operasional', ARRAY['korlap'], true),
  (gen_random_uuid(), 'Patroli', 'patroli_korlap', 'Patroli area kerja', ARRAY['korlap'], true),
  (gen_random_uuid(), 'Pengecekan Alat', 'cek_alat', 'Pemeriksaan peralatan kerja', ARRAY['korlap'], true),
  (gen_random_uuid(), 'Lainnya', 'lainnya_korlap', 'Aktivitas korlap lainnya', ARRAY['korlap'], true);

-- Step 6: Insert new admin_data activities
INSERT INTO activity_types (id, name, code, description, applicable_roles, is_active) VALUES
  (gen_random_uuid(), 'Cek Absensi', 'cek_absensi', 'Pengecekan data absensi', ARRAY['admin_data'], true),
  (gen_random_uuid(), 'Cek dan Entri Laporan', 'entri_laporan', 'Pengecekan dan entri laporan', ARRAY['admin_data'], true),
  (gen_random_uuid(), 'Lainnya', 'lainnya_admin_data', 'Aktivitas admin data lainnya', ARRAY['admin_data'], true);
```

### Activity Types Service Change Required

**File:** `be/src/modules/activity-types/activity-types.service.ts`

Update `findByRole()` to query using array contains:
```typescript
async findByRole(role: string): Promise<ActivityType[]> {
  // applicable_roles is TEXT[] — use array contains operator
  return this.repo.createQueryBuilder('at')
    .where(':role = ANY(at.applicable_roles)', { role })
    .andWhere('at.is_active = true')
    .andWhere('at.deleted_at IS NULL')
    .getMany();
}
```

---

## Migration 2: Reports → Aktivitas Schema

### work_reports table - Current State (Verified)

| Column | Type | Nullable | Notes |
|--------|------|----------|-------|
| `id` | UUID PK | NO | |
| `worker_id` | UUID FK→users | NO | Column name is `worker_id`, NOT `user_id` |
| `shift_id` | UUID FK→shifts | NO | **ALREADY EXISTS** — do NOT add again |
| `area_id` | UUID FK→areas | NO | |
| `task_id` | UUID FK→tasks | YES | Phase 2 addition |
| `activity_type_id` | UUID FK→activity_types | YES | Phase 2 addition — becomes NOT NULL in 2C |
| `report_type` | VARCHAR(50) | NO | ReportType enum — becomes nullable in 2C |
| `description` | TEXT | NO | |
| `condition` | VARCHAR(20) | YES | ReportCondition enum — removed in 2C |
| `photo_url` | TEXT | YES | Single photo — migrated to photo_urls array |
| `gps_lat` | DECIMAL(10,8) | NO | |
| `gps_lng` | DECIMAL(11,8) | NO | |
| `is_reviewed` | BOOLEAN | NO | Default false — removed in 2C |
| `reviewed_by` | UUID FK→users | YES | Removed in 2C |
| `reviewed_at` | TIMESTAMPTZ | YES | Removed in 2C |

### Columns to ADD

```sql
-- Add multi-photo support (max 3)
ALTER TABLE work_reports ADD COLUMN photo_urls TEXT[] DEFAULT '{}';
```

> **NOTE:** `shift_id` already exists and is NOT NULL. Do NOT add it again.

### Columns to REMOVE (soft - nullable first, then drop in Phase 3)

```sql
-- Phase 2C: Make nullable (backward compatibility during transition)
ALTER TABLE work_reports ALTER COLUMN report_type DROP NOT NULL;

-- Phase 2C: Drop review workflow columns
ALTER TABLE work_reports DROP COLUMN IF EXISTS is_reviewed;
ALTER TABLE work_reports DROP COLUMN IF EXISTS reviewed_by;
ALTER TABLE work_reports DROP COLUMN IF EXISTS reviewed_at;
```

### Constraints update

```sql
-- activity_type_id becomes required
ALTER TABLE work_reports ALTER COLUMN activity_type_id SET NOT NULL;

-- photo_urls max 3 items check
ALTER TABLE work_reports ADD CONSTRAINT work_reports_photo_urls_max3
  CHECK (array_length(photo_urls, 1) IS NULL OR array_length(photo_urls, 1) <= 3);
```

### Data migration for existing reports

```sql
-- Migrate single photo_url to photo_urls array
UPDATE work_reports
SET photo_urls = ARRAY[photo_url]
WHERE photo_url IS NOT NULL AND (photo_urls IS NULL OR photo_urls = '{}');

-- Set activity_type_id for existing reports that don't have one
-- (must be done BEFORE the NOT NULL constraint is set)
-- Strategy: assign a default activity type based on report_type
UPDATE work_reports wr
SET activity_type_id = (
  SELECT id FROM activity_types
  WHERE code = CASE wr.report_type
    WHEN 'cleaning' THEN 'perawatan'
    WHEN 'planting' THEN 'penanaman'
    WHEN 'maintenance' THEN 'perawatan'
    WHEN 'inspection' THEN 'periksa_fasilitas'
    WHEN 'task_completion' THEN 'perawatan'
    WHEN 'incident' THEN 'insiden'
    WHEN 'maintenance_request' THEN 'perawatan'
    ELSE 'perawatan'
  END
  AND deleted_at IS NULL
  LIMIT 1
)
WHERE activity_type_id IS NULL;
```

### Index additions

```sql
-- shift_id index likely already exists, but ensure it does
CREATE INDEX IF NOT EXISTS idx_work_reports_shift_id ON work_reports(shift_id);
CREATE INDEX IF NOT EXISTS idx_work_reports_activity_type_id ON work_reports(activity_type_id);
```

---

## Migration 3: Tasks Schema Update

### Current Task Schema (Verified)

| Column | Type | Nullable | Phase 2C Change |
|--------|------|----------|-----------------|
| `id` | UUID PK | NO | Keep |
| `title` | VARCHAR(200) | NO | Keep |
| `description` | TEXT | YES | Keep |
| `status` | ENUM TaskStatus | NO | Simplify: remove ACCEPTED, DECLINED |
| `priority` | ENUM TaskPriority | NO | **Decision needed**: keep or remove? |
| `deadline` | TIMESTAMPTZ | YES | Keep (rename concept to `due_date` in DTO only) |
| `area_id` | UUID FK→areas | **NO (required)** | Make NULLABLE (tasks can be rayon-scoped) |
| `activity_type_id` | UUID FK→activity_types | YES | **DROP** — tasks don't have activity types in 2C |
| `assigned_to` | UUID FK→users | YES | Keep |
| `created_by` | UUID FK→users | NO | Keep |
| `completion_photo_url` | VARCHAR(500) | YES | Keep — becomes REQUIRED in DTO |
| `completion_notes` | TEXT | YES | Keep — replaced by `description` in DTO |
| `completed_at` | TIMESTAMPTZ | YES | Keep |
| `completion_gps_lat` | DECIMAL(10,7) | YES | **DROP** |
| `completion_gps_lng` | DECIMAL(10,7) | YES | **DROP** |
| `decline_reason` | TEXT | YES | **DROP** (if removing DECLINED status) |
| `declined_at` | TIMESTAMPTZ | YES | **DROP** (if removing DECLINED status) |
| `assigned_at` | TIMESTAMPTZ | YES | Keep |
| `accepted_at` | TIMESTAMPTZ | YES | **DROP** (if removing ACCEPTED status) |
| `started_at` | TIMESTAMPTZ | YES | Keep |

### TaskStatus Simplification Decision

**Current (6 statuses):** `pending → assigned → accepted → in_progress → completed → declined`

**Phase 2C (simplified, 4 statuses):** `pending → assigned → in_progress → completed`

**Rationale:** Client didn't mention accept/decline workflow. Tasks go directly from assigned to in_progress.

```sql
-- Update task status constraint
ALTER TABLE tasks DROP CONSTRAINT IF EXISTS tasks_status_check;

-- Migrate existing data
UPDATE tasks SET status = 'assigned' WHERE status = 'accepted';
UPDATE tasks SET status = 'assigned' WHERE status = 'declined';

-- Add new constraint (4 statuses)
ALTER TABLE tasks ADD CONSTRAINT tasks_status_check
  CHECK (status IN ('pending', 'assigned', 'in_progress', 'completed'));
```

### TaskPriority Decision

**Recommendation:** KEEP priority enum as-is. It's useful for task ordering and doesn't conflict with Phase 2C requirements. The client didn't mention removing it.

### Tasks table modifications

```sql
-- Add rayon_id for rayon-scoped tasks
ALTER TABLE tasks ADD COLUMN rayon_id UUID REFERENCES rayons(id);

-- Make area_id nullable (tasks can be rayon-scoped without specific area)
ALTER TABLE tasks ALTER COLUMN area_id DROP NOT NULL;

-- Remove activity_type_id (tasks don't have activity types in 2C)
ALTER TABLE tasks DROP COLUMN IF EXISTS activity_type_id;

-- Remove GPS-related completion fields
ALTER TABLE tasks DROP COLUMN IF EXISTS completion_gps_lat;
ALTER TABLE tasks DROP COLUMN IF EXISTS completion_gps_lng;

-- Remove accept/decline fields (simplified workflow)
ALTER TABLE tasks DROP COLUMN IF EXISTS decline_reason;
ALTER TABLE tasks DROP COLUMN IF EXISTS declined_at;
ALTER TABLE tasks DROP COLUMN IF EXISTS accepted_at;
```

### Index additions

```sql
CREATE INDEX idx_tasks_rayon_id ON tasks(rayon_id);
-- These indexes already exist via @Index decorators but ensure they do:
CREATE INDEX IF NOT EXISTS idx_tasks_assigned_to ON tasks(assigned_to, status);
CREATE INDEX IF NOT EXISTS idx_tasks_created_by ON tasks(created_by);
```

### New table: task_tags

```sql
CREATE TABLE task_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(task_id, user_id)
);

CREATE INDEX idx_task_tags_task_id ON task_tags(task_id);
CREATE INDEX idx_task_tags_user_id ON task_tags(user_id);
```

---

## Migration 4: Overtime Tables

### New table: overtimes

```sql
CREATE TABLE overtimes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  area_id UUID REFERENCES areas(id),
  date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'approved', 'rejected')),
  approved_by UUID REFERENCES users(id),
  approved_at TIMESTAMP WITH TIME ZONE,
  rejection_reason TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_overtimes_user_id ON overtimes(user_id);
CREATE INDEX idx_overtimes_area_id ON overtimes(area_id);
CREATE INDEX idx_overtimes_status ON overtimes(status);
CREATE INDEX idx_overtimes_date ON overtimes(date);
CREATE INDEX idx_overtimes_approved_by ON overtimes(approved_by);
```

### New table: overtime_aktivitas

```sql
CREATE TABLE overtime_aktivitas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  overtime_id UUID NOT NULL REFERENCES overtimes(id) ON DELETE CASCADE,
  activity_type_id UUID NOT NULL REFERENCES activity_types(id),
  description TEXT NOT NULL,
  photo_urls TEXT[] DEFAULT '{}',
  gps_lat DECIMAL(10, 8),
  gps_lng DECIMAL(11, 8),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE overtime_aktivitas ADD CONSTRAINT overtime_aktivitas_photo_urls_max3
  CHECK (array_length(photo_urls, 1) IS NULL OR array_length(photo_urls, 1) <= 3);

CREATE INDEX idx_overtime_aktivitas_overtime_id ON overtime_aktivitas(overtime_id);
```

---

## Migration 5: Worker Assignment Reconciliation

### Strategy: Deprecate WorkerAssignment, use WorkerSchedule as primary

**WorkerSchedule fields (verified):** `user_id`, `area_id`, `shift_definition_id`, `effective_date`, `end_date`

```sql
-- Add deprecation flag to worker_assignments
ALTER TABLE worker_assignments ADD COLUMN deprecated BOOLEAN DEFAULT false;
ALTER TABLE worker_assignments ADD COLUMN migrated_to_schedule_id UUID REFERENCES worker_schedules(id);

-- Mark all existing assignments as deprecated
UPDATE worker_assignments SET deprecated = true;
```

**Clock-in area detection logic (post-migration):**
1. Check WorkerSchedule for today's active schedule:
   ```sql
   SELECT area_id FROM worker_schedules
   WHERE user_id = :userId
     AND effective_date <= CURRENT_DATE
     AND (end_date IS NULL OR end_date >= CURRENT_DATE)
     AND deleted_at IS NULL
   ORDER BY effective_date DESC LIMIT 1;
   ```
2. Fallback: Check WorkerAssignment (non-deprecated) → use that area_id
3. No assignment: Allow clock-in with NULL area (GPS still recorded)

---

## Updated Entity Relationship Summary

```
users (role: 8 roles, has rayon_id AND area_id)
├── shifts (1:N via worker_id)
│   └── work_reports/aktivitas (1:N via shift_id)
├── tasks (N:1 as assigned_to)
├── tasks (N:1 as created_by)
├── task_tags (N:M via task_tags)
├── overtimes (1:N as user_id)
├── overtimes (1:N as approved_by)
├── location_logs (1:N)
├── worker_assignments (1:1, deprecated)
└── worker_schedules (1:N via user_id)

areas
├── shifts (1:N)
├── overtimes (1:N)
├── tasks (1:N, nullable in 2C)
├── users (1:N via area_id for korlap)
└── worker_schedules (1:N)

rayons
├── areas (1:N)
├── tasks (1:N via rayon_id, NEW)
└── users (1:N via rayon_id for kepala_rayon)

activity_types (applicable_roles TEXT[] — multi-role support)
├── work_reports (1:N via activity_type_id)
└── overtime_aktivitas (1:N)

overtimes
└── overtime_aktivitas (1:N)

tasks
└── task_tags (1:N)
```

---

## Seed Data Updates

### Test Users (Phase 2C)

> **NOTE:** `area_id` is a new column added in Migration 0. Password uses bcrypt hash.

```sql
-- Update existing users' roles first (via Migration 0)
-- Then insert new test users for new roles:
INSERT INTO users (id, username, password_hash, full_name, role, rayon_id, area_id, is_active) VALUES
  (gen_random_uuid(), 'superadmin', '$2b$10$...', 'Super Admin', 'superadmin', NULL, NULL, true),
  (gen_random_uuid(), 'admin_system1', '$2b$10$...', 'Admin Sistem', 'admin_system', NULL, NULL, true),
  (gen_random_uuid(), 'admin_data1', '$2b$10$...', 'Admin Data', 'admin_data', NULL, NULL, true);

-- Existing users get role updates via Migration 0:
-- admin → superadmin, worker1/worker2 → satgas, supervisor1 → korlap (with area_id set)
```

**Default password for all test users:** `password123` (bcrypt hashed with 10 rounds)

### TypeORM Seed File Update Required

**File:** `be/src/database/seeds/seed-phase2.ts`

Update the activity type INSERT statements to use `applicable_roles` column with lowercase role values (see Migration 1 SQL above).

---

## Rollback Strategy

Each migration has an independent rollback. In case of failure:

1. **Stop the application**
2. **Run rollback for the failed migration only** (each migration is atomic)
3. **Verify data integrity** with provided CHECK queries
4. **Restart the application**

If full rollback to Phase 2B is needed:
1. Run all rollbacks in reverse order (5→4→3→2→1→0)
2. Re-deploy Phase 2B backend code
3. Force all users to re-authenticate

---

**Last Updated:** 2026-02-10
