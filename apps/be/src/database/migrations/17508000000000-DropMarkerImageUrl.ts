import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Phase 4 marker unification (ADR-051): drop `marker_image_url` column from all
 * entities now that markers are rendered as glyph+color pins. The image-based
 * system is retired; only marker_icon (glyph) and marker_color (pin fill) remain.
 */
export class DropMarkerImageUrl1750800000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    const tables = ['rayons', 'regions', 'locations', 'roles', 'team_categories'];
    for (const table of tables) {
      await queryRunner.query(`ALTER TABLE "${table}" DROP COLUMN IF EXISTS "marker_image_url"`);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Re-add as nullable TEXT for rollback
    const tables = [
      { name: 'rayons', desc: 'rayon' },
      { name: 'regions', desc: 'region' },
      { name: 'locations', desc: 'location' },
      { name: 'roles', desc: 'role' },
      { name: 'team_categories', desc: 'team category' },
    ];
    for (const { name } of tables) {
      await queryRunner.query(
        `ALTER TABLE "${name}" ADD COLUMN IF NOT EXISTS "marker_image_url" TEXT`,
      );
    }
  }
}
