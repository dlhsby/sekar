import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Phase 4-5 — async export job tracking (`export_jobs`).
 *
 * `file_url` stores the S3 object key (presigned URLs are minted per request).
 * CHECK constraints mirror the entity's allowed status/format/entity_type values.
 */
export class CreateExportJobs17480500000000 implements MigrationInterface {
  name = 'CreateExportJobs17480500000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "export_jobs" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "user_id" uuid NOT NULL,
        "entity_type" varchar(30) NOT NULL,
        "format" varchar(10) NOT NULL,
        "status" varchar(20) NOT NULL DEFAULT 'processing',
        "file_url" text,
        "row_count" integer NOT NULL DEFAULT 0,
        "error_message" text,
        "retry_count" integer NOT NULL DEFAULT 0,
        "filters" jsonb,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_export_jobs" PRIMARY KEY ("id"),
        CONSTRAINT "FK_export_jobs_user" FOREIGN KEY ("user_id")
          REFERENCES "users"("id") ON DELETE CASCADE,
        CONSTRAINT "chk_export_jobs_status"
          CHECK ("status" IN ('processing', 'completed', 'failed')),
        CONSTRAINT "chk_export_jobs_format"
          CHECK ("format" IN ('csv', 'xlsx', 'kmz')),
        CONSTRAINT "chk_export_jobs_entity_type"
          CHECK ("entity_type" IN ('users', 'areas', 'rayons', 'tasks', 'activities', 'overtime', 'schedules'))
      )
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_export_jobs_user_status"
        ON "export_jobs" ("user_id", "status")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_export_jobs_user_status"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "export_jobs"`);
  }
}
