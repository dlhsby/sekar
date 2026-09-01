import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Retire `schedule_locations` (ADR-053).
 *
 * The junction existed so one roster row could hold several lokasi. ADR-053
 * settles the model the other way — **one row = one worker, one shift, one
 * place** — so its extra generality became dead weight: two ways to say where a
 * worker is, one of them unreachable from the UI, and a join on every read path.
 *
 * `schedules.location_id` (migration 17517) is now the only answer, and it is
 * what `UQ_schedules_user_date_shift_place` indexes. Nothing is lost: 17517
 * backfilled the column from this table before anything started writing to it,
 * and this migration re-runs that backfill defensively for rows created in
 * between.
 *
 * DO NOT RENAME this class — TypeORM keys applied migrations by className +
 * timestamp.
 */
export class DropScheduleLocations17518000000000 implements MigrationInterface {
  name = 'DropScheduleLocations17518000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Defensive: anything written to the junction after 17517 ran still lands on
    // the column before the table goes.
    await queryRunner.query(`
      UPDATE schedules s
         SET location_id = sub.location_id
        FROM (
          SELECT schedule_id, MIN(location_id::text)::uuid AS location_id
            FROM schedule_locations GROUP BY schedule_id
        ) sub
       WHERE sub.schedule_id = s.id AND s.location_id IS NULL
    `);
    await queryRunner.query(`DROP TABLE IF EXISTS schedule_locations`);
  }

  public async down(): Promise<void> {
    // Deliberately empty: re-creating the junction would reinstate a model this
    // project has decided against (ADR-053). The place lives on `schedules`.
  }
}
