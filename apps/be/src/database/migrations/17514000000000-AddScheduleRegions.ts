import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * `schedule_regions` — one occurrence, many kawasan.
 *
 * `schedules.region_id` is a single column, so a crew patrolling several kawasan
 * in one shift could not be represented: a second roster row is refused by
 * `UQ_schedules_user_date_shift` (one row per user/day/shift, which is the
 * attendance anchor and stays). This junction mirrors `schedule_locations` for
 * the kawasan tier. `region_id` remains the PRIMARY kawasan that drives
 * `display_scope` and the monitoring drill; this table carries full coverage.
 *
 * Backfill: every existing row with a `region_id` gets one junction row, so the
 * two representations agree from the start.
 *
 * DO NOT RENAME this class — TypeORM keys applied migrations by className +
 * timestamp.
 */
export class AddScheduleRegions17514000000000 implements MigrationInterface {
  name = 'AddScheduleRegions17514000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS schedule_regions (
        id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        schedule_id uuid NOT NULL REFERENCES schedules(id) ON DELETE CASCADE,
        region_id uuid NOT NULL REFERENCES regions(id) ON DELETE CASCADE,
        assigned_by uuid NULL,
        assigned_at timestamptz NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_schedule_regions_region" ON schedule_regions (region_id)`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS "UQ_schedule_regions" ON schedule_regions (schedule_id, region_id)`,
    );
    // Backfill from the single-column representation.
    await queryRunner.query(`
      INSERT INTO schedule_regions (schedule_id, region_id)
      SELECT s.id, s.region_id FROM schedules s
       WHERE s.region_id IS NOT NULL AND s.deleted_at IS NULL
      ON CONFLICT DO NOTHING
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS schedule_regions`);
  }
}
