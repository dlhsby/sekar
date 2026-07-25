import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * ADR-055 — `shifts.service_day`: the session's WIB service-day stored EXPLICITLY
 * on the projection row, rather than derived from `clock_in_time`.
 *
 * The attribution window (Phase 2) can put a session's first punch on a different
 * calendar day than the day it belongs to — a night worker's first clock-in at
 * 00:30 belongs to the previous day's crossing shift. Deriving service_day from
 * `clock_in_time`'s WIB date would then split the clock-in and clock-out onto
 * different session keys and never close the session. An explicit column keys the
 * projection correctly.
 *
 * Backfill existing rows with the WIB date of their clock-in (the value the old
 * derived logic produced), so nothing changes for already-closed sessions.
 *
 * DO NOT RENAME this class — TypeORM keys applied migrations by className + timestamp.
 */
export class AddShiftServiceDay17522000000000 implements MigrationInterface {
  name = 'AddShiftServiceDay17522000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE shifts ADD COLUMN IF NOT EXISTS service_day date NULL`);
    await queryRunner.query(`
      UPDATE shifts
        SET service_day = (clock_in_time AT TIME ZONE 'Asia/Jakarta')::date
      WHERE service_day IS NULL AND clock_in_time IS NOT NULL
    `);
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS idx_shifts_session_key ON shifts (user_id, service_day, shift_definition_id, is_overtime)`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS idx_shifts_session_key`);
    await queryRunner.query(`ALTER TABLE shifts DROP COLUMN IF EXISTS service_day`);
  }
}
