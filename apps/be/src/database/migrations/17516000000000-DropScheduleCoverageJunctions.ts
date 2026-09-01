import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Drop the multi-coverage junctions (ADR-053).
 *
 * `schedule_regions` and `schedule_event_locations` were built to let ONE
 * assignment span several kawasan/lokasi. ADR-053 settles the model the other
 * way: **one row = one worker, one shift, one place**, and wider coverage is
 * another schedule row. Keeping both shapes would mean two ways to express the
 * same thing — the exact clutter the ADR exists to remove.
 *
 * The migrations that CREATED these two tables were withdrawn rather than
 * shipped-then-reverted, so a fresh database never builds them and this runs as a
 * no-op (`IF EXISTS`). It stays for the databases that ran the withdrawn pair
 * before ADR-053 landed — dropping it would strand those tables forever.
 *
 * Safe to drop: neither table was ever the source of truth. `schedules.region_id`
 * and `schedule_events.location_id` always held the authoritative value, and both
 * junctions were backfilled *from* those columns, so no data is lost.
 *
 * DO NOT RENAME this class — TypeORM keys applied migrations by className +
 * timestamp.
 */
export class DropScheduleCoverageJunctions17516000000000 implements MigrationInterface {
  name = 'DropScheduleCoverageJunctions17516000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS schedule_event_locations`);
    await queryRunner.query(`DROP TABLE IF EXISTS schedule_regions`);
  }

  public async down(): Promise<void> {
    // Deliberately empty: re-creating the junctions would reinstate a model this
    // project has decided against. Revert 17514/17515 explicitly if ever needed.
  }
}
