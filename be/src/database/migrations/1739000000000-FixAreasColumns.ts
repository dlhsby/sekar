import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Fix Areas Table Columns
 *
 * The InitialSchema migration created areas table with incorrect column names:
 * - latitude/longitude instead of gps_lat/gps_lng (entity uses gps_lat/gps_lng)
 *
 * This migration also adds missing columns and constraints per specs/database/schema.md:
 * - Renames latitude → gps_lat
 * - Renames longitude → gps_lng
 * - Adds radius_meters column (with CHECK constraint)
 * - Adds CHECK constraints for gps_lat and gps_lng ranges
 * - Sets NOT NULL on gps_lat and gps_lng
 */
export class FixAreasColumns1739000000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    console.log('Fixing areas table columns...');

    // Rename latitude to gps_lat
    await queryRunner.query(`
      ALTER TABLE areas
      RENAME COLUMN latitude TO gps_lat;
    `);

    // Rename longitude to gps_lng
    await queryRunner.query(`
      ALTER TABLE areas
      RENAME COLUMN longitude TO gps_lng;
    `);

    // Add radius_meters column if it doesn't exist
    await queryRunner.query(`
      ALTER TABLE areas
      ADD COLUMN IF NOT EXISTS radius_meters INTEGER DEFAULT 100;
    `);

    // Set NOT NULL on gps_lat and gps_lng (update any NULL values first)
    await queryRunner.query(`
      UPDATE areas SET gps_lat = 0 WHERE gps_lat IS NULL;
    `);
    await queryRunner.query(`
      UPDATE areas SET gps_lng = 0 WHERE gps_lng IS NULL;
    `);
    await queryRunner.query(`
      ALTER TABLE areas
      ALTER COLUMN gps_lat SET NOT NULL;
    `);
    await queryRunner.query(`
      ALTER TABLE areas
      ALTER COLUMN gps_lng SET NOT NULL;
    `);

    // Add CHECK constraints for GPS coordinates
    await queryRunner.query(`
      ALTER TABLE areas
      ADD CONSTRAINT chk_areas_gps_lat
      CHECK (gps_lat BETWEEN -90 AND 90);
    `);
    await queryRunner.query(`
      ALTER TABLE areas
      ADD CONSTRAINT chk_areas_gps_lng
      CHECK (gps_lng BETWEEN -180 AND 180);
    `);

    // Add CHECK constraint for radius_meters
    await queryRunner.query(`
      ALTER TABLE areas
      ADD CONSTRAINT chk_areas_radius
      CHECK (radius_meters BETWEEN 1 AND 10000);
    `);

    console.log('✅ Areas table columns fixed successfully');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    console.log('Reverting areas table column fixes...');

    // Drop CHECK constraints
    await queryRunner.query(`
      ALTER TABLE areas
      DROP CONSTRAINT IF EXISTS chk_areas_radius;
    `);
    await queryRunner.query(`
      ALTER TABLE areas
      DROP CONSTRAINT IF EXISTS chk_areas_gps_lng;
    `);
    await queryRunner.query(`
      ALTER TABLE areas
      DROP CONSTRAINT IF EXISTS chk_areas_gps_lat;
    `);

    // Rename columns back
    await queryRunner.query(`
      ALTER TABLE areas
      RENAME COLUMN gps_lng TO longitude;
    `);
    await queryRunner.query(`
      ALTER TABLE areas
      RENAME COLUMN gps_lat TO latitude;
    `);

    console.log('✅ Areas table reverted');
  }
}
