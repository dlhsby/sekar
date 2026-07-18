import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Make `shifts.location_id` nullable.
 *
 * The `Shift` entity already declares `location_id` as `nullable: true`, and
 * `ShiftsService.clockIn` explicitly supports an **ad-hoc clock-in with no area**
 * ("area can be null — allow clock-in without area; GPS still recorded") for a
 * worker with no schedule and no assigned area. But the column was created
 * `NOT NULL`, so that path threw a raw `not-null constraint` error (HTTP 500)
 * instead of recording the shift. This aligns the DB with the entity + intent.
 *
 * Behaviour-preserving: existing shifts all have a `location_id`; only the
 * previously-impossible null insert now succeeds.
 */
export class MakeShiftLocationNullable17506000000000 implements MigrationInterface {
  name = 'MakeShiftLocationNullable17506000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "shifts" ALTER COLUMN "location_id" DROP NOT NULL`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Only restorable if no ad-hoc (null-location) shifts exist; otherwise this
    // would fail, which is the correct signal that the constraint no longer holds.
    await queryRunner.query(`ALTER TABLE "shifts" ALTER COLUMN "location_id" SET NOT NULL`);
  }
}
