import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Migrate standing schedule templates to ScheduleEvent rules (ADR-047, Phase 4).
 *
 * For every eligible user (satgas or linmas, active, not deleted, with a shift
 * definition and a resolvable location), create ONE daily static schedule_events
 * row representing their template as a recurring daily event.
 *
 * Multi-location users: collapse to their PRIMARY location (one event). Admins
 * can add more locations via the calendar later.
 *
 * IDEMPOTENT: checks NOT EXISTS before inserting, so retrying this migration
 * is safe. Skips users with no location — they simply stop being auto-rostered
 * until someone schedules them in the calendar (accepted Option-B trade-off).
 *
 * Down: best-effort delete of migrated rows, identified by the marker note
 * ('Migrated from standing template') + is_team=false + recurrence_type='daily'.
 */
export class MigrateTemplatesToScheduleEvents17492700000000 implements MigrationInterface {
  name = 'MigrateTemplatesToScheduleEvents17492700000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Insert ONE daily static schedule_events per eligible user, if not already
    // created. Location resolution: COALESCE(users.location_id, first
    // user_locations row ordered by created_at).
    await queryRunner.query(`
      INSERT INTO schedule_events (
        id,
        recurrence_type,
        start_date,
        end_date,
        recurrence_config,
        shift_definition_id,
        scope,
        location_id,
        region_id,
        is_team,
        user_id,
        pic_user_id,
        team_id,
        title,
        is_active,
        notes,
        created_by,
        updated_by,
        deleted_by,
        created_at,
        updated_at,
        deleted_at
      )
      SELECT
        gen_random_uuid(),
        'daily',
        CURRENT_DATE,
        NULL,
        NULL,
        u.shift_definition_id,
        'static',
        COALESCE(
          u.location_id,
          -- user_locations has NO deleted_at column; permanent assignments only,
          -- earliest first for determinism.
          (SELECT ul.location_id FROM user_locations ul
           WHERE ul.user_id = u.id AND ul.assignment_type = 'permanent'
           ORDER BY ul.assigned_at ASC, ul.location_id ASC LIMIT 1)
        ),
        NULL,
        false,
        u.id,
        NULL,
        NULL,
        NULL,
        true,
        'Migrated from standing template',
        u.created_by,
        NULL,
        NULL,
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP,
        NULL
      FROM users u
      WHERE
        u.role IN ('satgas', 'linmas')
        AND u.deleted_at IS NULL
        AND u.is_active = true
        AND u.shift_definition_id IS NOT NULL
        AND COALESCE(
          u.location_id,
          (SELECT ul.location_id FROM user_locations ul
           WHERE ul.user_id = u.id AND ul.assignment_type = 'permanent'
           ORDER BY ul.assigned_at ASC, ul.location_id ASC LIMIT 1)
        ) IS NOT NULL
        AND NOT EXISTS (
          SELECT 1 FROM schedule_events se
          WHERE se.user_id = u.id AND se.deleted_at IS NULL
        );
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Best-effort delete of migrated rows — the marker lives in NOTES (title is
    // NULL on migrated rows).
    await queryRunner.query(`
      DELETE FROM schedule_events
      WHERE
        is_team = false
        AND recurrence_type = 'daily'
        AND notes = 'Migrated from standing template'
        AND deleted_at IS NULL;
    `);
  }
}
