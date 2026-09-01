import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Drop the per-entity `marker_color` column (UAT): markers are now colorful
 * transparent images, so a separate configured color is redundant. The dynamic
 * status ring (active/inactive/inside/outside) is computed live from worker
 * activity — it never used this column. Additive-safe + idempotent.
 */
export class DropMarkerColor17491900000000 implements MigrationInterface {
  name = 'DropMarkerColor17491900000000';

  private readonly tables = ['roles', 'teams', 'rayons', 'regions', 'areas'];

  public async up(queryRunner: QueryRunner): Promise<void> {
    for (const table of this.tables) {
      await queryRunner.query(`ALTER TABLE "${table}" DROP COLUMN IF EXISTS "marker_color"`);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    for (const table of this.tables) {
      await queryRunner.query(
        `ALTER TABLE "${table}" ADD COLUMN IF NOT EXISTS "marker_color" VARCHAR(9)`,
      );
    }
  }
}
