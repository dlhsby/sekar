import type { SeedContext } from '../lib/context';

/**
 * Seed schedules (staging only) — materialize TODAY's daily roster from user
 * + user_areas + shift_definition_id.
 *
 * Staging: 1125 schedules (one per active user) + 378 schedule_areas (join to
 * user_areas with assignment_type = 'permanent'). Materialized once at seed time.
 *
 * Demo: not seeded (transactional data created dynamically in other seeders).
 */
export async function seedSchedules(ctx: SeedContext): Promise<void> {
  if (ctx.mode !== 'staging') {
    // Schedules only seeded in staging mode (demo handles via other seeders)
    return;
  }

  ctx.log("📅 Seeding Schedules (Today's Roster)…");

  // Get today's date in Asia/Jakarta timezone
  const today = await ctx.qr.query(`SELECT (NOW() AT TIME ZONE 'Asia/Jakarta')::date AS date`);
  const scheduleDate = (today as any[])[0]?.date ?? new Date().toISOString().split('T')[0];

  // Insert schedules for all active users (1125 target)
  // Status: 'planned' if user has shift_definition_id, 'off' otherwise
  // Source: 'template' (generated from user template, not manually created)
  const result = await ctx.qr.query(
    `INSERT INTO schedules (user_id, schedule_date, rayon_id, shift_definition_id, status, source)
     SELECT
       u.id,
       $1::date,
       u.rayon_id,
       u.shift_definition_id,
       CASE WHEN u.shift_definition_id IS NOT NULL THEN 'planned' ELSE 'off' END,
       'template'
     FROM users u
     WHERE u.is_active = TRUE
       AND u.deleted_at IS NULL
     ON CONFLICT DO NOTHING
     RETURNING (xmax = 0) AS inserted`,
    [scheduleDate],
  );

  const schedulesInserted = result.filter((r: any) => r.inserted).length;
  ctx.log(`  ✓ ${schedulesInserted} schedules inserted (1125 target)`);

  // Insert schedule_areas for permanent user_areas assignments (378 target)
  // Join schedules → user_areas (permanent) to populate area assignments
  const areaResult = await ctx.qr.query(
    `INSERT INTO schedule_areas (schedule_id, area_id)
     SELECT DISTINCT
       s.id,
       ua.area_id
     FROM schedules s
     JOIN user_areas ua ON s.user_id = ua.user_id
     WHERE s.schedule_date = $1::date
       AND ua.assignment_type = 'permanent'
     ON CONFLICT DO NOTHING
     RETURNING (xmax = 0) AS inserted`,
    [scheduleDate],
  );

  const areasInserted = areaResult.filter((r: any) => r.inserted).length;
  ctx.log(`  ✓ ${areasInserted} schedule_areas inserted (378 target)`);

  ctx.log('✅ Schedules seeding complete');
}
