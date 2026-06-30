import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Drop the rayon.code column and its unique constraint.
 *
 * Rayon identification now relies solely on name (already unique) and UUID.
 * The code field was a legacy artifact previously used for lookups.
 * This migration cleans up the schema.
 *
 * Idempotent: uses DROP CONSTRAINT IF EXISTS to handle multiple runs.
 * Irreversible: original code values are not recoverable.
 */
export class DropRayonCode17490800000000 implements MigrationInterface {
  name = 'DropRayonCode17490800000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Drop the unique constraint if it exists (name varies by historical state)
    await queryRunner.query(`ALTER TABLE "rayons" DROP CONSTRAINT IF EXISTS "UQ_rayons_code"`);

    // Drop the code column if it exists
    await queryRunner.query(`ALTER TABLE "rayons" DROP COLUMN IF EXISTS "code"`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Add back a nullable code column (data not recoverable — original values lost)
    await queryRunner.query(`ALTER TABLE "rayons" ADD COLUMN "code" character varying(50)`);
  }
}
