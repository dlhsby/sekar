import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Remove Area Code and Description Columns
 *
 * The InitialSchema migration incorrectly added code and description columns
 * to the areas table, which are not in the specification (specs/database/schema.md).
 *
 * This migration:
 * - Drops code column if it exists
 * - Drops description column if it exists
 * - Updates name column from VARCHAR(200) to VARCHAR(100) per spec
 */
export class RemoveAreaCodeAndDescription1740000000000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    console.log('Removing code and description columns from areas table...');

    // Drop code column if it exists
    await queryRunner.query(`
      ALTER TABLE areas
      DROP COLUMN IF EXISTS code;
    `);

    // Drop description column if it exists
    await queryRunner.query(`
      ALTER TABLE areas
      DROP COLUMN IF EXISTS description;
    `);

    // Update name column length to match spec
    await queryRunner.query(`
      ALTER TABLE areas
      ALTER COLUMN name TYPE VARCHAR(100);
    `);

    console.log('✅ Areas table columns corrected to match specification');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    console.log('Reverting areas table column changes...');

    // Add columns back (for rollback only)
    await queryRunner.query(`
      ALTER TABLE areas
      ADD COLUMN IF NOT EXISTS code VARCHAR(50) UNIQUE;
    `);

    await queryRunner.query(`
      ALTER TABLE areas
      ADD COLUMN IF NOT EXISTS description TEXT;
    `);

    await queryRunner.query(`
      ALTER TABLE areas
      ALTER COLUMN name TYPE VARCHAR(200);
    `);

    console.log('✅ Areas table reverted');
  }
}
