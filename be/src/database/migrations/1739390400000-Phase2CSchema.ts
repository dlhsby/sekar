import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Phase 2C Database Schema Migration
 *
 * This migration implements ALL Phase 2C database changes in a single atomic transaction:
 *
 * ROLE SYSTEM OVERHAUL (Migration 0):
 * - Update users.role CHECK constraint (7 → 8 roles)
 * - Add users.area_id column (UUID FK to areas)
 * - Migrate existing role values
 *
 * ACTIVITY TYPES UPDATE (Migration 1):
 * - Update applicable_roles values (PascalCase → lowercase)
 * - Soft-delete old activity types
 * - Insert 20 new activity types (8 satgas + 5 linmas + 4 korlap + 3 admin_data)
 *
 * TERMINOLOGY CLEANUP (Migration 2):
 * - DROP TABLE overtime_aktivitas, worker_assignments
 * - RENAME TABLE: worker_schedules → schedules, work_reports → activities
 * - RENAME COLUMN: worker_id → user_id (shifts, activities, location_logs)
 * - DROP COLUMN: activities.report_type
 * - ADD COLUMNS: overtimes (activity_type_id, description, photo_urls, gps_lat, gps_lng)
 * - ADD COLUMNS: shifts (clock_in_outside_boundary, clock_out_outside_boundary)
 * - Rename indexes to match new table/column names
 *
 * TASKS SCHEMA UPDATE (Migration 3):
 * - ADD tasks.rayon_id (UUID FK to rayons)
 * - ALTER tasks.area_id (make nullable)
 * - DROP COLUMNS: activity_type_id, completion_gps_lat, completion_gps_lng,
 *                 decline_reason, declined_at, accepted_at
 * - UPDATE TaskStatus constraint (6 → 4 values)
 * - CREATE TABLE task_tags (task_id, user_id, UNIQUE constraint)
 *
 * ACTIVITIES TABLE UPDATES (Migration 4):
 * - ADD activities.photo_urls TEXT[] (multi-photo support, max 3)
 * - ALTER activities.activity_type_id (make NOT NULL)
 * - DROP COLUMNS: is_reviewed, reviewed_by, reviewed_at, condition, photo_url
 * - Data migration: photo_url → photo_urls array
 *
 * Related: specs/phases/phase-2-c-client-feedback/database.md
 * Related: specs/architecture/decisions/ADR-009-phase2c-role-system-overhaul.md
 * Related: specs/architecture/decisions/ADR-010-phase2c-terminology-cleanup.md
 */
export class Phase2CSchema1739390400000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    console.log('Starting Phase 2C database migration...');
    console.log(
      'This migration includes role system overhaul, terminology cleanup, and schema refinements.',
    );
    console.log('');

    // ==========================================
    // MIGRATION 0: ROLE ENUM UPDATE + USERS SCHEMA
    // ==========================================
    console.log('[Migration 0] Updating role system and users table...');

    // Step 1: Drop old role constraint
    console.log('  - Dropping old role constraint...');
    await queryRunner.query(`
      ALTER TABLE users DROP CONSTRAINT IF EXISTS chk_users_role;
    `);

    // Step 2: Add area_id column
    console.log('  - Adding area_id column to users...');
    await queryRunner.query(`
      ALTER TABLE users ADD COLUMN IF NOT EXISTS area_id UUID;
    `);
    await queryRunner.query(`
      ALTER TABLE users ADD CONSTRAINT FK_users_area_id
        FOREIGN KEY (area_id) REFERENCES areas(id)
        ON DELETE SET NULL;
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_users_area_id ON users(area_id);
    `);

    // Step 3: Migrate existing role values
    console.log('  - Migrating existing role values...');
    await queryRunner.query(`
      UPDATE users SET role = 'satgas' WHERE role = 'worker';
    `);
    await queryRunner.query(`
      UPDATE users SET role = 'korlap' WHERE role IN ('koordinator_lapangan', 'supervisor');
    `);
    await queryRunner.query(`
      UPDATE users SET role = 'superadmin' WHERE role = 'admin';
    `);

    // Step 4: Add new role constraint with 8 roles
    console.log('  - Adding new role constraint (8 roles)...');
    await queryRunner.query(`
      ALTER TABLE users ADD CONSTRAINT chk_users_role CHECK (
        role IN ('satgas', 'linmas', 'korlap', 'admin_data', 'kepala_rayon', 'top_management', 'admin_system', 'superadmin')
      );
    `);

    console.log('✅ [Migration 0] Role system update completed.');
    console.log('');

    // ==========================================
    // MIGRATION 1: ACTIVITY TYPES UPDATE
    // ==========================================
    console.log('[Migration 1] Updating activity types...');

    // Step 1: Update existing applicable_roles from PascalCase to lowercase
    console.log('  - Converting applicable_roles to lowercase...');
    await queryRunner.query(`
      UPDATE activity_types SET applicable_roles = ARRAY(
        SELECT CASE
          WHEN elem = 'Worker' THEN 'satgas'
          WHEN elem = 'Linmas' THEN 'linmas'
          ELSE lower(elem)
        END
        FROM unnest(applicable_roles) AS elem
      ) WHERE applicable_roles IS NOT NULL;
    `);

    // Step 2: Update activity_types CHECK constraint to allow new roles
    console.log('  - Updating activity_types role constraint...');
    await queryRunner.query(`
      ALTER TABLE activity_types DROP CONSTRAINT IF EXISTS chk_activity_types_roles;
    `);
    await queryRunner.query(`
      ALTER TABLE activity_types ADD CONSTRAINT chk_activity_types_roles CHECK (
        applicable_roles <@ ARRAY['satgas', 'linmas', 'korlap', 'admin_data']::TEXT[]
      );
    `);

    // Step 3: Soft-delete old activity types
    console.log('  - Soft-deleting old activity types...');
    await queryRunner.query(`
      UPDATE activity_types SET deleted_at = NOW() WHERE deleted_at IS NULL;
    `);

    // Step 4: Insert 20 new activity types
    console.log('  - Inserting 20 new activity types...');
    await queryRunner.query(`
      INSERT INTO activity_types (name, code, description, applicable_roles, is_active) VALUES
        -- Satgas (8)
        ('Perawatan', 'perawatan', 'Perawatan tanaman dan area', ARRAY['satgas'], true),
        ('Penanaman', 'penanaman', 'Penanaman tanaman baru', ARRAY['satgas'], true),
        ('Perantingan', 'perantingan', 'Pemangkasan ranting pohon', ARRAY['satgas'], true),
        ('Penyiraman', 'penyiraman', 'Penyiraman tanaman', ARRAY['satgas'], true),
        ('Penyulaman', 'penyulaman', 'Penggantian tanaman mati', ARRAY['satgas'], true),
        ('Potong Rumput', 'potong_rumput', 'Pemotongan rumput', ARRAY['satgas'], true),
        ('Angkut Sampah', 'angkut_sampah', 'Pengangkutan sampah', ARRAY['satgas'], true),
        ('Lainnya', 'lainnya_satgas', 'Aktivitas satgas lainnya', ARRAY['satgas'], true),
        -- Linmas (5)
        ('Patroli', 'patroli', 'Patroli keamanan area', ARRAY['linmas'], true),
        ('Insiden', 'insiden', 'Pelaporan insiden keamanan', ARRAY['linmas'], true),
        ('Memeriksa Kondisi Fasilitas', 'periksa_fasilitas', 'Pemeriksaan kondisi fasilitas', ARRAY['linmas'], true),
        ('Halau PKL', 'halau_pkl', 'Penertiban pedagang kaki lima', ARRAY['linmas'], true),
        ('Lainnya', 'lainnya_linmas', 'Aktivitas linmas lainnya', ARRAY['linmas'], true),
        -- Korlap (4)
        ('Pengecekan Kendaraan', 'cek_kendaraan', 'Pemeriksaan kendaraan operasional', ARRAY['korlap'], true),
        ('Patroli', 'patroli_korlap', 'Patroli area kerja', ARRAY['korlap'], true),
        ('Pengecekan Alat', 'cek_alat', 'Pemeriksaan peralatan kerja', ARRAY['korlap'], true),
        ('Lainnya', 'lainnya_korlap', 'Aktivitas korlap lainnya', ARRAY['korlap'], true),
        -- Admin Data (3)
        ('Cek Absensi', 'cek_absensi', 'Pengecekan data absensi', ARRAY['admin_data'], true),
        ('Cek dan Entri Laporan', 'entri_laporan', 'Pengecekan dan entri laporan', ARRAY['admin_data'], true),
        ('Lainnya', 'lainnya_admin_data', 'Aktivitas admin data lainnya', ARRAY['admin_data'], true);
    `);

    console.log('✅ [Migration 1] Activity types update completed (20 new types).');
    console.log('');

    // ==========================================
    // MIGRATION 2: TERMINOLOGY CLEANUP
    // ==========================================
    console.log('[Migration 2] Terminology cleanup (table/column renames, drops)...');

    // Create overtimes + overtime_aktivitas if they don't exist yet
    // (Phase 2 migration omitted these tables; this ensures fresh-DB compatibility)
    console.log('  - Ensuring overtimes table exists (fresh-DB compatibility)...');
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS overtimes (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        area_id UUID REFERENCES areas(id) ON DELETE SET NULL,
        date DATE,
        start_time TIME,
        end_time TIME,
        status VARCHAR(20) NOT NULL DEFAULT 'pending',
        approved_by UUID REFERENCES users(id) ON DELETE SET NULL,
        approved_at TIMESTAMPTZ,
        rejection_reason TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW(),
        CONSTRAINT chk_overtimes_status CHECK (status IN ('pending', 'approved', 'rejected'))
      );
    `);
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS overtime_aktivitas (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        overtime_id UUID NOT NULL REFERENCES overtimes(id) ON DELETE CASCADE,
        activity_type_id UUID,
        description TEXT,
        photo_urls TEXT[] DEFAULT '{}',
        gps_lat DECIMAL(10,8),
        gps_lng DECIMAL(11,8),
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    // Step 1: Migrate overtime_aktivitas data to overtimes (flat 1:1), then DROP
    console.log('  - Adding activity columns to overtimes table...');
    await queryRunner.query(`
      ALTER TABLE overtimes ADD COLUMN IF NOT EXISTS activity_type_id UUID;
    `);
    await queryRunner.query(`
      ALTER TABLE overtimes ADD CONSTRAINT FK_overtimes_activity_type
        FOREIGN KEY (activity_type_id) REFERENCES activity_types(id)
        ON DELETE RESTRICT;
    `);
    await queryRunner.query(`
      ALTER TABLE overtimes ADD COLUMN IF NOT EXISTS description TEXT;
    `);
    await queryRunner.query(`
      ALTER TABLE overtimes ADD COLUMN IF NOT EXISTS photo_urls TEXT[] DEFAULT '{}';
    `);
    await queryRunner.query(`
      ALTER TABLE overtimes ADD COLUMN IF NOT EXISTS gps_lat DECIMAL(10,8);
    `);
    await queryRunner.query(`
      ALTER TABLE overtimes ADD COLUMN IF NOT EXISTS gps_lng DECIMAL(11,8);
    `);
    await queryRunner.query(`
      ALTER TABLE overtimes ADD CONSTRAINT overtimes_photo_urls_max3
        CHECK (array_length(photo_urls, 1) IS NULL OR array_length(photo_urls, 1) <= 3);
    `);

    // Migrate existing overtime_aktivitas data before dropping
    console.log('  - Migrating overtime_aktivitas data to flat overtimes...');
    await queryRunner.query(`
      UPDATE overtimes o
      SET
        activity_type_id = oa.activity_type_id,
        description = oa.description,
        photo_urls = COALESCE(oa.photo_urls, '{}'),
        gps_lat = oa.gps_lat,
        gps_lng = oa.gps_lng
      FROM (
        SELECT DISTINCT ON (overtime_id) *
        FROM overtime_aktivitas
        ORDER BY overtime_id, created_at ASC
      ) oa
      WHERE o.id = oa.overtime_id;
    `);

    // Set NOT NULL on activity_type_id after data migration
    console.log('  - Setting activity_type_id NOT NULL on overtimes...');
    await queryRunner.query(`
      UPDATE overtimes SET activity_type_id = (SELECT id FROM activity_types LIMIT 1)
      WHERE activity_type_id IS NULL;
    `);
    await queryRunner.query(`
      ALTER TABLE overtimes ALTER COLUMN activity_type_id SET NOT NULL;
    `);

    // Now safe to drop overtime_aktivitas
    console.log('  - Dropping overtime_aktivitas table...');
    await queryRunner.query(`DROP TABLE IF EXISTS overtime_aktivitas CASCADE;`);

    // Add index on overtimes.activity_type_id
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_overtimes_activity_type_id ON overtimes(activity_type_id);
    `);

    // Step 3: RENAME TABLE worker_schedules → schedules
    console.log('  - Renaming worker_schedules → schedules...');
    await queryRunner.query(`ALTER TABLE worker_schedules RENAME TO schedules;`);

    // Step 4: DROP TABLE worker_assignments
    console.log('  - Dropping worker_assignments table...');
    await queryRunner.query(`DROP TABLE IF EXISTS worker_assignments CASCADE;`);

    // Step 5: RENAME TABLE work_reports → activities
    console.log('  - Renaming work_reports → activities...');
    await queryRunner.query(`ALTER TABLE work_reports RENAME TO activities;`);

    // Step 6: DROP COLUMN activities.report_type
    console.log('  - Dropping activities.report_type column...');
    await queryRunner.query(`ALTER TABLE activities DROP COLUMN IF EXISTS report_type;`);

    // Step 7-9: RENAME COLUMN worker_id → user_id
    console.log('  - Renaming worker_id → user_id in shifts, activities, location_logs...');
    await queryRunner.query(`
      ALTER TABLE shifts RENAME COLUMN worker_id TO user_id;
    `);
    await queryRunner.query(`
      ALTER TABLE activities RENAME COLUMN worker_id TO user_id;
    `);
    await queryRunner.query(`
      ALTER TABLE location_logs RENAME COLUMN worker_id TO user_id;
    `);

    // Step 10: ALTER TABLE shifts - Add boundary flag columns
    console.log('  - Adding boundary flags to shifts table...');
    await queryRunner.query(`
      ALTER TABLE shifts ADD COLUMN IF NOT EXISTS clock_in_outside_boundary BOOLEAN DEFAULT false;
    `);
    await queryRunner.query(`
      ALTER TABLE shifts ADD COLUMN IF NOT EXISTS clock_out_outside_boundary BOOLEAN DEFAULT false;
    `);

    // Step 11: Rename indexes to match new table/column names
    console.log('  - Renaming indexes...');
    await queryRunner.query(
      `ALTER INDEX IF EXISTS idx_work_reports_shift_id RENAME TO idx_activities_shift_id;`,
    );
    await queryRunner.query(
      `ALTER INDEX IF EXISTS idx_work_reports_activity_type RENAME TO idx_activities_activity_type_id;`,
    );
    await queryRunner.query(
      `ALTER INDEX IF EXISTS idx_work_reports_worker_id RENAME TO idx_activities_user_id;`,
    );
    await queryRunner.query(
      `ALTER INDEX IF EXISTS idx_shifts_worker_id RENAME TO idx_shifts_user_id;`,
    );
    await queryRunner.query(
      `ALTER INDEX IF EXISTS idx_location_logs_worker_id RENAME TO idx_location_logs_user_id;`,
    );
    await queryRunner.query(
      `ALTER INDEX IF EXISTS idx_worker_schedules_user RENAME TO idx_schedules_user_id;`,
    );
    await queryRunner.query(
      `ALTER INDEX IF EXISTS idx_worker_schedules_date RENAME TO idx_schedules_date;`,
    );
    await queryRunner.query(
      `ALTER INDEX IF EXISTS idx_worker_schedules_area RENAME TO idx_schedules_area;`,
    );

    console.log('✅ [Migration 2] Terminology cleanup completed.');
    console.log('');

    // ==========================================
    // MIGRATION 3: TASKS SCHEMA UPDATE
    // ==========================================
    console.log('[Migration 3] Updating tasks schema...');

    // Create tasks table if it doesn't exist yet
    // (Phase 2 migration omitted this table; this ensures fresh-DB compatibility)
    console.log('  - Ensuring tasks table exists (fresh-DB compatibility)...');
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS tasks (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        title VARCHAR(255) NOT NULL,
        description TEXT,
        status VARCHAR(20) NOT NULL DEFAULT 'pending',
        priority VARCHAR(20) NOT NULL DEFAULT 'medium',
        deadline TIMESTAMPTZ,
        area_id UUID REFERENCES areas(id) ON DELETE SET NULL,
        assigned_to UUID REFERENCES users(id) ON DELETE SET NULL,
        created_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    // Add rayon_id for rayon-scoped tasks
    console.log('  - Adding rayon_id column to tasks...');
    await queryRunner.query(`
      ALTER TABLE tasks ADD COLUMN IF NOT EXISTS rayon_id UUID;
    `);
    await queryRunner.query(`
      ALTER TABLE tasks ADD CONSTRAINT FK_tasks_rayon_id
        FOREIGN KEY (rayon_id) REFERENCES rayons(id)
        ON DELETE SET NULL;
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_tasks_rayon_id ON tasks(rayon_id);
    `);

    // Make area_id nullable (tasks can be rayon-scoped without specific area)
    console.log('  - Making tasks.area_id nullable...');
    await queryRunner.query(`
      ALTER TABLE tasks ALTER COLUMN area_id DROP NOT NULL;
    `);

    // Remove activity_type_id (tasks don't have activity types in 2C)
    console.log('  - Dropping tasks.activity_type_id column...');
    await queryRunner.query(`
      ALTER TABLE tasks DROP CONSTRAINT IF EXISTS FK_tasks_activity_type;
    `);
    await queryRunner.query(`
      ALTER TABLE tasks DROP COLUMN IF EXISTS activity_type_id;
    `);

    // Remove GPS-related completion fields
    console.log('  - Dropping GPS completion fields...');
    await queryRunner.query(`
      ALTER TABLE tasks DROP COLUMN IF EXISTS completion_gps_lat;
    `);
    await queryRunner.query(`
      ALTER TABLE tasks DROP COLUMN IF EXISTS completion_gps_lng;
    `);

    // Remove accept/decline fields (simplified workflow)
    console.log('  - Dropping accept/decline workflow columns...');
    await queryRunner.query(`
      ALTER TABLE tasks DROP COLUMN IF EXISTS decline_reason;
    `);
    await queryRunner.query(`
      ALTER TABLE tasks DROP COLUMN IF EXISTS declined_at;
    `);
    await queryRunner.query(`
      ALTER TABLE tasks DROP COLUMN IF EXISTS accepted_at;
    `);

    // Update task status constraint (6 → 4 statuses)
    console.log('  - Updating TaskStatus constraint (6 → 4 values)...');
    await queryRunner.query(`
      ALTER TABLE tasks DROP CONSTRAINT IF EXISTS tasks_status_check;
    `);
    // Migrate existing statuses
    await queryRunner.query(`
      UPDATE tasks SET status = 'assigned' WHERE status IN ('accepted', 'declined');
    `);
    await queryRunner.query(`
      ALTER TABLE tasks ADD CONSTRAINT tasks_status_check
        CHECK (status IN ('pending', 'assigned', 'in_progress', 'completed'));
    `);

    // Create task_tags table
    console.log('  - Creating task_tags table...');
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS task_tags (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        task_id UUID NOT NULL,
        user_id UUID NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        CONSTRAINT FK_task_tags_task_id
          FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
        CONSTRAINT FK_task_tags_user_id
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        CONSTRAINT UQ_task_tags_task_user UNIQUE(task_id, user_id)
      );
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_task_tags_task_id ON task_tags(task_id);
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_task_tags_user_id ON task_tags(user_id);
    `);

    console.log('✅ [Migration 3] Tasks schema update completed.');
    console.log('');

    // ==========================================
    // MIGRATION 4: ACTIVITIES TABLE UPDATES
    // ==========================================
    console.log('[Migration 4] Updating activities table...');

    // Add multi-photo support (max 3)
    console.log('  - Adding photo_urls array column...');
    await queryRunner.query(`
      ALTER TABLE activities ADD COLUMN IF NOT EXISTS photo_urls TEXT[] DEFAULT '{}';
    `);

    // Data migration: single photo_url → photo_urls array (before dropping photo_url)
    console.log('  - Migrating photo_url → photo_urls...');
    await queryRunner.query(`
      UPDATE activities
      SET photo_urls = ARRAY[photo_url]
      WHERE photo_url IS NOT NULL AND (photo_urls IS NULL OR photo_urls = '{}');
    `);

    // Map existing activities to activity types (before NOT NULL constraint)
    console.log('  - Mapping existing activities to activity types...');
    await queryRunner.query(`
      UPDATE activities a
      SET activity_type_id = (
        SELECT id FROM activity_types
        WHERE code = 'perawatan' AND deleted_at IS NULL
        LIMIT 1
      )
      WHERE activity_type_id IS NULL;
    `);

    // Make activity_type_id required
    console.log('  - Making activity_type_id required...');
    await queryRunner.query(`
      ALTER TABLE activities ALTER COLUMN activity_type_id SET NOT NULL;
    `);

    // Drop review workflow columns
    console.log('  - Dropping review workflow columns...');
    await queryRunner.query(`
      ALTER TABLE activities DROP COLUMN IF EXISTS is_reviewed;
    `);
    await queryRunner.query(`
      ALTER TABLE activities DROP COLUMN IF EXISTS reviewed_by;
    `);
    await queryRunner.query(`
      ALTER TABLE activities DROP COLUMN IF EXISTS reviewed_at;
    `);

    // Drop legacy columns
    console.log('  - Dropping legacy columns...');
    await queryRunner.query(`
      ALTER TABLE activities DROP COLUMN IF EXISTS condition;
    `);
    await queryRunner.query(`
      ALTER TABLE activities DROP COLUMN IF EXISTS photo_url;
    `);

    // Photo constraint
    console.log('  - Adding photo_urls max 3 constraint...');
    await queryRunner.query(`
      ALTER TABLE activities ADD CONSTRAINT activities_photo_urls_max3
        CHECK (array_length(photo_urls, 1) IS NULL OR array_length(photo_urls, 1) <= 3);
    `);

    // Ensure indexes exist
    console.log('  - Ensuring indexes exist...');
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_activities_shift_id ON activities(shift_id);
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_activities_activity_type_id ON activities(activity_type_id);
    `);

    console.log('✅ [Migration 4] Activities table update completed.');
    console.log('');

    // ==========================================
    // FINAL SUMMARY
    // ==========================================
    console.log('✅ Phase 2C database migration completed successfully!');
    console.log('');
    console.log('Summary of changes:');
    console.log('  ✅ [M0] Role system: 7 → 8 roles, added users.area_id');
    console.log('  ✅ [M1] Activity types: PascalCase → lowercase, 10 → 20 types');
    console.log('  ✅ [M2] Terminology: 2 tables renamed, 2 tables dropped, 3 column renames');
    console.log(
      '  ✅ [M3] Tasks: +rayon_id, area_id nullable, 6 → 4 statuses, task_tags table created',
    );
    console.log(
      '  ✅ [M4] Activities: multi-photo support, activity_type_id required, legacy columns dropped',
    );
    console.log('');
    console.log('Final table count: 17 tables');
    console.log('');
    console.log('⚠️  IMPORTANT POST-MIGRATION STEPS:');
    console.log('   1. Update seed data (npm run seed)');
    console.log('   2. Invalidate all refresh tokens (force re-authentication)');
    console.log('   3. Manually populate users.area_id for existing korlap users');
    console.log('   4. Run backend tests to verify entity changes');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    console.log('Rolling back Phase 2C database migration...');
    console.log('⚠️  WARNING: Some rollbacks cannot restore dropped data.');
    console.log('');

    // ==========================================
    // ROLLBACK MIGRATION 4: ACTIVITIES TABLE
    // ==========================================
    console.log('[Rollback M4] Reverting activities table updates...');

    // Drop constraints and indexes
    await queryRunner.query(`
      DROP INDEX IF EXISTS idx_activities_activity_type_id;
    `);
    await queryRunner.query(`
      DROP INDEX IF EXISTS idx_activities_shift_id;
    `);
    await queryRunner.query(`
      ALTER TABLE activities DROP CONSTRAINT IF EXISTS activities_photo_urls_max3;
    `);

    // Cannot restore dropped columns (flag for manual review)
    console.log(
      '  ⚠️  Cannot restore: photo_url, condition, is_reviewed, reviewed_by, reviewed_at',
    );

    // Revert activity_type_id to nullable
    await queryRunner.query(`
      ALTER TABLE activities ALTER COLUMN activity_type_id DROP NOT NULL;
    `);

    // Drop photo_urls
    await queryRunner.query(`
      ALTER TABLE activities DROP COLUMN IF EXISTS photo_urls;
    `);

    // ==========================================
    // ROLLBACK MIGRATION 3: TASKS SCHEMA
    // ==========================================
    console.log('[Rollback M3] Reverting tasks schema updates...');

    // Drop task_tags table
    await queryRunner.query(`DROP TABLE IF EXISTS task_tags CASCADE;`);

    // Revert status constraint (4 → 6 values)
    await queryRunner.query(`
      ALTER TABLE tasks DROP CONSTRAINT IF EXISTS tasks_status_check;
    `);
    await queryRunner.query(`
      ALTER TABLE tasks ADD CONSTRAINT tasks_status_check
        CHECK (status IN ('pending', 'assigned', 'accepted', 'in_progress', 'completed', 'declined'));
    `);

    // Cannot restore dropped columns (flag for manual review)
    console.log(
      '  ⚠️  Cannot restore: accepted_at, declined_at, decline_reason, completion_gps_lat, completion_gps_lng, activity_type_id',
    );

    // Revert area_id to NOT NULL
    await queryRunner.query(`
      ALTER TABLE tasks ALTER COLUMN area_id SET NOT NULL;
    `);

    // Drop rayon_id
    await queryRunner.query(`
      DROP INDEX IF EXISTS idx_tasks_rayon_id;
    `);
    await queryRunner.query(`
      ALTER TABLE tasks DROP CONSTRAINT IF EXISTS FK_tasks_rayon_id;
    `);
    await queryRunner.query(`
      ALTER TABLE tasks DROP COLUMN IF EXISTS rayon_id;
    `);

    // ==========================================
    // ROLLBACK MIGRATION 2: TERMINOLOGY CLEANUP
    // ==========================================
    console.log('[Rollback M2] Reverting terminology cleanup...');

    // Reverse index renames
    await queryRunner.query(
      `ALTER INDEX IF EXISTS idx_schedules_area RENAME TO idx_worker_schedules_area;`,
    );
    await queryRunner.query(
      `ALTER INDEX IF EXISTS idx_schedules_date RENAME TO idx_worker_schedules_date;`,
    );
    await queryRunner.query(
      `ALTER INDEX IF EXISTS idx_schedules_user_id RENAME TO idx_worker_schedules_user;`,
    );
    await queryRunner.query(
      `ALTER INDEX IF EXISTS idx_location_logs_user_id RENAME TO idx_location_logs_worker_id;`,
    );
    await queryRunner.query(
      `ALTER INDEX IF EXISTS idx_shifts_user_id RENAME TO idx_shifts_worker_id;`,
    );
    await queryRunner.query(
      `ALTER INDEX IF EXISTS idx_activities_user_id RENAME TO idx_work_reports_worker_id;`,
    );
    await queryRunner.query(
      `ALTER INDEX IF EXISTS idx_activities_activity_type_id RENAME TO idx_work_reports_activity_type;`,
    );
    await queryRunner.query(
      `ALTER INDEX IF EXISTS idx_activities_shift_id RENAME TO idx_work_reports_shift_id;`,
    );

    // Drop boundary flags
    await queryRunner.query(`
      ALTER TABLE shifts DROP COLUMN IF EXISTS clock_in_outside_boundary;
    `);
    await queryRunner.query(`
      ALTER TABLE shifts DROP COLUMN IF EXISTS clock_out_outside_boundary;
    `);

    // Reverse column renames
    await queryRunner.query(`
      ALTER TABLE location_logs RENAME COLUMN user_id TO worker_id;
    `);
    await queryRunner.query(`
      ALTER TABLE activities RENAME COLUMN user_id TO worker_id;
    `);
    await queryRunner.query(`
      ALTER TABLE shifts RENAME COLUMN user_id TO worker_id;
    `);

    // Cannot re-add report_type without data
    console.log('  ⚠️  Cannot restore: activities.report_type column');

    // Reverse table renames
    await queryRunner.query(`ALTER TABLE activities RENAME TO work_reports;`);

    // Cannot re-create worker_assignments table
    console.log('  ⚠️  Cannot restore: worker_assignments table (schema unknown)');

    await queryRunner.query(`ALTER TABLE schedules RENAME TO worker_schedules;`);

    // Drop overtimes columns
    await queryRunner.query(`
      ALTER TABLE overtimes DROP CONSTRAINT IF EXISTS overtimes_photo_urls_max3;
    `);
    await queryRunner.query(`
      ALTER TABLE overtimes DROP COLUMN IF EXISTS gps_lng;
    `);
    await queryRunner.query(`
      ALTER TABLE overtimes DROP COLUMN IF EXISTS gps_lat;
    `);
    await queryRunner.query(`
      ALTER TABLE overtimes DROP COLUMN IF EXISTS photo_urls;
    `);
    await queryRunner.query(`
      ALTER TABLE overtimes DROP COLUMN IF EXISTS description;
    `);
    await queryRunner.query(`
      ALTER TABLE overtimes DROP CONSTRAINT IF EXISTS FK_overtimes_activity_type;
    `);
    await queryRunner.query(`
      ALTER TABLE overtimes DROP COLUMN IF EXISTS activity_type_id;
    `);

    // Cannot re-create overtime_aktivitas table
    console.log('  ⚠️  Cannot restore: overtime_aktivitas table (schema unknown)');

    // ==========================================
    // ROLLBACK MIGRATION 1: ACTIVITY TYPES
    // ==========================================
    console.log('[Rollback M1] Reverting activity types updates...');

    // Delete new activity types
    await queryRunner.query(`
      DELETE FROM activity_types WHERE code IN (
        'perawatan', 'penanaman', 'perantingan', 'penyiraman', 'penyulaman', 'potong_rumput', 'angkut_sampah', 'lainnya_satgas',
        'patroli', 'insiden', 'periksa_fasilitas', 'halau_pkl', 'lainnya_linmas',
        'cek_kendaraan', 'patroli_korlap', 'cek_alat', 'lainnya_korlap',
        'cek_absensi', 'entri_laporan', 'lainnya_admin_data'
      );
    `);

    // Un-soft-delete old activity types
    await queryRunner.query(`
      UPDATE activity_types SET deleted_at = NULL WHERE deleted_at IS NOT NULL;
    `);

    // Revert activity_types constraint
    await queryRunner.query(`
      ALTER TABLE activity_types DROP CONSTRAINT IF EXISTS chk_activity_types_roles;
    `);
    await queryRunner.query(`
      ALTER TABLE activity_types ADD CONSTRAINT chk_activity_types_roles CHECK (
        applicable_roles <@ ARRAY['Worker', 'Linmas']::TEXT[]
      );
    `);

    // Revert applicable_roles to PascalCase
    await queryRunner.query(`
      UPDATE activity_types SET applicable_roles = ARRAY(
        SELECT CASE
          WHEN elem = 'satgas' THEN 'Worker'
          WHEN elem = 'linmas' THEN 'Linmas'
          ELSE INITCAP(elem)
        END
        FROM unnest(applicable_roles) AS elem
      ) WHERE applicable_roles IS NOT NULL;
    `);

    // ==========================================
    // ROLLBACK MIGRATION 0: ROLE SYSTEM
    // ==========================================
    console.log('[Rollback M0] Reverting role system changes...');

    // Drop new role constraint
    await queryRunner.query(`
      ALTER TABLE users DROP CONSTRAINT IF EXISTS chk_users_role;
    `);

    // Revert role migrations
    await queryRunner.query(`
      UPDATE users SET role = 'admin' WHERE role = 'superadmin';
    `);
    await queryRunner.query(`
      UPDATE users SET role = 'koordinator_lapangan' WHERE role = 'korlap';
    `);
    await queryRunner.query(`
      UPDATE users SET role = 'worker' WHERE role = 'satgas';
    `);

    // Delete users with new-only roles
    await queryRunner.query(`
      DELETE FROM users WHERE role IN ('admin_data', 'admin_system');
    `);

    // Re-add old role constraint (7 roles)
    await queryRunner.query(`
      ALTER TABLE users ADD CONSTRAINT chk_users_role CHECK (
        role IN ('worker', 'supervisor', 'admin', 'top_management', 'kepala_rayon', 'koordinator_lapangan', 'linmas')
      );
    `);

    // Drop area_id column
    await queryRunner.query(`
      DROP INDEX IF EXISTS idx_users_area_id;
    `);
    await queryRunner.query(`
      ALTER TABLE users DROP CONSTRAINT IF EXISTS FK_users_area_id;
    `);
    await queryRunner.query(`
      ALTER TABLE users DROP COLUMN IF EXISTS area_id;
    `);

    console.log('✅ Phase 2C database migration rollback completed!');
    console.log('');
    console.log('⚠️  WARNING: Some data could not be restored (see warnings above).');
    console.log('   Manual review and data recovery may be required.');
  }
}
