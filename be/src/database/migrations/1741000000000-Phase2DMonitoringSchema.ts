import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Phase 2D Database Schema Migration
 *
 * Implements monitoring enhancement tables and indexes:
 *
 * Migration 0: Add shift_definition_id to shifts
 * Migration 1: Create monitoring_configs table
 * Migration 2: Create user_tracking_status table
 * Migration 3: Add performance indexes for location history
 * Migration 4: Backfill shift_definition_id for active shifts
 */
export class Phase2DMonitoringSchema1741000000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    console.log('Starting Phase 2D database migration...');
    console.log('');

    // ==========================================
    // MIGRATION 0: ADD shift_definition_id TO shifts
    // ==========================================
    console.log('[Migration 0] Adding shift_definition_id to shifts...');

    await queryRunner.query(`
      ALTER TABLE shifts ADD COLUMN IF NOT EXISTS shift_definition_id UUID;
    `);

    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'FK_shifts_shift_definition_id'
        ) THEN
          ALTER TABLE shifts ADD CONSTRAINT FK_shifts_shift_definition_id
            FOREIGN KEY (shift_definition_id) REFERENCES shift_definitions(id)
            ON DELETE SET NULL;
        END IF;
      END $$;
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_shifts_shift_definition_id
        ON shifts(shift_definition_id) WHERE deleted_at IS NULL;
    `);

    console.log('  ✓ shift_definition_id column added to shifts');

    // ==========================================
    // MIGRATION 1: CREATE monitoring_configs TABLE
    // ==========================================
    console.log('[Migration 1] Creating monitoring_configs table...');

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS monitoring_configs (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        key VARCHAR(100) UNIQUE NOT NULL,
        value JSONB NOT NULL,
        description TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_monitoring_configs_key ON monitoring_configs(key);
    `);

    console.log('  ✓ monitoring_configs table created');

    // ==========================================
    // MIGRATION 2: CREATE user_tracking_status TABLE
    // ==========================================
    console.log('[Migration 2] Creating user_tracking_status table...');

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS user_tracking_status (
        user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
        shift_id UUID REFERENCES shifts(id) ON DELETE SET NULL,
        shift_definition_id UUID REFERENCES shift_definitions(id) ON DELETE SET NULL,
        status VARCHAR(20) NOT NULL DEFAULT 'offline',
        last_latitude DECIMAL(10,8),
        last_longitude DECIMAL(11,8),
        last_accuracy_meters DECIMAL(6,2),
        last_battery_level INTEGER,
        last_location_at TIMESTAMPTZ,
        is_within_area BOOLEAN DEFAULT true,
        area_id UUID REFERENCES areas(id) ON DELETE SET NULL,
        updated_at TIMESTAMPTZ DEFAULT NOW(),
        CONSTRAINT chk_uts_status CHECK (status IN ('active', 'inactive', 'outside_area', 'missing', 'offline'))
      );
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_uts_status ON user_tracking_status(status);
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_uts_area_id ON user_tracking_status(area_id);
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_uts_shift_id ON user_tracking_status(shift_id);
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_uts_updated_at ON user_tracking_status(updated_at);
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_uts_area_status ON user_tracking_status(area_id, status);
    `);

    console.log('  ✓ user_tracking_status table created with indexes');

    // ==========================================
    // MIGRATION 3: PERFORMANCE INDEXES FOR LOCATION HISTORY
    // ==========================================
    console.log('[Migration 3] Adding performance indexes for location history...');

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_location_logs_user_shift_time
        ON location_logs(user_id, shift_id, logged_at DESC);
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_location_logs_user_date
        ON location_logs(user_id, logged_at DESC);
    `);

    console.log('  ✓ Location history indexes created');

    // ==========================================
    // MIGRATION 4: BACKFILL shift_definition_id FOR ACTIVE SHIFTS
    // ==========================================
    console.log('[Migration 4] Backfilling shift_definition_id for active shifts...');

    // Best-effort backfill: match shifts to shift_definitions by time overlap
    await queryRunner.query(`
      UPDATE shifts s
      SET shift_definition_id = (
        SELECT sd.id FROM shift_definitions sd
        WHERE sd.is_active = true
          AND (
            (sd.crosses_midnight = false AND
              CAST(s.clock_in_time AT TIME ZONE 'Asia/Jakarta' AS TIME) >= CAST(sd.start_time AS TIME) AND
              CAST(s.clock_in_time AT TIME ZONE 'Asia/Jakarta' AS TIME) < CAST(sd.end_time AS TIME))
            OR
            (sd.crosses_midnight = true AND (
              CAST(s.clock_in_time AT TIME ZONE 'Asia/Jakarta' AS TIME) >= CAST(sd.start_time AS TIME) OR
              CAST(s.clock_in_time AT TIME ZONE 'Asia/Jakarta' AS TIME) < CAST(sd.end_time AS TIME)))
          )
        LIMIT 1
      )
      WHERE s.clock_out_time IS NULL
        AND s.shift_definition_id IS NULL
        AND s.deleted_at IS NULL;
    `);

    console.log('  ✓ Backfill complete (best-effort)');
    console.log('');
    console.log('Phase 2D migration completed successfully.');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    console.log('Reverting Phase 2D database migration...');

    // Drop indexes for location history
    await queryRunner.query(`DROP INDEX IF EXISTS idx_location_logs_user_date;`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_location_logs_user_shift_time;`);

    // Drop user_tracking_status
    await queryRunner.query(`DROP TABLE IF EXISTS user_tracking_status;`);

    // Drop monitoring_configs
    await queryRunner.query(`DROP TABLE IF EXISTS monitoring_configs;`);

    // Remove shift_definition_id from shifts
    await queryRunner.query(`DROP INDEX IF EXISTS idx_shifts_shift_definition_id;`);
    await queryRunner.query(
      `ALTER TABLE shifts DROP CONSTRAINT IF EXISTS FK_shifts_shift_definition_id;`,
    );
    await queryRunner.query(`ALTER TABLE shifts DROP COLUMN IF EXISTS shift_definition_id;`);

    console.log('Phase 2D migration reverted.');
  }
}
