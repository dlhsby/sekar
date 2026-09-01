import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Make `activities.location_id` nullable (ADR-046). Scope-aware activities can be
 * district/region/city/none-scoped — bound to no single location — so a linked
 * district task (or a roving worker with no clock-in location) legitimately
 * submits with `location_id = null`; physical position is still captured by GPS.
 * The entity already declares the column nullable; this aligns the schema.
 */
export class ActivityLocationNullable17513000000000 implements MigrationInterface {
  name = 'ActivityLocationNullable17513000000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "activities" ALTER COLUMN "location_id" DROP NOT NULL`);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    // Best-effort restore; will fail if null-location activities exist by then.
    await queryRunner.query(`ALTER TABLE "activities" ALTER COLUMN "location_id" SET NOT NULL`);
  }
}
