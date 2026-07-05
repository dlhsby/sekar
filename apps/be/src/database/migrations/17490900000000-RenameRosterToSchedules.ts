import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Retire the schedule-template model and promote the daily roster to be the
 * single "schedules" concept (ADR-013 follow-up).
 *
 * 1. Drop the legacy `schedules` template table — a worker's standing
 *    shift+rayon+area assignment now lives on the user (`users.shift_definition_id`
 *    + `user_areas` + `users.rayon_id`); the roster is derived from that.
 * 2. Rename the roster tables `daily_schedules` → `schedules` and
 *    `daily_schedule_areas` → `schedule_areas`, and the FK column
 *    `daily_schedule_id` → `schedule_id`.
 *
 * Idempotent (IF EXISTS guards). Index/constraint names keep their historical
 * `daily_*` spellings — cosmetic only; runtime queries match on columns.
 * Irreversible: legacy template rows are not recoverable (down() only undoes
 * the rename).
 */
export class RenameRosterToSchedules17490900000000 implements MigrationInterface {
  name = 'RenameRosterToSchedules17490900000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Remove the retired schedule-template table (frees the `schedules` name).
    await queryRunner.query(`DROP TABLE IF EXISTS "schedules" CASCADE`);

    // 2. Promote the daily roster to the single "schedules" concept.
    await queryRunner.query(`ALTER TABLE IF EXISTS "daily_schedules" RENAME TO "schedules"`);
    await queryRunner.query(
      `ALTER TABLE IF EXISTS "daily_schedule_areas" RENAME TO "schedule_areas"`,
    );
    await queryRunner.query(
      `ALTER TABLE IF EXISTS "schedule_areas" RENAME COLUMN "daily_schedule_id" TO "schedule_id"`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Undo the rename only — the dropped legacy template table is not restored.
    await queryRunner.query(
      `ALTER TABLE IF EXISTS "schedule_areas" RENAME COLUMN "schedule_id" TO "daily_schedule_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE IF EXISTS "schedule_areas" RENAME TO "daily_schedule_areas"`,
    );
    await queryRunner.query(`ALTER TABLE IF EXISTS "schedules" RENAME TO "daily_schedules"`);
  }
}
