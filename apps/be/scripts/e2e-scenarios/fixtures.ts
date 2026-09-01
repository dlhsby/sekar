/**
 * Demo roster fixtures — the half of the retired stager that was never a
 * scenario.
 *
 * These rows carry no assertion, so they are deliberately NOT scenarios: the
 * catalog's `assertCatalogIsSound()` rejects anything that arranges data and
 * asserts nothing, and weakening that rule to fit fixtures would let a genuinely
 * broken scenario pass vacuously. They live here instead, arranged alongside the
 * catalog and named for what they exist to make possible.
 *
 * What depends on them (`specs/testing/manual-uat.md`):
 *  - the Jadwal day board has rows to show at every rayon,
 *  - "Penugasan Kota" has a full role set per shift to drag between Shift 1/2/3,
 *  - monitoring drill-down has scheduled workers at each tier to drill into.
 */

import type { DataSource } from 'typeorm';
import type { Helpers } from './types';

/** One full role set per shift — the cohort the rescheduling test drags around. */
const SHIFT_COHORT = ['satgas_shift', 'linmas_shift', 'korlap_shift'];
const TEAM_COHORT = ['tim_shift'];

interface FixtureResult {
  rosterRows: number;
  skipped: string[];
}

export async function arrangeDemoFixtures(
  ds: DataSource,
  helpers: Helpers,
  today: string,
  /**
   * Usernames the CATALOG owns — every adopted persona.
   *
   * They must be excluded or the fixtures overwrite the scenarios: the leave
   * personas were re-rostered as `planned`, and `satgas_unscheduled_1` was given
   * a schedule, which is precisely the one thing that scenario needs it not to
   * have. Caught by `--verify-only` on a freshly seeded database.
   */
  ownedByCatalog: string[] = [],
): Promise<FixtureResult> {
  const skipped: string[] = [];
  let rosterRows = 0;

  const shiftIds = (await ds.query(
    `SELECT id, name FROM shift_definitions
      WHERE deleted_at IS NULL AND is_active ORDER BY start_time LIMIT 3`,
  )) as Array<{ id: string; name: string }>;
  if (shiftIds.length === 0) {
    return { rosterRows: 0, skipped: ['no shift definitions — seed the catalog first'] };
  }

  /** Roster one username, using whatever geography their account already has. */
  const rosterUser = async (username: string, shiftDefinitionId: string): Promise<void> => {
    if (ownedByCatalog.includes(username)) return;
    const [u] = (await ds.query(
      `SELECT u.id, u.location_id, u.district_id, l.region_id
         FROM users u LEFT JOIN locations l ON l.id = u.location_id
        WHERE u.username = $1 AND u.is_active`,
      [username],
    )) as Array<{
      id: string;
      location_id: string | null;
      district_id: string | null;
      region_id: string | null;
    }>;
    if (!u) {
      skipped.push(username);
      return;
    }
    await helpers.schedule({
      userId: u.id,
      date: today,
      shiftDefinitionId,
      locationId: u.location_id,
      districtId: u.district_id,
    });
    rosterRows += 1;
  };

  // ── The rescheduling cohort: role set N on Shift N ──────────────────────────
  for (const [i, shift] of shiftIds.entries()) {
    const n = i + 1;
    for (const prefix of SHIFT_COHORT) await rosterUser(`${prefix}_${n}`, shift.id);
    for (const prefix of TEAM_COHORT) {
      await rosterUser(`${prefix}_${n}_1`, shift.id);
      await rosterUser(`${prefix}_${n}_2`, shift.id);
    }
  }

  // ── Every remaining field worker, on the shift that is running now ──────────
  // Without this the Jadwal board is empty at most rayon and the drill-down has
  // nothing to drill into — the state the board was in before the stager ran.
  const currentShift = await helpers.currentShiftDefId();
  const rest = (await ds.query(
    `SELECT u.id, u.username, u.location_id, u.district_id
       FROM users u
      WHERE u.is_active
        AND u.role IN ('satgas', 'linmas', 'korlap')
        AND u.district_id IS NOT NULL
        AND u.username NOT LIKE 'e2e_%'
        AND u.username <> ALL($2)
        AND NOT EXISTS (
          SELECT 1 FROM schedules s
           WHERE s.user_id = u.id AND s.schedule_date = $1 AND s.deleted_at IS NULL
        )`,
    [today, ownedByCatalog],
  )) as Array<{ id: string; username: string; location_id: string | null; district_id: string }>;

  for (const u of rest) {
    await helpers.schedule({
      userId: u.id,
      date: today,
      shiftDefinitionId: currentShift,
      locationId: u.location_id,
      districtId: u.district_id,
    });
    rosterRows += 1;
  }

  return { rosterRows, skipped };
}

/**
 * Remove fixture rows so a re-run does not stack them.
 *
 * Scoped to TODAY and to `source = 'manual'`, which is what `helpers.schedule`
 * writes — event-materialized rows belong to the cron and must survive.
 */
export async function clearDemoFixtures(
  ds: DataSource,
  today: string,
  ownedByCatalog: string[] = [],
): Promise<void> {
  await ds.query(
    `DELETE FROM schedules
      WHERE schedule_date = $1 AND source = 'manual'
        AND user_id IN (
          SELECT id FROM users
           WHERE username NOT LIKE 'e2e_%' AND username <> ALL($2)
        )`,
    [today, ownedByCatalog],
  );
}
