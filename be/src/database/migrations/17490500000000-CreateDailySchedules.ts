import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Daily roster: materialize the per-worker template (rayon + areas + one shift)
 * into one editable row per worker per WIB day.
 *
 * `daily_schedules` holds the day's plan + status (planned/absent/leave/replaced/
 * off); `daily_schedule_areas` holds the 0..N areas for that day (join table, so
 * monitoring/clock-in can join the area entities the geofence code expects).
 * A nightly cron generates tomorrow's rows from each user's template; admins
 * then edit them (leave / replacement / extra area / shift). Monitoring reads
 * today's roster as the "expected" denominator. See ADR-013 (materialized
 * daily-roster supersedes the Jun-26 derived-only model).
 */
export class CreateDailySchedules17490500000000 implements MigrationInterface {
  name = 'CreateDailySchedules17490500000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "daily_schedules" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "user_id" uuid NOT NULL,
        "schedule_date" date NOT NULL,
        "rayon_id" uuid,
        "shift_definition_id" uuid,
        "status" varchar(20) NOT NULL DEFAULT 'planned',
        "replacement_user_id" uuid,
        "original_user_id" uuid,
        "source" varchar(20) NOT NULL DEFAULT 'template',
        "is_overtime" boolean NOT NULL DEFAULT false,
        "notes" text,
        "created_by" uuid,
        "updated_by" uuid,
        "deleted_by" uuid,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        "deleted_at" timestamptz,
        CONSTRAINT "PK_daily_schedules" PRIMARY KEY ("id"),
        CONSTRAINT "FK_daily_schedules_user" FOREIGN KEY ("user_id")
          REFERENCES "users"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_daily_schedules_rayon" FOREIGN KEY ("rayon_id")
          REFERENCES "rayons"("id") ON DELETE SET NULL,
        CONSTRAINT "FK_daily_schedules_shift_definition" FOREIGN KEY ("shift_definition_id")
          REFERENCES "shift_definitions"("id") ON DELETE SET NULL,
        CONSTRAINT "FK_daily_schedules_replacement_user" FOREIGN KEY ("replacement_user_id")
          REFERENCES "users"("id") ON DELETE SET NULL,
        CONSTRAINT "FK_daily_schedules_original_user" FOREIGN KEY ("original_user_id")
          REFERENCES "users"("id") ON DELETE SET NULL
      )
    `);

    // One live roster row per worker per day (soft-deleted rows excluded so a
    // delete + regenerate is possible).
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "UQ_daily_schedules_user_date"
        ON "daily_schedules" ("user_id", "schedule_date")
        WHERE "deleted_at" IS NULL
    `);
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_daily_schedules_date" ON "daily_schedules" ("schedule_date")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_daily_schedules_rayon_date" ON "daily_schedules" ("rayon_id", "schedule_date")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_daily_schedules_status" ON "daily_schedules" ("status")`,
    );

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "daily_schedule_areas" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "daily_schedule_id" uuid NOT NULL,
        "area_id" uuid NOT NULL,
        "assigned_by" uuid,
        "assigned_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_daily_schedule_areas" PRIMARY KEY ("id"),
        CONSTRAINT "FK_daily_schedule_areas_schedule" FOREIGN KEY ("daily_schedule_id")
          REFERENCES "daily_schedules"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_daily_schedule_areas_area" FOREIGN KEY ("area_id")
          REFERENCES "areas"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "UQ_daily_schedule_areas"
        ON "daily_schedule_areas" ("daily_schedule_id", "area_id")
    `);
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_daily_schedule_areas_area" ON "daily_schedule_areas" ("area_id")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "daily_schedule_areas"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "daily_schedules"`);
  }
}
