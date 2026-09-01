import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Preserve multi-place roster rows across the ADR-053 cutover.
 *
 * **Why this exists.** `17517` added `schedules.location_id` and backfilled it
 * with `MIN(location_id)` per schedule; `17518` then drops the
 * `schedule_locations` junction. Both say "nothing is lost" — and that is true
 * only when a schedule has at most ONE location. It does not hold on real data.
 *
 * Measured on live staging before the cutover (2026-07-23):
 *
 *   18,649 schedules carried 136,292 location assignments
 *    2,600 of them had 2+ locations
 *  117,643 assignments would have been silently discarded by the MIN collapse
 *      179 locations on the worst single row
 *
 * Those rows are current (2026-07-01…24, 161 of them today-or-future), so this
 * is live roster data, not history. Discarding it would have been invisible: no
 * error, no constraint violation, just a day board that quietly forgot where
 * most of the workforce was due.
 *
 * **What it does.** For every schedule still holding more than one junction
 * location, it re-expresses the assignment in the ADR-053 model, choosing the
 * narrowest scope that covers the set:
 *
 *   1. all locations inside ONE kawasan  → one **region-scoped** row
 *   2. else all inside ONE rayon         → one **district-scoped** row
 *   3. else                              → **fan out**, one row per location
 *
 * (1) and (2) lean on ADR-053's own containment rule — a kawasan row covers the
 * lokasi in it, a rayon row covers the lokasi in it — which is also what makes a
 * 179-location row legible again: it was one "cover this rayon" assignment that
 * the old bulk-assign UI wrote out one lokasi at a time, and it becomes one row
 * saying exactly that. Fan-out is the honest fallback when the set genuinely
 * straddles containers (192 of the 2,600 on staging).
 *
 * The copies inherit every column of their parent (status, team, source, notes,
 * `schedule_event_id`, …) so nothing but the place changes. Child records —
 * shifts, activities — stay attached to the original row, which is correct:
 * presence belongs to the worker and the shift, never to the roster row
 * (ADR-053, consequence 1).
 *
 * **Ordering.** Must run after `17517` (which creates `location_id` and the
 * `(user, date, shift, place)` unique index) and before `17518` (which drops the
 * junction). Hence the `.5` timestamp. On a database that has already run
 * `17518` — every local dev DB — the junction is gone and this is a no-op.
 * On a fresh migration-built DB the junction is empty, likewise a no-op.
 *
 * **Nothing is destroyed either way:** the junction is copied to
 * `schedule_locations_archive` first, so the raw assignments remain recoverable
 * even if the scope choice above later proves wrong.
 *
 * DO NOT RENAME this class — TypeORM keys applied migrations by className +
 * timestamp.
 */
export class PreserveMultiPlaceSchedules17517500000000 implements MigrationInterface {
  name = 'PreserveMultiPlaceSchedules17517500000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const junction = await queryRunner.query(
      `SELECT to_regclass('public.schedule_locations') IS NOT NULL AS present`,
    );
    if (!junction?.[0]?.present) return; // already retired, or fresh DB

    // 1) Archive the raw assignments before anything reinterprets them.
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS schedule_locations_archive AS
        SELECT *, now() AS archived_at FROM schedule_locations
    `);

    // 2) Re-express every multi-location schedule.
    //
    // The column list is read from the catalog rather than hardcoded: this runs
    // against a schema that has been through 38 migrations, and a hardcoded list
    // would silently drop any column added since. Generated columns are excluded
    // (they cannot be inserted into).
    await queryRunner.query(`
      DO $$
      DECLARE
        cols       text;
        cols_pref  text;
        n_region   bigint := 0;
        n_district bigint := 0;
        n_fanout   bigint := 0;
      BEGIN
        SELECT string_agg(quote_ident(column_name), ', ' ORDER BY ordinal_position),
               string_agg('s.' || quote_ident(column_name), ', ' ORDER BY ordinal_position)
          INTO cols, cols_pref
          FROM information_schema.columns
         WHERE table_schema = 'public'
           AND table_name   = 'schedules'
           AND column_name NOT IN ('id', 'location_id', 'region_id', 'district_id')
           AND is_generated = 'NEVER';

        -- Working set: schedules with >1 distinct location, plus how far their
        -- locations spread. Uses the CURRENT geography column names (locations /
        -- districts) — by this point 17492500000000 and 17510000000000 have run.
        CREATE TEMP TABLE _multi ON COMMIT DROP AS
          SELECT sl.schedule_id,
                 count(DISTINCT sl.location_id)              AS n_locs,
                 count(DISTINCT l.region_id)                 AS n_regions,
                 count(DISTINCT l.district_id)               AS n_districts,
                 min(l.region_id::text)::uuid                AS the_region,
                 min(l.district_id::text)::uuid              AS the_district,
                 bool_or(l.region_id IS NULL)                AS any_region_null
            FROM schedule_locations sl
            JOIN locations l ON l.id = sl.location_id
           GROUP BY sl.schedule_id
          HAVING count(DISTINCT sl.location_id) > 1;

        -- (1) All locations in ONE kawasan -> a single region-scoped row.
        --     any_region_null guards Taman Aktif, whose lokasi hang straight off
        --     the rayon (region_id IS NULL); those fall through to (2).
        EXECUTE '
          UPDATE schedules s
             SET region_id = m.the_region, location_id = NULL, district_id = NULL
            FROM _multi m
           WHERE m.schedule_id = s.id
             AND m.n_regions = 1 AND NOT m.any_region_null';
        GET DIAGNOSTICS n_region = ROW_COUNT;

        -- (2) Else all in ONE rayon -> a single district-scoped row.
        EXECUTE '
          UPDATE schedules s
             SET district_id = m.the_district, location_id = NULL, region_id = NULL
            FROM _multi m
           WHERE m.schedule_id = s.id
             AND m.n_districts = 1
             AND NOT (m.n_regions = 1 AND NOT m.any_region_null)';
        GET DIAGNOSTICS n_district = ROW_COUNT;

        -- (3) Else fan out: keep the parent on its MIN location (17517 already
        --     set that) and add one row per remaining location.
        EXECUTE format($f$
          INSERT INTO schedules (id, location_id, region_id, district_id, %s)
          SELECT gen_random_uuid(), x.location_id, NULL, NULL, %s
            FROM schedules s
            JOIN _multi m ON m.schedule_id = s.id
            JOIN (SELECT DISTINCT schedule_id, location_id FROM schedule_locations) x
              ON x.schedule_id = s.id
           WHERE m.n_districts > 1
             AND x.location_id IS DISTINCT FROM s.location_id
          ON CONFLICT DO NOTHING
        $f$, cols, cols_pref);
        GET DIAGNOSTICS n_fanout = ROW_COUNT;

        -- (4) Retire the junction rows we have just re-expressed.
        --
        -- REQUIRED, not tidiness: 17518 re-runs the MIN backfill for any schedule
        -- whose location_id IS NULL, which is exactly the shape a (1)/(2) collapse
        -- produces. Left in place, those rows would be dragged straight back to a
        -- single lokasi and the collapse would be undone. The archive from step 1
        -- still holds every one of them.
        DELETE FROM schedule_locations sl USING _multi m WHERE m.schedule_id = sl.schedule_id;

        RAISE NOTICE 'multi-place schedules preserved: % collapsed to kawasan, % to rayon, % rows fanned out',
                     n_region, n_district, n_fanout;
      END $$;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // The archive is the recovery path; it is deliberately NOT dropped here.
    // Reversing the reinterpretation would mean guessing which rows were copies,
    // and re-creating the junction would reinstate the model ADR-053 rejects.
    await queryRunner.query(`SELECT 1`);
  }
}
