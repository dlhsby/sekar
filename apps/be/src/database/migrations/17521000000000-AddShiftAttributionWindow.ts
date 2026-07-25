import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * ADR-055 attribution window — per-shift-definition `early_window_min` /
 * `cutoff_grace_min`. A clock-in is attributed to a shift from `early_window_min`
 * before its start until `cutoff_grace_min` after its end; past the cutoff the
 * shift drops out and an open session becomes a dangling `lupa_clock_out`.
 *
 * Both default to 60 (1 h) so every existing shift keeps a sensible window on
 * deploy; operators can tune per shift (the night shift may want a longer grace).
 *
 * DO NOT RENAME this class — TypeORM keys applied migrations by className + timestamp.
 */
export class AddShiftAttributionWindow17521000000000 implements MigrationInterface {
  name = 'AddShiftAttributionWindow17521000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE shift_definitions ADD COLUMN IF NOT EXISTS early_window_min int NOT NULL DEFAULT 60`,
    );
    await queryRunner.query(
      `ALTER TABLE shift_definitions ADD COLUMN IF NOT EXISTS cutoff_grace_min int NOT NULL DEFAULT 60`,
    );
    // Guard the range at the DB — a negative window would invert the attribution
    // logic and silently mis-assign punches.
    await queryRunner.query(`
      ALTER TABLE shift_definitions
        ADD CONSTRAINT chk_shift_def_attribution_window
        CHECK (early_window_min >= 0 AND cutoff_grace_min >= 0)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE shift_definitions DROP CONSTRAINT IF EXISTS chk_shift_def_attribution_window`,
    );
    await queryRunner.query(`ALTER TABLE shift_definitions DROP COLUMN IF EXISTS cutoff_grace_min`);
    await queryRunner.query(`ALTER TABLE shift_definitions DROP COLUMN IF EXISTS early_window_min`);
  }
}
