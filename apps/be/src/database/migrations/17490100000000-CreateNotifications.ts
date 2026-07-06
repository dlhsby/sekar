import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Create the `notifications` table (Jun 20, 2026).
 *
 * The `Notification` entity (apps/be/src/modules/notifications/entities/
 * notification.entity.ts) has been live since Phase 2B but always relied on
 * `synchronize=true` to auto-create the table + its `notifications_type_enum` in
 * dev — no migration ever carried it (see the comment in
 * 17480000000000-Phase4NotificationTypes.ts). On migration-only environments
 * (staging, on-prem prod) the table is therefore missing and every
 * `/notifications*` endpoint 500s with `relation "notifications" does not exist`.
 *
 * Purely additive and idempotent: dev installs already have the table from
 * synchronize, and IF NOT EXISTS keeps this safe to (re-)run. The enum is created
 * with the FULL value set (base + Phase 4-3 + ADR-038 tagged + 3-8 overdue) so
 * the later `ADD VALUE IF NOT EXISTS` migrations remain no-ops.
 */
export class CreateNotifications17490100000000 implements MigrationInterface {
  name = 'CreateNotifications17490100000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'notifications_type_enum') THEN
          CREATE TYPE notifications_type_enum AS ENUM (
            'task_assigned', 'task_updated', 'task_completed', 'task_declined',
            'shift_reminder', 'report_submitted', 'announcement', 'system',
            'activity_approved', 'activity_rejected', 'overtime_approved',
            'overtime_rejected', 'missing_worker_alert', 'activity_tagged',
            'area_plant_overdue'
          );
        END IF;
      END $$;
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "notifications" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "user_id" uuid NOT NULL,
        "title" varchar(200) NOT NULL,
        "body" text NOT NULL,
        "type" notifications_type_enum NOT NULL DEFAULT 'system',
        "data" jsonb,
        "is_read" boolean NOT NULL DEFAULT false,
        "read_at" timestamptz,
        "is_sent" boolean NOT NULL DEFAULT false,
        "sent_at" timestamptz,
        "fcm_message_id" varchar(100),
        "send_attempts" integer NOT NULL DEFAULT 0,
        "error_message" text,
        "created_at" timestamptz NOT NULL DEFAULT NOW(),
        CONSTRAINT "PK_notifications" PRIMARY KEY ("id"),
        CONSTRAINT "FK_notifications_user"
          FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_notifications_user_id_is_read"
        ON "notifications" ("user_id", "is_read")
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_notifications_user_id_created_at"
        ON "notifications" ("user_id", "created_at")
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_notifications_type"
        ON "notifications" ("type")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_notifications_type"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_notifications_user_id_created_at"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_notifications_user_id_is_read"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "notifications"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "notifications_type_enum"`);
  }
}
