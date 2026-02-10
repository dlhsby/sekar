import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Remove Email Column Migration
 *
 * Removes the email column from users table as it's not required for Phase 1/2.
 * Email was added initially but is not used in authentication, notifications,
 * or any other feature.
 *
 * This migration:
 * - Drops idx_users_email index if it exists
 * - Drops email column from users table
 */
export class RemoveEmailColumn1738000000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    console.log('Removing email column from users table...');

    // Drop email index if it exists
    await queryRunner.query(`
      DROP INDEX IF EXISTS idx_users_email;
    `);

    // Drop email column if it exists
    await queryRunner.query(`
      ALTER TABLE users
      DROP COLUMN IF EXISTS email;
    `);

    console.log('✅ Email column removed successfully');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    console.log('Re-adding email column to users table...');

    // Add email column back (nullable for backward compatibility)
    await queryRunner.query(`
      ALTER TABLE users
      ADD COLUMN email VARCHAR(100) UNIQUE;
    `);

    // Recreate email index
    await queryRunner.query(`
      CREATE INDEX idx_users_email ON users(email);
    `);

    console.log('✅ Email column restored');
  }
}
