import { MigrationInterface, QueryRunner } from 'typeorm';

export class FixIndexesAndConstraints1741400000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // ================================================================
    // CRITICAL: overtimes CHECK constraint missing 'in_progress' status
    // This causes runtime failures for Phase 2E overtime clock-in flow
    // ================================================================
    await queryRunner.query(`ALTER TABLE overtimes DROP CONSTRAINT IF EXISTS chk_overtimes_status`);
    await queryRunner.query(`
      ALTER TABLE overtimes ADD CONSTRAINT chk_overtimes_status
        CHECK (status IN ('in_progress', 'pending', 'approved', 'rejected'))
    `);

    // ================================================================
    // MISSING FK: tasks.verified_by has no database-level constraint
    // (entity declares @ManyToOne but migration never added the FK)
    // ================================================================
    await queryRunner.query(`
      ALTER TABLE tasks
        ADD CONSTRAINT FK_tasks_verified_by
          FOREIGN KEY (verified_by) REFERENCES users(id) ON DELETE SET NULL
    `);

    // ================================================================
    // MISSING INDEXES ON FK COLUMNS
    // ================================================================

    // users.rayon_id — FK exists, index missing
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_users_rayon_id
        ON users (rayon_id) WHERE deleted_at IS NULL
    `);

    // overtimes.approved_by — FK exists, index missing
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_overtimes_approved_by
        ON overtimes (approved_by) WHERE approved_by IS NOT NULL
    `);

    // tasks.verified_by — backing index for new FK
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_tasks_verified_by
        ON tasks (verified_by) WHERE verified_by IS NOT NULL
    `);

    // activities.reviewed_by — FK exists, index missing
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_activities_reviewed_by
        ON activities (reviewed_by) WHERE reviewed_by IS NOT NULL
    `);

    // schedules.shift_definition_id — FK exists, index missing
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_schedules_shift_definition_id
        ON schedules (shift_definition_id) WHERE deleted_at IS NULL
    `);

    // ================================================================
    // MISSING OPERATIONAL INDEXES — activities (high-volume table)
    // ================================================================

    // Partial index for the hot path: pending activities awaiting review
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_activities_pending
        ON activities (created_at DESC)
        WHERE status = 'pending' AND deleted_at IS NULL
    `);

    // General status filter (approved/rejected queries)
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_activities_status
        ON activities (status) WHERE deleted_at IS NULL
    `);

    // Area-scoped queries (korlap dashboard)
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_activities_area_id
        ON activities (area_id, created_at DESC) WHERE deleted_at IS NULL
    `);

    // Time-range report queries
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_activities_created_at
        ON activities (created_at DESC) WHERE deleted_at IS NULL
    `);

    // ================================================================
    // MISSING OPERATIONAL INDEXES — overtimes table
    // ================================================================

    // Worker fetching own overtime list
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_overtimes_user_id
        ON overtimes (user_id, start_datetime DESC)
    `);

    // Korlap fetching pending overtime for their area
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_overtimes_status_area
        ON overtimes (status, area_id) WHERE status = 'pending'
    `);

    // Time-range reporting on overtime
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_overtimes_start_datetime
        ON overtimes (start_datetime DESC)
    `);

    // ================================================================
    // BRIN INDEXES — append-only high-volume tables
    // Near-zero storage cost, ideal for time-range scans
    // ================================================================

    // audit_logs — all-date time-range scans
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at_brin
        ON audit_logs USING BRIN (created_at)
    `);

    // location_logs — all-user time-range scans (monitoring dashboard)
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_location_logs_logged_at_brin
        ON location_logs USING BRIN (logged_at)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS idx_location_logs_logged_at_brin`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_audit_logs_created_at_brin`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_overtimes_start_datetime`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_overtimes_status_area`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_overtimes_user_id`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_activities_created_at`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_activities_area_id`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_activities_status`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_activities_pending`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_schedules_shift_definition_id`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_activities_reviewed_by`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_tasks_verified_by`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_overtimes_approved_by`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_users_rayon_id`);
    await queryRunner.query(`ALTER TABLE tasks DROP CONSTRAINT IF EXISTS FK_tasks_verified_by`);
    await queryRunner.query(`ALTER TABLE overtimes DROP CONSTRAINT IF EXISTS chk_overtimes_status`);
    await queryRunner.query(`
      ALTER TABLE overtimes ADD CONSTRAINT chk_overtimes_status
        CHECK (status IN ('pending', 'approved', 'rejected'))
    `);
  }
}
