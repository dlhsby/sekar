import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Phase 3 — `activity_tags` table (ADR-038, May 2026).
 *
 * Mirrors `task_tags` so multi-worker activities (e.g. a `korlap` filing a
 * pruning activity that involved several `satgas`) surface on each tagged
 * user's activity feed via `GET /api/v1/activities?involving_me=true`.
 *
 * Owner stays the sole writer (`activities.user_id`); tagged users gain
 * read-only feed visibility plus an FCM push notification (notification
 * stub lands in a follow-up commit).
 */
export class ActivityTags17460004000000 implements MigrationInterface {
  name = 'ActivityTags17460004000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "activity_tags" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "activity_id" uuid NOT NULL,
        "user_id" uuid NOT NULL,
        "tagged_by" uuid NOT NULL,
        "created_at" timestamptz NOT NULL DEFAULT NOW(),
        CONSTRAINT "PK_activity_tags" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_activity_tags_activity_user" UNIQUE ("activity_id", "user_id"),
        CONSTRAINT "FK_activity_tags_activity"
          FOREIGN KEY ("activity_id") REFERENCES "activities"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_activity_tags_user"
          FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_activity_tags_tagged_by"
          FOREIGN KEY ("tagged_by") REFERENCES "users"("id") ON DELETE RESTRICT
      )
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_activity_tags_activity_id"
        ON "activity_tags" ("activity_id")
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_activity_tags_user_id"
        ON "activity_tags" ("user_id")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_activity_tags_user_id"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_activity_tags_activity_id"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "activity_tags"`);
  }
}
