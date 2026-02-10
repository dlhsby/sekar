import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Initial Schema Migration - Phase 1
 *
 * Creates all base tables for Phase 1 functionality:
 * - users: User accounts (Admin, Supervisor, Worker, Linmas)
 * - area_types: Area categories (Taman, Trotoar, etc.)
 * - areas: Work locations
 * - worker_assignments: Worker-to-area assignments
 * - shifts: Work shift records
 * - work_reports: Daily work reports
 * - location_logs: GPS tracking data
 *
 * This migration must run BEFORE Phase2DatabaseSchema migration.
 */
export class InitialSchema1737000000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    console.log('Creating Phase 1 base schema...');

    // Enable UUID extension
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);

    // Create users table
    await queryRunner.query(`
      CREATE TABLE users (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        username VARCHAR(50) NOT NULL UNIQUE,
        password_hash VARCHAR(255) NOT NULL,
        full_name VARCHAR(100) NOT NULL,
        role VARCHAR(50) NOT NULL,
        phone VARCHAR(20),
        nip VARCHAR(50),
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW(),
        deleted_at TIMESTAMPTZ,
        CONSTRAINT chk_users_role CHECK (
          role IN ('worker', 'supervisor', 'admin', 'linmas', 'top_management', 'kepala_rayon', 'koordinator_lapangan')
        )
      );
    `);

    // Create area_types table
    await queryRunner.query(`
      CREATE TABLE area_types (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        name VARCHAR(100) NOT NULL UNIQUE,
        code VARCHAR(50) NOT NULL UNIQUE,
        description TEXT,
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW(),
        deleted_at TIMESTAMPTZ
      );
    `);

    // Create areas table
    await queryRunner.query(`
      CREATE TABLE areas (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        name VARCHAR(100) NOT NULL,
        area_type_id UUID NOT NULL,
        gps_lat DECIMAL(10, 8) NOT NULL,
        gps_lng DECIMAL(11, 8) NOT NULL,
        radius_meters INTEGER DEFAULT 100,
        address TEXT,
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW(),
        deleted_at TIMESTAMPTZ,
        CONSTRAINT fk_areas_area_type FOREIGN KEY (area_type_id)
          REFERENCES area_types(id) ON DELETE RESTRICT,
        CONSTRAINT chk_areas_gps_lat CHECK (gps_lat BETWEEN -90 AND 90),
        CONSTRAINT chk_areas_gps_lng CHECK (gps_lng BETWEEN -180 AND 180),
        CONSTRAINT chk_areas_radius CHECK (radius_meters BETWEEN 1 AND 10000)
      );
    `);

    // Create worker_assignments table
    await queryRunner.query(`
      CREATE TABLE worker_assignments (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id UUID NOT NULL,
        area_id UUID NOT NULL,
        assigned_at TIMESTAMPTZ DEFAULT NOW(),
        assigned_by_id UUID,
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW(),
        deleted_at TIMESTAMPTZ,
        CONSTRAINT fk_worker_assignments_user FOREIGN KEY (user_id)
          REFERENCES users(id) ON DELETE CASCADE,
        CONSTRAINT fk_worker_assignments_area FOREIGN KEY (area_id)
          REFERENCES areas(id) ON DELETE CASCADE,
        CONSTRAINT fk_worker_assignments_assigned_by FOREIGN KEY (assigned_by_id)
          REFERENCES users(id) ON DELETE SET NULL
      );
    `);

    // Create shifts table
    await queryRunner.query(`
      CREATE TABLE shifts (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id UUID NOT NULL,
        area_id UUID NOT NULL,
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
        CONSTRAINT fk_shifts_user FOREIGN KEY (user_id)
          REFERENCES users(id) ON DELETE CASCADE,
        CONSTRAINT fk_shifts_area FOREIGN KEY (area_id)
          REFERENCES areas(id) ON DELETE CASCADE,
        CONSTRAINT chk_shifts_status CHECK (
          status IN ('active', 'completed', 'cancelled')
        )
      );
    `);

    // Create work_reports table
    await queryRunner.query(`
      CREATE TABLE work_reports (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        shift_id UUID NOT NULL,
        user_id UUID NOT NULL,
        area_id UUID NOT NULL,
        report_type VARCHAR(50) NOT NULL,
        title VARCHAR(200) NOT NULL,
        description TEXT NOT NULL,
        latitude DECIMAL(10, 8) NOT NULL,
        longitude DECIMAL(11, 8) NOT NULL,
        photo_urls TEXT[],
        video_url VARCHAR(500),
        status VARCHAR(20) NOT NULL,
        submitted_at TIMESTAMPTZ DEFAULT NOW(),
        reviewed_at TIMESTAMPTZ,
        reviewed_by_id UUID,
        reviewer_notes TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW(),
        deleted_at TIMESTAMPTZ,
        CONSTRAINT fk_work_reports_shift FOREIGN KEY (shift_id)
          REFERENCES shifts(id) ON DELETE CASCADE,
        CONSTRAINT fk_work_reports_user FOREIGN KEY (user_id)
          REFERENCES users(id) ON DELETE CASCADE,
        CONSTRAINT fk_work_reports_area FOREIGN KEY (area_id)
          REFERENCES areas(id) ON DELETE CASCADE,
        CONSTRAINT fk_work_reports_reviewed_by FOREIGN KEY (reviewed_by_id)
          REFERENCES users(id) ON DELETE SET NULL,
        CONSTRAINT chk_work_reports_type CHECK (
          report_type IN ('task_completion', 'maintenance_request', 'incident_report', 'daily_summary')
        ),
        CONSTRAINT chk_work_reports_status CHECK (
          status IN ('pending', 'approved', 'rejected', 'needs_revision')
        )
      );
    `);

    // Create location_logs table
    await queryRunner.query(`
      CREATE TABLE location_logs (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        shift_id UUID NOT NULL,
        user_id UUID NOT NULL,
        latitude DECIMAL(10, 8) NOT NULL,
        longitude DECIMAL(11, 8) NOT NULL,
        accuracy DECIMAL(6, 2),
        battery_level INTEGER,
        timestamp TIMESTAMPTZ NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        CONSTRAINT fk_location_logs_shift FOREIGN KEY (shift_id)
          REFERENCES shifts(id) ON DELETE CASCADE,
        CONSTRAINT fk_location_logs_user FOREIGN KEY (user_id)
          REFERENCES users(id) ON DELETE CASCADE
      );
    `);

    // Create indexes for performance
    await queryRunner.query(`CREATE INDEX idx_users_username ON users(username)`);
    await queryRunner.query(`CREATE INDEX idx_users_role ON users(role)`);
    await queryRunner.query(`CREATE INDEX idx_areas_area_type_id ON areas(area_type_id)`);
    await queryRunner.query(`CREATE INDEX idx_worker_assignments_user_id ON worker_assignments(user_id)`);
    await queryRunner.query(`CREATE INDEX idx_worker_assignments_area_id ON worker_assignments(area_id)`);
    await queryRunner.query(`CREATE INDEX idx_shifts_user_id ON shifts(user_id)`);
    await queryRunner.query(`CREATE INDEX idx_shifts_area_id ON shifts(area_id)`);
    await queryRunner.query(`CREATE INDEX idx_shifts_status ON shifts(status)`);
    await queryRunner.query(`CREATE INDEX idx_work_reports_user_id ON work_reports(user_id)`);
    await queryRunner.query(`CREATE INDEX idx_work_reports_shift_id ON work_reports(shift_id)`);
    await queryRunner.query(`CREATE INDEX idx_work_reports_status ON work_reports(status)`);
    await queryRunner.query(`CREATE INDEX idx_location_logs_shift_id ON location_logs(shift_id)`);
    await queryRunner.query(`CREATE INDEX idx_location_logs_timestamp ON location_logs(timestamp)`);

    console.log('✅ Phase 1 base schema created successfully');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    console.log('Dropping Phase 1 base schema...');

    await queryRunner.query(`DROP TABLE IF EXISTS location_logs CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS work_reports CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS shifts CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS worker_assignments CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS areas CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS area_types CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS users CASCADE`);

    console.log('✅ Phase 1 base schema dropped');
  }
}
