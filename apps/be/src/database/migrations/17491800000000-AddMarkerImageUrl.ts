import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Marker-as-image (UAT): add a nullable `marker_image_url` TEXT column to every
 * entity that carries a map marker — roles, teams, rayons, regions, areas. The
 * value is either a preset path (`/markers/*.svg`) or a base64 data-URI for a
 * custom upload. Additive + idempotent — safe on live staging; the existing
 * `marker_icon`/`marker_color` columns are kept as a fallback.
 */
export class AddMarkerImageUrl17491800000000 implements MigrationInterface {
  name = 'AddMarkerImageUrl17491800000000';

  private readonly tables = ['roles', 'teams', 'rayons', 'regions', 'areas'];

  public async up(queryRunner: QueryRunner): Promise<void> {
    for (const table of this.tables) {
      await queryRunner.query(
        `ALTER TABLE "${table}" ADD COLUMN IF NOT EXISTS "marker_image_url" TEXT`,
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    for (const table of this.tables) {
      await queryRunner.query(`ALTER TABLE "${table}" DROP COLUMN IF EXISTS "marker_image_url"`);
    }
  }
}
