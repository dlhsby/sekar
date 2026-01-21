import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Production Database Hardening Migration
 *
 * This migration implements ALL critical performance optimizations and data integrity
 * constraints required for production deployment at scale (500 workers).
 *
 * Changes:
 * 1. Adds missing columns to reports table (area_id, is_reviewed, reviewed_by, reviewed_at, deleted_at)
 * 2. Adds performance indexes for shifts, location_logs, and reports (work_reports)
 * 3. Adds CHECK constraints for GPS coordinates, battery levels, and enum validations
 * 4. Updates foreign key cascades (location_logs -> shifts: CASCADE)
 * 5. Adds soft delete support to reports table
 *
 * Estimated Duration:
 * - Empty database: <1 second
 * - 10K records: ~2-3 seconds
 * - 100K records: ~10-15 seconds
 * - 1M records: ~60-90 seconds
 *
 * IMPORTANT: Test on production copy first!
 *
 * Related: specs/database/schema.md, specs/ACTION_PLAN.md (Days 1-2)
 */
export class AddProductionIndexesAndConstraints1737006000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // ==========================================
    // STEP 1: Add Missing Columns to Reports Table
    // ==========================================
    console.log('Adding missing columns to reports table...');

    // Add area_id (required for supervisor filtering)
    await queryRunner.query(`
      ALTER TABLE reports
      ADD COLUMN area_id UUID,
      ADD CONSTRAINT FK_reports_area_id
        FOREIGN KEY (area_id) REFERENCES areas(id)
        ON DELETE RESTRICT;
    `);

    // STEP 2A: Check for orphaned reports (reports without valid shifts)
    // This detects data integrity issues before attempting backfill
    console.log('Checking for orphaned reports...');
    const orphanedReports = await queryRunner.query(`
      SELECT r.id, r.shift_id, r.created_at
      FROM reports r
      LEFT JOIN shifts s ON r.shift_id = s.id
      WHERE s.id IS NULL
      LIMIT 5;
    `);

    if (orphanedReports.length > 0) {
      console.error('❌ Found orphaned reports:', JSON.stringify(orphanedReports, null, 2));
      throw new Error(
        `Cannot proceed with migration: Found ${orphanedReports.length}+ reports that reference non-existent shifts. ` +
          'These reports must be cleaned up before running this migration. ' +
          'Options: (1) Delete orphaned reports, (2) Reassign to valid shifts, or (3) Create placeholder shifts. ' +
          'Run this query to find all orphaned reports: ' +
          'SELECT r.id, r.shift_id, r.worker_id, r.created_at FROM reports r LEFT JOIN shifts s ON r.shift_id = s.id WHERE s.id IS NULL;',
      );
    }
    console.log('✅ No orphaned reports found');

    // STEP 2B: Backfill area_id from shifts (including soft-deleted shifts)
    // This ensures all reports get their area_id, even if the shift was soft-deleted
    console.log('Backfilling area_id from shifts...');
    const updateResult = await queryRunner.query(`
      UPDATE reports r
      SET area_id = s.area_id
      FROM shifts s
      WHERE r.shift_id = s.id AND r.area_id IS NULL;
    `);
    console.log(`✅ Updated ${updateResult[1]} reports with area_id`);

    // STEP 2C: Verify all reports have area_id before adding NOT NULL constraint
    // This prevents constraint violations and identifies any remaining data issues
    console.log('Verifying all reports have area_id...');
    const nullAreaReports = await queryRunner.query(`
      SELECT COUNT(*) as count FROM reports WHERE area_id IS NULL;
    `);

    const nullCount = parseInt(nullAreaReports[0].count, 10);
    if (nullCount > 0) {
      // Additional diagnostic: show sample of problematic reports
      const sampleNullReports = await queryRunner.query(`
        SELECT r.id, r.shift_id, r.worker_id, r.created_at, s.id as shift_exists
        FROM reports r
        LEFT JOIN shifts s ON r.shift_id = s.id
        WHERE r.area_id IS NULL
        LIMIT 5;
      `);
      console.error(
        '❌ Found reports with NULL area_id:',
        JSON.stringify(sampleNullReports, null, 2),
      );
      throw new Error(
        `Cannot add NOT NULL constraint: ${nullCount} reports still have NULL area_id after backfill. ` +
          'This indicates orphaned data that must be manually cleaned. ' +
          'The backfill query may have failed, or the data has referential integrity issues. ' +
          'Please investigate and fix the data before re-running this migration.',
      );
    }
    console.log('✅ All reports have area_id');

    // STEP 2D: Make area_id NOT NULL after successful backfill and verification
    console.log('Adding NOT NULL constraint to area_id...');
    await queryRunner.query(`
      ALTER TABLE reports
      ALTER COLUMN area_id SET NOT NULL;
    `);
    console.log('✅ NOT NULL constraint added successfully');

    // Add review tracking columns
    await queryRunner.query(`
      ALTER TABLE reports
      ADD COLUMN is_reviewed BOOLEAN DEFAULT FALSE,
      ADD COLUMN reviewed_by UUID,
      ADD COLUMN reviewed_at TIMESTAMPTZ,
      ADD CONSTRAINT FK_reports_reviewed_by
        FOREIGN KEY (reviewed_by) REFERENCES users(id)
        ON DELETE SET NULL;
    `);

    // Add soft delete column
    await queryRunner.query(`
      ALTER TABLE reports
      ADD COLUMN deleted_at TIMESTAMPTZ;
    `);

    // Add condition column (optional: Baik, Cukup, Buruk)
    await queryRunner.query(`
      ALTER TABLE reports
      ADD COLUMN condition VARCHAR(20);
    `);

    // ==========================================
    // STEP 2: Add CHECK Constraints
    // ==========================================
    console.log('Adding CHECK constraints...');

    // GPS Coordinate Validation - shifts
    await queryRunner.query(`
      ALTER TABLE shifts
      ADD CONSTRAINT chk_shifts_clock_in_lat
        CHECK (clock_in_gps_lat IS NULL OR (clock_in_gps_lat BETWEEN -90 AND 90)),
      ADD CONSTRAINT chk_shifts_clock_in_lng
        CHECK (clock_in_gps_lng IS NULL OR (clock_in_gps_lng BETWEEN -180 AND 180)),
      ADD CONSTRAINT chk_shifts_clock_out_lat
        CHECK (clock_out_gps_lat IS NULL OR (clock_out_gps_lat BETWEEN -90 AND 90)),
      ADD CONSTRAINT chk_shifts_clock_out_lng
        CHECK (clock_out_gps_lng IS NULL OR (clock_out_gps_lng BETWEEN -180 AND 180)),
      ADD CONSTRAINT chk_shifts_times
        CHECK (clock_out_time IS NULL OR clock_out_time > clock_in_time);
    `);

    // GPS Coordinate Validation - location_logs
    await queryRunner.query(`
      ALTER TABLE location_logs
      ADD CONSTRAINT chk_location_logs_gps_lat
        CHECK (gps_lat BETWEEN -90 AND 90),
      ADD CONSTRAINT chk_location_logs_gps_lng
        CHECK (gps_lng BETWEEN -180 AND 180),
      ADD CONSTRAINT chk_location_logs_battery
        CHECK (battery_level IS NULL OR battery_level BETWEEN 0 AND 100);
    `);

    // GPS Coordinate Validation - reports
    await queryRunner.query(`
      ALTER TABLE reports
      ADD CONSTRAINT chk_reports_gps_lat
        CHECK (gps_lat BETWEEN -90 AND 90),
      ADD CONSTRAINT chk_reports_gps_lng
        CHECK (gps_lng BETWEEN -180 AND 180),
      ADD CONSTRAINT chk_reports_type
        CHECK (report_type IN ('task_completion', 'incident', 'maintenance_request')),
      ADD CONSTRAINT chk_reports_condition
        CHECK (condition IS NULL OR condition IN ('Baik', 'Cukup', 'Buruk'));
    `);

    // GPS Coordinate Validation - areas
    await queryRunner.query(`
      ALTER TABLE areas
      ADD CONSTRAINT chk_areas_gps_lat
        CHECK (gps_lat BETWEEN -90 AND 90),
      ADD CONSTRAINT chk_areas_gps_lng
        CHECK (gps_lng BETWEEN -180 AND 180),
      ADD CONSTRAINT chk_areas_radius
        CHECK (radius_meters BETWEEN 1 AND 10000);
    `);

    // ==========================================
    // STEP 3: Update Foreign Key Cascades
    // ==========================================
    console.log('Updating foreign key cascades...');

    // Drop and recreate location_logs -> shifts with CASCADE
    // This ensures location logs are automatically deleted when a shift is deleted
    await queryRunner.query(`
      ALTER TABLE location_logs
      DROP CONSTRAINT IF EXISTS "FK_6938df393d1969889c5b0633a08";
    `);

    await queryRunner.query(`
      ALTER TABLE location_logs
      ADD CONSTRAINT FK_location_logs_shift_id
        FOREIGN KEY (shift_id) REFERENCES shifts(id)
        ON DELETE CASCADE;
    `);

    // ==========================================
    // STEP 4: Create Performance Indexes - Shifts
    // ==========================================
    console.log('Creating performance indexes for shifts...');

    // Index for fetching worker's shift history (most common query)
    // Supports: SELECT * FROM shifts WHERE worker_id = ? AND deleted_at IS NULL ORDER BY clock_in_time DESC
    await queryRunner.query(`
      CREATE INDEX idx_shifts_worker_date
      ON shifts(worker_id, clock_in_time DESC)
      WHERE deleted_at IS NULL;
    `);

    // Index for supervisor viewing shifts by area
    // Supports: SELECT * FROM shifts WHERE area_id = ? ORDER BY clock_in_time DESC
    await queryRunner.query(`
      CREATE INDEX idx_shifts_area_date
      ON shifts(area_id, clock_in_time DESC)
      WHERE deleted_at IS NULL;
    `);

    // Index for finding active shifts (critical for preventing double clock-in)
    // Supports: SELECT * FROM shifts WHERE worker_id = ? AND clock_out_time IS NULL
    await queryRunner.query(`
      CREATE INDEX idx_shifts_active
      ON shifts(worker_id)
      WHERE clock_out_time IS NULL AND deleted_at IS NULL;
    `);

    // Index for date range queries (dashboard, reports)
    // Supports: SELECT * FROM shifts WHERE clock_in_time BETWEEN ? AND ?
    await queryRunner.query(`
      CREATE INDEX idx_shifts_date_range
      ON shifts(clock_in_time DESC)
      WHERE deleted_at IS NULL;
    `);

    // ==========================================
    // STEP 5: Create Performance Indexes - Location Logs
    // ==========================================
    console.log('Creating performance indexes for location_logs...');

    // Index for fetching worker's latest location (real-time tracking)
    // Supports: SELECT * FROM location_logs WHERE worker_id = ? ORDER BY logged_at DESC LIMIT 1
    await queryRunner.query(`
      CREATE INDEX idx_location_logs_worker_latest
      ON location_logs(worker_id, logged_at DESC);
    `);

    // Index for fetching all locations during a shift (tracking history)
    // Supports: SELECT * FROM location_logs WHERE shift_id = ? ORDER BY logged_at DESC
    await queryRunner.query(`
      CREATE INDEX idx_location_logs_shift_time
      ON location_logs(shift_id, logged_at DESC);
    `);

    // ==========================================
    // STEP 6: Create Performance Indexes - Reports
    // ==========================================
    console.log('Creating performance indexes for reports (work_reports)...');

    // Index for fetching reports by shift (most common query)
    // Supports: SELECT * FROM reports WHERE shift_id = ? ORDER BY created_at DESC
    await queryRunner.query(`
      CREATE INDEX idx_reports_shift_created
      ON reports(shift_id, created_at DESC)
      WHERE deleted_at IS NULL;
    `);

    // Index for worker's report history
    // Supports: SELECT * FROM reports WHERE worker_id = ? ORDER BY created_at DESC
    await queryRunner.query(`
      CREATE INDEX idx_reports_worker_date
      ON reports(worker_id, created_at DESC)
      WHERE deleted_at IS NULL;
    `);

    // Index for filtering by report type (supervisor dashboard)
    // Supports: SELECT * FROM reports WHERE report_type = ? ORDER BY created_at DESC
    await queryRunner.query(`
      CREATE INDEX idx_reports_type_date
      ON reports(report_type, created_at DESC)
      WHERE deleted_at IS NULL;
    `);

    // Index for finding unreviewed reports (supervisor task list)
    // Supports: SELECT * FROM reports WHERE is_reviewed = FALSE ORDER BY created_at DESC
    await queryRunner.query(`
      CREATE INDEX idx_reports_unreviewed
      ON reports(is_reviewed, created_at DESC)
      WHERE is_reviewed = FALSE AND deleted_at IS NULL;
    `);

    // Index for area-based report filtering
    // Supports: SELECT * FROM reports WHERE area_id = ? ORDER BY created_at DESC
    await queryRunner.query(`
      CREATE INDEX idx_reports_area_date
      ON reports(area_id, created_at DESC)
      WHERE deleted_at IS NULL;
    `);

    console.log('Migration completed successfully!');
    console.log('✅ Added missing columns to reports table');
    console.log('✅ Added CHECK constraints for data integrity');
    console.log('✅ Updated foreign key cascades');
    console.log('✅ Created 4 performance indexes for shifts');
    console.log('✅ Created 2 performance indexes for location_logs');
    console.log('✅ Created 5 performance indexes for reports');
    console.log('');
    console.log('⚠️  IMPORTANT: Run ANALYZE on all tables to update statistics:');
    console.log('   ANALYZE shifts;');
    console.log('   ANALYZE location_logs;');
    console.log('   ANALYZE reports;');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    console.log('Rolling back production indexes and constraints...');

    // ==========================================
    // Drop Indexes - Reports
    // ==========================================
    await queryRunner.query(`DROP INDEX IF EXISTS idx_reports_area_date;`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_reports_unreviewed;`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_reports_type_date;`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_reports_worker_date;`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_reports_shift_created;`);

    // ==========================================
    // Drop Indexes - Location Logs
    // ==========================================
    await queryRunner.query(`DROP INDEX IF EXISTS idx_location_logs_shift_time;`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_location_logs_worker_latest;`);

    // ==========================================
    // Drop Indexes - Shifts
    // ==========================================
    await queryRunner.query(`DROP INDEX IF EXISTS idx_shifts_date_range;`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_shifts_active;`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_shifts_area_date;`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_shifts_worker_date;`);

    // ==========================================
    // Restore Original Foreign Key Cascade
    // ==========================================
    await queryRunner.query(`
      ALTER TABLE location_logs
      DROP CONSTRAINT IF EXISTS FK_location_logs_shift_id;
    `);

    await queryRunner.query(`
      ALTER TABLE location_logs
      ADD CONSTRAINT "FK_6938df393d1969889c5b0633a08"
        FOREIGN KEY (shift_id) REFERENCES shifts(id)
        ON DELETE RESTRICT;
    `);

    // ==========================================
    // Drop CHECK Constraints
    // ==========================================
    // Areas
    await queryRunner.query(`ALTER TABLE areas DROP CONSTRAINT IF EXISTS chk_areas_radius;`);
    await queryRunner.query(`ALTER TABLE areas DROP CONSTRAINT IF EXISTS chk_areas_gps_lng;`);
    await queryRunner.query(`ALTER TABLE areas DROP CONSTRAINT IF EXISTS chk_areas_gps_lat;`);

    // Reports
    await queryRunner.query(`ALTER TABLE reports DROP CONSTRAINT IF EXISTS chk_reports_condition;`);
    await queryRunner.query(`ALTER TABLE reports DROP CONSTRAINT IF EXISTS chk_reports_type;`);
    await queryRunner.query(`ALTER TABLE reports DROP CONSTRAINT IF EXISTS chk_reports_gps_lng;`);
    await queryRunner.query(`ALTER TABLE reports DROP CONSTRAINT IF EXISTS chk_reports_gps_lat;`);

    // Location Logs
    await queryRunner.query(
      `ALTER TABLE location_logs DROP CONSTRAINT IF EXISTS chk_location_logs_battery;`,
    );
    await queryRunner.query(
      `ALTER TABLE location_logs DROP CONSTRAINT IF EXISTS chk_location_logs_gps_lng;`,
    );
    await queryRunner.query(
      `ALTER TABLE location_logs DROP CONSTRAINT IF EXISTS chk_location_logs_gps_lat;`,
    );

    // Shifts
    await queryRunner.query(`ALTER TABLE shifts DROP CONSTRAINT IF EXISTS chk_shifts_times;`);
    await queryRunner.query(
      `ALTER TABLE shifts DROP CONSTRAINT IF EXISTS chk_shifts_clock_out_lng;`,
    );
    await queryRunner.query(
      `ALTER TABLE shifts DROP CONSTRAINT IF EXISTS chk_shifts_clock_out_lat;`,
    );
    await queryRunner.query(
      `ALTER TABLE shifts DROP CONSTRAINT IF EXISTS chk_shifts_clock_in_lng;`,
    );
    await queryRunner.query(
      `ALTER TABLE shifts DROP CONSTRAINT IF EXISTS chk_shifts_clock_in_lat;`,
    );

    // ==========================================
    // Remove Added Columns from Reports
    // ==========================================
    await queryRunner.query(
      `ALTER TABLE reports DROP CONSTRAINT IF EXISTS FK_reports_reviewed_by;`,
    );
    await queryRunner.query(`ALTER TABLE reports DROP CONSTRAINT IF EXISTS FK_reports_area_id;`);

    await queryRunner.query(`ALTER TABLE reports DROP COLUMN IF EXISTS condition;`);
    await queryRunner.query(`ALTER TABLE reports DROP COLUMN IF EXISTS deleted_at;`);
    await queryRunner.query(`ALTER TABLE reports DROP COLUMN IF EXISTS reviewed_at;`);
    await queryRunner.query(`ALTER TABLE reports DROP COLUMN IF EXISTS reviewed_by;`);
    await queryRunner.query(`ALTER TABLE reports DROP COLUMN IF EXISTS is_reviewed;`);
    await queryRunner.query(`ALTER TABLE reports DROP COLUMN IF EXISTS area_id;`);

    console.log('Rollback completed successfully!');
  }
}
