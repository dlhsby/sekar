import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Phase 4-6 (I3 + B3): production index audit closure + location daily
 * summaries table.
 *
 * Index audit (spec backend.md §I3) found 2 of 11 required indexes missing:
 * activities(user_id, status) and overtimes(user_id, status). The rest exist
 * via earlier migrations / entity decorators.
 *
 * `location_daily_summaries` (spec database.md §A3) preserves per-user daily
 * aggregates so the 90-day location_logs retention purge (I1) loses no
 * reporting data.
 */
export class AddProductionIndexesAndDailySummaries17480600000000 implements MigrationInterface {
  name = 'AddProductionIndexesAndDailySummaries17480600000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "idx_activities_user_status" ON "activities" ("user_id", "status")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "idx_overtimes_user_status" ON "overtimes" ("user_id", "status")`,
    );

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "location_daily_summaries" (
        "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "user_id" UUID NOT NULL REFERENCES "users"("id"),
        "date" DATE NOT NULL,
        "total_pings" INT DEFAULT 0,
        "first_ping_at" TIMESTAMP WITH TIME ZONE,
        "last_ping_at" TIMESTAMP WITH TIME ZONE,
        "avg_latitude" DECIMAL(10, 7),
        "avg_longitude" DECIMAL(11, 7),
        "within_area_pings" INT DEFAULT 0,
        "outside_area_pings" INT DEFAULT 0,
        "location_id" UUID REFERENCES "areas"("id") ON DELETE SET NULL,
        "rayon_id" UUID REFERENCES "rayons"("id") ON DELETE SET NULL,
        "is_backfilled" BOOLEAN DEFAULT false,
        "created_at" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        CONSTRAINT "uq_location_summary_user_date" UNIQUE ("user_id", "date")
      )
    `);
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "idx_location_summaries_date" ON "location_daily_summaries" ("date")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "location_daily_summaries"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_overtimes_user_status"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_activities_user_status"`);
  }
}
