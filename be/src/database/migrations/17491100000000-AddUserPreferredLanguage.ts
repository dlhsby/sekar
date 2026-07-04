import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Add users.preferred_language ('id' | 'en').
 *
 * Stores each user's chosen UI language for the web + mobile clients so the
 * choice follows them across devices. The API stays English-canonical — only the
 * frontends localize; this column simply seeds the client's active language on
 * sign-in. Defaults to Indonesian ('id'), the product default.
 *
 * Idempotent: ADD COLUMN IF NOT EXISTS + guarded CHECK constraint. Reversible.
 */
export class AddUserPreferredLanguage17491100000000 implements MigrationInterface {
  name = 'AddUserPreferredLanguage17491100000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "preferred_language" VARCHAR(2) NOT NULL DEFAULT 'id'`,
    );
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'chk_users_preferred_language'
        ) THEN
          ALTER TABLE "users"
            ADD CONSTRAINT "chk_users_preferred_language"
            CHECK ("preferred_language" IN ('id', 'en'));
        END IF;
      END $$;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "users" DROP CONSTRAINT IF EXISTS "chk_users_preferred_language"`,
    );
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN IF EXISTS "preferred_language"`);
  }
}
