import type { SeedContext } from '../lib/context';

/**
 * Seed schedule events (demo mode only) — create one daily static ScheduleEvent
 * per seeded satgas/linmas with a shift + resolvable primary location, then
 * materialize TODAY's occurrences.
 *
 * Demo: ONE schedule_event + TODAY's materialized occurrences per eligible user.
 * Staging: skipped (schedules seed handles template-based roster).
 */
export async function seedScheduleEvents(ctx: SeedContext): Promise<void> {
  if (ctx.mode !== 'demo') {
    // Schedule events only seeded in demo mode
    return;
  }

  ctx.log('📅 Seeding Schedule Events…');

  // Get today's date in Asia/Jakarta timezone
  const todayResult = await ctx.qr.query(
    `SELECT (NOW() AT TIME ZONE 'Asia/Jakarta')::date AS date`,
  );
  const today = (todayResult as any[])[0]?.date ?? new Date().toISOString().split('T')[0];

  // For each satgas/linmas with shift + location, insert ONE daily static schedule_event
  // Idempotent: only insert if user has no existing non-deleted event
  const eventResult = await ctx.qr.query(
    `INSERT INTO schedule_events
     (
       id, recurrence_type, start_date, end_date, recurrence_config,
       shift_definition_id, scope, location_id, region_id,
       is_team, pic_user_id, team_type_id, user_id,
       is_active, notes, created_by, updated_by, created_at, updated_at, deleted_at
     )
     SELECT
       gen_random_uuid(),
       'daily',
       $1::date,
       NULL,
       NULL,
       u.shift_definition_id,
       'static',
       COALESCE(
         u.location_id,
         (SELECT ul.location_id FROM user_locations ul
          WHERE ul.user_id = u.id AND ul.assignment_type = 'permanent'
          ORDER BY ul.assigned_at ASC, ul.location_id ASC LIMIT 1)
       ),
       NULL,
       false,
       NULL,
       NULL,
       u.id,
       true,
       'Seeded daily event',
       u.created_by,
       NULL,
       NOW(),
       NOW(),
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
       )
     ON CONFLICT DO NOTHING
     RETURNING (xmax = 0) AS inserted`,
    [today],
  );

  const eventsInserted = eventResult.filter((r: any) => r.inserted).length;
  ctx.log(`  ✓ ${eventsInserted} schedule_events inserted`);

  // Materialize TODAY's occurrences for all active events via direct SQL
  // (mimics ScheduleMaterializerService.materializeEvent logic)
  const materializeResult = await ctx.qr.query(
    `WITH event_members AS (
       -- Resolve members: individual events use user_id; team events use the
       -- PIC + invited members. UNION dedups a PIC who is also invited.
       SELECT se.id AS schedule_event_id, se.user_id
       FROM schedule_events se
       WHERE se.is_active = true AND se.deleted_at IS NULL AND se.is_team = false
       UNION
       SELECT se.id, se.pic_user_id
       FROM schedule_events se
       WHERE se.is_active = true AND se.deleted_at IS NULL AND se.is_team = true
       UNION
       SELECT sem.schedule_event_id, sem.user_id
       FROM schedule_event_members sem
       JOIN schedule_events se ON se.id = sem.schedule_event_id
       WHERE se.is_active = true AND se.deleted_at IS NULL AND se.is_team = true
     ),
     occurrence_inserts AS (
       INSERT INTO schedules
       (
         id, user_id, schedule_date, rayon_id, shift_definition_id,
         status, source, schedule_event_id, region_id, team_type_id, is_detached,
         created_by, created_at, updated_at, deleted_at
       )
       SELECT
         gen_random_uuid(),
         em.user_id,
         $1::date,
         CASE
           WHEN se.scope = 'static' THEN l.rayon_id
           ELSE r.rayon_id
         END,
         se.shift_definition_id,
         'planned',
         'event',
         se.id,
         CASE WHEN se.scope = 'mobile' THEN se.region_id ELSE NULL END,
         CASE WHEN se.is_team THEN se.team_type_id ELSE NULL END,
         false,
         se.created_by,
         NOW(),
         NOW(),
         NULL
       FROM event_members em
       JOIN schedule_events se ON se.id = em.schedule_event_id
       LEFT JOIN locations l ON l.id = se.location_id
       LEFT JOIN regions r ON r.id = se.region_id
       WHERE
         -- Only materialize if not already existing (including soft-deleted)
         NOT EXISTS (
           SELECT 1 FROM schedules s
           WHERE s.user_id = em.user_id
             AND s.schedule_date = $1::date
             AND s.schedule_event_id = se.id
         )
         -- And no time-based conflicts (simplified check: same date+user+shift is conflict)
         AND NOT EXISTS (
           SELECT 1 FROM schedules s2
           WHERE s2.user_id = em.user_id
             AND s2.schedule_date = $1::date
             AND s2.shift_definition_id = se.shift_definition_id
             AND s2.deleted_at IS NULL
         )
       ON CONFLICT DO NOTHING
       RETURNING (xmax = 0) AS inserted
     )
     SELECT COUNT(*) FILTER (WHERE inserted) AS created FROM occurrence_inserts`,
    [today],
  );

  const schedulesCreated = (materializeResult[0]?.created ?? 0) as number;
  ctx.log(`  ✓ ${schedulesCreated} schedule occurrences materialized for today (${today})`);

  // Add schedule_locations for static scope events
  const locationsResult = await ctx.qr.query(
    `INSERT INTO schedule_locations (schedule_id, location_id)
     SELECT DISTINCT
       s.id,
       se.location_id
     FROM schedules s
     JOIN schedule_events se ON s.schedule_event_id = se.id
     WHERE
       s.schedule_date = $1::date
       AND se.scope = 'static'
       AND se.location_id IS NOT NULL
       AND s.source = 'event'
     ON CONFLICT DO NOTHING
     RETURNING (xmax = 0) AS inserted`,
    [today],
  );

  const locationsInserted = locationsResult.filter((r: any) => r.inserted).length;
  ctx.log(`  ✓ ${locationsInserted} schedule_locations inserted`);

  ctx.log('✅ Schedule events seeding complete');
}
