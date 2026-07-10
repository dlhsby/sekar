import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Settings backend (ADR-049): `system_config` override table + a personal
 * `preference_theme` column on users. Additive + idempotent — safe on live staging.
 */
export class AddSystemConfigAndPreferences17491400000000 implements MigrationInterface {
  name = 'AddSystemConfigAndPreferences17491400000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "system_config" (
        "id" UUID NOT NULL DEFAULT gen_random_uuid(),
        "key" VARCHAR(100) NOT NULL,
        "value" TEXT,
        "is_secret" BOOLEAN NOT NULL DEFAULT FALSE,
        "value_type" VARCHAR(10) NOT NULL DEFAULT 'string',
        "config_group" VARCHAR(40) NOT NULL,
        "updated_by" UUID,
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "pk_system_config" PRIMARY KEY ("id"),
        CONSTRAINT "uq_system_config_key" UNIQUE ("key")
      )
    `);

    await queryRunner.query(
      `ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "preference_theme" VARCHAR(10)`,
    );
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_users_preference_theme') THEN
          ALTER TABLE "users" ADD CONSTRAINT "chk_users_preference_theme"
            CHECK ("preference_theme" IS NULL OR "preference_theme" IN ('light','dark','system'));
        END IF;
      END $$;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "users" DROP CONSTRAINT IF EXISTS "chk_users_preference_theme"`,
    );
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN IF EXISTS "preference_theme"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "system_config"`);
  }
}
