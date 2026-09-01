import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Add rayon-wide scope to schedule events (P5). A new `rayon_id` column lets an
 * event be placed at whole-Rayon level (no fixed location/region) — e.g. a
 * roving crew. FK → rayons (SET NULL on delete), indexed for the rayon-scoped
 * projection/filter queries. Also widens the scope CHECK constraint to allow the
 * rayon case (rayon_id set, location/region null). Additive + idempotent.
 */
export class AddScheduleEventRayonScope17495000000000 implements MigrationInterface {
  name = 'AddScheduleEventRayonScope17495000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "schedule_events" ADD COLUMN IF NOT EXISTS "rayon_id" uuid`,
    );
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.table_constraints
          WHERE constraint_name = 'FK_schedule_events_rayon'
        ) THEN
          ALTER TABLE "schedule_events"
            ADD CONSTRAINT "FK_schedule_events_rayon"
            FOREIGN KEY ("rayon_id") REFERENCES "rayons"("id") ON DELETE SET NULL;
        END IF;
      END $$;
    `);
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_schedule_events_rayon" ON "schedule_events" ("rayon_id")`,
    );
    // Widen the scope CHECK to accept rayon-wide events.
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

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Restore the original static/mobile-only constraint (fails if rayon rows exist).
    await queryRunner.query(
      `ALTER TABLE "schedule_events" DROP CONSTRAINT IF EXISTS "chk_schedule_events_scope"`,
    );
    await queryRunner.query(`
      ALTER TABLE "schedule_events" ADD CONSTRAINT "chk_schedule_events_scope"
        CHECK ((scope = 'static' AND location_id IS NOT NULL AND region_id IS NULL)
          OR (scope = 'mobile' AND region_id IS NOT NULL AND location_id IS NULL))
    `);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_schedule_events_rayon"`);
    await queryRunner.query(
      `ALTER TABLE "schedule_events" DROP CONSTRAINT IF EXISTS "FK_schedule_events_rayon"`,
    );
    await queryRunner.query(`ALTER TABLE "schedule_events" DROP COLUMN IF EXISTS "rayon_id"`);
  }
}
