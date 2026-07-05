import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Phase 3 — backfill the `notification_tokens` table (May 1, 2026).
 *
 * The `NotificationToken` entity (apps/be/src/modules/notifications/entities/
 * notification-token.entity.ts) has been live since Phase 2B, but was always
 * relied on `synchronize=true` to auto-create in dev. Production migrations
 * never carried it. Without this table the seeder crashes on a fresh DB.
 *
 * This migration is purely additive and idempotent: existing dev installs
 * already have the table from synchronize, and IF NOT EXISTS keeps the
 * migration safe to re-run.
 */
export class NotificationTokens17460003500000 implements MigrationInterface {
  name = 'NotificationTokens17460003500000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'notification_tokens_platform_enum') THEN
          CREATE TYPE notification_tokens_platform_enum AS ENUM ('android', 'ios', 'web');
        END IF;
      END $$;
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "notification_tokens" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "user_id" uuid NOT NULL,
        "fcm_token" varchar(500) NOT NULL,
        "platform" notification_tokens_platform_enum NOT NULL DEFAULT 'android',
        "device_id" varchar(100),
        "device_name" varchar(100),
        "device_model" varchar(50),
        "app_version" varchar(50),
        "is_active" boolean NOT NULL DEFAULT true,
        "last_used_at" timestamptz,
        "created_at" timestamptz NOT NULL DEFAULT NOW(),
        "updated_at" timestamptz NOT NULL DEFAULT NOW(),
        CONSTRAINT "PK_notification_tokens" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_notification_tokens_fcm_token" UNIQUE ("fcm_token"),
        CONSTRAINT "FK_notification_tokens_user"
          FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_notification_tokens_user_id"
        ON "notification_tokens" ("user_id")
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_notification_tokens_fcm_token"
        ON "notification_tokens" ("fcm_token")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_notification_tokens_fcm_token"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_notification_tokens_user_id"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "notification_tokens"`);
    await queryRunner.query(`DROP TYPE IF EXISTS notification_tokens_platform_enum`);
  }
}
