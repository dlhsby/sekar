import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Fix: `plant_species` was created (Phase3Schema) WITHOUT a `deleted_at` column,
 * but the entity declares `@DeleteDateColumn` and the service filters every
 * create/update/delete by `deleted_at IS NULL`. On dev (TypeORM auto-sync) the
 * column exists so it works; on staging/prod (migrations only) it doesn't, so
 * every create/edit/delete of a plant species raised `column "deleted_at" does
 * not exist` → 500.
 *
 * This adds the missing column and rebuilds the unique index on `name_id` as a
 * PARTIAL index (`WHERE deleted_at IS NULL`) so it agrees with the soft-delete
 * model — a soft-deleted name no longer blocks re-creating a species with the
 * same name (which also matches the service's `deletedAt: IsNull()` pre-check).
 */
export class AddPlantSpeciesDeletedAt17491200000000 implements MigrationInterface {
  name = 'AddPlantSpeciesDeletedAt17491200000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "plant_species" ADD COLUMN IF NOT EXISTS "deleted_at" TIMESTAMPTZ NULL`,
    );
    // Rebuild the name_id uniqueness as a partial index so soft-deleted rows do
    // not collide with live ones.
    await queryRunner.query(`DROP INDEX IF EXISTS "uidx_plant_species_name_id"`);
    await queryRunner.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS "uidx_plant_species_name_id" ` +
        `ON "plant_species" ("name_id") WHERE "deleted_at" IS NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Restore the plain (non-partial) unique index, then drop the column.
    await queryRunner.query(`DROP INDEX IF EXISTS "uidx_plant_species_name_id"`);
    await queryRunner.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS "uidx_plant_species_name_id" ON "plant_species" ("name_id")`,
    );
    await queryRunner.query(`ALTER TABLE "plant_species" DROP COLUMN IF EXISTS "deleted_at"`);
  }
}
