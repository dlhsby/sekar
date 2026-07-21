import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Fix the schedule-event scope CHECK left stale by the rayon→district rename
 * (ADR-052). Migration 17510 renamed the `rayon_id` column → `district_id` (which
 * cascaded into `chk_schedule_events_scope`), but never updated the scope literal:
 * the constraint still required `scope = 'rayon'` while `ScheduleScope.RAYON` is
 * `'district'`. Result: any district-scoped event violated the constraint.
 *
 * Migrate any legacy `'rayon'` rows to `'district'`, then re-issue the constraint
 * with the current enum values (static/mobile/district/city). Idempotent.
 */
export class FixScheduleEventDistrictScope17512000000000 implements MigrationInterface {
  name = 'FixScheduleEventDistrictScope17512000000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `UPDATE "schedule_events" SET "scope" = 'district' WHERE "scope" = 'rayon'`,
    );
    await queryRunner.query(
      `ALTER TABLE "schedule_events" DROP CONSTRAINT IF EXISTS "chk_schedule_events_scope"`,
    );
    await queryRunner.query(`
      ALTER TABLE "schedule_events" ADD CONSTRAINT "chk_schedule_events_scope"
        CHECK ((scope = 'static' AND location_id IS NOT NULL AND region_id IS NULL AND district_id IS NULL)
          OR (scope = 'mobile' AND region_id IS NOT NULL AND location_id IS NULL AND district_id IS NULL)
          OR (scope = 'district' AND district_id IS NOT NULL AND location_id IS NULL AND region_id IS NULL)
          OR (scope = 'city' AND district_id IS NULL AND location_id IS NULL AND region_id IS NULL))
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `UPDATE "schedule_events" SET "scope" = 'rayon' WHERE "scope" = 'district'`,
    );
    await queryRunner.query(
      `ALTER TABLE "schedule_events" DROP CONSTRAINT IF EXISTS "chk_schedule_events_scope"`,
    );
    await queryRunner.query(`
      ALTER TABLE "schedule_events" ADD CONSTRAINT "chk_schedule_events_scope"
        CHECK ((scope = 'static' AND location_id IS NOT NULL AND region_id IS NULL AND district_id IS NULL)
          OR (scope = 'mobile' AND region_id IS NOT NULL AND location_id IS NULL AND district_id IS NULL)
          OR (scope = 'rayon' AND district_id IS NOT NULL AND location_id IS NULL AND region_id IS NULL)
          OR (scope = 'city' AND district_id IS NULL AND location_id IS NULL AND region_id IS NULL))
    `);
  }
}
