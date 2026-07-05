import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Drop the rayon.boundary_computed_at column.
 *
 * Rayon boundaries are now the official KMZ "Batas Wilayah Kerja Rayon" outlines
 * set by the seeder (static, like area geofences) — they are no longer derived
 * from member-area geofences via the (now-removed) RayonBoundaryService. With
 * auto-recompute gone, the "when was the boundary last computed" timestamp is
 * meaningless, so the column is removed.
 *
 * Idempotent: DROP COLUMN IF EXISTS. Reversible: re-adds a nullable column
 * (historical timestamps are not recoverable).
 */
export class DropRayonBoundaryComputedAt17491000000000 implements MigrationInterface {
  name = 'DropRayonBoundaryComputedAt17491000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "rayons" DROP COLUMN IF EXISTS "boundary_computed_at"`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "rayons" ADD COLUMN IF NOT EXISTS "boundary_computed_at" TIMESTAMPTZ NULL`,
    );
  }
}
