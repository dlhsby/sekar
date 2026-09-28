import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Assignment policy (ADR-063): the roster uniqueness key gains the TEAM.
 *
 * Before: (user, date, shift, place) — so a satgas assigned individually to
 * Taman A could not ALSO be in a team working Taman A in the same shift, and a
 * korlap could not be in two teams at one place. The user rule is: one
 * individual place + one team per shift for satgas/linmas (role limits,
 * enforced by AssignmentPolicyService), unlimited for korlap.
 *
 * After: (user, date, shift, place, team event or nil). Team rows are the ones
 * carrying `team_category_id` (team events require one); their event id makes
 * each team distinct. Individual rows keep nil, so an individual is still
 * unique per place. Exact duplicates stay impossible at the DB level.
 *
 * DO NOT RENAME this class — TypeORM keys applied migrations by className + timestamp.
 */
export class ScheduleUniqueWithTeam17546000000000 implements MigrationInterface {
  name = 'ScheduleUniqueWithTeam17546000000000';

  public async up(qr: QueryRunner): Promise<void> {
    await qr.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "UQ_schedules_user_date_shift_place_team"
        ON schedules (
          user_id,
          schedule_date,
          shift_definition_id,
          COALESCE(location_id, region_id, district_id, '00000000-0000-0000-0000-000000000000'::uuid),
          COALESCE(
            CASE WHEN team_category_id IS NOT NULL THEN schedule_event_id END,
            '00000000-0000-0000-0000-000000000000'::uuid
          )
        )
        WHERE deleted_at IS NULL`);
    // The new key is strictly looser; drop the old one only after the new exists.
    await qr.query(`DROP INDEX IF EXISTS "UQ_schedules_user_date_shift_place"`);
  }

  public async down(qr: QueryRunner): Promise<void> {
    // Fails if individual+team rows now share a place — that data is what the
    // new key exists to allow; resolve it before reverting.
    await qr.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "UQ_schedules_user_date_shift_place"
        ON schedules (
          user_id,
          schedule_date,
          shift_definition_id,
          COALESCE(location_id, region_id, district_id, '00000000-0000-0000-0000-000000000000'::uuid)
        )
        WHERE deleted_at IS NULL`);
    await qr.query(`DROP INDEX IF EXISTS "UQ_schedules_user_date_shift_place_team"`);
  }
}
