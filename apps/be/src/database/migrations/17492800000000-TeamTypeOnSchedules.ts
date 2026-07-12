import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Phase 4: Teams become type-only; team type (crew category) + metadata live on schedule_events.
 * The standing `teams` table is removed. This migration is idempotent by design.
 *
 * CRITICAL: This is the ONLY Phase 4 migration. Data loss is local (dev only).
 * Down() safely reverts: recreates empty tables for rollback compatibility.
 *
 * ADR-048 (amended): team_type defines crew type; concrete team membership is per-event.
 */
export class TeamTypeOnSchedules17492800000000 implements MigrationInterface {
  name = 'TeamTypeOnSchedules17492800000000';

  private async tableExists(qr: QueryRunner, name: string): Promise<boolean> {
    const rows = await qr.query(`SELECT to_regclass('public.${name}') AS reg`);
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

  private async constraintExists(
    qr: QueryRunner,
    table: string,
    constraint: string,
  ): Promise<boolean> {
    const rows = await qr.query(
      `SELECT 1 FROM information_schema.table_constraints
       WHERE table_schema = 'public' AND table_name = $1 AND constraint_name = $2`,
      [table, constraint],
    );
    return rows?.length > 0;
  }

  public async up(queryRunner: QueryRunner): Promise<void> {
    // ============ drop the LEGACY one-row-per-day unique index ============
    // 17490500000000 created the roster as `daily_schedules` with
    // "UQ_daily_schedules_user_date"; the ADR-047 migration (17492600000000)
    // only dropped the newer "UQ_schedules_user_date" name, so on a
    // migrations-built DB the legacy index still blocked multi-shift days and
    // overlap-allowed scheduling. The (user, date, shift) index from
    // 17492600000000 remains the roster uniqueness rule.
    await queryRunner.query(`DROP INDEX IF EXISTS "UQ_daily_schedules_user_date"`);

    // ============ team_types: add marker columns ============
    if (!(await this.columnExists(queryRunner, 'team_types', 'marker_image_url'))) {
      await queryRunner.query(`ALTER TABLE team_types ADD COLUMN marker_image_url TEXT NULL`);
    }

    if (!(await this.columnExists(queryRunner, 'team_types', 'marker_color'))) {
      await queryRunner.query(`ALTER TABLE team_types ADD COLUMN marker_color VARCHAR(7) NULL`);
      // Add check constraint for hex color format
      if (
        !(await this.constraintExists(queryRunner, 'team_types', 'chk_team_types_marker_color'))
      ) {
        await queryRunner.query(
          `ALTER TABLE team_types ADD CONSTRAINT chk_team_types_marker_color
           CHECK (marker_color IS NULL OR marker_color ~ '^#[0-9A-Fa-f]{6}$')`,
        );
      }
    }

    // Backfill marker_image_url from teams table if it exists
    if (await this.tableExists(queryRunner, 'teams')) {
      await queryRunner.query(
        `UPDATE team_types tt SET marker_image_url = t.marker_image_url
         FROM teams t
         WHERE t.team_type_id = tt.id AND tt.marker_image_url IS NULL`,
      );
    }

    // ============ schedule_events: rename team_id to team_type_id ============
    if (!(await this.columnExists(queryRunner, 'schedule_events', 'team_type_id'))) {
      // Create new team_type_id column with FK to team_types
      await queryRunner.query(
        `ALTER TABLE schedule_events ADD COLUMN team_type_id uuid NULL
         REFERENCES team_types(id) ON DELETE SET NULL`,
      );

      // Backfill team_type_id from team_id (via teams table)
      if (await this.tableExists(queryRunner, 'teams')) {
        await queryRunner.query(
          `UPDATE schedule_events se SET team_type_id = t.team_type_id
           FROM teams t
           WHERE se.team_id = t.id`,
        );
      }

      // Drop and recreate the kind constraint to replace team_id with team_type_id
      if (await this.constraintExists(queryRunner, 'schedule_events', 'chk_schedule_events_kind')) {
        await queryRunner.query(
          `ALTER TABLE schedule_events DROP CONSTRAINT chk_schedule_events_kind`,
        );
      }

      await queryRunner.query(
        `ALTER TABLE schedule_events ADD CONSTRAINT chk_schedule_events_kind
         CHECK ((is_team = true AND team_type_id IS NOT NULL AND pic_user_id IS NOT NULL AND user_id IS NULL)
           OR (is_team = false AND user_id IS NOT NULL AND team_type_id IS NULL AND pic_user_id IS NULL))`,
      );

      // Drop old team_id FK and column
      if (await this.columnExists(queryRunner, 'schedule_events', 'team_id')) {
        await queryRunner.query(
          `ALTER TABLE schedule_events DROP CONSTRAINT IF EXISTS "FK_schedule_events_team_id"`,
        );
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_schedule_events_team"`);
        await queryRunner.query(`ALTER TABLE schedule_events DROP COLUMN team_id`);
      }

      // Create index on team_type_id
      await queryRunner.query(
        `CREATE INDEX IF NOT EXISTS "IDX_schedule_events_team_type" ON schedule_events(team_type_id)`,
      );
    }

    // ============ schedules: rename team_id to team_type_id ============
    if (!(await this.columnExists(queryRunner, 'schedules', 'team_type_id'))) {
      await queryRunner.query(
        `ALTER TABLE schedules ADD COLUMN team_type_id uuid NULL
         REFERENCES team_types(id) ON DELETE SET NULL`,
      );

      // Backfill team_type_id from team_id (via teams table)
      if (await this.tableExists(queryRunner, 'teams')) {
        await queryRunner.query(
          `UPDATE schedules s SET team_type_id = t.team_type_id
           FROM teams t
           WHERE s.team_id = t.id`,
        );
      }

      // Drop old team_id FK and column
      if (await this.columnExists(queryRunner, 'schedules', 'team_id')) {
        await queryRunner.query(
          `ALTER TABLE schedules DROP CONSTRAINT IF EXISTS "FK_schedules_team_id"`,
        );
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_schedules_team"`);
        await queryRunner.query(`ALTER TABLE schedules DROP COLUMN team_id`);
      }

      // Create index on team_type_id
      await queryRunner.query(
        `CREATE INDEX IF NOT EXISTS "IDX_schedules_team_type" ON schedules(team_type_id)`,
      );
    }

    // ============ Drop teams table ============
    if (await this.tableExists(queryRunner, 'teams')) {
      await queryRunner.query(`DROP TABLE teams`);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // ============ Recreate teams table (empty skeleton) ============
    if (!(await this.tableExists(queryRunner, 'teams'))) {
      await queryRunner.query(
        `CREATE TABLE teams (
          id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
          name varchar(100) NOT NULL,
          team_type_id uuid NOT NULL,
          marker_icon varchar(50),
          marker_image_url text,
          is_active boolean NOT NULL DEFAULT true,
          created_at timestamptz NOT NULL DEFAULT now(),
          updated_at timestamptz NOT NULL DEFAULT now(),
          deleted_at timestamptz,
          created_by uuid,
          updated_by uuid,
          deleted_by uuid,
          CONSTRAINT "FK_teams_team_type_id" FOREIGN KEY (team_type_id) REFERENCES team_types(id) ON DELETE RESTRICT
        )`,
      );
    }

    // ============ schedules: restore team_id ============
    if (!(await this.columnExists(queryRunner, 'schedules', 'team_id'))) {
      await queryRunner.query(
        `ALTER TABLE schedules ADD COLUMN team_id uuid NULL
         REFERENCES teams(id) ON DELETE SET NULL`,
      );

      // Drop team_type_id if it exists
      if (await this.columnExists(queryRunner, 'schedules', 'team_type_id')) {
        await queryRunner.query(
          `ALTER TABLE schedules DROP CONSTRAINT IF EXISTS "FK_schedules_team_type_id"`,
        );
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_schedules_team_type"`);
        await queryRunner.query(`ALTER TABLE schedules DROP COLUMN team_type_id`);
      }

      // Create index on team_id
      await queryRunner.query(
        `CREATE INDEX IF NOT EXISTS "IDX_schedules_team" ON schedules(team_id)`,
      );
    }

    // ============ schedule_events: restore team_id ============
    if (!(await this.columnExists(queryRunner, 'schedule_events', 'team_id'))) {
      await queryRunner.query(
        `ALTER TABLE schedule_events ADD COLUMN team_id uuid NULL
         REFERENCES teams(id) ON DELETE SET NULL`,
      );

      // Drop and restore the kind constraint
      if (await this.constraintExists(queryRunner, 'schedule_events', 'chk_schedule_events_kind')) {
        await queryRunner.query(
          `ALTER TABLE schedule_events DROP CONSTRAINT chk_schedule_events_kind`,
        );
      }

      await queryRunner.query(
        `ALTER TABLE schedule_events ADD CONSTRAINT chk_schedule_events_kind
         CHECK ((is_team = true AND team_id IS NOT NULL AND pic_user_id IS NOT NULL AND user_id IS NULL)
           OR (is_team = false AND user_id IS NOT NULL AND team_id IS NULL AND pic_user_id IS NULL))`,
      );

      // Drop team_type_id if it exists
      if (await this.columnExists(queryRunner, 'schedule_events', 'team_type_id')) {
        await queryRunner.query(
          `ALTER TABLE schedule_events DROP CONSTRAINT IF EXISTS "FK_schedule_events_team_type_id"`,
        );
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_schedule_events_team_type"`);
        await queryRunner.query(`ALTER TABLE schedule_events DROP COLUMN team_type_id`);
      }

      // Create index on team_id
      await queryRunner.query(
        `CREATE INDEX IF NOT EXISTS "IDX_schedule_events_team" ON schedule_events(team_id)`,
      );
    }

    // ============ team_types: remove marker columns ============
    if (await this.columnExists(queryRunner, 'team_types', 'marker_color')) {
      if (await this.constraintExists(queryRunner, 'team_types', 'chk_team_types_marker_color')) {
        await queryRunner.query(
          `ALTER TABLE team_types DROP CONSTRAINT chk_team_types_marker_color`,
        );
      }
      await queryRunner.query(`ALTER TABLE team_types DROP COLUMN marker_color`);
    }

    if (await this.columnExists(queryRunner, 'team_types', 'marker_image_url')) {
      await queryRunner.query(`ALTER TABLE team_types DROP COLUMN marker_image_url`);
    }
  }
}
