#!/usr/bin/env npx ts-node
/**
 * Stage presence scenarios for manual testing of /monitoring.
 *
 * Creates one seeded worker per presence state, with controlled timestamps so each
 * evaluates to the intended lifecycle_state + flags + activity + location axes.
 *
 * Idempotent: clears prior staging data for today, then seeds fresh rows.
 * Usage: cd apps/be && npx ts-node scripts/stage-presence-scenarios.ts
 *
 * Derives from specs/testing/presence-model-matrix.md (Layers 1–3) and the backend
 * derivation logic in presence-lifecycle.ts (ADR-050).
 */

import AppDataSource from '../src/database/data-source';
import { Shift } from '../src/modules/shifts/entities/shift.entity';
import { LocationLog } from '../src/modules/location/entities/location-log.entity';
import { Overtime } from '../src/modules/overtime/entities/overtime.entity';
import { User } from '../src/modules/users/entities/user.entity';
import { Location } from '../src/modules/locations/entities/location.entity';
import { ShiftDefinition } from '../src/modules/shift-definitions/entities/shift-definition.entity';
import { Schedule, ScheduleStatus } from '../src/modules/schedules/entities/schedule.entity';
import { OvertimeStatus } from '../src/modules/overtime/entities/overtime.entity';
import { District } from '../src/modules/districts/entities/district.entity';
import { Region } from '../src/modules/regions/entities/region.entity';

// ── Constants ──
const ACTIVE_MAX_AGE_SEC = 600; // ~10 min (ADR-050)
const LATE_GRACE_SEC = 10 * 60; // 10 min (ADR-050 G01)

const STAGING_USERNAMES = [
  'satgas_bertugas_1', 'satgas_terlambat_in_1', 'satgas_luar_area_1', 'satgas_offline_1',
  'satgas_lupa_pulang_1', 'satgas_lembur_1', 'satgas_unscheduled_1', 'satgas_pulang_1',
  'satgas_pulang_awal_1', 'satgas_belum_hadir_1', 'satgas_terlambat_1', 'satgas_tidak_hadir_1',
  'satgas_cuti_1', 'satgas_sakit_1', 'satgas_izin_1', 'satgas_libur_1',
  'satgas_tidak_bertugas_1', 'satgas_surabaya_1', 'satgas_rayon_1', 'satgas_kawasan_1',
  'linmas_bertugas_1', 'korlap_bertugas_1',
];

// WIB offset (UTC+7, no DST)
const WIB_OFFSET_MS = 7 * 60 * 60 * 1000;

interface StagedScenario {
  username: string;
  intendedState: string;
  how: string;
  found: boolean;
}

const scenarios: StagedScenario[] = [];

/**
 * Clock-ins are opt-in (`--with-clockins`). By default the cohort is left
 * SCHEDULE-ONLY so a tester can clock in from the app and drive the real
 * transitions themselves; pre-clocking them would hide exactly that flow.
 */
const STAGE_CLOCKINS = process.argv.includes('--with-clockins');

/**
 * Remove every clock-in artefact for the cohort, leaving only their schedules.
 * Order matters: tracking status references the shift rows.
 */
async function stripClockIns(ds: typeof AppDataSource): Promise<void> {
  await ds.query(
    `DELETE FROM user_tracking_status WHERE user_id IN (SELECT id FROM users WHERE username = ANY($1))`,
    [STAGING_USERNAMES],
  );
  await ds.query(
    `DELETE FROM location_logs WHERE user_id IN (SELECT id FROM users WHERE username = ANY($1))`,
    [STAGING_USERNAMES],
  );
  await ds.query(
    `DELETE FROM overtimes WHERE user_id IN (SELECT id FROM users WHERE username = ANY($1))`,
    [STAGING_USERNAMES],
  );
  await ds.query(
    `DELETE FROM shifts WHERE user_id IN (SELECT id FROM users WHERE username = ANY($1))`,
    [STAGING_USERNAMES],
  );
  console.log(
    'Schedule-only mode: cleared staged clock-ins — clock in from the app to drive the live states.\n' +
      '  (re-run with --with-clockins to pre-stage bertugas/lembur/pulang/ad_hoc instead)\n',
  );
}

/**
 * Stage the whole presence cohort. Exported so the demo seeder can leave a
 * ready-to-test state in ONE command, instead of the tester having to remember a
 * second step. The seeder owns the users (static identity); this owns their
 * time-relative state for today, which a static seed cannot express — the same
 * rows produce different presence states depending on the hour.
 *
 * Takes an already-initialised DataSource so it can run inside the seeder's
 * connection; the CLI wrapper below owns init/destroy when run standalone.
 */
export async function stagePresenceScenarios(
  ds: typeof AppDataSource,
  opts: { withClockIns?: boolean; log?: (message: string) => void } = {},
): Promise<void> {
  const log = opts.log ?? ((m: string) => console.log(m));
  const withClockIns = opts.withClockIns ?? false;

  scenarios.length = 0; // reset so repeat calls in one process don't stack

  log('Staging presence scenarios...');

  await clearPriorRuns(ds);

  const { users, usersByUsername, locations, districtMap, regionMap } = await loadFixtures(ds);
  if (locations.length === 0) throw new Error('No locations available');
  if (usersByUsername.size === 0) {
    log('  ⚠ No presence-scenario users found — run the seeder first. Skipping.');
    return;
  }

  const now = new Date();
  const today = wibDateString(now);
  const roles = await selectRealShifts(ds, now, today);
  const missing = Object.entries(roles)
    .filter(([, v]) => !v)
    .map(([k]) => k);
  log(
    `  Real shifts — belum_hadir:${roles.belum?.code ?? '—'} ` +
      `terlambat:${roles.terlambat?.code ?? '—'} ended:${roles.ended?.code ?? '—'}` +
      (missing.length ? `  (unfillable at this hour: ${missing.join(', ')})` : ''),
  );

  await stagePresenceStates(
    ds,
    usersByUsername,
    locations,
    roles,
    districtMap,
    regionMap,
    now,
    today,
  );
  await ensureSchedules(ds, today);
  await stageGeneralSchedules(ds, today);
  // After the general pass (which wipes today's non-manual rows) and before the
  // shift cohort, so it can still find unrostered people in the host district.
  await stageMultiPlaceCoverage(ds, today);
  await stageShiftRosters(ds, today);

  // Clock-ins are opt-in: by default the cohort is left SCHEDULE-ONLY so the
  // tester clocks in from the app and drives the real transitions themselves.
  if (withClockIns) {
    await deriveTrackingStatus(ds);
  } else {
    await stripClockIns(ds);
  }
}

async function main() {
  if (!AppDataSource.isInitialized) {
    await AppDataSource.initialize();
  }
  try {
    await stagePresenceScenarios(AppDataSource, { withClockIns: STAGE_CLOCKINS });
    reportStagedScenarios();
    console.log('\n✅ Presence scenarios staged successfully.');
  } finally {
    if (AppDataSource.isInitialized) {
      await AppDataSource.destroy();
    }
  }
}

/**
 * Clear all staging data for today (shifts, location logs, schedules, overtimes)
 * that belong to known staging users.
 */
async function clearPriorRuns(ds: typeof AppDataSource): Promise<void> {
  console.log('Clearing prior staging runs for today...\n');

  const stagingUsernames = STAGING_USERNAMES;

  const today = wibDateString(new Date());
  const userRepo = ds.getRepository(User);
  const shiftRepo = ds.getRepository(Shift);
  const locLogRepo = ds.getRepository(LocationLog);
  const schedRepo = ds.getRepository(Schedule);
  const overtimeRepo = ds.getRepository(Overtime);

  // Get user IDs for these usernames
  const users = await userRepo
    .createQueryBuilder('u')
    .where('u.username IN (:...usernames)', { usernames: stagingUsernames })
    .getMany();
  const userIds = users.map((u) => u.id);

  if (userIds.length === 0) {
    console.log('(No prior staging users found; skipping cleanup)\n');
    return;
  }

  // Delete in order of FK dependencies. user_tracking_status first: it points at
  // shift rows, and a stale row left behind would keep a worker pinned "live" on
  // the map after their staged shift is gone.
  await ds.query(`DELETE FROM user_tracking_status WHERE user_id = ANY($1)`, [userIds]);
  await overtimeRepo.delete({ user_id: In(userIds) });
  await locLogRepo.delete({ user_id: In(userIds) });
  await shiftRepo.delete({ user_id: In(userIds) });
  await schedRepo.delete({ user_id: In(userIds), schedule_date: today });

  console.log(`Deleted shifts/logs/schedules/overtimes for ${userIds.length} users\n`);
}

/**
 * Create a RECURRING assignment, not a one-off row.
 *
 * The first cut inserted bare `schedules` rows for `today` with no
 * `schedule_event_id`, so the demo roster evaporated at midnight — open the
 * board the next morning and every rayon read "belum ada jadwal untuk hari ini".
 * Scheduling is calendar-style (ADR-047): a `schedule_events` row holds the RULE
 * (here: `daily`, open-ended) and the materializer expands it into concrete
 * `schedules` rows across the horizon, topping up on a cron and at boot. So we
 * write the event, then materialize TODAY ourselves (the script may run while
 * the backend is down); the cron fills the rest.
 *
 * @returns true when today's row was created.
 */
async function addGeneralRow(
  ds: typeof AppDataSource,
  today: string,
  userId: string,
  districtId: string | null,
  regionId: string | null,
  locationId: string | null,
  teamId: string | null,
  note: string,
  shiftId: string,
): Promise<boolean> {
  // scope literal follows the event's own enum: lokasi → static,
  // kawasan → mobile, rayon → district, otherwise city.
  const scope = locationId ? 'static' : regionId ? 'mobile' : districtId ? 'district' : 'city';
  // `chk_schedule_events_scope` demands EXCLUSIVITY: exactly one of
  // location/region/district is set for its scope, the other two NULL. The
  // materialized row still derives its district from the location/region.
  const evLocation = scope === 'static' ? locationId : null;
  const evRegion = scope === 'mobile' ? regionId : null;
  const evDistrict = scope === 'district' ? districtId : null;
  const [event] = (await ds.query(
    `INSERT INTO schedule_events (title, recurrence_type, start_date, end_date,
                                  shift_definition_id, scope, location_id, region_id,
                                  district_id, is_team, user_id, team_category_id,
                                  pic_user_id, is_active, notes)
     VALUES ($1, 'daily', $2::date, NULL, $3, $4, $5, $6, $7, $8, $9, $10, $11, TRUE, $12)
     RETURNING id`,
    [
      note,
      today,
      shiftId,
      scope,
      evLocation,
      evRegion,
      evDistrict,
      !!teamId,
      teamId ? null : userId,
      teamId,
      teamId ? userId : null,
      note,
    ],
  )) as Array<{ id: string }>;

  // The place lives on the row (ADR-053) — one lokasi per occurrence, no junction.
  const [row] = (await ds.query(
    `INSERT INTO schedules (user_id, schedule_date, district_id, region_id, location_id,
                            shift_definition_id, status, source, team_category_id, notes,
                            schedule_event_id)
     VALUES ($1, $2::date, $3, $4, $5, $6, 'planned', 'event', $7, $8, $9)
     ON CONFLICT DO NOTHING
     RETURNING id`,
    [userId, today, districtId, regionId, locationId, shiftId, teamId, note, event?.id ?? null],
  )) as Array<{ id: string }>;
  return !!row;
}

/**
 * Build the GENERAL demo roster for today — a full scope × role sample.
 *
 * Replaces the old seeder (`seedScheduleEventVariants`), which picked users with
 * `ORDER BY username LIMIT n` and so produced incoherent rows — a korlap whose
 * home is Rayon Barat 2 ended up on CITY scope, which no operator would create.
 *
 * Guarantees, for EACH of the four scope levels (city · district · region ·
 * location), one **satgas**, one **linmas**, one **korlap** and one **team**, so
 * every tier of the board and every role column has something in it.
 *
 * Coherence rule: a worker is only ever scoped inside their OWN district. Since no
 * single district holds enough people for all four levels, each level draws from a
 * different district. City scope is the one exception — it has no district by
 * definition, so its sample is a deliberate city-wide crew, not drift.
 */
async function stageGeneralSchedules(ds: typeof AppDataSource, today: string): Promise<void> {
  // This owns the whole non-presence day now, so clear leftovers first.
  await ds.query(`DELETE FROM schedules WHERE schedule_date = $1::date AND source <> 'manual'`, [
    today,
  ]);
  // The recurring rules this script owns go too, or every re-run stacks another
  // copy of the same daily assignment (and the cron would materialize all of them).
  await ds.query(
    `DELETE FROM schedule_events
      WHERE notes LIKE 'SAMPLE %' OR notes LIKE 'RESCHEDULE %' OR notes LIKE 'MULTIPLACE %'`,
  );

  const shift = (
    await ds.query(
      `SELECT id FROM shift_definitions WHERE code NOT LIKE 'STG%' AND deleted_at IS NULL
        ORDER BY start_time LIMIT 1`,
    )
  )[0]?.id as string | undefined;
  if (!shift) {
    console.log('General roster: skipped — no shift definitions.');
    return;
  }
  const teams = (await ds.query(
    `SELECT id, name FROM team_categories WHERE is_active ORDER BY name`,
  )) as Array<{ id: string; name: string }>;

  // Districts that can actually host each tier, richest first.
  const districts = (await ds.query(
    `SELECT d.id, d.name,
            (SELECT r.id FROM regions r WHERE r.district_id = d.id AND r.deleted_at IS NULL
              ORDER BY r.name LIMIT 1) AS region_id,
            (SELECT l.id FROM locations l WHERE l.district_id = d.id AND l.deleted_at IS NULL
              ORDER BY l.name LIMIT 1) AS location_id,
            (SELECT count(*) FROM users u WHERE u.district_id = d.id AND u.is_active
               AND u.deleted_at IS NULL AND u.role IN ('satgas','linmas','korlap')
               AND u.id::text NOT LIKE 'b0000000%') AS staff
       FROM districts d WHERE d.deleted_at IS NULL
      ORDER BY staff DESC, d.name`,
  )) as Array<{ id: string; name: string; region_id: string | null; location_id: string | null; staff: string }>;

  const taken = new Set<string>();
  /** Free workers of `role` in `districtId` (or anywhere, for city scope). */
  const pick = async (role: string, districtId: string | null, n: number): Promise<string[]> => {
    const rows = (await ds.query(
      // City scope draws from EVERY rayon, one per rayon before taking a second
      // from any — a "city-wide crew" made entirely of Rayon Barat 2 staff reads
      // like a scoping bug even when the rule allows it (city has no rayon).
      // Within a rayon the order stays alphabetical, so picks are deterministic.
      `SELECT u.id FROM users u
        WHERE u.role = $1 AND u.is_active AND u.deleted_at IS NULL
          AND u.id::text NOT LIKE 'b0000000%'
          AND ($2::uuid IS NULL OR u.district_id = $2::uuid)
        ORDER BY row_number() OVER (PARTITION BY u.district_id ORDER BY u.username),
                 u.username`,
      [role, districtId],
    )) as Array<{ id: string }>;
    const out = rows.map((r) => r.id).filter((id) => !taken.has(id)).slice(0, n);
    out.forEach((id) => taken.add(id));
    return out;
  };

  const addRow = (
    userId: string,
    districtId: string | null,
    regionId: string | null,
    locationId: string | null,
    teamId: string | null,
    note: string,
    shiftId: string = shift,
  ): Promise<boolean> =>
    addGeneralRow(ds, today, userId, districtId, regionId, locationId, teamId, note, shiftId);

  // level → the district it draws from. City needs none; the other three take a
  // different district each so nobody is scoped outside their own.
  //
  // Order is deliberate: LOCATION runs first and is pinned to Rayon Pusat (the
  // demo-rich rayon everyone opens first, and the only one with enough staff for
  // a full role set), so it claims its people before the unscoped CITY pass —
  // which runs last — can take them.
  const hosts = districts.filter((d) => d.region_id && d.location_id);
  const pusat = hosts.find((d) => /pusat/i.test(d.name)) ?? hosts[0];
  const rest = hosts.filter((d) => d.id !== pusat?.id);
  const levels: Array<{
    label: string;
    districtId: string | null;
    regionId: string | null;
    locationId: string | null;
  }> = [
    { label: 'location', districtId: pusat?.id ?? null, regionId: null, locationId: pusat?.location_id ?? null },
    { label: 'region', districtId: rest[0]?.id ?? null, regionId: rest[0]?.region_id ?? null, locationId: null },
    { label: 'district', districtId: rest[1]?.id ?? null, regionId: null, locationId: null },
    { label: 'city', districtId: null, regionId: null, locationId: null },
  ];

  let rows = 0;
  const gaps: string[] = [];
  for (const [i, lvl] of levels.entries()) {
    if (lvl.label !== 'city' && !lvl.districtId) {
      gaps.push(`${lvl.label} (no district with both a kawasan and a lokasi)`);
      continue;
    }
    for (const role of ['satgas', 'linmas', 'korlap']) {
      const [id] = await pick(role, lvl.districtId, 1);
      if (!id) {
        gaps.push(`${lvl.label}/${role}`);
        continue;
      }
      await addRow(id, lvl.districtId, lvl.regionId, lvl.locationId, null, `SAMPLE ${lvl.label} × ${role}`);
      rows += 1;
    }
    // One team per level: 2 countable members sharing a team category.
    const team = teams[i % Math.max(teams.length, 1)];
    const members = await pick('satgas', lvl.districtId, 2);
    // Top up with linmas when the district has run out of spare satgas — a team
    // of one reads as a bug on the board.
    if (members.length < 2) members.push(...(await pick('linmas', lvl.districtId, 2 - members.length)));
    if (team && members.length > 0) {
      for (const m of members) {
        await addRow(m, lvl.districtId, lvl.regionId, lvl.locationId, team.id, `SAMPLE ${lvl.label} × tim ${team.name}`);
        rows += 1;
      }
    } else {
      gaps.push(`${lvl.label}/tim`);
    }
  }

  console.log(
    `General roster: ${rows} sample rows across city/district/region/location ` +
      `(satgas · linmas · korlap · tim each)` +
      (gaps.length ? `; gaps: ${gaps.join(', ')}` : ''),
  );
}

/**
 * Roster the MULTI-PLACE cohort — one worker, one shift, several lokasi.
 *
 * ADR-053's headline case, and the only one the rest of the demo day never
 * produces: every other cohort gives a worker exactly one row per shift, so the
 * board, the counts and the staffing rollup all look identical whether or not
 * multi-place works. This stages the shape that tells them apart.
 *
 * A satgas covering three taman and a korlap covering two get ONE ROW EACH PER
 * LOKASI on the SAME shift — legal only because uniqueness is now
 * `(user, date, shift, place)`. What to look for:
 *
 *  - the day board shows N chips for the worker but counts them as **1 petugas**
 *    (distinct people, not occurrences) at rayon and city level;
 *  - all N lokasi report the worker in `active_count` once they clock in —
 *    staffing is `assigned ∧ present`, so the two they are not standing in do
 *    NOT read understaffed;
 *  - each lokasi's summary carries ITS OWN name and rayon, not the one the
 *    worker's GPS happens to sit in.
 *
 * Workers are drawn from people with no roster row yet, so this never collides
 * with the SAMPLE/RESCHEDULE cohorts.
 */
async function stageMultiPlaceCoverage(ds: typeof AppDataSource, today: string): Promise<void> {
  const shift = (
    await ds.query(
      `SELECT id FROM shift_definitions WHERE code NOT LIKE 'STG%' AND deleted_at IS NULL
        ORDER BY start_time LIMIT 1`,
    )
  )[0]?.id as string | undefined;
  if (!shift) {
    console.log('Multi-place: skipped — no shift definitions.');
    return;
  }

  // A district with at least 3 lokasi, preferring the demo-rich Rayon Pusat so
  // the case is visible on the rayon everyone opens first.
  const hosts = (await ds.query(
    `SELECT d.id, d.name,
            (SELECT count(*) FROM locations l
              WHERE l.district_id = d.id AND l.deleted_at IS NULL AND l.is_active) AS lokasi
       FROM districts d WHERE d.deleted_at IS NULL
      ORDER BY lokasi DESC, d.name`,
  )) as Array<{ id: string; name: string; lokasi: string }>;
  const host = hosts.find((d) => /pusat/i.test(d.name) && Number(d.lokasi) >= 3) ?? hosts[0];
  if (!host || Number(host.lokasi) < 2) {
    console.log('Multi-place: skipped — no district with 2+ active lokasi.');
    return;
  }

  const lokasi = (await ds.query(
    `SELECT id, name FROM locations
      WHERE district_id = $1 AND deleted_at IS NULL AND is_active
      ORDER BY name LIMIT 3`,
    [host.id],
  )) as Array<{ id: string; name: string }>;

  /** Free workers of `role` in the host district with NO roster row today. */
  const freeWorkers = async (role: string, n: number): Promise<Array<{ id: string; username: string }>> =>
    (await ds.query(
      `SELECT u.id, u.username FROM users u
        WHERE u.role = $1 AND u.district_id = $2 AND u.is_active AND u.deleted_at IS NULL
          AND u.id::text NOT LIKE 'b0000000%'
          AND NOT EXISTS (
            SELECT 1 FROM schedules s
             WHERE s.user_id = u.id AND s.schedule_date = $3::date AND s.deleted_at IS NULL)
        ORDER BY u.username LIMIT $4`,
      [role, host.id, today, n],
    )) as Array<{ id: string; username: string }>;

  const cohort: Array<{ role: string; places: number }> = [
    { role: 'satgas', places: 3 },
    { role: 'korlap', places: 2 },
  ];

  let rows = 0;
  const staged: string[] = [];
  for (const { role, places } of cohort) {
    const [worker] = await freeWorkers(role, 1);
    if (!worker) continue;
    const spread = lokasi.slice(0, places);
    if (spread.length < 2) continue;
    for (const loc of spread) {
      const ok = await addGeneralRow(
        ds,
        today,
        worker.id,
        host.id,
        null,
        loc.id,
        null,
        `MULTIPLACE ${role} × ${loc.name}`,
        shift,
      );
      if (ok) rows += 1;
    }
    staged.push(`${worker.username} → ${spread.map((l) => l.name).join(' + ')}`);
  }

  console.log(
    staged.length
      ? `Multi-place (ADR-053): ${rows} rows in ${host.name} — ${staged.join('; ')}`
      : 'Multi-place: skipped — no unrostered satgas/korlap left in the host district.',
  );
}

/**
 * Roster the RESCHEDULING cohort — `<role>_shift_<n>` / `tim_shift_<n>_<m>`.
 *
 * One satgas, one linmas, one korlap and one 2-person team per shift, all on
 * CITY scope, so the day board's "Penugasan Kota" section has a full role set
 * under every shift and you can move any of them between Shift 1/2/3 to exercise
 * rescheduling — without touching a presence scenario.
 *
 * Runs AFTER stageGeneralSchedules, which wipes every non-`manual` row for today.
 */
async function stageShiftRosters(ds: typeof AppDataSource, today: string): Promise<void> {
  const shifts = (await ds.query(
    `SELECT id, code FROM shift_definitions
      WHERE code NOT LIKE 'STG%' AND deleted_at IS NULL AND is_active
      ORDER BY start_time LIMIT 3`,
  )) as Array<{ id: string; code: string }>;
  if (shifts.length === 0) {
    console.log('Shift roster: skipped — no shift definitions.');
    return;
  }
  const teams = (await ds.query(
    `SELECT id FROM team_categories WHERE is_active ORDER BY name`,
  )) as Array<{ id: string }>;

  let rows = 0;
  const gaps: string[] = [];
  for (const [i, shift] of shifts.entries()) {
    const n = i + 1;
    const members: Array<[string, string | null]> = [
      [`satgas_shift_${n}`, null],
      [`linmas_shift_${n}`, null],
      [`korlap_shift_${n}`, null],
      [`tim_shift_${n}_1`, teams[i % Math.max(teams.length, 1)]?.id ?? null],
      [`tim_shift_${n}_2`, teams[i % Math.max(teams.length, 1)]?.id ?? null],
    ];
    for (const [username, teamId] of members) {
      const [u] = (await ds.query(
        `SELECT id FROM users WHERE username = $1 AND deleted_at IS NULL`,
        [username],
      )) as Array<{ id: string }>;
      if (!u) {
        gaps.push(username);
        continue;
      }
      // Recurring (daily, open-ended) city-scope assignment — see addRow's note:
      // a bare row for `today` would vanish at midnight.
      const created = await addGeneralRow(
        ds,
        today,
        u.id,
        null,
        null,
        null,
        teamId,
        `RESCHEDULE ${shift.code} × ${username}`,
        shift.id,
      );
      if (created) rows += 1;
      else gaps.push(username);
    }
  }

  console.log(
    `Shift roster: ${rows} city-scope rows across ${shifts.length} shift(s) ` +
      `(satgas · linmas · korlap · tim each)` +
      (gaps.length ? `; missing users: ${gaps.join(', ')}` : ''),
  );
}

/**
 * Guarantee a roster row for every cohort worker, except the two that are
 * deliberately unscheduled.
 *
 * Without this the clock-in cohort had shifts but NO schedule, so the moment you
 * clocked one in (from the app or via --with-clockins) the backend saw no
 * occurrence and classified them `ad_hoc` / `is_scheduled=false` — i.e. a
 * "Luar Jadwal" pin parked at city scope and EXCLUDED from staffing, instead of
 * a normal counted `bertugas` at their own scope. Only `satgas_unscheduled_1`
 * (the intentional ad-hoc case) and `satgas_tidak_bertugas_1` (off duty) stay
 * scheduleless.
 *
 * Rows already staged with a specific scope/leave status are left untouched.
 */
async function ensureSchedules(ds: typeof AppDataSource, today: string): Promise<void> {
  const EXCLUDED = ['satgas_unscheduled_1', 'satgas_tidak_bertugas_1'];
  const res = await ds.query(
    `
    INSERT INTO schedules (user_id, schedule_date, district_id, shift_definition_id, status, source)
    SELECT u.id, $1::date, u.district_id,
           -- MUST be the CURRENT REAL shift (Shift 1/2/3), not a synthetic STG_*.
           -- The backend decides ad_hoc via scheduledUserIdsForCurrentShift(
           -- getCurrentShiftDefinition()), i.e. it only matches occurrences on the
           -- catalog shift whose window contains NOW. A row on STG_STD never
           -- matches, so the worker clocks in as "Luar Jadwal" and is excluded
           -- from staffing. Fall back to the first active shift if none covers now.
           COALESCE(
             (SELECT sd.id FROM shift_definitions sd
               WHERE sd.code NOT LIKE 'STG%' AND sd.deleted_at IS NULL
                 AND ((NOT sd.crosses_midnight
                       AND (now() AT TIME ZONE 'Asia/Jakarta')::time BETWEEN sd.start_time AND sd.end_time)
                   OR (sd.crosses_midnight
                       AND ((now() AT TIME ZONE 'Asia/Jakarta')::time >= sd.start_time
                         OR (now() AT TIME ZONE 'Asia/Jakarta')::time < sd.end_time)))
               ORDER BY sd.start_time LIMIT 1),
             (SELECT id FROM shift_definitions
               WHERE code NOT LIKE 'STG%' AND deleted_at IS NULL ORDER BY start_time LIMIT 1)
           ),
           'planned', 'manual'
    FROM users u
    WHERE u.username = ANY($2)
      AND u.username <> ALL($3)
      AND NOT EXISTS (
        SELECT 1 FROM schedules s
        WHERE s.user_id = u.id AND s.schedule_date = $1::date AND s.deleted_at IS NULL
      )
    RETURNING user_id
    `,
    [today, STAGING_USERNAMES, EXCLUDED],
  );
  // The scope trio already HAS a schedule (carrying its city/district/region
  // fields), but staged on a synthetic STG_* shift — which the current-shift
  // roster match ignores, so they'd clock in as ad_hoc at city and lose the very
  // scope they exist to demonstrate. Repoint just their shift, keeping the scope
  // columns. The three time-window users are deliberately left on their STG_*
  // shifts: those windows are what make belum_hadir/terlambat/tidak_hadir hold.
  await ds.query(
    `
    UPDATE schedules s
       SET shift_definition_id = COALESCE(
             (SELECT sd.id FROM shift_definitions sd
               WHERE sd.code NOT LIKE 'STG%' AND sd.deleted_at IS NULL
                 AND ((NOT sd.crosses_midnight
                       AND (now() AT TIME ZONE 'Asia/Jakarta')::time BETWEEN sd.start_time AND sd.end_time)
                   OR (sd.crosses_midnight
                       AND ((now() AT TIME ZONE 'Asia/Jakarta')::time >= sd.start_time
                         OR (now() AT TIME ZONE 'Asia/Jakarta')::time < sd.end_time)))
               ORDER BY sd.start_time LIMIT 1),
             (SELECT id FROM shift_definitions
               WHERE code NOT LIKE 'STG%' AND deleted_at IS NULL ORDER BY start_time LIMIT 1))
      FROM users u
     WHERE u.id = s.user_id
       AND s.schedule_date = $1::date
       AND u.username IN ('satgas_surabaya_1', 'satgas_rayon_1', 'satgas_kawasan_1')
    `,
    [today],
  );

  // Normalise scope to the worker's OWN district. The per-scenario staging picks a
  // convenient location to clock in at, which left cohort members rostered on a
  // district they don't belong to (home Rayon Pusat, scheduled on Rayon Selatan) —
  // the same incoherence that made a Barat-2 korlap show up under CITY scope.
  // satgas_surabaya_1 is exempt: city scope means no district by definition.
  await ds.query(
    `
    UPDATE schedules s
       SET district_id = u.district_id
      FROM users u
     WHERE u.id = s.user_id
       AND s.schedule_date = $1::date
       AND u.username = ANY($2)
       AND u.username <> 'satgas_surabaya_1'
       AND u.district_id IS NOT NULL
       AND s.district_id IS DISTINCT FROM u.district_id
    `,
    [today, STAGING_USERNAMES],
  );

  // satgas_kawasan_1 must actually carry a region_id, or it is indistinguishable
  // from the district-scoped user and renders one tier too high.
  await ds.query(
    `
    UPDATE schedules s
       SET region_id = (SELECT r.id FROM regions r
                         WHERE r.district_id = s.district_id AND r.deleted_at IS NULL
                         ORDER BY r.name LIMIT 1)
      FROM users u
     WHERE u.id = s.user_id
       AND s.schedule_date = $1::date
       AND u.username = 'satgas_kawasan_1'
       AND s.region_id IS NULL
    `,
    [today],
  );

  console.log(
    `Ensured roster rows: ${Array.isArray(res) ? res.length : 0} added ` +
      `(scheduleless by design: ${EXCLUDED.join(', ')}); scope trio repointed to the current shift.\n`,
  );
}

/**
 * Derive `user_tracking_status` from the shifts + location_logs just staged.
 *
 * This is REQUIRED, not cosmetic: `GET /monitoring/live-users` builds its live
 * list from `user_tracking_status`, NOT from shifts. Staging a clock-in without
 * this leaves every worker invisible on the map (they fall through to the absent
 * roster), which is exactly what happened before this step existed.
 *
 * Done as one set-based pass over everything staged rather than at each of the
 * ~14 call sites, so a new scenario gets it for free.
 *   - status: `active` when the newest ping is inside the freshness window, else `offline`
 *   - is_within_area: ping within ~500 m of the assigned location's centre
 */
async function deriveTrackingStatus(ds: typeof AppDataSource): Promise<void> {
  await ds.query(
    `
    INSERT INTO user_tracking_status
      (user_id, shift_id, shift_definition_id, status, last_latitude, last_longitude,
       last_accuracy_meters, last_battery_level, last_location_at, is_within_area,
       location_id, updated_at, district_id)
    SELECT DISTINCT ON (s.user_id)
      s.user_id, s.id, s.shift_definition_id,
      CASE WHEN l.logged_at > now() - ($1 || ' seconds')::interval THEN 'active' ELSE 'offline' END,
      l.gps_lat, l.gps_lng, l.accuracy_meters, l.battery_level, l.logged_at,
      COALESCE(
        (loc.gps_lat IS NOT NULL AND
         sqrt(power(l.gps_lat - loc.gps_lat, 2) + power(l.gps_lng - loc.gps_lng, 2)) < 0.005),
        TRUE),
      s.location_id, l.logged_at, u.district_id
    FROM shifts s
    JOIN users u ON u.id = s.user_id
    LEFT JOIN locations loc ON loc.id = s.location_id
    LEFT JOIN LATERAL (
      SELECT * FROM location_logs ll WHERE ll.shift_id = s.id ORDER BY ll.logged_at DESC LIMIT 1
    ) l ON TRUE
    WHERE u.username = ANY($2)
      AND s.clock_out_time IS NULL
      AND l.id IS NOT NULL
    ORDER BY s.user_id, s.clock_in_time DESC
    ON CONFLICT (user_id) DO UPDATE SET
      shift_id = EXCLUDED.shift_id, shift_definition_id = EXCLUDED.shift_definition_id,
      status = EXCLUDED.status, last_latitude = EXCLUDED.last_latitude,
      last_longitude = EXCLUDED.last_longitude, last_accuracy_meters = EXCLUDED.last_accuracy_meters,
      last_battery_level = EXCLUDED.last_battery_level, last_location_at = EXCLUDED.last_location_at,
      is_within_area = EXCLUDED.is_within_area, location_id = EXCLUDED.location_id,
      updated_at = EXCLUDED.updated_at, district_id = EXCLUDED.district_id;
    `,
    [ACTIVE_MAX_AGE_SEC, STAGING_USERNAMES],
  );
  console.log('Derived user_tracking_status for staged clock-ins (live map source).\n');
}

/**
 * Load test users, locations, and build lookup maps.
 */
async function loadFixtures(ds: typeof AppDataSource): Promise<{
  users: User[];
  usersByUsername: Map<string, User>;
  locations: Location[];
  districtMap: Map<string, District>;
  regionMap: Map<string, Region>;
}> {
  const stagingUsernames = STAGING_USERNAMES;

  const [users, locations, districts, regions] = await Promise.all([
    ds.getRepository(User).find({
      where: { username: In(stagingUsernames) },
    }),
    ds.getRepository(Location).find({ take: 50 }),
    ds.getRepository(District).find(),
    ds.getRepository(Region).find(),
  ]);

  const usersByUsername = new Map(users.map((u) => [u.username, u]));
  const districtMap = new Map(districts.map((d) => [d.id, d]));
  const regionMap = new Map(regions.map((r) => [r.id, r]));

  return { users, usersByUsername, locations, districtMap, regionMap };
}

/**
 * Pick which REAL shift (Shift 1/2/3) produces each roster state right now.
 *
 * Earlier this CREATED synthetic `STG_*` shift definitions with windows relative
 * to now. That worked, but they are rows in the shift catalog — so they showed up
 * as extra shift lanes on the /schedules day board and made it unreadable. The
 * catalog must stay exactly Shift 1/2/3.
 *
 * The real shifts already cover every state; which one plays which role just
 * depends on the hour. At 19:50 for example: Shift 1 (06–15) has ENDED →
 * tidak_hadir, Shift 2 (15–23) is running past grace → terlambat, Shift 3 (21–05)
 * has not started → belum_hadir. Returns `null` for any role no real shift can
 * fill at this moment (the caller warns rather than inventing one).
 */
async function selectRealShifts(
  ds: typeof AppDataSource,
  now: Date,
  today: string,
): Promise<{
  belum: ShiftDefinition | null;
  terlambat: ShiftDefinition | null;
  ended: ShiftDefinition | null;
}> {
  const all = await ds.getRepository(ShiftDefinition).find();
  const graceMs = LATE_GRACE_SEC * 1000;
  let belum: ShiftDefinition | null = null;
  let terlambat: ShiftDefinition | null = null;
  let ended: ShiftDefinition | null = null;

  for (const sd of all) {
    const w = resolveShiftWindow(sd, today);
    if (now.getTime() < w.start.getTime()) {
      if (!belum) belum = sd; // not started yet
    } else if (now.getTime() >= w.end.getTime()) {
      if (!ended) ended = sd; // already finished
    } else if (now.getTime() > w.start.getTime() + graceMs) {
      if (!terlambat) terlambat = sd; // running, past the arrival grace
    }
  }
  return { belum, terlambat, ended };
}

/**
 * YYYY-MM-DD in WIB for the given timestamp.
 */
/** `HH:mm:ss` local WIB wall-clock, the format shift_definitions stores. */
function formatWibClock(date: Date): string {
  const h = String(date.getHours()).padStart(2, '0');
  const m = String(date.getMinutes()).padStart(2, '0');
  const sec = String(date.getSeconds()).padStart(2, '0');
  return `${h}:${m}:${sec}`;
}

function wibDateString(date: Date): string {
  const wibTime = new Date(date.getTime() + WIB_OFFSET_MS);
  return wibTime.toISOString().split('T')[0];
}

/**
 * Parse HH:mm[:ss] into a WIB instant for the given date.
 */
function wibInstant(dateStr: string, timeStr: string): Date {
  const hms = timeStr.length === 5 ? `${timeStr}:00` : timeStr;
  return new Date(`${dateStr}T${hms}+07:00`);
}

/**
 * Resolve a shift definition to start/end instants for the given service date.
 */
function resolveShiftWindow(
  shiftDef: ShiftDefinition,
  serviceDate: string,
): { start: Date; end: Date } {
  let start = wibInstant(serviceDate, shiftDef.start_time);
  let end = wibInstant(serviceDate, shiftDef.end_time);

  if (shiftDef.crosses_midnight) {
    end = new Date(end.getTime() + 24 * 60 * 60 * 1000);
  }

  return { start, end };
}

/**
 * Helper: safely find/warn on missing user by username.
 */
function findUserOrWarn(
  username: string,
  usersByUsername: Map<string, User>,
): User | null {
  const user = usersByUsername.get(username);
  if (!user) {
    console.warn(`  ⚠️  User not found: ${username}`);
  }
  return user || null;
}

/**
 * Stage each presence scenario with controlled data.
 */
async function stagePresenceStates(
  ds: typeof AppDataSource,
  usersByUsername: Map<string, User>,
  locations: Location[],
  roles: { belum: ShiftDefinition | null; terlambat: ShiftDefinition | null; ended: ShiftDefinition | null },
  districtMap: Map<string, District>,
  regionMap: Map<string, Region>,
  now: Date,
  today: string,
): Promise<void> {
  const manager = ds.manager;
  const shiftRepo = ds.getRepository(Shift);
  const locLogRepo = ds.getRepository(LocationLog);
  const schedRepo = ds.getRepository(Schedule);
  const overtimeRepo = ds.getRepository(Overtime);
  const shiftDefRepo = ds.getRepository(ShiftDefinition);

  // Pick a primary location
  const primaryLoc = locations[0];
  if (!primaryLoc) throw new Error('No locations available');

  // Geofence center + offset for "outside"
  const centerLat = parseFloat(primaryLoc.gps_lat?.toString() || '-7.250445');
  const centerLng = parseFloat(primaryLoc.gps_lng?.toString() || '112.768845');
  const outsideOffset = 0.02; // ~2 km

  // Staging shift definitions
  // Bound by ROLE, not array position: selectRealShifts may return null for a
  // role no real shift can fill at this hour, so positional indexing would silently
  // shift everything by one.
  const shiftBelum = roles.belum;
  const shiftTerlambat = roles.terlambat;
  const shiftTidakHadir = roles.ended;

  // The "on-time" window is simply the REAL shift that is running now (the same
  // one that yields `terlambat` for someone who never showed). Clock in at
  // start+5min → on-time `bertugas`; at start+grace+30min → `is_late`. Both are
  // in the past for a shift already under way, so they hold at any hour.
  // No synthetic shift is created — the catalog stays Shift 1/2/3.
  const stdShift = shiftTerlambat ?? shiftTidakHadir ?? shiftBelum;
  if (!stdShift) throw new Error('No shift definitions found — seed the shift catalog first.');
  const windowStd = resolveShiftWindow(stdShift, today);
  // Fall back to the on-time window when a role is unfillable at this hour, so a
  // missing role degrades one scenario instead of crashing the whole run.
  const windowTidakHadir = shiftTidakHadir
    ? resolveShiftWindow(shiftTidakHadir, today)
    : windowStd;
  const windowTerlambat = shiftTerlambat ? resolveShiftWindow(shiftTerlambat, today) : windowStd;

  console.log('Staging scenarios:\n');

  // ─── BERTUGAS scenarios ───
  {
    const username = 'satgas_bertugas_1';
    const user = findUserOrWarn(username, usersByUsername);
    if (user) {
      const clockInTime = new Date(windowStd.start.getTime() + 5 * 60 * 1000);
      const shift = await shiftRepo.save({
        user_id: user.id,
        location_id: primaryLoc.id,
        shift_definition_id: stdShift.id,
        clock_in_time: clockInTime,
        clock_in_gps_lat: centerLat,
        clock_in_gps_lng: centerLng,
        clock_in_outside_boundary: false,
      });
      await locLogRepo.save({
        user_id: user.id,
        shift_id: shift.id,
        gps_lat: centerLat,
        gps_lng: centerLng,
        accuracy_meters: 10,
        battery_level: 80,
        logged_at: now,
      });
      scenarios.push({
        username,
        intendedState: 'bertugas + aktif + dalam_area',
        how: 'Clock-in on-time, fresh location ping inside geofence',
        found: true,
      });
      console.log(`  ✓ ${username}`);
    }
  }

  // ─── BERTUGAS + is_late ───
  {
    const username = 'satgas_terlambat_in_1';
    const user = findUserOrWarn(username, usersByUsername);
    if (user) {
      // Must use the STG_LATE window (started ~3h ago). stdShift now starts only
      // ~2 min before now, so "start + grace + 5min" landed in the FUTURE and the
      // clock-in was never actually late.
      const clockInTime = new Date(
        windowTerlambat.start.getTime() + (LATE_GRACE_SEC + 30 * 60) * 1000,
      );
      const shift = await shiftRepo.save({
        user_id: user.id,
        location_id: primaryLoc.id,
        shift_definition_id: (shiftTerlambat ?? stdShift).id,
        clock_in_time: clockInTime,
        clock_in_gps_lat: centerLat,
        clock_in_gps_lng: centerLng,
        clock_in_outside_boundary: false,
      });
      await locLogRepo.save({
        user_id: user.id,
        shift_id: shift.id,
        gps_lat: centerLat,
        gps_lng: centerLng,
        accuracy_meters: 10,
        battery_level: 75,
        logged_at: now,
      });
      scenarios.push({
        username,
        intendedState: 'bertugas + is_late + aktif',
        how: `Clock-in ${Math.round((LATE_GRACE_SEC + 5 * 60) / 60)} min after start (past grace)`,
        found: true,
      });
      console.log(`  ✓ ${username}`);
    }
  }

  // ─── BERTUGAS + luar_area ───
  {
    const username = 'satgas_luar_area_1';
    const user = findUserOrWarn(username, usersByUsername);
    if (user) {
      const clockInTime = new Date(windowStd.start.getTime() + 5 * 60 * 1000);
      const shift = await shiftRepo.save({
        user_id: user.id,
        location_id: primaryLoc.id,
        shift_definition_id: stdShift.id,
        clock_in_time: clockInTime,
        clock_in_gps_lat: centerLat,
        clock_in_gps_lng: centerLng,
        clock_in_outside_boundary: true,
      });
      await locLogRepo.save({
        user_id: user.id,
        shift_id: shift.id,
        gps_lat: centerLat + outsideOffset,
        gps_lng: centerLng,
        accuracy_meters: 15,
        battery_level: 70,
        logged_at: now,
      });
      scenarios.push({
        username,
        intendedState: 'bertugas + aktif + luar_area',
        how: 'Clock-in on-time, fresh ping ~2km outside geofence',
        found: true,
      });
      console.log(`  ✓ ${username}`);
    }
  }

  // ─── BERTUGAS + offline ───
  {
    const username = 'satgas_offline_1';
    const user = findUserOrWarn(username, usersByUsername);
    if (user) {
      const clockInTime = new Date(windowStd.start.getTime() + 5 * 60 * 1000);
      const staleLogTime = new Date(now.getTime() - (ACTIVE_MAX_AGE_SEC + 5 * 60) * 1000);
      const shift = await shiftRepo.save({
        user_id: user.id,
        location_id: primaryLoc.id,
        shift_definition_id: stdShift.id,
        clock_in_time: clockInTime,
        clock_in_gps_lat: centerLat,
        clock_in_gps_lng: centerLng,
        clock_in_outside_boundary: false,
      });
      await locLogRepo.save({
        user_id: user.id,
        shift_id: shift.id,
        gps_lat: centerLat,
        gps_lng: centerLng,
        accuracy_meters: 10,
        battery_level: 15,
        logged_at: staleLogTime,
      });
      scenarios.push({
        username,
        intendedState: 'bertugas + offline',
        how: `Clock-in on-time, last location ping is ${Math.round((ACTIVE_MAX_AGE_SEC + 5 * 60) / 60)} min old`,
        found: true,
      });
      console.log(`  ✓ ${username}`);
    }
  }

  // ─── BERTUGAS + lupa_clock_out ───
  {
    const username = 'satgas_lupa_pulang_1';
    const user = findUserOrWarn(username, usersByUsername);
    if (user) {
      // `lupa_clock_out` needs a window that has ALREADY ENDED — that is the whole
      // point of the flag. It used stdShift (which now runs now→+8h, i.e. still
      // open) with a *yesterday* clock-in, so the flag could never fire and the
      // service day was wrong too. STG_ABSENT ended ~2h ago; clock in inside it
      // and never clock out.
      const clockInTime = new Date(windowTidakHadir.start.getTime() + 5 * 60 * 1000);
      const shift = await shiftRepo.save({
        user_id: user.id,
        location_id: primaryLoc.id,
        shift_definition_id: (shiftTidakHadir ?? stdShift).id,
        clock_in_time: clockInTime,
        clock_in_gps_lat: centerLat,
        clock_in_gps_lng: centerLng,
        clock_in_outside_boundary: false,
      });
      await locLogRepo.save({
        user_id: user.id,
        shift_id: shift.id,
        gps_lat: centerLat,
        gps_lng: centerLng,
        accuracy_meters: 11,
        battery_level: 40,
        logged_at: new Date(clockInTime.getTime() + 30 * 60 * 1000),
      });
      scenarios.push({
        username,
        intendedState: 'bertugas + lupa_clock_out',
        how: 'Clock-in yesterday, no clock-out, shift window now ended',
        found: true,
      });
      console.log(`  ✓ ${username}`);
    }
  }

  // ─── BERTUGAS + lembur ───
  {
    const username = 'satgas_lembur_1';
    const user = findUserOrWarn(username, usersByUsername);
    if (user) {
      // `lembur` = still clocked in PAST the shift end, WITH approved overtime.
      // It used stdShift, whose window now runs now→+8h: the clock-in landed in
      // the FUTURE and the overtime 8h out, so past-end never held and the flag
      // never fired. Use the already-ended window and keep every timestamp in the
      // past, with the overtime covering the post-end stretch up to now.
      const clockInTime = new Date(windowTidakHadir.start.getTime() + 5 * 60 * 1000);
      const shift = await shiftRepo.save({
        user_id: user.id,
        location_id: primaryLoc.id,
        shift_definition_id: (shiftTidakHadir ?? stdShift).id,
        clock_in_time: clockInTime,
        clock_in_gps_lat: centerLat,
        clock_in_gps_lng: centerLng,
        clock_in_outside_boundary: false,
        // The backend reads `shift.is_overtime` (monitoring-user.service:514) — NOT
        // the overtimes table — to decide lembur vs lupa_clock_out. Without this the
        // approved overtime row is invisible and past-end presence reads as a
        // forgotten clock-out.
        is_overtime: true,
      });
      await overtimeRepo.save({
        user_id: user.id,
        location_id: primaryLoc.id,
        shift_id: shift.id,
        status: OvertimeStatus.APPROVED,
        start_datetime: new Date(windowTidakHadir.end.getTime() + 60 * 1000),
        end_datetime: new Date(now.getTime() + 60 * 60 * 1000),
        reason: 'Extended maintenance work',
        photo_urls: [],
      });
      await locLogRepo.save({
        user_id: user.id,
        shift_id: shift.id,
        gps_lat: centerLat,
        gps_lng: centerLng,
        accuracy_meters: 13,
        battery_level: 55,
        logged_at: new Date(now.getTime() - 2 * 60 * 1000),
      });
      scenarios.push({
        username,
        intendedState: 'bertugas + lembur (approved overtime)',
        how: 'Clock-in within shift, location ping past shift end WITH approved overtime',
        found: true,
      });
      console.log(`  ✓ ${username}`);
    }
  }

  // ─── BERTUGAS + ad_hoc ───
  {
    const username = 'satgas_unscheduled_1';
    const user = findUserOrWarn(username, usersByUsername);
    if (user) {
      const clockInTime = new Date(windowStd.start.getTime() + 60 * 60 * 1000);
      const shift = await shiftRepo.save({
        user_id: user.id,
        location_id: primaryLoc.id,
        shift_definition_id: null, // no shift assignment!
        clock_in_time: clockInTime,
        clock_in_gps_lat: centerLat,
        clock_in_gps_lng: centerLng,
        clock_in_outside_boundary: false,
      });
      await locLogRepo.save({
        user_id: user.id,
        shift_id: shift.id,
        gps_lat: centerLat,
        gps_lng: centerLng,
        accuracy_meters: 12,
        battery_level: 65,
        logged_at: now,
      });
      scenarios.push({
        username,
        intendedState: 'bertugas + ad_hoc (unscheduled)',
        how: 'Clock-in without a schedule for this location',
        found: true,
      });
      console.log(`  ✓ ${username}`);
    }
  }

  // ─── PULANG (clocked out, on-time) ───
  {
    const username = 'satgas_pulang_1';
    const user = findUserOrWarn(username, usersByUsername);
    if (user) {
      const clockInTime = new Date(windowStd.start.getTime() + 30 * 60 * 1000);
      const clockOutTime = new Date(windowStd.end.getTime() - 30 * 60 * 1000);
      await shiftRepo.save({
        user_id: user.id,
        location_id: primaryLoc.id,
        shift_definition_id: stdShift.id,
        clock_in_time: clockInTime,
        clock_in_gps_lat: centerLat,
        clock_in_gps_lng: centerLng,
        clock_in_outside_boundary: false,
        clock_out_time: clockOutTime,
        clock_out_gps_lat: centerLat,
        clock_out_gps_lng: centerLng,
        clock_out_outside_boundary: false,
      });
      scenarios.push({
        username,
        intendedState: 'pulang (clocked out, on-time)',
        how: 'Clock-in + clock-out both within shift window',
        found: true,
      });
      console.log(`  ✓ ${username}`);
    }
  }

  // ─── PULANG + early ───
  {
    const username = 'satgas_pulang_awal_1';
    const user = findUserOrWarn(username, usersByUsername);
    if (user) {
      const clockInTime = new Date(windowStd.start.getTime() + 30 * 60 * 1000);
      const clockOutTime = new Date(windowStd.end.getTime() - 2 * 60 * 60 * 1000);
      await shiftRepo.save({
        user_id: user.id,
        location_id: primaryLoc.id,
        shift_definition_id: stdShift.id,
        clock_in_time: clockInTime,
        clock_in_gps_lat: centerLat,
        clock_in_gps_lng: centerLng,
        clock_in_outside_boundary: false,
        clock_out_time: clockOutTime,
        clock_out_gps_lat: centerLat,
        clock_out_gps_lng: centerLng,
        clock_out_outside_boundary: false,
      });
      scenarios.push({
        username,
        intendedState: 'pulang + early (left before shift end)',
        how: 'Clock-in + clock-out >1 hour before shift end',
        found: true,
      });
      console.log(`  ✓ ${username}`);
    }
  }

  // ─── BELUM_HADIR (scheduled but not clocked in, within grace window) ───
  {
    const username = 'satgas_belum_hadir_1';
    const user = findUserOrWarn(username, usersByUsername);
    if (user) {
      const windowBelum = resolveShiftWindow(shiftBelum ?? stdShift, today);
      await schedRepo.save({
        user_id: user.id,
        schedule_date: today,
        shift_definition_id: (shiftBelum ?? stdShift).id,
        district_id: primaryLoc.district_id || null,
        status: ScheduleStatus.PLANNED,
        source: 'manual',
      });
      scenarios.push({
        username,
        intendedState: 'belum_hadir (scheduled, not in, within grace)',
        how: `Scheduled with STG_BELUM shift (starts in ~2h), no clock-in`,
        found: true,
      });
      console.log(`  ✓ ${username}`);
    }
  }

  // ─── TERLAMBAT (scheduled, past grace, not clocked in) ───
  {
    const username = 'satgas_terlambat_1';
    const user = findUserOrWarn(username, usersByUsername);
    if (user) {
      await schedRepo.save({
        user_id: user.id,
        schedule_date: today,
        shift_definition_id: (shiftTerlambat ?? stdShift).id,
        district_id: primaryLoc.district_id || null,
        status: ScheduleStatus.PLANNED,
        source: 'manual',
      });
      scenarios.push({
        username,
        intendedState: 'terlambat (scheduled, past grace, not in)',
        how: 'Scheduled with STG_LATE shift (started ~3h ago), no clock-in',
        found: true,
      });
      console.log(`  ✓ ${username}`);
    }
  }

  // ─── TIDAK_HADIR (scheduled, window ended, not clocked in) ───
  {
    const username = 'satgas_tidak_hadir_1';
    const user = findUserOrWarn(username, usersByUsername);
    if (user) {
      await schedRepo.save({
        user_id: user.id,
        schedule_date: today,
        shift_definition_id: (shiftTidakHadir ?? stdShift).id,
        district_id: primaryLoc.district_id || null,
        status: ScheduleStatus.PLANNED,
        source: 'manual',
      });
      scenarios.push({
        username,
        intendedState: 'tidak_hadir (scheduled, window ended, not in)',
        how: 'Scheduled with STG_ABSENT shift (ended ~2h ago), no clock-in',
        found: true,
      });
      console.log(`  ✓ ${username}`);
    }
  }

  // ─── EXCUSED: cuti (leave_annual) ───
  {
    const username = 'satgas_cuti_1';
    const user = findUserOrWarn(username, usersByUsername);
    if (user) {
      await schedRepo.save({
        user_id: user.id,
        schedule_date: today,
        shift_definition_id: stdShift.id,
        district_id: primaryLoc.district_id || null,
        status: ScheduleStatus.LEAVE_ANNUAL,
        source: 'manual',
      });
      scenarios.push({
        username,
        intendedState: 'tidak_bertugas + cuti (approved annual leave)',
        how: 'Schedule row with status LEAVE_ANNUAL',
        found: true,
      });
      console.log(`  ✓ ${username}`);
    }
  }

  // ─── EXCUSED: sakit (leave_sick) ───
  {
    const username = 'satgas_sakit_1';
    const user = findUserOrWarn(username, usersByUsername);
    if (user) {
      await schedRepo.save({
        user_id: user.id,
        schedule_date: today,
        shift_definition_id: stdShift.id,
        district_id: primaryLoc.district_id || null,
        status: ScheduleStatus.LEAVE_SICK,
        source: 'manual',
      });
      scenarios.push({
        username,
        intendedState: 'tidak_hadir + sakit (approved sick leave)',
        how: 'Schedule row with status LEAVE_SICK',
        found: true,
      });
      console.log(`  ✓ ${username}`);
    }
  }

  // ─── EXCUSED: izin (leave_permit) ───
  {
    const username = 'satgas_izin_1';
    const user = findUserOrWarn(username, usersByUsername);
    if (user) {
      await schedRepo.save({
        user_id: user.id,
        schedule_date: today,
        shift_definition_id: stdShift.id,
        district_id: primaryLoc.district_id || null,
        status: ScheduleStatus.LEAVE_PERMIT,
        source: 'manual',
      });
      scenarios.push({
        username,
        intendedState: 'tidak_hadir + izin (approved permit leave)',
        how: 'Schedule row with status LEAVE_PERMIT',
        found: true,
      });
      console.log(`  ✓ ${username}`);
    }
  }

  // ─── LIBUR (rest day / off schedule) ───
  {
    const username = 'satgas_libur_1';
    const user = findUserOrWarn(username, usersByUsername);
    if (user) {
      await schedRepo.save({
        user_id: user.id,
        schedule_date: today,
        shift_definition_id: null,
        district_id: primaryLoc.district_id || null,
        status: ScheduleStatus.OFF,
        source: 'manual',
      });
      scenarios.push({
        username,
        intendedState: 'tidak_bertugas + libur (off schedule / rest day)',
        how: 'Schedule row with status OFF (libur is unreachable as a leave_reason)',
        found: true,
      });
      console.log(`  ✓ ${username}`);
    }
  }

  // ─── TIDAK_BERTUGAS (no schedule, not clocked in) ───
  {
    const username = 'satgas_tidak_bertugas_1';
    const user = findUserOrWarn(username, usersByUsername);
    if (user) {
      // No schedule row, no shift → not appearing anywhere
      scenarios.push({
        username,
        intendedState: 'tidak_bertugas (not scheduled, not clocked in)',
        how: 'No schedule row for today; no active shift',
        found: true,
      });
      console.log(`  ✓ ${username}`);
    }
  }

  // ─── CITY SCOPE (surabaya_1 — schedule with district_id=NULL, region_id=NULL) ───
  {
    const username = 'satgas_surabaya_1';
    const user = findUserOrWarn(username, usersByUsername);
    if (user) {
      const clockInTime = new Date(windowStd.start.getTime() + 5 * 60 * 1000);
      const shift = await shiftRepo.save({
        user_id: user.id,
        location_id: primaryLoc.id,
        shift_definition_id: stdShift.id,
        clock_in_time: clockInTime,
        clock_in_gps_lat: centerLat,
        clock_in_gps_lng: centerLng,
        clock_in_outside_boundary: false,
      });
      await locLogRepo.save({
        user_id: user.id,
        shift_id: shift.id,
        gps_lat: centerLat,
        gps_lng: centerLng,
        accuracy_meters: 10,
        battery_level: 80,
        logged_at: now,
      });
      await schedRepo.save({
        user_id: user.id,
        schedule_date: today,
        shift_definition_id: stdShift.id,
        district_id: null, // CITY SCOPE
        region_id: null,
        status: ScheduleStatus.PRESENT,
        source: 'manual',
      });
      scenarios.push({
        username,
        intendedState: 'bertugas + CITY monitoring scope',
        how: 'Schedule with district_id=NULL and region_id=NULL; clock-in active',
        found: true,
      });
      console.log(`  ✓ ${username}`);
    }
  }

  // ─── DISTRICT SCOPE (rayon_1 — schedule with district_id set, region_id=NULL) ───
  {
    const username = 'satgas_rayon_1';
    const user = findUserOrWarn(username, usersByUsername);
    if (user) {
      const clockInTime = new Date(windowStd.start.getTime() + 5 * 60 * 1000);
      const shift = await shiftRepo.save({
        user_id: user.id,
        location_id: primaryLoc.id,
        shift_definition_id: stdShift.id,
        clock_in_time: clockInTime,
        clock_in_gps_lat: centerLat,
        clock_in_gps_lng: centerLng,
        clock_in_outside_boundary: false,
      });
      await locLogRepo.save({
        user_id: user.id,
        shift_id: shift.id,
        gps_lat: centerLat,
        gps_lng: centerLng,
        accuracy_meters: 10,
        battery_level: 80,
        logged_at: now,
      });
      await schedRepo.save({
        user_id: user.id,
        schedule_date: today,
        shift_definition_id: stdShift.id,
        district_id: primaryLoc.district_id || null,
        region_id: null, // DISTRICT SCOPE
        status: ScheduleStatus.PRESENT,
        source: 'manual',
      });
      scenarios.push({
        username,
        intendedState: 'bertugas + DISTRICT monitoring scope',
        how: `Schedule with district_id set (${primaryLoc.district_id}), region_id=NULL; clock-in active`,
        found: true,
      });
      console.log(`  ✓ ${username}`);
    }
  }

  // ─── REGION SCOPE (kawasan_1 — schedule with region_id set) ───
  {
    const username = 'satgas_kawasan_1';
    const user = findUserOrWarn(username, usersByUsername);
    if (user) {
      const clockInTime = new Date(windowStd.start.getTime() + 5 * 60 * 1000);
      const shift = await shiftRepo.save({
        user_id: user.id,
        location_id: primaryLoc.id,
        shift_definition_id: stdShift.id,
        clock_in_time: clockInTime,
        clock_in_gps_lat: centerLat,
        clock_in_gps_lng: centerLng,
        clock_in_outside_boundary: false,
      });
      await locLogRepo.save({
        user_id: user.id,
        shift_id: shift.id,
        gps_lat: centerLat,
        gps_lng: centerLng,
        accuracy_meters: 10,
        battery_level: 80,
        logged_at: now,
      });
      await schedRepo.save({
        user_id: user.id,
        schedule_date: today,
        shift_definition_id: stdShift.id,
        district_id: primaryLoc.district_id || null,
        region_id: primaryLoc.region_id || null, // REGION SCOPE
        status: ScheduleStatus.PRESENT,
        source: 'manual',
      });
      scenarios.push({
        username,
        intendedState: 'bertugas + REGION monitoring scope',
        how: `Schedule with region_id set (${primaryLoc.region_id}); clock-in active`,
        found: true,
      });
      console.log(`  ✓ ${username}`);
    }
  }

  // ─── LINMAS (role-based, counts toward staffing) ───
  {
    const username = 'linmas_bertugas_1';
    const user = findUserOrWarn(username, usersByUsername);
    if (user) {
      const clockInTime = new Date(windowStd.start.getTime() + 5 * 60 * 1000);
      const shift = await shiftRepo.save({
        user_id: user.id,
        location_id: primaryLoc.id,
        shift_definition_id: stdShift.id,
        clock_in_time: clockInTime,
        clock_in_gps_lat: centerLat,
        clock_in_gps_lng: centerLng,
        clock_in_outside_boundary: false,
      });
      await locLogRepo.save({
        user_id: user.id,
        shift_id: shift.id,
        gps_lat: centerLat,
        gps_lng: centerLng,
        accuracy_meters: 10,
        battery_level: 80,
        logged_at: now,
      });
      scenarios.push({
        username,
        intendedState: 'bertugas (linmas, COUNTS toward staffing)',
        how: 'Clock-in on-time, role=linmas (counted in roster summaries)',
        found: true,
      });
      console.log(`  ✓ ${username}`);
    }
  }

  // ─── KORLAP (role-based, does NOT count toward staffing) ───
  {
    const username = 'korlap_bertugas_1';
    const user = findUserOrWarn(username, usersByUsername);
    if (user) {
      const clockInTime = new Date(windowStd.start.getTime() + 5 * 60 * 1000);
      const shift = await shiftRepo.save({
        user_id: user.id,
        location_id: primaryLoc.id,
        shift_definition_id: stdShift.id,
        clock_in_time: clockInTime,
        clock_in_gps_lat: centerLat,
        clock_in_gps_lng: centerLng,
        clock_in_outside_boundary: false,
      });
      await locLogRepo.save({
        user_id: user.id,
        shift_id: shift.id,
        gps_lat: centerLat,
        gps_lng: centerLng,
        accuracy_meters: 10,
        battery_level: 80,
        logged_at: now,
      });
      scenarios.push({
        username,
        intendedState: 'bertugas (korlap, does NOT count toward staffing)',
        how: 'Clock-in on-time, role=korlap (not counted in staffing)',
        found: true,
      });
      console.log(`  ✓ ${username}`);
    }
  }
}

/**
 * Import missing for In() operator
 */
import { In } from 'typeorm';

/**
 * Print the final summary report.
 */
function reportStagedScenarios(): void {
  console.log('\n' + '='.repeat(100));
  console.log('STAGED PRESENCE SCENARIOS — SUMMARY');
  console.log('='.repeat(100) + '\n');

  console.log('Username | Intended State | How');
  console.log('---|---|---');

  for (const s of scenarios.filter((sc) => sc.found)) {
    console.log(`${s.username} | ${s.intendedState} | ${s.how}`);
  }

  const missing = scenarios.filter((sc) => !sc.found);
  if (missing.length > 0) {
    console.log('\n' + '='.repeat(100));
    console.log('MISSING USERS (not seeded, scenarios skipped):');
    console.log('='.repeat(100) + '\n');
    for (const s of missing) {
      console.log(`  ⚠️  ${s.username}`);
    }
  }

  console.log('\n' + '='.repeat(100));
  console.log('IMPORTANT NOTES:');
  console.log('='.repeat(100) + '\n');

  console.log('✅ DETERMINISTIC TIME WINDOWS:');
  console.log('  • STG_BELUM: starts now+2h (ensures belum_hadir regardless of wall-clock hour)');
  console.log('  • STG_LATE: started now-3h (ensures terlambat regardless of wall-clock hour)');
  console.log('  • STG_ABSENT: ended now-2h (ensures tidak_hadir regardless of wall-clock hour)');

  console.log(
    '\n❌ UNREACHABLE: `libur` leave_reason is deliberately NOT reachable from ScheduleStatus.OFF',
  );
  console.log('  Reason: mapping OFF to "on_leave" would double-count in roster summaries.');
  console.log('  See: monitoring-user.service.ts:38–46 (SCHEDULE_STATUS_TO_LEAVE)');
  console.log('  satgas_libur_1 exists to exercise the OFF status path, but will read as');
  console.log('  "tidak_bertugas" (not on the map).');

  console.log('\n📍 VERIFICATION:');
  console.log('  1. Open /monitoring in your web browser');
  console.log('  2. Check the live map for pins (only bertugas/lembur/ad_hoc users appear)');
  console.log('  3. Check the roster panel for expected/present/absent/on_leave tallies');
  console.log('  4. Click drill-downs to verify scope filtering (city/district/region)');

  console.log('\n' + '='.repeat(100) + '\n');
}

// Only run the CLI when this file is executed directly. Without the guard, the
// demo seeder's `import { stagePresenceScenarios }` would trigger a full staging
// run at MODULE LOAD — i.e. against a freshly truncated, empty DB, before the
// seed had inserted anything.
if (require.main === module) {
  main().catch((err) => {
    console.error('Error:', err);
    process.exit(1);
  });
}
