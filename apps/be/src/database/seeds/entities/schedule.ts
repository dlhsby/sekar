import type { SeedContext } from '../lib/context';

/**
 * Seed schedules (staging only) — materialize TODAY's daily roster from user
 * + user_locations + shift_definition_id.
 *
 * Staging: 1125 schedules (one per active user), each pointed at a lokasi (join to
 * user_locations with assignment_type = 'permanent'). Materialized once at seed time.
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
    `INSERT INTO schedules (user_id, schedule_date, district_id, shift_definition_id, status, source)
     SELECT
       u.id,
       $1::date,
       u.district_id,
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

  // Point each row at the worker's permanent lokasi. ONE place per row
  // (ADR-053), so this is a column update rather than the junction insert it used
  // to be; a worker with several permanent lokasi keeps the lowest id
  // deterministically, and covering more means more rows.
  const areaResult = await ctx.qr.query(
    `UPDATE schedules s
        SET location_id = sub.location_id
       FROM (
         SELECT ua.user_id, MIN(ua.location_id::text)::uuid AS location_id
           FROM user_locations ua
          WHERE ua.assignment_type = 'permanent'
          GROUP BY ua.user_id
       ) sub
      WHERE sub.user_id = s.user_id
        AND s.schedule_date = $1::date
        AND s.location_id IS NULL
     RETURNING s.id`,
    [scheduleDate],
  );

  ctx.log(`  ✓ ${areaResult.length} schedules pointed at a lokasi`);

  ctx.log('✅ Schedules seeding complete');
}
