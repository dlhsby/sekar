import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Add the scope-aware columns for tasks & activities (ADR-046, 2026-07-21).
 *
 * Tasks and activities now carry a geographic `scope`
 * (`city|district|region|location|none`) that follows the schedule assigned,
 * mirroring the monitoring drill tiers. The enum + id columns match the entity
 * declarations (`type: 'enum'` → native Postgres enum named `<table>_scope_enum`,
 * default `none`).
 *
 * Only the genuinely-new columns are added:
 *   - tasks:       `scope`, `region_id`         (`location_id`/`district_id` already exist)
 *   - activities:  `scope`, `region_id`, `district_id`  (`location_id` already exists)
 *
 * Idempotent (guards) + reversible. No data backfill: existing rows default to
 * `scope='none'` with null ids, which is the correct "no binding" state.
 */
export class AddAssignmentScopes17511000000000 implements MigrationInterface {
  name = 'AddAssignmentScopes17511000000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    // Native enum types (one per table, matching TypeORM's default naming).
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "tasks_scope_enum" AS ENUM ('city', 'district', 'region', 'location', 'none');
      EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    `);
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "activities_scope_enum" AS ENUM ('city', 'district', 'region', 'location', 'none');
      EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    `);

    // tasks: +scope, +region_id
    await queryRunner.query(
      `ALTER TABLE "tasks" ADD COLUMN IF NOT EXISTS "scope" "tasks_scope_enum" NOT NULL DEFAULT 'none'`,
    );
    await queryRunner.query(`ALTER TABLE "tasks" ADD COLUMN IF NOT EXISTS "region_id" uuid`);

    // activities: +scope, +region_id, +district_id
    await queryRunner.query(
      `ALTER TABLE "activities" ADD COLUMN IF NOT EXISTS "scope" "activities_scope_enum" NOT NULL DEFAULT 'none'`,
    );
    await queryRunner.query(`ALTER TABLE "activities" ADD COLUMN IF NOT EXISTS "region_id" uuid`);
    await queryRunner.query(`ALTER TABLE "activities" ADD COLUMN IF NOT EXISTS "district_id" uuid`);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "activities" DROP COLUMN IF EXISTS "district_id"`);
    await queryRunner.query(`ALTER TABLE "activities" DROP COLUMN IF EXISTS "region_id"`);
    await queryRunner.query(`ALTER TABLE "activities" DROP COLUMN IF EXISTS "scope"`);
    await queryRunner.query(`ALTER TABLE "tasks" DROP COLUMN IF EXISTS "region_id"`);
    await queryRunner.query(`ALTER TABLE "tasks" DROP COLUMN IF EXISTS "scope"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "activities_scope_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "tasks_scope_enum"`);
  }
}
