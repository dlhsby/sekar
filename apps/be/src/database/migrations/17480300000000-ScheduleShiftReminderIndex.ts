import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Phase 4-3 (§C3): index to support the shift-reminder cron's lookup of
 * active schedules by `effective_date` (with `shift_definition_id` for the
 * join). Additive + idempotent.
 */
export class ScheduleShiftReminderIndex17480300000000 implements MigrationInterface {
  name = 'ScheduleShiftReminderIndex17480300000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_schedules_effective_date_shift_def"
        ON "schedules" ("effective_date", "shift_definition_id")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_schedules_effective_date_shift_def"`);
  }
}
