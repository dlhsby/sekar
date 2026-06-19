import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Mobile app release registry — one row per published build, surfaced as the
 * dynamic "Download the SEKAR app (vX.Y.Z)" link on web.
 */
export class CreateAppReleases17490003000000 implements MigrationInterface {
  name = 'CreateAppReleases17490003000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "app_releases" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "platform" varchar(10) NOT NULL,
        "channel" varchar(20) NOT NULL DEFAULT 'staging',
        "version" varchar(50) NOT NULL,
        "build_number" varchar(50) NOT NULL,
        "version_code" integer,
        "storage_key" varchar(500) NOT NULL,
        "file_size" bigint,
        "notes" text,
        "is_published" boolean NOT NULL DEFAULT true,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        "deleted_at" timestamptz
      )
    `);

    // "Latest" lookups filter by platform+channel+is_published and order by created_at.
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_app_releases_lookup"
      ON "app_releases" ("platform", "channel", "is_published", "created_at")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_app_releases_lookup"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "app_releases"`);
  }
}
