import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Phase 4 sub-phase 4-7 (M3a): add `users.password_must_change` boolean.
 *
 * Defaults to false on existing rows so the column is non-blocking on add.
 * Admin password-reset operations set it true; `POST /auth/change-password`
 * clears it (per ADR-041).
 */
export class AddUserPasswordMustChange17480100000000 implements MigrationInterface {
  name = 'AddUserPasswordMustChange17480100000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "password_must_change" boolean NOT NULL DEFAULT false`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN IF EXISTS "password_must_change"`);
  }
}
