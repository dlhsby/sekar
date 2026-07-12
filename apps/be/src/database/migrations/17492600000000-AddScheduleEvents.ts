import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Add ScheduleEvent (rule-based recurrence) and event materialization support.
 * Phase 4 backend: schedule_events + schedule_event_members tables, alter schedules
 * to add event_id + region_id + team_id + is_detached, replace roster uniqueness.
 *
 * IDEMPOTENT BY DESIGN — every step checks existence before creating.
 * Down() fully reverses all changes.
 */
export class AddScheduleEvents17492600000000 implements MigrationInterface {
  name = 'AddScheduleEvents17492600000000';

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

  private async indexExists(qr: QueryRunner, indexName: string): Promise<boolean> {
    const rows = await qr.query(
      `SELECT 1 FROM information_schema.tables
       WHERE table_schema = 'public' AND table_name = $1`,
      [indexName],
    );
    return rows?.length > 0;
  }

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create schedule_events table if not exists
    if (!(await this.tableExists(queryRunner, 'schedule_events'))) {
      await queryRunner.query(`
        CREATE TABLE schedule_events (
          id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
          title varchar(120),
          recurrence_type varchar(20) NOT NULL,
          start_date date NOT NULL,
          end_date date,
          recurrence_config jsonb,
          shift_definition_id uuid NOT NULL,
          scope varchar(10) NOT NULL,
          location_id uuid,
          region_id uuid,
          is_team boolean NOT NULL DEFAULT false,
          team_id uuid,
          pic_user_id uuid,
          user_id uuid,
          is_active boolean NOT NULL DEFAULT true,
          notes text,
          created_by uuid,
          updated_by uuid,
          deleted_by uuid,
          created_at timestamptz NOT NULL DEFAULT now(),
          updated_at timestamptz NOT NULL DEFAULT now(),
          deleted_at timestamptz,
          CONSTRAINT chk_schedule_events_recurrence
            CHECK (recurrence_type IN ('none', 'daily', 'every_n_days', 'weekly', 'specific_dates')),
          CONSTRAINT chk_schedule_events_scope
            CHECK ((scope = 'static' AND location_id IS NOT NULL AND region_id IS NULL)
              OR (scope = 'mobile' AND region_id IS NOT NULL AND location_id IS NULL)),
          CONSTRAINT chk_schedule_events_kind
            CHECK ((is_team = true AND team_id IS NOT NULL AND pic_user_id IS NOT NULL AND user_id IS NULL)
              OR (is_team = false AND user_id IS NOT NULL AND team_id IS NULL AND pic_user_id IS NULL)),
          FOREIGN KEY (shift_definition_id) REFERENCES shift_definitions(id) ON DELETE RESTRICT,
          FOREIGN KEY (location_id) REFERENCES locations(id) ON DELETE SET NULL,
          FOREIGN KEY (region_id) REFERENCES regions(id) ON DELETE SET NULL,
          FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE SET NULL,
          FOREIGN KEY (pic_user_id) REFERENCES users(id) ON DELETE SET NULL,
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )
      `);
    }

    // Create indexes on schedule_events
    if (
      !(await queryRunner
        .query(
          `SELECT 1 FROM information_schema.statistics
       WHERE table_schema = 'public' AND table_name = 'schedule_events' AND column_name = 'shift_definition_id'`,
        )
        .then((r) => r?.length > 0))
    ) {
      await queryRunner.query(
        `CREATE INDEX IF NOT EXISTS IDX_schedule_events_shift_definition ON schedule_events(shift_definition_id)`,
      );
    }

    if (
      !(await queryRunner
        .query(
          `SELECT 1 FROM information_schema.statistics
       WHERE table_schema = 'public' AND table_name = 'schedule_events' AND column_name = 'user_id'`,
        )
        .then((r) => r?.length > 0))
    ) {
      await queryRunner.query(
        `CREATE INDEX IF NOT EXISTS IDX_schedule_events_user ON schedule_events(user_id)`,
      );
    }

    if (
      !(await queryRunner
        .query(
          `SELECT 1 FROM information_schema.statistics
       WHERE table_schema = 'public' AND table_name = 'schedule_events' AND column_name = 'team_id'`,
        )
        .then((r) => r?.length > 0))
    ) {
      await queryRunner.query(
        `CREATE INDEX IF NOT EXISTS IDX_schedule_events_team ON schedule_events(team_id)`,
      );
    }

    if (
      !(await queryRunner
        .query(
          `SELECT 1 FROM information_schema.statistics
       WHERE table_schema = 'public' AND table_name = 'schedule_events' AND column_name = 'start_date'`,
        )
        .then((r) => r?.length > 0))
    ) {
      await queryRunner.query(
        `CREATE INDEX IF NOT EXISTS IDX_schedule_events_start_date ON schedule_events(start_date)`,
      );
    }

    // Create schedule_event_members table if not exists
    if (!(await this.tableExists(queryRunner, 'schedule_event_members'))) {
      await queryRunner.query(`
        CREATE TABLE schedule_event_members (
          schedule_event_id uuid NOT NULL,
          user_id uuid NOT NULL,
          PRIMARY KEY (schedule_event_id, user_id),
          FOREIGN KEY (schedule_event_id) REFERENCES schedule_events(id) ON DELETE CASCADE,
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )
      `);
    }

    // Add columns to schedules table if not exists
    if (!(await this.columnExists(queryRunner, 'schedules', 'schedule_event_id'))) {
      await queryRunner.query(
        `ALTER TABLE schedules ADD COLUMN schedule_event_id uuid REFERENCES schedule_events(id) ON DELETE SET NULL`,
      );
    }

    if (!(await this.columnExists(queryRunner, 'schedules', 'region_id'))) {
      await queryRunner.query(
        `ALTER TABLE schedules ADD COLUMN region_id uuid REFERENCES regions(id) ON DELETE SET NULL`,
      );
    }

    if (!(await this.columnExists(queryRunner, 'schedules', 'team_id'))) {
      await queryRunner.query(
        `ALTER TABLE schedules ADD COLUMN team_id uuid REFERENCES teams(id) ON DELETE SET NULL`,
      );
    }

    if (!(await this.columnExists(queryRunner, 'schedules', 'is_detached'))) {
      await queryRunner.query(
        `ALTER TABLE schedules ADD COLUMN is_detached boolean NOT NULL DEFAULT false`,
      );
    }

    // Add index for schedule_event_id
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS IDX_schedules_schedule_event ON schedules(schedule_event_id)`,
    );

    // Replace roster uniqueness constraint: drop old, add new
    // The old constraint is UQ_schedules_user_date — drop it if it exists
    try {
      await queryRunner.query(`ALTER TABLE schedules DROP CONSTRAINT UQ_schedules_user_date`);
    } catch {
      // Already dropped or doesn't exist
    }

    // Add new unique constraint that includes shift_definition_id
    try {
      await queryRunner.query(
        `CREATE UNIQUE INDEX UQ_schedules_user_date_shift
         ON schedules(user_id, schedule_date, shift_definition_id)
         WHERE deleted_at IS NULL`,
      );
    } catch {
      // Already exists
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop new index
    try {
      await queryRunner.query(`DROP INDEX IF EXISTS UQ_schedules_user_date_shift`);
    } catch {
      // Already gone
    }

    // Recreate old unique index
    try {
      await queryRunner.query(
        `CREATE UNIQUE INDEX UQ_schedules_user_date
         ON schedules(user_id, schedule_date)
         WHERE deleted_at IS NULL`,
      );
    } catch {
      // Already exists
    }

    // Drop columns from schedules
    if (await this.columnExists(queryRunner, 'schedules', 'is_detached')) {
      await queryRunner.query(`ALTER TABLE schedules DROP COLUMN is_detached`);
    }

    if (await this.columnExists(queryRunner, 'schedules', 'team_id')) {
      await queryRunner.query(`ALTER TABLE schedules DROP COLUMN team_id`);
    }

    if (await this.columnExists(queryRunner, 'schedules', 'region_id')) {
      await queryRunner.query(`ALTER TABLE schedules DROP COLUMN region_id`);
    }

    if (await this.columnExists(queryRunner, 'schedules', 'schedule_event_id')) {
      await queryRunner.query(`ALTER TABLE schedules DROP COLUMN schedule_event_id`);
    }

    // Drop index on schedule_event_id if exists
    try {
      await queryRunner.query(`DROP INDEX IF EXISTS IDX_schedules_schedule_event`);
    } catch {
      // Already gone
    }

    // Drop schedule_event_members table
    if (await this.tableExists(queryRunner, 'schedule_event_members')) {
      await queryRunner.query(`DROP TABLE schedule_event_members`);
    }

    // Drop schedule_events table
    if (await this.tableExists(queryRunner, 'schedule_events')) {
      await queryRunner.query(`DROP TABLE schedule_events`);
    }
  }
}
