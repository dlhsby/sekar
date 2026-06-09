import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Phase 4-3 (§D1): create the `notification_preferences` table.
 *
 * One row per (user, notification_type) the user has explicitly toggled.
 * Absence of a row = enabled (default-on), so the table only stores opt-outs.
 * Additive + idempotent (IF NOT EXISTS) — safe on dev installs that may have
 * the table from a prior `synchronize` run.
 */
export class CreateNotificationPreferences17480200000000 implements MigrationInterface {
  name = 'CreateNotificationPreferences17480200000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "notification_preferences" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "user_id" uuid NOT NULL,
        "notification_type" varchar(50) NOT NULL,
        "enabled" boolean NOT NULL DEFAULT true,
        CONSTRAINT "PK_notification_preferences" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_notification_preferences_user_type"
          UNIQUE ("user_id", "notification_type"),
        CONSTRAINT "FK_notification_preferences_user"
          FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_notification_preferences_user"
        ON "notification_preferences" ("user_id")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_notification_preferences_user"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "notification_preferences"`);
  }
}
