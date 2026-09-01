import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Phase 4 follow-up: rename the "team type" concept to "team category"
 * (UI label "Kategori Tim") across the schema — table, columns, indexes and
 * constraints. Purely a rename; no data is lost and FK relationships are
 * preserved (Postgres RENAME propagates to dependent constraints/indexes).
 *
 * team_types                 → team_categories
 * schedule_events.team_type_id → schedule_events.team_category_id
 * schedules.team_type_id       → schedules.team_category_id
 *
 * Idempotent: every step is guarded so a partial/rerun is safe.
 */
export class RenameTeamTypeToTeamCategory17494000000000 implements MigrationInterface {
  name = 'RenameTeamTypeToTeamCategory17494000000000';

  private async regExists(qr: QueryRunner, qualified: string): Promise<boolean> {
    const rows = await qr.query(`SELECT to_regclass($1) AS reg`, [qualified]);
    return rows?.[0]?.reg != null;
  }

  private async columnExists(qr: QueryRunner, table: string, column: string): Promise<boolean> {
    const rows = await qr.query(
      `SELECT 1 FROM information_schema.columns
       WHERE table_schema = 'public' AND table_name = $1 AND column_name = $2`,
      [table, column],
    );
    return rows?.length > 0;
  }

  private async constraintExists(qr: QueryRunner, name: string): Promise<boolean> {
    const rows = await qr.query(`SELECT 1 FROM pg_constraint WHERE conname = $1`, [name]);
    return rows?.length > 0;
  }

  public async up(queryRunner: QueryRunner): Promise<void> {
    // ---- table + its own constraints ----
    if (
      (await this.regExists(queryRunner, 'public.team_types')) &&
      !(await this.regExists(queryRunner, 'public.team_categories'))
    ) {
      await queryRunner.query(`ALTER TABLE "team_types" RENAME TO "team_categories"`);
    }
    if (await this.constraintExists(queryRunner, 'pk_team_types')) {
      await queryRunner.query(
        `ALTER TABLE "team_categories" RENAME CONSTRAINT "pk_team_types" TO "pk_team_categories"`,
      );
    }
    if (await this.constraintExists(queryRunner, 'uq_team_types_name')) {
      await queryRunner.query(
        `ALTER TABLE "team_categories" RENAME CONSTRAINT "uq_team_types_name" TO "uq_team_categories_name"`,
      );
    }
    if (await this.constraintExists(queryRunner, 'chk_team_types_marker_color')) {
      await queryRunner.query(
        `ALTER TABLE "team_categories" RENAME CONSTRAINT "chk_team_types_marker_color" TO "chk_team_categories_marker_color"`,
      );
    }

    // ---- schedule_events.team_type_id ----
    if (await this.columnExists(queryRunner, 'schedule_events', 'team_type_id')) {
      await queryRunner.query(
        `ALTER TABLE "schedule_events" RENAME COLUMN "team_type_id" TO "team_category_id"`,
      );
    }
    if (await this.constraintExists(queryRunner, 'schedule_events_team_type_id_fkey')) {
      await queryRunner.query(
        `ALTER TABLE "schedule_events" RENAME CONSTRAINT "schedule_events_team_type_id_fkey" TO "schedule_events_team_category_id_fkey"`,
      );
    }
    await queryRunner.query(
      `ALTER INDEX IF EXISTS "IDX_schedule_events_team_type" RENAME TO "IDX_schedule_events_team_category"`,
    );

    // ---- schedules.team_type_id ----
    if (await this.columnExists(queryRunner, 'schedules', 'team_type_id')) {
      await queryRunner.query(
        `ALTER TABLE "schedules" RENAME COLUMN "team_type_id" TO "team_category_id"`,
      );
    }
    if (await this.constraintExists(queryRunner, 'schedules_team_type_id_fkey')) {
      await queryRunner.query(
        `ALTER TABLE "schedules" RENAME CONSTRAINT "schedules_team_type_id_fkey" TO "schedules_team_category_id_fkey"`,
      );
    }
    await queryRunner.query(
      `ALTER INDEX IF EXISTS "IDX_schedules_team_type" RENAME TO "IDX_schedules_team_category"`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // ---- schedules.team_category_id ----
    await queryRunner.query(
      `ALTER INDEX IF EXISTS "IDX_schedules_team_category" RENAME TO "IDX_schedules_team_type"`,
    );
    if (await this.constraintExists(queryRunner, 'schedules_team_category_id_fkey')) {
      await queryRunner.query(
        `ALTER TABLE "schedules" RENAME CONSTRAINT "schedules_team_category_id_fkey" TO "schedules_team_type_id_fkey"`,
      );
    }
    if (await this.columnExists(queryRunner, 'schedules', 'team_category_id')) {
      await queryRunner.query(
        `ALTER TABLE "schedules" RENAME COLUMN "team_category_id" TO "team_type_id"`,
      );
    }

    // ---- schedule_events.team_category_id ----
    await queryRunner.query(
      `ALTER INDEX IF EXISTS "IDX_schedule_events_team_category" RENAME TO "IDX_schedule_events_team_type"`,
    );
    if (await this.constraintExists(queryRunner, 'schedule_events_team_category_id_fkey')) {
      await queryRunner.query(
        `ALTER TABLE "schedule_events" RENAME CONSTRAINT "schedule_events_team_category_id_fkey" TO "schedule_events_team_type_id_fkey"`,
      );
    }
    if (await this.columnExists(queryRunner, 'schedule_events', 'team_category_id')) {
      await queryRunner.query(
        `ALTER TABLE "schedule_events" RENAME COLUMN "team_category_id" TO "team_type_id"`,
      );
    }

    // ---- table + its own constraints ----
    if (await this.constraintExists(queryRunner, 'chk_team_categories_marker_color')) {
      await queryRunner.query(
        `ALTER TABLE "team_categories" RENAME CONSTRAINT "chk_team_categories_marker_color" TO "chk_team_types_marker_color"`,
      );
    }
    if (await this.constraintExists(queryRunner, 'uq_team_categories_name')) {
      await queryRunner.query(
        `ALTER TABLE "team_categories" RENAME CONSTRAINT "uq_team_categories_name" TO "uq_team_types_name"`,
      );
    }
    if (await this.constraintExists(queryRunner, 'pk_team_categories')) {
      await queryRunner.query(
        `ALTER TABLE "team_categories" RENAME CONSTRAINT "pk_team_categories" TO "pk_team_types"`,
      );
    }
    if (
      (await this.regExists(queryRunner, 'public.team_categories')) &&
      !(await this.regExists(queryRunner, 'public.team_types'))
    ) {
      await queryRunner.query(`ALTER TABLE "team_categories" RENAME TO "team_types"`);
    }
  }
}
