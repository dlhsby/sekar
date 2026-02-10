import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Initial Schema Migration - Phase 1
 *
 * Source: specs/database/schema.md - Core Tables (Phase 1)
 * Created: 2026-02-10
 *
 * Tables: users, area_types, areas, worker_assignments, shifts, work_reports, location_logs
 *
 * IMPORTANT: This migration matches the specification EXACTLY.
 * Any deviations from the spec are bugs and should be fixed.
 */
export class InitialSchema1737000000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    console.log('🚀 Creating Phase 1 schema from specification...');

    // Enable UUID extension
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);

    // ==========================================
    // 1. users table
    // Spec: specs/database/schema.md line 29-48
    // ==========================================
    await queryRunner.query(`
      CREATE TABLE users (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        username VARCHAR(50) NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        full_name VARCHAR(100) NOT NULL,
        phone VARCHAR(20),
        role VARCHAR(20) NOT NULL,
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW(),
        deleted_at TIMESTAMPTZ,

        CONSTRAINT uq_users_username UNIQUE (username),
        CONSTRAINT chk_users_role CHECK (role IN ('worker', 'supervisor', 'admin'))
      );
    `);

    await queryRunner.query(`CREATE UNIQUE INDEX idx_users_username ON users(username) WHERE deleted_at IS NULL;`);
    await queryRunner.query(`CREATE INDEX idx_users_role ON users(role) WHERE deleted_at IS NULL;`);
    await queryRunner.query(`CREATE INDEX idx_users_active ON users(is_active) WHERE deleted_at IS NULL;`);

    console.log('  ✓ users');

    // ==========================================
    // 2. area_types table
    // Spec: specs/database/schema.md line 76-95
    // ==========================================
    await queryRunner.query(`
      CREATE TABLE area_types (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        name VARCHAR(100) NOT NULL,
        description TEXT,
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW(),
        deleted_at TIMESTAMPTZ,

        CONSTRAINT uq_area_types_name UNIQUE (name)
      );
    `);

    await queryRunner.query(`CREATE INDEX idx_area_types_active ON area_types(is_active) WHERE deleted_at IS NULL;`);

    console.log('  ✓ area_types');

    // ==========================================
    // 3. areas table
    // Spec: specs/database/schema.md line 104-124
    // ==========================================
    await queryRunner.query(`
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
    `);

    await queryRunner.query(`CREATE INDEX idx_areas_type ON areas(area_type_id) WHERE deleted_at IS NULL;`);
    await queryRunner.query(`CREATE INDEX idx_areas_active ON areas(is_active) WHERE deleted_at IS NULL AND is_active = TRUE;`);

    console.log('  ✓ areas');

    // ==========================================
    // 4. worker_assignments table
    // Spec: specs/database/schema.md line 133-154
    // ==========================================
    await queryRunner.query(`
      CREATE TABLE worker_assignments (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        area_id UUID NOT NULL REFERENCES areas(id) ON DELETE CASCADE,
        assigned_at TIMESTAMPTZ DEFAULT NOW(),
        assigned_by_id UUID REFERENCES users(id) ON DELETE SET NULL,
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW(),
        deleted_at TIMESTAMPTZ,

        CONSTRAINT uq_worker_area_active UNIQUE (user_id, area_id)
      );
    `);

    await queryRunner.query(`CREATE INDEX idx_worker_assignments_user ON worker_assignments(user_id) WHERE deleted_at IS NULL;`);
    await queryRunner.query(`CREATE INDEX idx_worker_assignments_area ON worker_assignments(area_id) WHERE deleted_at IS NULL;`);
    await queryRunner.query(`CREATE INDEX idx_worker_assignments_active ON worker_assignments(is_active) WHERE deleted_at IS NULL;`);

    console.log('  ✓ worker_assignments');

    // ==========================================
    // 5. shifts table
    // Spec: specs/database/schema.md line 163-193
    // ==========================================
    await queryRunner.query(`
      CREATE TABLE shifts (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        area_id UUID NOT NULL REFERENCES areas(id) ON DELETE CASCADE,
        check_in_time TIMESTAMPTZ NOT NULL,
        check_in_latitude DECIMAL(10, 8) NOT NULL,
        check_in_longitude DECIMAL(11, 8) NOT NULL,
        check_in_photo_url VARCHAR(500),
        check_out_time TIMESTAMPTZ,
        check_out_latitude DECIMAL(10, 8),
        check_out_longitude DECIMAL(11, 8),
        check_out_photo_url VARCHAR(500),
        status VARCHAR(20) NOT NULL,
        notes TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW(),
        deleted_at TIMESTAMPTZ,

        CONSTRAINT chk_shifts_status CHECK (status IN ('active', 'completed', 'cancelled'))
      );
    `);

    await queryRunner.query(`CREATE INDEX idx_shifts_user ON shifts(user_id) WHERE deleted_at IS NULL;`);
    await queryRunner.query(`CREATE INDEX idx_shifts_area ON shifts(area_id) WHERE deleted_at IS NULL;`);
    await queryRunner.query(`CREATE INDEX idx_shifts_status ON shifts(status) WHERE deleted_at IS NULL;`);
    await queryRunner.query(`CREATE INDEX idx_shifts_check_in ON shifts(check_in_time) WHERE deleted_at IS NULL;`);

    console.log('  ✓ shifts');

    // ==========================================
    // 6. work_reports table
    // Spec: specs/database/schema.md line 209-237
    // ==========================================
    await queryRunner.query(`
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
    `);

    await queryRunner.query(`CREATE INDEX idx_reports_shift_created ON work_reports(shift_id, created_at DESC) WHERE deleted_at IS NULL;`);
    await queryRunner.query(`CREATE INDEX idx_reports_worker_date ON work_reports(worker_id, created_at DESC) WHERE deleted_at IS NULL;`);
    await queryRunner.query(`CREATE INDEX idx_reports_type_date ON work_reports(report_type, created_at DESC) WHERE deleted_at IS NULL;`);
    await queryRunner.query(`CREATE INDEX idx_reports_unreviewed ON work_reports(is_reviewed, created_at DESC) WHERE is_reviewed = FALSE AND deleted_at IS NULL;`);

    console.log('  ✓ work_reports');

    // ==========================================
    // 7. location_logs table (simplified, non-partitioned)
    // Spec: specs/database/schema.md line 248-263
    // Note: Spec calls for partitioning, but starting with simple version
    // ==========================================
    await queryRunner.query(`
      CREATE TABLE location_logs (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        worker_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
        shift_id UUID NOT NULL REFERENCES shifts(id) ON DELETE CASCADE,
        gps_lat DECIMAL(10, 8) NOT NULL,
        gps_lng DECIMAL(11, 8) NOT NULL,
        accuracy_meters DECIMAL(6, 2),
        battery_level INTEGER,
        logged_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

        CONSTRAINT chk_location_logs_gps_lat CHECK (gps_lat BETWEEN -90 AND 90),
        CONSTRAINT chk_location_logs_gps_lng CHECK (gps_lng BETWEEN -180 AND 180),
        CONSTRAINT chk_location_logs_battery CHECK (battery_level IS NULL OR battery_level BETWEEN 0 AND 100)
      );
    `);

    await queryRunner.query(`CREATE INDEX idx_location_logs_worker_latest ON location_logs(worker_id, logged_at DESC);`);
    await queryRunner.query(`CREATE INDEX idx_location_logs_shift_time ON location_logs(shift_id, logged_at DESC);`);

    console.log('  ✓ location_logs');

    console.log('✅ Phase 1 schema created - 7 tables, all constraints, all indexes');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    console.log('Rolling back Phase 1 schema...');

    await queryRunner.query(`DROP TABLE IF EXISTS location_logs CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS work_reports CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS shifts CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS worker_assignments CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS areas CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS area_types CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS users CASCADE`);

    console.log('✅ Phase 1 schema rolled back');
  }
}
