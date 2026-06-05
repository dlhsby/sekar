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
 */
export class RayonColor17480100000000 implements MigrationInterface {
  name = 'RayonColor17480100000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add the color column
    await queryRunner.query(`ALTER TABLE "rayons" ADD COLUMN "color" varchar(9) NULL`);

    // Backfill the 7 geographic rayons with their canonical colors
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
    // Drop the color column
    await queryRunner.query(`ALTER TABLE "rayons" DROP COLUMN "color"`);
  }
}
