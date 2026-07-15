import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Retire the legacy single `rayons.color` column (added by RayonColor17480150000000).
 *
 * ADR-045 replaced the single boundary colour with per-level styling
 * (`border_color` / `fill_color`). The `color` column lingered as a fallback and
 * caused confusion: the CRUD form edited border/fill while the grid + monitoring
 * still read `color`. This migration backfills the per-level columns from `color`
 * (so existing rayons keep their boundary tint — monitoring now derives the map
 * colour from `border_color ?? fill_color`) and drops `color`.
 *
 * Idempotent + safe on a fresh migration-built DB: the backfill is a plain UPDATE
 * (no FK dependency) and the drop is `IF EXISTS`.
 */
export class RetireRayonLegacyColor17501000000000 implements MigrationInterface {
  name = 'RetireRayonLegacyColor17501000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Preserve the boundary tint: copy `color` into the per-level columns wherever
    // they are still empty. Never overwrite a colour the operator already set.
    await queryRunner.query(
      `UPDATE "rayons" SET "border_color" = "color"
         WHERE "border_color" IS NULL AND "color" IS NOT NULL`,
    );
    await queryRunner.query(
      `UPDATE "rayons" SET "fill_color" = "color"
         WHERE "fill_color" IS NULL AND "color" IS NOT NULL`,
    );

    await queryRunner.query(`ALTER TABLE "rayons" DROP COLUMN IF EXISTS "color"`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Re-add the column and best-effort restore from the border colour.
    await queryRunner.query(
      `ALTER TABLE "rayons" ADD COLUMN IF NOT EXISTS "color" varchar(9) NULL`,
    );
    await queryRunner.query(`UPDATE "rayons" SET "color" = "border_color" WHERE "color" IS NULL`);
  }
}
