import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Make `location_staff_requirements` **polymorphic** — a target may attach to a
 * location, a region (kawasan), or a rayon (per the parent rayon's
 * `staffing_level`). Adds nullable `region_id`/`rayon_id` (FK, cascade), drops
 * NOT NULL on `location_id`, and a CHECK that at most one subject is set
 * (all-null = a city-wide target). Additive + idempotent; existing location-level
 * rows are untouched, so monitoring keeps reading them unchanged.
 */
export class PolymorphicStaffRequirements17499000000000 implements MigrationInterface {
  name = 'PolymorphicStaffRequirements17499000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Drop the pre-revamp location-only unique (location_id, shift, role, day_type):
    // it is incompatible with the polymorphic model (region/rayon rows have a NULL
    // location_id; PG14 treats those NULLs as distinct, so it neither dedups them
    // nor allows a location that a kawasan-level row also covers). Uniqueness is now
    // managed by deterministic ids + app-level find-or-update. Sync-built DBs never
    // had this constraint, so this reconciles the migration path to match.
    await queryRunner.query(
      `ALTER TABLE "location_staff_requirements" DROP CONSTRAINT IF EXISTS "uq_area_staff_requirements"`,
    );
    await queryRunner.query(
      `ALTER TABLE "location_staff_requirements" ADD COLUMN IF NOT EXISTS "region_id" uuid`,
    );
    await queryRunner.query(
      `ALTER TABLE "location_staff_requirements" ADD COLUMN IF NOT EXISTS "rayon_id" uuid`,
    );
    await queryRunner.query(
      `ALTER TABLE "location_staff_requirements" ALTER COLUMN "location_id" DROP NOT NULL`,
    );
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints
                       WHERE constraint_name = 'FK_lsr_region') THEN
          ALTER TABLE "location_staff_requirements"
            ADD CONSTRAINT "FK_lsr_region" FOREIGN KEY ("region_id")
            REFERENCES "regions"("id") ON DELETE CASCADE;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints
                       WHERE constraint_name = 'FK_lsr_rayon') THEN
          ALTER TABLE "location_staff_requirements"
            ADD CONSTRAINT "FK_lsr_rayon" FOREIGN KEY ("rayon_id")
            REFERENCES "rayons"("id") ON DELETE CASCADE;
        END IF;
      END $$;
    `);
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_lsr_region" ON "location_staff_requirements" ("region_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_lsr_rayon" ON "location_staff_requirements" ("rayon_id")`,
    );
    await queryRunner.query(
      `ALTER TABLE "location_staff_requirements" DROP CONSTRAINT IF EXISTS "chk_lsr_one_subject"`,
    );
    await queryRunner.query(`
      ALTER TABLE "location_staff_requirements" ADD CONSTRAINT "chk_lsr_one_subject"
        CHECK (
          (CASE WHEN location_id IS NOT NULL THEN 1 ELSE 0 END)
          + (CASE WHEN region_id IS NOT NULL THEN 1 ELSE 0 END)
          + (CASE WHEN rayon_id IS NOT NULL THEN 1 ELSE 0 END) <= 1
        )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "location_staff_requirements" DROP CONSTRAINT IF EXISTS "chk_lsr_one_subject"`,
    );
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_lsr_region"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_lsr_rayon"`);
    await queryRunner.query(
      `ALTER TABLE "location_staff_requirements" DROP CONSTRAINT IF EXISTS "FK_lsr_region"`,
    );
    await queryRunner.query(
      `ALTER TABLE "location_staff_requirements" DROP CONSTRAINT IF EXISTS "FK_lsr_rayon"`,
    );
    // Restore NOT NULL only if no region/rayon-level rows exist (else it would fail).
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM "location_staff_requirements" WHERE location_id IS NULL) THEN
          ALTER TABLE "location_staff_requirements" ALTER COLUMN "location_id" SET NOT NULL;
        END IF;
      END $$;
    `);
    await queryRunner.query(
      `ALTER TABLE "location_staff_requirements" DROP COLUMN IF EXISTS "region_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "location_staff_requirements" DROP COLUMN IF EXISTS "rayon_id"`,
    );
  }
}
