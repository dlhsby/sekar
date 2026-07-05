# Phase 2C: Database Schema Changes

**Last Updated:** 2026-02-16
**Status:** Spec Rewrite (Terminology Cleanup + Schema Redesign)
**Migration Strategy:** Single atomic migration with rollback support
**Related ADR:** [ADR-010](../../architecture/decisions/ADR-010-phase2c-terminology-cleanup.md)
**See also:** [Seeder Updates](./seeder-updates.md) for test data implementation

---

## Current Codebase Facts (Verified)

> These are verified against the actual codebase and MUST be kept accurate for AI agent implementation.

| Fact | Actual Value | File |
|------|-------------|------|
| `activity_types` role column | `applicable_roles TEXT[]` (array, NOT single `role`) | `apps/be/src/modules/activity-types/entities/activity-type.entity.ts:58` |
| Current seed role format | PascalCase in ARRAY: `ARRAY['Worker']`, `ARRAY['Linmas']`, `ARRAY['Worker', 'Linmas']` | `apps/be/src/database/seeds/seed-phase2.ts:81-86` |
| `work_reports.shift_id` | **ALREADY EXISTS** (UUID, NOT NULL, FK to shifts) | `apps/be/src/modules/reports/entities/report.entity.ts:54` |
| `work_reports.worker_id` | Column name is `worker_id` (NOT `user_id`) — **RENAME to `user_id`** | `apps/be/src/modules/reports/entities/report.entity.ts:50` |
| `users.area_id` | **DOES NOT EXIST** — users only have `rayon_id` | `apps/be/src/modules/users/entities/user.entity.ts:64` |
| `worker_schedules` date field | `effective_date` (NOT `start_date`), has `user_id` (NOT `worker_id`) | `apps/be/src/modules/worker-schedules/entities/worker-schedule.entity.ts:59` |
| `tasks.area_id` | **REQUIRED** (NOT NULL), FK to areas | `apps/be/src/modules/tasks/entities/task.entity.ts:78` |
| TaskStatus enum | 6 values: `pending, assigned, accepted, in_progress, completed, declined` | `apps/be/src/modules/tasks/entities/task.entity.ts:19-26` |
| `shifts.worker_id` | Column name is `worker_id` — **RENAME to `user_id`** | `apps/be/src/modules/shifts/entities/shift.entity.ts` |
| `location_logs.worker_id` | Column name is `worker_id` — **RENAME to `user_id`** | `apps/be/src/modules/location-logs/entities/location-log.entity.ts` |
| `areas.boundary_polygon` | JSONB column, ALREADY EXISTS (from KMZ import) | `apps/be/src/modules/areas/entities/area.entity.ts` |
| Report entity class | Named `Report` (NOT `WorkReport`), table `work_reports` — **RENAME to `Activity`, table `activities`** | `apps/be/src/modules/reports/entities/report.entity.ts:43` |
| ReportType enum | 7 values — **DROP column** (replaced by `activity_type_id`) | `apps/be/src/modules/reports/entities/report.entity.ts:18-28` |

---

## Migration Overview

Phase 2C uses a **single migration file** with 12 ordered steps. This replaces the previous 6-migration approach.

### Changes Summary

| Change | Type | Details |
|--------|------|---------|
| Table renames | 2 | `worker_schedules` → `schedules`, `work_reports` → `activities` |
| Table drops | 2 | `worker_assignments`, `overtime_aktivitas` |
| Column renames | 3 | `worker_id` → `user_id` on shifts, activities, location_logs |
| Column drops | 1 | `activities.report_type` |
| Columns added to `overtimes` | 5 | `activity_type_id`, `description`, `photo_urls`, `gps_lat`, `gps_lng` |
| Columns added to `shifts` | 2 | `clock_in_outside_boundary`, `clock_out_outside_boundary` |
| Role enum update | 1 | 7 roles → 8 roles |
| Users column add | 1 | `area_id` UUID FK → areas |
| Tasks modifications | Multiple | `rayon_id` added, `area_id` nullable, columns dropped |
| TaskStatus constraint | 1 | 6 → 4 values |
| New table | 1 | `task_tags` |
| Activity types | Seed update | PascalCase → lowercase, 10 → 20 types |

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

```sql
ALTER TABLE users ADD COLUMN IF NOT EXISTS area_id UUID REFERENCES areas(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_users_area_id ON users(area_id);
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

### Rollback Script

```sql
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
UPDATE users SET role = 'worker' WHERE role = 'satgas';
UPDATE users SET role = 'koordinator_lapangan' WHERE role = 'korlap';
UPDATE users SET role = 'admin' WHERE role = 'superadmin';
ALTER TABLE users DROP COLUMN IF EXISTS area_id;
ALTER TABLE users ADD CONSTRAINT users_role_check
  CHECK (role IN ('worker', 'linmas', 'supervisor', 'admin', 'koordinator_lapangan', 'kepala_rayon', 'top_management'));
```

---

## Migration 1: Activity Types Update

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

-- Step 3: Insert 20 new activity types (8 satgas + 5 linmas + 4 korlap + 3 admin_data)
INSERT INTO activity_types (id, name, code, description, applicable_roles, is_active) VALUES
  -- Satgas (8)
  (gen_random_uuid(), 'Perawatan', 'perawatan', 'Perawatan tanaman dan area', ARRAY['satgas'], true),
  (gen_random_uuid(), 'Penanaman', 'penanaman', 'Penanaman tanaman baru', ARRAY['satgas'], true),
  (gen_random_uuid(), 'Perantingan', 'perantingan', 'Pemangkasan ranting pohon', ARRAY['satgas'], true),
  (gen_random_uuid(), 'Penyiraman', 'penyiraman', 'Penyiraman tanaman', ARRAY['satgas'], true),
  (gen_random_uuid(), 'Penyulaman', 'penyulaman', 'Penggantian tanaman mati', ARRAY['satgas'], true),
  (gen_random_uuid(), 'Potong Rumput', 'potong_rumput', 'Pemotongan rumput', ARRAY['satgas'], true),
  (gen_random_uuid(), 'Angkut Sampah', 'angkut_sampah', 'Pengangkutan sampah', ARRAY['satgas'], true),
  (gen_random_uuid(), 'Lainnya', 'lainnya_satgas', 'Aktivitas satgas lainnya', ARRAY['satgas'], true),
  -- Linmas (5)
  (gen_random_uuid(), 'Patroli', 'patroli', 'Patroli keamanan area', ARRAY['linmas'], true),
  (gen_random_uuid(), 'Insiden', 'insiden', 'Pelaporan insiden keamanan', ARRAY['linmas'], true),
  (gen_random_uuid(), 'Memeriksa Kondisi Fasilitas', 'periksa_fasilitas', 'Pemeriksaan kondisi fasilitas', ARRAY['linmas'], true),
  (gen_random_uuid(), 'Halau PKL', 'halau_pkl', 'Penertiban pedagang kaki lima', ARRAY['linmas'], true),
  (gen_random_uuid(), 'Lainnya', 'lainnya_linmas', 'Aktivitas linmas lainnya', ARRAY['linmas'], true),
  -- Korlap (4)
  (gen_random_uuid(), 'Pengecekan Kendaraan', 'cek_kendaraan', 'Pemeriksaan kendaraan operasional', ARRAY['korlap'], true),
  (gen_random_uuid(), 'Patroli', 'patroli_korlap', 'Patroli area kerja', ARRAY['korlap'], true),
  (gen_random_uuid(), 'Pengecekan Alat', 'cek_alat', 'Pemeriksaan peralatan kerja', ARRAY['korlap'], true),
  (gen_random_uuid(), 'Lainnya', 'lainnya_korlap', 'Aktivitas korlap lainnya', ARRAY['korlap'], true),
  -- Admin Data (3)
  (gen_random_uuid(), 'Cek Absensi', 'cek_absensi', 'Pengecekan data absensi', ARRAY['admin_data'], true),
  (gen_random_uuid(), 'Cek dan Entri Laporan', 'entri_laporan', 'Pengecekan dan entri laporan', ARRAY['admin_data'], true),
  (gen_random_uuid(), 'Lainnya', 'lainnya_admin_data', 'Aktivitas admin data lainnya', ARRAY['admin_data'], true);
```

---

## Migration 2: Terminology Cleanup (Single Migration)

This migration handles all table renames, column renames, drops, and additions in a single atomic transaction.

### Migration Script

```sql
BEGIN;

-- Step 1: DROP TABLE overtime_aktivitas (FK child first)
DROP TABLE IF EXISTS overtime_aktivitas CASCADE;

-- Step 2: ALTER TABLE overtimes ADD activity columns (flat 1:1)
ALTER TABLE overtimes ADD COLUMN IF NOT EXISTS activity_type_id UUID REFERENCES activity_types(id) ON DELETE SET NULL;
ALTER TABLE overtimes ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE overtimes ADD COLUMN IF NOT EXISTS photo_urls TEXT[] DEFAULT '{}';
ALTER TABLE overtimes ADD COLUMN IF NOT EXISTS gps_lat DECIMAL(10,7);
ALTER TABLE overtimes ADD COLUMN IF NOT EXISTS gps_lng DECIMAL(10,7);
ALTER TABLE overtimes ADD CONSTRAINT overtimes_photo_urls_max3
  CHECK (array_length(photo_urls, 1) IS NULL OR array_length(photo_urls, 1) <= 3);

-- Step 3: ALTER TABLE worker_schedules RENAME TO schedules
ALTER TABLE worker_schedules RENAME TO schedules;

-- Step 4: DROP TABLE worker_assignments
DROP TABLE IF EXISTS worker_assignments CASCADE;

-- Step 5: ALTER TABLE work_reports RENAME TO activities
ALTER TABLE work_reports RENAME TO activities;

-- Step 6: ALTER TABLE activities DROP COLUMN report_type
ALTER TABLE activities DROP COLUMN IF EXISTS report_type;

-- Step 7: ALTER TABLE shifts RENAME COLUMN worker_id TO user_id
ALTER TABLE shifts RENAME COLUMN worker_id TO user_id;

-- Step 8: ALTER TABLE activities RENAME COLUMN worker_id TO user_id
ALTER TABLE activities RENAME COLUMN worker_id TO user_id;

-- Step 9: ALTER TABLE location_logs RENAME COLUMN worker_id TO user_id
ALTER TABLE location_logs RENAME COLUMN worker_id TO user_id;

-- Step 10: ALTER TABLE shifts ADD boundary flag columns
ALTER TABLE shifts ADD COLUMN IF NOT EXISTS clock_in_outside_boundary BOOLEAN DEFAULT false;
ALTER TABLE shifts ADD COLUMN IF NOT EXISTS clock_out_outside_boundary BOOLEAN DEFAULT false;

-- Step 11: Rename indexes referencing old names
ALTER INDEX IF EXISTS idx_work_reports_shift_id RENAME TO idx_activities_shift_id;
ALTER INDEX IF EXISTS idx_work_reports_activity_type_id RENAME TO idx_activities_activity_type_id;
ALTER INDEX IF EXISTS idx_work_reports_worker_id RENAME TO idx_activities_user_id;
ALTER INDEX IF EXISTS idx_shifts_worker_id RENAME TO idx_shifts_user_id;
ALTER INDEX IF EXISTS idx_location_logs_worker_id RENAME TO idx_location_logs_user_id;
ALTER INDEX IF EXISTS idx_worker_schedules_user_id RENAME TO idx_schedules_user_id;

-- Step 12: (Reserved — photo_urls constraint created fresh in Migration 4)

COMMIT;
```

### Rollback Script

```sql
BEGIN;

-- Reverse step 12: (no-op — constraint created fresh in Migration 4)

-- Reverse step 11
ALTER INDEX IF EXISTS idx_activities_shift_id RENAME TO idx_work_reports_shift_id;
ALTER INDEX IF EXISTS idx_activities_activity_type_id RENAME TO idx_work_reports_activity_type_id;
ALTER INDEX IF EXISTS idx_activities_user_id RENAME TO idx_work_reports_worker_id;
ALTER INDEX IF EXISTS idx_shifts_user_id RENAME TO idx_shifts_worker_id;
ALTER INDEX IF EXISTS idx_location_logs_user_id RENAME TO idx_location_logs_worker_id;
ALTER INDEX IF EXISTS idx_schedules_user_id RENAME TO idx_worker_schedules_user_id;

-- Reverse step 10
ALTER TABLE shifts DROP COLUMN IF EXISTS clock_in_outside_boundary;
ALTER TABLE shifts DROP COLUMN IF EXISTS clock_out_outside_boundary;

-- Reverse step 9
ALTER TABLE location_logs RENAME COLUMN user_id TO worker_id;

-- Reverse step 8
ALTER TABLE activities RENAME COLUMN user_id TO worker_id;

-- Reverse step 7
ALTER TABLE shifts RENAME COLUMN user_id TO worker_id;

-- Reverse step 6 (cannot re-add dropped column without data - flag for manual review)
-- ALTER TABLE activities ADD COLUMN report_type VARCHAR(50);

-- Reverse step 5
ALTER TABLE activities RENAME TO work_reports;

-- Reverse step 4 (cannot re-create dropped table without schema - flag for manual review)
-- CREATE TABLE worker_assignments (...);

-- Reverse step 3
ALTER TABLE schedules RENAME TO worker_schedules;

-- Reverse step 2
ALTER TABLE overtimes DROP CONSTRAINT IF EXISTS overtimes_photo_urls_max3;
ALTER TABLE overtimes DROP COLUMN IF EXISTS activity_type_id;
ALTER TABLE overtimes DROP COLUMN IF EXISTS description;
ALTER TABLE overtimes DROP COLUMN IF EXISTS photo_urls;
ALTER TABLE overtimes DROP COLUMN IF EXISTS gps_lat;
ALTER TABLE overtimes DROP COLUMN IF EXISTS gps_lng;

-- Reverse step 1 (cannot re-create dropped table - flag for manual review)
-- CREATE TABLE overtime_aktivitas (...);

COMMIT;
```

---

## Migration 3: Tasks Schema Update

```sql
-- Add rayon_id for rayon-scoped tasks
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS rayon_id UUID REFERENCES rayons(id);

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

-- Update task status constraint (6 → 4 statuses)
ALTER TABLE tasks DROP CONSTRAINT IF EXISTS tasks_status_check;
UPDATE tasks SET status = 'assigned' WHERE status IN ('accepted', 'declined');
ALTER TABLE tasks ADD CONSTRAINT tasks_status_check
  CHECK (status IN ('pending', 'assigned', 'in_progress', 'completed'));

-- Index
CREATE INDEX IF NOT EXISTS idx_tasks_rayon_id ON tasks(rayon_id);
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

## Migration 4: Activities Table Updates

Updates to the `activities` table (formerly `work_reports`) for Phase 2C features.

```sql
-- Add multi-photo support (max 3)
ALTER TABLE activities ADD COLUMN IF NOT EXISTS photo_urls TEXT[] DEFAULT '{}';

-- Make activity_type_id required
ALTER TABLE activities ALTER COLUMN activity_type_id SET NOT NULL;

-- Drop review workflow columns
ALTER TABLE activities DROP COLUMN IF EXISTS is_reviewed;
ALTER TABLE activities DROP COLUMN IF EXISTS reviewed_by;
ALTER TABLE activities DROP COLUMN IF EXISTS reviewed_at;

-- Drop legacy columns (replaced by activity_type_id and photo_urls)
ALTER TABLE activities DROP COLUMN IF EXISTS condition;
ALTER TABLE activities DROP COLUMN IF EXISTS photo_url;

-- Photo constraint
ALTER TABLE activities ADD CONSTRAINT activities_photo_urls_max3
  CHECK (array_length(photo_urls, 1) IS NULL OR array_length(photo_urls, 1) <= 3);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_activities_shift_id ON activities(shift_id);
CREATE INDEX IF NOT EXISTS idx_activities_activity_type_id ON activities(activity_type_id);

-- Data migration: single photo_url → photo_urls array
UPDATE activities
SET photo_urls = ARRAY[photo_url]
WHERE photo_url IS NOT NULL AND (photo_urls IS NULL OR photo_urls = '{}');

-- Map existing reports to activity types (before NOT NULL constraint)
UPDATE activities a
SET activity_type_id = (
  SELECT id FROM activity_types
  WHERE code = 'perawatan' AND deleted_at IS NULL
  LIMIT 1
)
WHERE activity_type_id IS NULL;
```

---

## Migration Execution Order

Migrations MUST be executed in this order due to foreign key dependencies:

1. **Migration 0:** Role enum update + add `area_id` to users (prerequisite for all other changes)
2. **Migration 1:** Activity types update (new seed data using `applicable_roles TEXT[]`)
3. **Migration 2:** Terminology cleanup (table renames, column renames, drops, additions)
4. **Migration 3:** Tasks schema update (rayon_id, status simplification, task_tags table)
5. **Migration 4:** Activities table updates (photo_urls, constraints, data migration)

---

## Migration 5: Activity Approval + Task Acceptance & Verification

```sql
BEGIN;

-- ── Activities: Approval Workflow ──────────────────
ALTER TABLE activities ADD COLUMN status VARCHAR(20) NOT NULL DEFAULT 'pending';
ALTER TABLE activities ADD CONSTRAINT activities_status_check
  CHECK (status IN ('pending', 'approved', 'rejected'));
ALTER TABLE activities ADD COLUMN reviewed_by UUID;
ALTER TABLE activities ADD CONSTRAINT FK_activities_reviewed_by
  FOREIGN KEY (reviewed_by) REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE activities ADD COLUMN reviewed_at TIMESTAMPTZ;
ALTER TABLE activities ADD COLUMN rejection_reason TEXT;

CREATE INDEX idx_activities_status ON activities(status);
CREATE INDEX idx_activities_area_status ON activities(area_id, status);

-- ── Tasks: Accept/Decline ──────────────────────────
ALTER TABLE tasks ADD COLUMN accepted_at TIMESTAMPTZ;
ALTER TABLE tasks ADD COLUMN declined_at TIMESTAMPTZ;
ALTER TABLE tasks ADD COLUMN decline_reason TEXT;

-- ── Tasks: Verification ────────────────────────────
ALTER TABLE tasks ADD COLUMN verified_by UUID;
ALTER TABLE tasks ADD CONSTRAINT FK_tasks_verified_by
  FOREIGN KEY (verified_by) REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE tasks ADD COLUMN verified_at TIMESTAMPTZ;
ALTER TABLE tasks ADD COLUMN revision_reason TEXT;

CREATE INDEX idx_tasks_verified_by ON tasks(verified_by);

-- ── Tasks: Expand status enum ──────────────────────
ALTER TABLE tasks DROP CONSTRAINT IF EXISTS tasks_status_check;
ALTER TABLE tasks ADD CONSTRAINT tasks_status_check
  CHECK (status IN ('pending', 'assigned', 'accepted', 'declined',
                    'in_progress', 'completed', 'verified', 'revision_needed'));

COMMIT;
```

### Rollback

```sql
BEGIN;
ALTER TABLE tasks DROP CONSTRAINT IF EXISTS tasks_status_check;
ALTER TABLE tasks ADD CONSTRAINT tasks_status_check
  CHECK (status IN ('pending', 'assigned', 'in_progress', 'completed'));
DROP INDEX IF EXISTS idx_tasks_verified_by;
ALTER TABLE tasks DROP COLUMN IF EXISTS revision_reason;
ALTER TABLE tasks DROP COLUMN IF EXISTS verified_at;
ALTER TABLE tasks DROP CONSTRAINT IF EXISTS FK_tasks_verified_by;
ALTER TABLE tasks DROP COLUMN IF EXISTS verified_by;
ALTER TABLE tasks DROP COLUMN IF EXISTS decline_reason;
ALTER TABLE tasks DROP COLUMN IF EXISTS declined_at;
ALTER TABLE tasks DROP COLUMN IF EXISTS accepted_at;
DROP INDEX IF EXISTS idx_activities_area_status;
DROP INDEX IF EXISTS idx_activities_status;
ALTER TABLE activities DROP COLUMN IF EXISTS rejection_reason;
ALTER TABLE activities DROP COLUMN IF EXISTS reviewed_at;
ALTER TABLE activities DROP CONSTRAINT IF EXISTS FK_activities_reviewed_by;
ALTER TABLE activities DROP COLUMN IF EXISTS reviewed_by;
ALTER TABLE activities DROP CONSTRAINT IF EXISTS activities_status_check;
ALTER TABLE activities DROP COLUMN IF EXISTS status;
COMMIT;
```

---

## Final Table Inventory (17 tables)

| # | Table | Status | Notes |
|---|-------|--------|-------|
| 1 | `users` | ALTERED | +`area_id`, role enum updated |
| 2 | `rayons` | Unchanged | |
| 3 | `area_types` | Unchanged | |
| 4 | `areas` | Unchanged | Already has `boundary_polygon` JSONB |
| 5 | `shift_definitions` | Unchanged | |
| 6 | `schedules` | RENAMED | From `worker_schedules` |
| 7 | `shifts` | ALTERED | `worker_id`→`user_id`, +2 boundary flags |
| 8 | `activities` | RENAMED+ALTERED | From `work_reports`, `worker_id`→`user_id`, -`report_type` |
| 9 | `location_logs` | ALTERED | `worker_id`→`user_id` |
| 10 | `activity_types` | Unchanged | Seeds updated (lowercase applicable_roles) |
| 11 | `area_staff_requirements` | Unchanged | |
| 12 | `special_day_overrides` | Unchanged | |
| 13 | `tasks` | ALTERED | +`rayon_id`, `area_id` nullable, 4 statuses, columns dropped |
| 14 | `task_tags` | NEW | task_id + user_id, UNIQUE constraint |
| 15 | `overtimes` | ALTERED | +5 activity columns (flat 1:1) |
| 16 | `notifications` | Unchanged | |
| 17 | `notification_tokens` | Unchanged | |

**Dropped tables (2):**
- `worker_assignments` — Fully replaced by `schedules`
- `overtime_aktivitas` — Merged into `overtimes`

---

## Entity Relationship Summary

```
users (role: 8 roles, has rayon_id AND area_id)
├── shifts (1:N via user_id)          ← RENAMED from worker_id
│   └── activities (1:N via shift_id) ← RENAMED from work_reports
├── schedules (1:N via user_id)       ← RENAMED from worker_schedules
├── tasks (N:1 as assigned_to)
├── tasks (N:1 as created_by)
├── task_tags (N:M via task_tags)
├── overtimes (1:N as user_id)
├── overtimes (1:N as approved_by)
└── location_logs (1:N via user_id)   ← RENAMED from worker_id

areas
├── shifts (1:N)
├── overtimes (1:N)
├── activities (1:N)
├── tasks (1:N, nullable in 2C)
├── users (1:N via area_id for korlap)
└── schedules (1:N)

rayons
├── areas (1:N)
├── tasks (1:N via rayon_id, NEW)
└── users (1:N via rayon_id for kepala_rayon)

activity_types (applicable_roles TEXT[] — multi-role support)
├── activities (1:N via activity_type_id)
└── overtimes (1:N via activity_type_id)  ← NEW (flat, was via overtime_aktivitas)

tasks
└── task_tags (1:N)

shifts
├── clock_in_outside_boundary (BOOLEAN)   ← NEW
└── clock_out_outside_boundary (BOOLEAN)  ← NEW
```

---

## Seed Data Updates

### Test Users (Phase 2C)

```sql
-- Update existing users' roles first (via Migration 0)
-- Then insert new test users for new roles:
INSERT INTO users (id, username, password_hash, full_name, role, rayon_id, area_id, is_active) VALUES
  (gen_random_uuid(), 'superadmin', '$2b$10$...', 'Super Admin', 'superadmin', NULL, NULL, true),
  (gen_random_uuid(), 'admin_system1', '$2b$10$...', 'Admin Sistem', 'admin_system', NULL, NULL, true),
  (gen_random_uuid(), 'admin_data1', '$2b$10$...', 'Admin Data', 'admin_data', NULL, NULL, true);
```

### TypeORM Seed File Updates Required

- `apps/be/src/database/seeds/seed-phase2.ts`: Update table references (`worker_schedules` → `schedules`, `work_reports` → `activities`), column references (`worker_id` → `user_id`)
- Remove `seedWorkerAssignments()` from `seed.service.ts`
- Update overtime seeds: flat structure (no nested aktivitas array)
- Activity type seeds: lowercase `applicable_roles` values

### Overtime Test Data (Phase 2C)

**Implementation:** Added in `seed-phase2.ts:seedOvertimes()`

```sql
-- 3 overtime records demonstrating flat structure (Phase 2C)
INSERT INTO overtimes (user_id, area_id, date, start_time, end_time, activity_type_id, description, photo_urls, gps_lat, gps_lng, status) VALUES
  -- PENDING: Awaiting approval
  (satgas_user_id, taman_bungkul_id, '2026-02-10', '17:00:00', '20:00:00', perawatan_type_id, 'Perawatan tambahan setelah jam kerja', ARRAY['https://example.com/overtime1.jpg'], -7.2756, 112.7395, 'PENDING'),
  -- APPROVED: Completed with photo evidence
  (korlap_user_id, taman_bungkul_id, '2026-02-09', '16:00:00', '19:00:00', perawatan_type_id, 'Koordinasi tim malam', ARRAY['https://example.com/overtime2.jpg'], -7.2756, 112.7395, 'APPROVED'),
  -- REJECTED: Request denied, no GPS/photo
  (satgas_user_id, taman_bungkul_id, '2026-02-08', '15:00:00', '18:00:00', perawatan_type_id, 'Request ditolak - tidak ada budget', ARRAY[]::text[], NULL, NULL, 'REJECTED');
```

**Key Points:**
- All activity fields (`activity_type_id`, `description`, `photo_urls`, `gps_lat`, `gps_lng`) are directly on the `overtimes` table
- No separate `overtime_aktivitas` table (Phase 2C flattened structure)
- Tests all 3 statuses: PENDING, APPROVED, REJECTED

### Task Test Data (Phase 2C)

**Implementation:** Added in `seed-tasks.ts`

```sql
-- 8 area-scoped tasks (assigned to specific areas)
-- status: pending (2), assigned (3), in_progress (2), completed (1)

-- 2 rayon-scoped tasks (assigned to rayon, area_id = NULL)
INSERT INTO tasks (title, description, rayon_id, area_id, assigned_by, priority, status, deadline) VALUES
  ('Audit semua area di Rayon Selatan', 'Periksa kondisi fasilitas di seluruh area dalam rayon', rayon_selatan_id, NULL, kepala_rayon_id, 'high', 'pending', NOW() + INTERVAL '7 days'),
  ('Koordinasi tim rayon untuk event weekend', 'Persiapan event di semua taman dalam rayon', rayon_selatan_id, NULL, kepala_rayon_id, 'medium', 'pending', NOW() + INTERVAL '3 days');
```

**Key Points:**
- Rayon-scoped tasks have `rayon_id` set and `area_id = NULL`
- Enables kepala_rayon to assign tasks across their entire rayon
- Tests nullable `area_id` feature from migration

### Korlap User Area Assignment

**Implementation:** Added in `seed.service.ts:seedUsers()`

```sql
-- After creating korlap1 and korlap2 users
UPDATE users
SET area_id = (SELECT id FROM areas WHERE name = 'Taman Bungkul' LIMIT 1)
WHERE username IN ('korlap1', 'korlap2');
```

**Rationale:** All korlap users must have `area_id` populated per Phase 2C spec to enable area-scoped features.

### Shift Boundary Flag Test Data

**Implementation:** Added in `seed.service.ts:seedShifts()`

```sql
-- Update one completed shift to have boundary flag
UPDATE shifts
SET clock_in_outside_boundary = true,
    clock_out_outside_boundary = false
WHERE user_id = satgas1_id AND clock_out_time IS NOT NULL LIMIT 1;
```

**Purpose:** Provides test data for monitoring dashboard boundary warnings (GPS polygon geofencing feature).

---

## Impact Assessment

- **Rows affected:** All users, shifts, activities, location_logs, schedules
- **Downtime:** Requires maintenance window (table renames lock tables briefly)
- **Post-migration:** Force all users to re-authenticate (invalidate all refresh tokens)
- **New column:** `users.area_id` added as nullable — existing korlap users need `area_id` populated manually
- **Boundary flags:** All existing shifts get `clock_in_outside_boundary = false` and `clock_out_outside_boundary = false` by default

---

**Last Updated:** 2026-02-16
