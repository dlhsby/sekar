import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Phase 4 M3: Add persistent `color` field to rayons entity.
 *
 * Adds a nullable varchar(9) column to store hex color codes for rayon boundaries
 * on the monitoring map (e.g., '#7FBC8C'). The color is reused by both mobile and web
 * frontends for consistent visualization.
 *
 * Backfills the 7 geographic rayons with their canonical colors:
 *   SELATAN=#7FBC8C, UTARA=#2563EB, PUSAT=#E3A018, TIMUR1=#9333EA,
 *   TIMUR2=#F48572, BARAT1=#1A4D2E, BARAT2=#FDFD96.
 * TAMAN_AKTIF and any other non-geographic rayons remain NULL.
 *
 * Jun 9, 2026 — renumbered from `17480100000000` (which collided with
 * `AddUserPasswordMustChange17480100000000`, giving two migrations the same
 * timestamp — non-deterministic ordering and an ambiguous `migration:revert`
 * boundary). Bumped to `17480150000000` (still before `CreateNotificationPreferences`)
 * and made idempotent: `IF NOT EXISTS` so it is a safe no-op on any environment
 * that already ran the old-named version or had the column from dev `synchronize`.
 */
export class RayonColor17480150000000 implements MigrationInterface {
  name = 'RayonColor17480150000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add the color column (idempotent)
    await queryRunner.query(
      `ALTER TABLE "rayons" ADD COLUMN IF NOT EXISTS "color" varchar(9) NULL`,
    );

    // Backfill the 7 geographic rayons with their canonical colors.
    // Naturally idempotent — re-running sets the same value by code.
    const colorMap: Record<string, string> = {
      SELATAN: '#7FBC8C',
      UTARA: '#2563EB',
      PUSAT: '#E3A018',
      TIMUR1: '#9333EA',
      TIMUR2: '#F48572',
      BARAT1: '#1A4D2E',
      BARAT2: '#FDFD96',
    };

    for (const [code, color] of Object.entries(colorMap)) {
      await queryRunner.query(`UPDATE "rayons" SET "color" = $1 WHERE "code" = $2`, [color, code]);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop the color column (idempotent)
    await queryRunner.query(`ALTER TABLE "rayons" DROP COLUMN IF EXISTS "color"`);
  }
}
