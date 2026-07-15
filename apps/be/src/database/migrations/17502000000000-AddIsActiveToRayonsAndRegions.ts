import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Add `is_active` to `rayons` and `regions` (Kawasan).
 *
 * `locations` and `team_categories` already carry `is_active` — a reversible
 * soft-retire that hides a record from browsing/pickers while keeping its row,
 * geometry and history intact (delete is the destructive tier below it). Rayon
 * and Kawasan had no equivalent, so the four master-data levels behaved
 * differently for no reason.
 *
 * Defaults to `true` and backfills existing rows, so every rayon/kawasan that
 * exists today stays active — this migration is behaviour-preserving on its own.
 *
 * Idempotent: `ADD COLUMN IF NOT EXISTS` with a NOT NULL default, so a fresh
 * migration-built DB and an existing one converge on the same shape.
 */
export class AddIsActiveToRayonsAndRegions17502000000000 implements MigrationInterface {
  name = 'AddIsActiveToRayonsAndRegions17502000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    for (const table of ['rayons', 'regions']) {
      await queryRunner.query(
        `ALTER TABLE "${table}" ADD COLUMN IF NOT EXISTS "is_active" boolean NOT NULL DEFAULT true`,
      );
      // Belt-and-braces for a column that somehow pre-exists as nullable: no
      // existing rayon/kawasan may silently read as inactive.
      await queryRunner.query(`UPDATE "${table}" SET "is_active" = true WHERE "is_active" IS NULL`);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    for (const table of ['rayons', 'regions']) {
      await queryRunner.query(`ALTER TABLE "${table}" DROP COLUMN IF EXISTS "is_active"`);
    }
  }
}
