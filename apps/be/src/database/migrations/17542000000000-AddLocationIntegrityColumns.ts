import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Location integrity (anti-spoofing) columns.
 *
 * `attendance_punches` gains only advisories — a punch that fails the integrity
 * check is REJECTED and never stored, so there is no `is_mocked` column here.
 * What is worth keeping on an accepted punch is why it might be unreliable:
 *  - `poor_accuracy`: the fix was too imprecise to mean much. Advisory exactly
 *    like `outside_boundary`; tree canopy is the honest case and must not block.
 *  - `clock_skew_ms`: client capture time minus server receive time. `punched_at`
 *    is now clamped into a bounded window (backdating was previously unlimited),
 *    and this records what the clamp hid.
 *
 * `location_logs` additionally gains `rejection_reason`, because a refused ping
 * IS stored. Dropping it would make a spoofing worker look identical to one
 * whose phone is simply off — the row is what lets a supervisor tell those
 * apart. Refusal costs the worker presence instead: a rejected ping never
 * advances tracking status, so they read as inactive until they stop.
 *
 * All additive and idempotent; safe to re-run. No backfill needed — the
 * defaults describe existing rows correctly (they were never checked, and
 * `rejection_reason IS NULL` means "accepted", which is how they were treated).
 *
 * DO NOT RENAME this class — TypeORM keys applied migrations by className + timestamp.
 */
export class AddLocationIntegrityColumns17542000000000 implements MigrationInterface {
  name = 'AddLocationIntegrityColumns17542000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE attendance_punches ADD COLUMN IF NOT EXISTS poor_accuracy boolean NOT NULL DEFAULT false`,
    );
    await queryRunner.query(
      `ALTER TABLE attendance_punches ADD COLUMN IF NOT EXISTS clock_skew_ms bigint NOT NULL DEFAULT 0`,
    );

    await queryRunner.query(
      `ALTER TABLE location_logs ADD COLUMN IF NOT EXISTS rejection_reason varchar(32) NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE location_logs ADD COLUMN IF NOT EXISTS poor_accuracy boolean NOT NULL DEFAULT false`,
    );
    await queryRunner.query(
      `ALTER TABLE location_logs ADD COLUMN IF NOT EXISTS clock_skew_ms bigint NOT NULL DEFAULT 0`,
    );

    // Presence queries and the last-known-fix lookup both filter on "clean
    // pings only". A partial index keeps that cheap and stays small, since the
    // overwhelming majority of rows are accepted.
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS idx_location_logs_user_clean
         ON location_logs (user_id, logged_at DESC)
         WHERE rejection_reason IS NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS idx_location_logs_user_clean`);
    await queryRunner.query(`ALTER TABLE location_logs DROP COLUMN IF EXISTS clock_skew_ms`);
    await queryRunner.query(`ALTER TABLE location_logs DROP COLUMN IF EXISTS poor_accuracy`);
    await queryRunner.query(`ALTER TABLE location_logs DROP COLUMN IF EXISTS rejection_reason`);
    await queryRunner.query(`ALTER TABLE attendance_punches DROP COLUMN IF EXISTS clock_skew_ms`);
    await queryRunner.query(`ALTER TABLE attendance_punches DROP COLUMN IF EXISTS poor_accuracy`);
  }
}
