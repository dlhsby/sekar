import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * ADR-055 follow-up:
 *  - Drop `shift_definitions.code`. The code became an internal, auto-generated
 *    value shown nowhere; shifts are identified by their (unique) name. Nothing
 *    in the app logic depends on it.
 *  - Add per-shift reminder timing: `start_reminder_min` (minutes before start
 *    to push a shift-start reminder, default 15 — preserving the legacy fixed
 *    window) and `end_reminder_min` (minutes before end to push a clock-out
 *    reminder, NULL = off).
 *
 * DO NOT RENAME this class — TypeORM keys applied migrations by className + timestamp.
 */
export class DropShiftCodeAddReminders17523000000000 implements MigrationInterface {
  name = 'DropShiftCodeAddReminders17523000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Reminder columns first (additive, safe).
    await queryRunner.query(
      `ALTER TABLE shift_definitions ADD COLUMN IF NOT EXISTS start_reminder_min int NOT NULL DEFAULT 15`,
    );
    await queryRunner.query(
      `ALTER TABLE shift_definitions ADD COLUMN IF NOT EXISTS end_reminder_min int`,
    );
    await queryRunner.query(
      `ALTER TABLE shift_definitions DROP CONSTRAINT IF EXISTS chk_shift_def_reminder_window`,
    );
    await queryRunner.query(`
      ALTER TABLE shift_definitions
        ADD CONSTRAINT chk_shift_def_reminder_window
        CHECK (
          start_reminder_min >= 0 AND start_reminder_min <= 1440
          AND (end_reminder_min IS NULL OR (end_reminder_min >= 0 AND end_reminder_min <= 1440))
        )
    `);

    // Drop the code column + its unique constraint (name from the create migration).
    await queryRunner.query(
      `ALTER TABLE shift_definitions DROP CONSTRAINT IF EXISTS uq_shift_definitions_code`,
    );
    await queryRunner.query(`ALTER TABLE shift_definitions DROP COLUMN IF EXISTS code`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Re-add code. Backfill from the name so the NOT NULL + unique constraint
    // hold; truncate to 10 chars and disambiguate collisions with the row id.
    await queryRunner.query(
      `ALTER TABLE shift_definitions ADD COLUMN IF NOT EXISTS code varchar(10)`,
    );
    await queryRunner.query(`
      UPDATE shift_definitions
        SET code = UPPER(LEFT(REGEXP_REPLACE(name, '[^A-Za-z0-9]', '', 'g'), 4)) || RIGHT(id::text, 6)
        WHERE code IS NULL
    `);
    await queryRunner.query(`ALTER TABLE shift_definitions ALTER COLUMN code SET NOT NULL`);
    await queryRunner.query(
      `ALTER TABLE shift_definitions ADD CONSTRAINT uq_shift_definitions_code UNIQUE (code)`,
    );

    await queryRunner.query(
      `ALTER TABLE shift_definitions DROP CONSTRAINT IF EXISTS chk_shift_def_reminder_window`,
    );
    await queryRunner.query(`ALTER TABLE shift_definitions DROP COLUMN IF EXISTS end_reminder_min`);
    await queryRunner.query(
      `ALTER TABLE shift_definitions DROP COLUMN IF EXISTS start_reminder_min`,
    );
  }
}
