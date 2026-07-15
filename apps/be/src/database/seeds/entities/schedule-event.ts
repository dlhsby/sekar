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
       is_team, pic_user_id, team_category_id, user_id,
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
         status, source, schedule_event_id, region_id, team_category_id, is_detached,
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
         CASE WHEN se.is_team THEN se.team_category_id ELSE NULL END,
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

/**
 * Seed one schedule event per SHAPE the model allows (demo only), so every
 * scope × target × recurrence combination exists in a populated database.
 *
 * Why this exists: `seedScheduleEvents` above only ever produced
 * `scope=static` + `recurrence=daily` + individual. Every other branch the code
 * supports — city / rayon / mobile scope, team fan-out, and the
 * weekly / every_n_days / specific_dates rules — had unit tests but had never
 * run end-to-end against real rows. That is exactly where a materializer or
 * projection defect hides, and it is invisible from the seeded UI because the
 * shapes simply aren't there to look at.
 *
 * Each variant is anchored to a distinctive note so it is findable, and every
 * insert is idempotent on that note. Runs AFTER seedScheduleEvents so the
 * per-user daily events already own their (user, date, shift) slots — variants
 * deliberately pick users/shifts that don't collide.
 */
export async function seedScheduleEventVariants(ctx: SeedContext): Promise<void> {
  if (ctx.mode !== 'demo') return;

  ctx.log('📅 Seeding Schedule Event variants (scope × target × recurrence)…');

  // ::text, not ::date — the pg driver hydrates a `date` column into a JS Date,
  // and JSON.stringify would then write "2026-07-15T17:00:00.000Z" into
  // recurrence_config. ScheduleRecurrenceUtil compares plain 'YYYY-MM-DD' WIB
  // strings, so a timestamp there expands to nothing and the event silently
  // never occurs.
  const [{ date: today }] = (await ctx.qr.query(
    `SELECT to_char((NOW() AT TIME ZONE 'Asia/Jakarta')::date, 'YYYY-MM-DD') AS date`,
  )) as Array<{ date: string }>;

  // Every variant needs a (user, shift) slot nobody else holds: the overlap guard
  // is (user, date, shift), and seedScheduleEvents already gave every satgas and
  // linmas a daily event on THEIR OWN shift. Reusing one shift and one member
  // pool across the variants — the first cut here — meant the guard rejected most
  // of them and only the first team materialized, which looks like coverage while
  // the city and rayon rows silently never appear on the board.
  //
  // korlap is the free pool (never auto-scheduled), so it supplies the
  // individuals and the PICs. Team MEMBERS are satgas/linmas on purpose — only
  // those roles are countable, so a korlap-only team would not exercise the
  // "team members count toward staffing" path at all.
  const shifts = (await ctx.qr.query(
    `SELECT id FROM shift_definitions WHERE is_active ORDER BY code`,
  )) as Array<{ id: string }>;
  const korlaps = (await ctx.qr.query(
    `SELECT id FROM users WHERE role = 'korlap' AND is_active AND deleted_at IS NULL
      ORDER BY username`,
  )) as Array<{ id: string }>;
  const [anchors] = (await ctx.qr.query(
    `SELECT
       (SELECT id FROM rayons WHERE deleted_at IS NULL ORDER BY name LIMIT 1) AS rayon_id,
       (SELECT r.id FROM regions r JOIN rayons ry ON ry.id = r.rayon_id
         WHERE r.deleted_at IS NULL ORDER BY ry.name, r.name LIMIT 1) AS region_id,
       (SELECT id FROM team_categories WHERE is_active ORDER BY name LIMIT 1) AS team_id`,
  )) as Array<Record<string, string | null>>;

  const { rayon_id, region_id, team_id } = anchors;
  if (!rayon_id || !region_id || !team_id || shifts.length < 2 || korlaps.length < 5) {
    // Loud, not silent: a half-seeded variant set is worse than none, because it
    // looks like coverage.
    ctx.log('  ⚠ skipped — needs a rayon, a kawasan, a team category, 2+ shifts and 5+ korlap');
    return;
  }

  /** Countable members free on `shiftId` — i.e. whose own daily event is elsewhere. */
  const usedMembers = new Set<string>();
  const membersFreeOn = async (shiftId: string, n: number): Promise<string[]> => {
    const rows = (await ctx.qr.query(
      `SELECT id FROM users
        WHERE role IN ('satgas','linmas') AND is_active AND deleted_at IS NULL
          AND (shift_definition_id IS DISTINCT FROM $1)
        ORDER BY username`,
      [shiftId],
    )) as Array<{ id: string }>;
    const picked = rows
      .map((r) => r.id)
      .filter((id) => !usedMembers.has(id))
      .slice(0, n);
    picked.forEach((id) => usedMembers.add(id));
    return picked;
  };

  /**
   * One row per shape, each on its own (korlap, shift) slot so none is rejected
   * by the overlap guard. Teams carry satgas/linmas members drawn from a shift
   * they are not already scheduled on.
   */
  const variants = [
    {
      note: 'SEED VARIANT: city × individual × weekly',
      scope: 'city' as const,
      recurrence: 'weekly' as const,
      config: { weekdays: [1, 3, 5] },
      rayonId: null,
      regionId: null,
      shiftId: shifts[0].id,
      isTeam: false,
      userId: korlaps[0].id,
      picId: null,
      members: [] as string[],
    },
    {
      note: 'SEED VARIANT: rayon × individual × every_n_days',
      scope: 'rayon' as const,
      recurrence: 'every_n_days' as const,
      config: { interval_n: 3 },
      rayonId: rayon_id,
      regionId: null,
      shiftId: shifts[1].id,
      isTeam: false,
      userId: korlaps[1].id,
      picId: null,
      members: [] as string[],
    },
    {
      note: 'SEED VARIANT: mobile (kawasan) × team × daily',
      scope: 'mobile' as const,
      recurrence: 'daily' as const,
      config: null,
      rayonId: null,
      regionId: region_id,
      shiftId: shifts[0].id,
      isTeam: true,
      userId: null,
      picId: korlaps[2].id,
      members: await membersFreeOn(shifts[0].id, 2),
    },
    {
      note: 'SEED VARIANT: city × team × specific_dates',
      scope: 'city' as const,
      recurrence: 'specific_dates' as const,
      config: { dates: [today] },
      rayonId: null,
      regionId: null,
      shiftId: shifts[1].id,
      isTeam: true,
      userId: null,
      picId: korlaps[3].id,
      members: await membersFreeOn(shifts[1].id, 2),
    },
    {
      note: 'SEED VARIANT: rayon × team × none (one-off)',
      scope: 'rayon' as const,
      recurrence: 'none' as const,
      config: null,
      rayonId: rayon_id,
      regionId: null,
      shiftId: shifts[0].id,
      isTeam: true,
      userId: null,
      picId: korlaps[4].id,
      members: await membersFreeOn(shifts[0].id, 2),
    },
  ];

  let inserted = 0;
  for (const v of variants) {
    const rows = (await ctx.qr.query(
      `INSERT INTO schedule_events
         (id, recurrence_type, start_date, end_date, recurrence_config,
          shift_definition_id, scope, location_id, region_id, rayon_id,
          is_team, pic_user_id, team_category_id, user_id,
          is_active, notes, created_at, updated_at)
       SELECT gen_random_uuid(), $1, $2::date, NULL, $3::jsonb,
              $4, $5, $6, $7, $8,
              $9, $10, $11, $12,
              true, $13, NOW(), NOW()
       WHERE NOT EXISTS (
         SELECT 1 FROM schedule_events WHERE notes = $13 AND deleted_at IS NULL
       )
       RETURNING id`,
      [
        v.recurrence,
        today,
        v.config ? JSON.stringify(v.config) : null,
        v.shiftId,
        v.scope,
        null, // no static variant here: seedScheduleEvents already covers scope=static
        v.regionId,
        v.rayonId,
        v.isTeam,
        v.picId,
        v.isTeam ? team_id : null,
        v.userId,
        v.note,
      ],
    )) as Array<{ id: string }>;

    if (rows.length === 0) continue; // already seeded
    inserted += 1;

    if (v.isTeam) {
      for (const m of v.members.map((id) => ({ id }))) {
        await ctx.qr.query(
          `INSERT INTO schedule_event_members (schedule_event_id, user_id)
           VALUES ($1, $2) ON CONFLICT DO NOTHING`,
          [rows[0].id, m.id],
        );
      }
    }
  }

  ctx.log(`  ✓ ${inserted} variant schedule_events inserted`);

  // Materialize today's occurrences for the variants. rayon_id on the roster row
  // resolves per scope: static → its lokasi's rayon, mobile → its kawasan's
  // rayon, rayon → itself, city → NULL (it belongs to no rayon, which is what
  // puts it on the board's Surabaya node).
  const materialized = (await ctx.qr.query(
    `WITH ev AS (
       SELECT * FROM schedule_events
        WHERE notes LIKE 'SEED VARIANT:%' AND is_active AND deleted_at IS NULL
     ),
     member_rows AS (
       SELECT e.id AS event_id, e.user_id AS user_id FROM ev e WHERE e.is_team = false
       UNION
       SELECT e.id, e.pic_user_id FROM ev e WHERE e.is_team = true
       UNION
       SELECT sem.schedule_event_id, sem.user_id
         FROM schedule_event_members sem JOIN ev e ON e.id = sem.schedule_event_id
     ),
     ins AS (
       INSERT INTO schedules
         (id, user_id, schedule_date, rayon_id, shift_definition_id, status, source,
          schedule_event_id, region_id, team_category_id, is_detached, created_at, updated_at)
       SELECT gen_random_uuid(), mr.user_id, $1::date,
              CASE e.scope
                WHEN 'static' THEN l.rayon_id
                WHEN 'mobile' THEN r.rayon_id
                WHEN 'rayon'  THEN e.rayon_id
                ELSE NULL
              END,
              e.shift_definition_id, 'planned', 'event', e.id,
              CASE WHEN e.scope = 'mobile' THEN e.region_id ELSE NULL END,
              CASE WHEN e.is_team THEN e.team_category_id ELSE NULL END,
              false, NOW(), NOW()
         FROM member_rows mr
         JOIN ev e ON e.id = mr.event_id
         LEFT JOIN locations l ON l.id = e.location_id
         LEFT JOIN regions r ON r.id = e.region_id
        WHERE NOT EXISTS (
                SELECT 1 FROM schedules s
                 WHERE s.user_id = mr.user_id AND s.schedule_date = $1::date
                   AND s.schedule_event_id = e.id)
          AND NOT EXISTS (
                SELECT 1 FROM schedules s2
                 WHERE s2.user_id = mr.user_id AND s2.schedule_date = $1::date
                   AND s2.shift_definition_id = e.shift_definition_id
                   AND s2.deleted_at IS NULL)
       ON CONFLICT DO NOTHING
       RETURNING 1
     )
     SELECT count(*) AS created FROM ins`,
    [today],
  )) as Array<{ created: string }>;

  ctx.log(`  ✓ ${materialized[0]?.created ?? 0} variant occurrences materialized for ${today}`);
  ctx.log('✅ Schedule event variants seeding complete');
}
