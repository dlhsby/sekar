import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Uniqueness moves from `(user, date, shift)` to `(user, date, shift, PLACE)` —
 * ADR-053.
 *
 * A worker legitimately covers several places in one shift (lokasi A in the
 * morning, lokasi B later, a kawasan elsewhere after that). The old key allowed
 * only one row per shift, so that day could not be expressed at all. What must
 * still be blocked is the duplicate that is genuinely wrong: the same worker, the
 * same shift, the **same place**.
 *
 * To express that in one index the row has to carry its own place. `region_id`
 * and `district_id` already sat on `schedules`; the lokasi lived only in the
 * `schedule_locations` junction, so this adds `schedules.location_id` and
 * backfills it. Under ADR-053 a row has at most ONE lokasi, so the junction's
 * extra generality is no longer used — `location_id` becomes authoritative and
 * `SchedulesService.setAreas` writes both. Removing the junction touches 40+
 * call sites and is deliberately left to a follow-up rather than bundled here.
 *
 * The place key is `COALESCE(location_id, region_id, district_id, <nil uuid>)`:
 * exactly one of the three is set, and city scope (all NULL) folds onto the nil
 * sentinel. A bare multi-column index would NOT work — Postgres treats NULLs as
 * distinct, so two city-scope rows would both be accepted.
 *
 * DO NOT RENAME this class — TypeORM keys applied migrations by className +
 * timestamp.
 */
export class ScheduleUniquePerPlace17517000000000 implements MigrationInterface {
  name = 'ScheduleUniquePerPlace17517000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE schedules ADD COLUMN IF NOT EXISTS location_id uuid NULL
         REFERENCES locations(id) ON DELETE SET NULL`,
    );
    // Backfill from the junction. A row with several lokasi predates ADR-053;
    // take the lowest id deterministically so re-runs agree.
    await queryRunner.query(`
      UPDATE schedules s
         SET location_id = sub.location_id
        FROM (
          SELECT schedule_id, MIN(location_id::text)::uuid AS location_id
            FROM schedule_locations GROUP BY schedule_id
        ) sub
       WHERE sub.schedule_id = s.id AND s.location_id IS NULL
    `);
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_schedules_location" ON schedules (location_id)`,
    );

    // Swap the key. Drop first: the old one is a strict subset, so both cannot
    // coexist without the old one still rejecting the rows this enables.
    await queryRunner.query(`DROP INDEX IF EXISTS "UQ_schedules_user_date_shift"`);
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "UQ_schedules_user_date_shift_place"
        ON schedules (
          user_id,
          schedule_date,
          shift_definition_id,
          COALESCE(location_id, region_id, district_id, '00000000-0000-0000-0000-000000000000'::uuid)
        )
        WHERE deleted_at IS NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "UQ_schedules_user_date_shift_place"`);
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "UQ_schedules_user_date_shift"
        ON schedules (user_id, schedule_date, shift_definition_id)
        WHERE deleted_at IS NULL
    `);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_schedules_location"`);
    await queryRunner.query(`ALTER TABLE schedules DROP COLUMN IF EXISTS location_id`);
  }
}
