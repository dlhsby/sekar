/**
 * A live population worth looking at.
 *
 * The scenario catalog seeds *one worker per rule* — correct for assertions,
 * useless for judging a map. Before this the dev DB held six live workers, all
 * with pings older than the offline threshold, none on a team and none outside
 * their area: every presence number that matters read zero, "Aktif" was
 * permanently empty, and zoom mode — whose entire purpose is showing everyone at
 * once — had almost nobody to show.
 *
 * This clocks in a slice of the already-rostered fleet with a deliberate spread:
 *
 *  - most **aktif** (fresh ping), a minority **tidak aktif** (stale ping), so the
 *    Aktif / Tidak Aktif split on the node rows is non-degenerate;
 *  - a minority **outside their area**, so the "Luar area" figure appears at all;
 *  - spread across rayon/kawasan/lokasi, so drilling has content at every tier.
 *
 * It carries no assertions on purpose — it is scenery, not a rule — which is why
 * it lives here rather than in the catalog, whose `assertCatalogIsSound()`
 * rejects anything that arranges data and asserts nothing.
 */

import type { DataSource } from 'typeorm';
import type { Helpers } from './types';

export interface LivePopulationResult {
  clockedIn: number;
  stale: number;
  outsideArea: number;
}

/** Deterministic pseudo-random from a string — same seed, same map, every run. */
function hashToUnit(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i += 1) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h % 1000) / 1000;
}

export async function arrangeLivePopulation(
  ds: DataSource,
  helpers: Helpers,
  today: string,
  now: Date,
  /**
   * Usernames the CATALOG owns — every adopted persona.
   *
   * They must be excluded or the scenery overwrites the rules: clocking in
   * `satgas_belum_hadir_1` destroys the very thing that persona exists to show.
   * `clearDemoFixtures` learned this the hard way; this is the same guard.
   */
  ownedByCatalog: string[] = [],
  /** How many rostered workers to bring on duty. */
  target = 60,
): Promise<LivePopulationResult> {
  const shiftId = await helpers.currentShiftDefId();

  // Only workers already ROSTERED for the current shift: clocking in someone who
  // is not on today's roster would make them ad-hoc, which is a different case
  // (MON-15/21 own it) and would inflate the "Luar jadwal" pill.
  // Rostered WITHOUT a lokasi is not a reason to leave someone off the map: a
  // rayon-scoped occurrence is a legitimate assignment (ADR-046) and excluding
  // them cost both population and tier variety. They fall back to their own
  // account's lokasi for a position, and keep their rayon-level display scope.
  const rostered = (await ds.query(
    `SELECT DISTINCT s.user_id,
            COALESCE(s.location_id, u.location_id) AS location_id,
            COALESCE(s.district_id, u.district_id) AS district_id,
            u.username
       FROM schedules s
       JOIN users u ON u.id = s.user_id AND u.is_active
      WHERE s.schedule_date = $1
        AND s.deleted_at IS NULL
        AND s.status IN ('planned', 'present')
        AND s.shift_definition_id = $2
        AND u.role IN ('satgas', 'linmas')
        AND u.username NOT LIKE 'e2e_%'
        AND u.username <> ALL($4)
      ORDER BY s.user_id
      LIMIT $3`,
    [today, shiftId, target, ownedByCatalog],
  )) as Array<{
    user_id: string;
    location_id: string | null;
    district_id: string | null;
    username: string;
  }>;

  let stale = 0;
  let outsideArea = 0;

  for (const r of rostered) {
    const roll = hashToUnit(r.user_id);
    // ~20% stale (tidak aktif), ~15% outside their area. Both are minorities on
    // purpose: a map where half the fleet is offline reads as broken rather than
    // as a map with an offline worker on it.
    const isStale = roll < 0.2;
    const isOutside = roll >= 0.8;
    // Clock-in between 10 and 90 minutes ago, so Jam Masuk varies per worker.
    const minutesAgo = 10 + Math.floor(roll * 80);

    await helpers.punch({
      userId: r.user_id,
      label: 'clock_in',
      at: new Date(now.getTime() - minutesAgo * 60_000),
      serviceDay: today,
      shiftDefinitionId: shiftId,
      locationId: r.location_id,
      outsideBoundary: isOutside,
    });
    await helpers.track({
      userId: r.user_id,
      locationId: r.location_id,
      districtId: r.district_id,
      withinArea: !isOutside,
      // Stale = older than the 10-minute offline threshold (ADR-050).
      lastLocationAt: new Date(now.getTime() - (isStale ? 25 : 1) * 60_000),
    });

    if (isStale) stale += 1;
    if (isOutside) outsideArea += 1;
  }

  return { clockedIn: rostered.length, stale, outsideArea };
}

/**
 * Release the population again.
 *
 * Scoped to today and to non-`e2e_` accounts, so the catalog's own subjects —
 * which encode specific rules — are never disturbed by the scenery being reset.
 */
export async function clearLivePopulation(
  ds: DataSource,
  today: string,
  ownedByCatalog: string[] = [],
): Promise<void> {
  // Adopted personas are excluded for the same reason they are excluded from the
  // arrange: their punches ARE their scenario. Deleting them silently broke seven
  // presence scenarios the first time this ran.
  const scope = `user_id IN (
      SELECT id FROM users WHERE username NOT LIKE 'e2e_%' AND username <> ALL($2)
    )`;
  await ds.query(`DELETE FROM attendance_punches WHERE service_day = $1 AND ${scope}`, [
    today,
    ownedByCatalog,
  ]);
  await ds.query(`DELETE FROM shifts WHERE service_day = $1 AND ${scope}`, [
    today,
    ownedByCatalog,
  ]);
  await ds.query(
    `UPDATE user_tracking_status SET shift_id = NULL, shift_definition_id = NULL
      WHERE user_id IN (
        SELECT id FROM users WHERE username NOT LIKE 'e2e_%' AND username <> ALL($1)
      )`,
    [ownedByCatalog],
  );
}
