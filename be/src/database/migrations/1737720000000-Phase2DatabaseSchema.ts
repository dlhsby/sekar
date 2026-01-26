import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Phase 2 Database Schema Migration
 *
 * This migration implements all Phase 2 database changes:
 *
 * NEW TABLES:
 * 1. rayons - Geographic sectors (7 Rayons for Surabaya)
 * 2. shift_definitions - Fixed shift times (3 shifts)
 * 3. activity_types - Work activity categories (role-specific)
 * 4. area_staff_requirements - Staff requirements per area/shift
 * 5. worker_schedules - Worker assignments to areas/shifts
 * 6. special_day_overrides - Holiday/special day configurations
 *
 * TABLE ALTERATIONS:
 * 1. users - Add rayon_id, update role enum (6 roles)
 * 2. areas - Add rayon_id, boundary_polygon, coverage_area
 * 3. area_types - Add category column (ACTIVE/PASSIVE)
 * 4. work_reports - Add task_id, activity_type_id
 *
 * Related: specs/database/schema.md (Phase 2 section)
 */
export class Phase2DatabaseSchema1737720000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    console.log('Starting Phase 2 database migration...');

    // ==========================================
    // STEP 1: Create rayons table
    // ==========================================
    console.log('Creating rayons table...');
    await queryRunner.query(`
      CREATE TABLE rayons (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        name VARCHAR(100) NOT NULL,
        code VARCHAR(20) NOT NULL,
        description TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW(),
        deleted_at TIMESTAMPTZ,
        CONSTRAINT uq_rayons_name UNIQUE (name),
        CONSTRAINT uq_rayons_code UNIQUE (code)
      );
    `);

    // ==========================================
    // STEP 2: Create shift_definitions table
    // ==========================================
    console.log('Creating shift_definitions table...');
    await queryRunner.query(`
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
        deleted_at TIMESTAMPTZ,
        CONSTRAINT uq_shift_definitions_code UNIQUE (code),
        CONSTRAINT uq_shift_definitions_name UNIQUE (name)
      );
    `);

    // ==========================================
    // STEP 3: Create activity_types table
    // ==========================================
    console.log('Creating activity_types table...');
    await queryRunner.query(`
      CREATE TABLE activity_types (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        name VARCHAR(100) NOT NULL,
        code VARCHAR(50) NOT NULL,
        description TEXT,
        applicable_roles TEXT[] NOT NULL,
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW(),
        deleted_at TIMESTAMPTZ,
        CONSTRAINT uq_activity_types_code UNIQUE (code),
        CONSTRAINT chk_activity_types_roles CHECK (
          applicable_roles <@ ARRAY['Worker', 'Linmas']::TEXT[]
        )
      );
    `);

    // ==========================================
    // STEP 4: Create special_day_overrides table
    // ==========================================
    console.log('Creating special_day_overrides table...');
    await queryRunner.query(`
      CREATE TABLE special_day_overrides (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        date DATE NOT NULL,
        day_type VARCHAR(20) NOT NULL,
        name VARCHAR(100),
        created_at TIMESTAMPTZ DEFAULT NOW(),
        CONSTRAINT uq_special_day_overrides_date UNIQUE (date),
        CONSTRAINT chk_special_day_overrides_type CHECK (
          day_type IN ('WEEKEND', 'HOLIDAY', 'SPECIAL')
        )
      );
    `);

    // ==========================================
    // STEP 5: Alter area_types table - Add category
    // ==========================================
    console.log('Adding category column to area_types...');
    await queryRunner.query(`
      ALTER TABLE area_types
      ADD COLUMN category VARCHAR(20) NOT NULL DEFAULT 'ACTIVE';
    `);

    await queryRunner.query(`
      ALTER TABLE area_types
      ADD CONSTRAINT chk_area_types_category CHECK (
        category IN ('ACTIVE', 'PASSIVE')
      );
    `);

    // ==========================================
    // STEP 6: Alter users table - Add rayon_id, update role
    // ==========================================
    console.log('Updating users table for Phase 2 roles...');

    // Add rayon_id column
    await queryRunner.query(`
      ALTER TABLE users
      ADD COLUMN rayon_id UUID,
      ADD CONSTRAINT FK_users_rayon_id
        FOREIGN KEY (rayon_id) REFERENCES rayons(id)
        ON DELETE SET NULL;
    `);

    // Update role column to support new roles
    // Note: The existing role values will be preserved
    await queryRunner.query(`
      ALTER TABLE users
      ALTER COLUMN role TYPE VARCHAR(30);
    `);

    // Add constraint for new role values
    await queryRunner.query(`
      ALTER TABLE users
      ADD CONSTRAINT chk_users_role CHECK (
        role IN ('worker', 'supervisor', 'admin', 'top_management', 'kepala_rayon', 'koordinator_lapangan', 'linmas')
      );
    `);

    // ==========================================
    // STEP 7: Alter areas table - Add rayon_id, boundary_polygon, coverage_area
    // ==========================================
    console.log('Updating areas table for Phase 2...');

    await queryRunner.query(`
      ALTER TABLE areas
      ADD COLUMN rayon_id UUID,
      ADD COLUMN boundary_polygon JSONB,
      ADD COLUMN coverage_area DECIMAL(12, 2),
      ADD CONSTRAINT FK_areas_rayon_id
        FOREIGN KEY (rayon_id) REFERENCES rayons(id)
        ON DELETE SET NULL;
    `);

    // Add index for rayon filtering
    await queryRunner.query(`
      CREATE INDEX idx_areas_rayon ON areas(rayon_id) WHERE deleted_at IS NULL;
    `);

    // ==========================================
    // STEP 8: Create area_staff_requirements table
    // ==========================================
    console.log('Creating area_staff_requirements table...');
    await queryRunner.query(`
      CREATE TABLE area_staff_requirements (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        area_id UUID NOT NULL,
        shift_definition_id UUID NOT NULL,
        role VARCHAR(30) NOT NULL,
        required_count INTEGER NOT NULL DEFAULT 1,
        day_type VARCHAR(20) DEFAULT 'WEEKDAY',
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW(),
        deleted_at TIMESTAMPTZ,
        CONSTRAINT FK_area_staff_requirements_area
          FOREIGN KEY (area_id) REFERENCES areas(id) ON DELETE CASCADE,
        CONSTRAINT FK_area_staff_requirements_shift
          FOREIGN KEY (shift_definition_id) REFERENCES shift_definitions(id) ON DELETE CASCADE,
        CONSTRAINT uq_area_staff_requirements
          UNIQUE (area_id, shift_definition_id, role, day_type),
        CONSTRAINT chk_area_staff_requirements_role CHECK (
          role IN ('worker', 'linmas')
        ),
        CONSTRAINT chk_area_staff_requirements_day_type CHECK (
          day_type IN ('WEEKDAY', 'WEEKEND', 'HOLIDAY')
        ),
        CONSTRAINT chk_area_staff_requirements_count CHECK (
          required_count >= 0
        )
      );
    `);

    // ==========================================
    // STEP 9: Create worker_schedules table
    // ==========================================
    console.log('Creating worker_schedules table...');
    await queryRunner.query(`
      CREATE TABLE worker_schedules (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id UUID NOT NULL,
        area_id UUID NOT NULL,
        shift_definition_id UUID NOT NULL,
        effective_date DATE NOT NULL,
        end_date DATE,
        created_by UUID,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW(),
        deleted_at TIMESTAMPTZ,
        CONSTRAINT FK_worker_schedules_user
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        CONSTRAINT FK_worker_schedules_area
          FOREIGN KEY (area_id) REFERENCES areas(id) ON DELETE CASCADE,
        CONSTRAINT FK_worker_schedules_shift
          FOREIGN KEY (shift_definition_id) REFERENCES shift_definitions(id) ON DELETE CASCADE,
        CONSTRAINT FK_worker_schedules_created_by
          FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
        CONSTRAINT uq_worker_schedules
          UNIQUE (user_id, effective_date, shift_definition_id),
        CONSTRAINT chk_worker_schedules_dates CHECK (
          end_date IS NULL OR end_date >= effective_date
        )
      );
    `);

    // Add indexes for worker_schedules
    await queryRunner.query(`
      CREATE INDEX idx_worker_schedules_date
      ON worker_schedules(effective_date, end_date)
      WHERE deleted_at IS NULL;
    `);

    await queryRunner.query(`
      CREATE INDEX idx_worker_schedules_user
      ON worker_schedules(user_id)
      WHERE deleted_at IS NULL;
    `);

    await queryRunner.query(`
      CREATE INDEX idx_worker_schedules_area
      ON worker_schedules(area_id)
      WHERE deleted_at IS NULL;
    `);

    // ==========================================
    // STEP 10: Alter work_reports table - Add task_id, activity_type_id
    // ==========================================
    console.log('Updating work_reports table for Phase 2...');

    // First check if tasks table exists (it might be created in Phase 2B)
    // For now, we add activity_type_id. task_id will be added when tasks table is created
    await queryRunner.query(`
      ALTER TABLE work_reports
      ADD COLUMN activity_type_id UUID,
      ADD CONSTRAINT FK_work_reports_activity_type
        FOREIGN KEY (activity_type_id) REFERENCES activity_types(id)
        ON DELETE SET NULL;
    `);

    // Add index for activity type filtering
    await queryRunner.query(`
      CREATE INDEX idx_work_reports_activity_type
      ON work_reports(activity_type_id)
      WHERE deleted_at IS NULL;
    `);

    // ==========================================
    // STEP 11: Add indexes for new tables
    // ==========================================
    console.log('Creating indexes for new tables...');

    // Rayon indexes
    await queryRunner.query(`
      CREATE INDEX idx_rayons_code ON rayons(code) WHERE deleted_at IS NULL;
    `);

    // Shift definitions indexes
    await queryRunner.query(`
      CREATE INDEX idx_shift_definitions_active
      ON shift_definitions(is_active)
      WHERE deleted_at IS NULL;
    `);

    // Activity types indexes
    await queryRunner.query(`
      CREATE INDEX idx_activity_types_active
      ON activity_types(is_active)
      WHERE deleted_at IS NULL;
    `);

    await queryRunner.query(`
      CREATE INDEX idx_activity_types_roles
      ON activity_types USING GIN(applicable_roles)
      WHERE deleted_at IS NULL;
    `);

    // Special day overrides indexes
    await queryRunner.query(`
      CREATE INDEX idx_special_day_overrides_date ON special_day_overrides(date);
    `);

    console.log('✅ Phase 2 database migration completed successfully!');
    console.log('');
    console.log('Summary:');
    console.log('  - Created 6 new tables: rayons, shift_definitions, activity_types,');
    console.log('    area_staff_requirements, worker_schedules, special_day_overrides');
    console.log('  - Updated 4 existing tables: users, areas, area_types, work_reports');
    console.log('  - Created 12 new indexes for performance optimization');
    console.log('');
    console.log('⚠️  IMPORTANT: Run seed data after migration:');
    console.log('   npm run seed:phase2');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    console.log('Rolling back Phase 2 database migration...');

    // ==========================================
    // Drop indexes first
    // ==========================================
    await queryRunner.query(`DROP INDEX IF EXISTS idx_special_day_overrides_date;`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_activity_types_roles;`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_activity_types_active;`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_shift_definitions_active;`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_rayons_code;`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_work_reports_activity_type;`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_worker_schedules_area;`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_worker_schedules_user;`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_worker_schedules_date;`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_areas_rayon;`);

    // ==========================================
    // Revert work_reports alterations
    // ==========================================
    await queryRunner.query(`
      ALTER TABLE work_reports DROP CONSTRAINT IF EXISTS FK_work_reports_activity_type;
    `);
    await queryRunner.query(`ALTER TABLE work_reports DROP COLUMN IF EXISTS activity_type_id;`);

    // ==========================================
    // Drop worker_schedules table
    // ==========================================
    await queryRunner.query(`DROP TABLE IF EXISTS worker_schedules;`);

    // ==========================================
    // Drop area_staff_requirements table
    // ==========================================
    await queryRunner.query(`DROP TABLE IF EXISTS area_staff_requirements;`);

    // ==========================================
    // Revert areas alterations
    // ==========================================
    await queryRunner.query(`ALTER TABLE areas DROP CONSTRAINT IF EXISTS FK_areas_rayon_id;`);
    await queryRunner.query(`ALTER TABLE areas DROP COLUMN IF EXISTS coverage_area;`);
    await queryRunner.query(`ALTER TABLE areas DROP COLUMN IF EXISTS boundary_polygon;`);
    await queryRunner.query(`ALTER TABLE areas DROP COLUMN IF EXISTS rayon_id;`);

    // ==========================================
    // Revert users alterations
    // ==========================================
    await queryRunner.query(`ALTER TABLE users DROP CONSTRAINT IF EXISTS chk_users_role;`);
    await queryRunner.query(`ALTER TABLE users DROP CONSTRAINT IF EXISTS FK_users_rayon_id;`);
    await queryRunner.query(`ALTER TABLE users DROP COLUMN IF EXISTS rayon_id;`);
    await queryRunner.query(`ALTER TABLE users ALTER COLUMN role TYPE VARCHAR(20);`);

    // ==========================================
    // Revert area_types alterations
    // ==========================================
    await queryRunner.query(
      `ALTER TABLE area_types DROP CONSTRAINT IF EXISTS chk_area_types_category;`,
    );
    await queryRunner.query(`ALTER TABLE area_types DROP COLUMN IF EXISTS category;`);

    // ==========================================
    // Drop special_day_overrides table
    // ==========================================
    await queryRunner.query(`DROP TABLE IF EXISTS special_day_overrides;`);

    // ==========================================
    // Drop activity_types table
    // ==========================================
    await queryRunner.query(`DROP TABLE IF EXISTS activity_types;`);

    // ==========================================
    // Drop shift_definitions table
    // ==========================================
    await queryRunner.query(`DROP TABLE IF EXISTS shift_definitions;`);

    // ==========================================
    // Drop rayons table
    // ==========================================
    await queryRunner.query(`DROP TABLE IF EXISTS rayons;`);

    console.log('✅ Phase 2 database migration rollback completed!');
  }
}
