import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Widen the schedule-event scope CHECK to accept **city** scope — a whole-Surabaya
 * placement with no rayon/region/location (e.g. a Tim Patroli). Parallels the
 * rayon-scope addition (17495). Additive + idempotent (drop-if-exists → re-add).
 */
export class AddScheduleEventCityScope17498000000000 implements MigrationInterface {
  name = 'AddScheduleEventCityScope17498000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "schedule_events" DROP CONSTRAINT IF EXISTS "chk_schedule_events_scope"`,
    );
    await queryRunner.query(`
      ALTER TABLE "schedule_events" ADD CONSTRAINT "chk_schedule_events_scope"
        CHECK ((scope = 'static' AND location_id IS NOT NULL AND region_id IS NULL AND rayon_id IS NULL)
          OR (scope = 'mobile' AND region_id IS NOT NULL AND location_id IS NULL AND rayon_id IS NULL)
          OR (scope = 'rayon' AND rayon_id IS NOT NULL AND location_id IS NULL AND region_id IS NULL)
          OR (scope = 'city' AND rayon_id IS NULL AND location_id IS NULL AND region_id IS NULL))
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Restore the static/mobile/rayon-only constraint (fails if city rows exist).
    await queryRunner.query(
      `ALTER TABLE "schedule_events" DROP CONSTRAINT IF EXISTS "chk_schedule_events_scope"`,
    );
    await queryRunner.query(`
      ALTER TABLE "schedule_events" ADD CONSTRAINT "chk_schedule_events_scope"
        CHECK ((scope = 'static' AND location_id IS NOT NULL AND region_id IS NULL AND rayon_id IS NULL)
          OR (scope = 'mobile' AND region_id IS NOT NULL AND location_id IS NULL AND rayon_id IS NULL)
          OR (scope = 'rayon' AND rayon_id IS NOT NULL AND location_id IS NULL AND region_id IS NULL))
    `);
  }
}
