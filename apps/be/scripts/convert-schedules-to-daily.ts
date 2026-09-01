/**
 * Promote standing one-off schedule events to recurring DAILY events.
 *
 * Why this exists
 * ---------------
 * ADR-047 made a `ScheduleEvent` the rule and the roster its materialization.
 * Migration `17492700000000` converted every standing template into an
 * open-ended DAILY event, but anything created *since* through the calendar UI
 * defaults to "Tidak berulang" (`none`). A `none` event materializes exactly one
 * day and then stops, so a worker who looks scheduled today quietly has no
 * roster from tomorrow on — and nothing in the product says so.
 *
 * What counts as a candidate
 * --------------------------
 * An **open-ended** `none` event: `end_date IS NULL`. That combination is
 * self-contradictory — someone who meant a single day would have bounded it —
 * and it is exactly the shape a standing assignment takes when it is created
 * without a recurrence. A `none` event WITH an `end_date` looks deliberate and
 * is left alone unless `--include-bounded` is passed.
 *
 * Safety
 * ------
 * - **Dry run by default.** Nothing is written without `--apply`.
 * - Prints the exact rows it would change, so a human approves the list.
 * - Idempotent: promoted events are no longer `none`, so a second run is a
 *   no-op. Safe to re-run right before cutover.
 * - Touches only `recurrence_type` (+ an audit note). Never changes who, which
 *   shift, or where; never deletes; never creates events for someone who has
 *   none (that is a judgement call the verifier reports for a human instead).
 * - Materializing the newly-daily events is left to the normal materializer
 *   (boot self-heal + the 00:15/17:00 crons, or `POST /schedules/generate`), so
 *   this script owns one decision and nothing else.
 *
 * Usage
 * -----
 *   npm run schedules:to-daily              # dry run — prints the plan
 *   npm run schedules:to-daily -- --apply   # write
 *   npm run schedules:to-daily -- --apply --include-bounded
 */
import AppDataSource from '../src/database/data-source';

interface Candidate {
  id: string;
  start_date: string;
  end_date: string | null;
  username: string | null;
  role: string | null;
  shift_name: string | null;
  scope: string;
  place: string | null;
  is_team: boolean;
  future_rows: string;
  /** Another ACTIVE daily event already covers this (user, shift, place). */
  dup_daily: boolean;
  /** How many candidates in THIS batch share the same (user, shift, place). */
  batch_siblings: string;
}

const args = process.argv.slice(2);
const APPLY = args.includes('--apply');
const INCLUDE_BOUNDED = args.includes('--include-bounded');

const NOTE = 'Promoted to daily by convert-schedules-to-daily';

async function main(): Promise<void> {
  await AppDataSource.initialize();
  const qr = AppDataSource.createQueryRunner();
  await qr.connect();

  try {
    // Only events whose target is a live, active worker: promoting an event for
    // someone deactivated would resurrect a schedule for a person who has left.
    const candidates: Candidate[] = await qr.query(
      `
      SELECT
        e.id,
        e.start_date::text                       AS start_date,
        e.end_date::text                         AS end_date,
        u.username,
        u.role,
        sd.name                                  AS shift_name,
        e.scope,
        COALESCE(l.name, r.name, d.name)         AS place,
        e.is_team,
        (SELECT count(*) FROM schedules s
           WHERE s.schedule_event_id = e.id
             AND s.deleted_at IS NULL
             AND s.schedule_date > CURRENT_DATE) AS future_rows,
        EXISTS (
          SELECT 1 FROM schedule_events d
          WHERE d.deleted_at IS NULL AND d.is_active
            AND d.recurrence_type = 'daily'
            AND d.user_id IS NOT DISTINCT FROM e.user_id
            AND d.shift_definition_id = e.shift_definition_id
            AND COALESCE(d.location_id, d.region_id, d.district_id)
                IS NOT DISTINCT FROM COALESCE(e.location_id, e.region_id, e.district_id)
        )                                        AS dup_daily,
        (SELECT count(*) FROM schedule_events b
           WHERE b.deleted_at IS NULL AND b.is_active
             AND b.recurrence_type = 'none'
             AND b.user_id IS NOT DISTINCT FROM e.user_id
             AND b.shift_definition_id = e.shift_definition_id
             AND COALESCE(b.location_id, b.region_id, b.district_id)
                 IS NOT DISTINCT FROM COALESCE(e.location_id, e.region_id, e.district_id)
        )                                        AS batch_siblings
      FROM schedule_events e
      LEFT JOIN users u              ON u.id  = e.user_id
      LEFT JOIN shift_definitions sd ON sd.id = e.shift_definition_id
      LEFT JOIN locations l          ON l.id  = e.location_id
      LEFT JOIN regions r            ON r.id  = e.region_id
      LEFT JOIN districts d          ON d.id  = e.district_id
      WHERE e.deleted_at IS NULL
        AND e.is_active
        AND e.recurrence_type = 'none'
        AND ($1::boolean OR e.end_date IS NULL)
        -- A team event has no single user_id; its members are resolved at
        -- materialization, so only require a live user for individual events.
        AND (e.is_team OR (u.id IS NOT NULL AND u.is_active AND u.deleted_at IS NULL))
      ORDER BY u.role NULLS FIRST, u.username NULLS FIRST, sd.name
      `,
      [INCLUDE_BOUNDED],
    );

    const skipped: Array<{ reason: string; count: number }> = await qr.query(
      `
      SELECT reason, count(*)::int AS count FROM (
        SELECT CASE
          WHEN e.end_date IS NOT NULL THEN 'bounded one-off (deliberate; use --include-bounded)'
          WHEN NOT e.is_team AND (u.id IS NULL OR NOT u.is_active OR u.deleted_at IS NOT NULL)
            THEN 'target worker inactive or missing'
          ELSE 'other'
        END AS reason
        FROM schedule_events e
        LEFT JOIN users u ON u.id = e.user_id
        WHERE e.deleted_at IS NULL AND e.is_active AND e.recurrence_type = 'none'
          AND NOT (
            ($1::boolean OR e.end_date IS NULL)
            AND (e.is_team OR (u.id IS NOT NULL AND u.is_active AND u.deleted_at IS NULL))
          )
      ) x
      GROUP BY reason ORDER BY count DESC
      `,
      [INCLUDE_BOUNDED],
    );

    console.log('');
    console.log('='.repeat(78));
    console.log(` convert-schedules-to-daily — ${APPLY ? 'APPLY' : 'DRY RUN'}`);
    console.log(`   scope: open-ended one-offs${INCLUDE_BOUNDED ? ' + bounded one-offs' : ''}`);
    console.log('='.repeat(78));

    if (candidates.length === 0) {
      console.log('\nNothing to promote — no active one-off events match. (Already converged.)\n');
      for (const s of skipped) console.log(`  skipped: ${s.count} × ${s.reason}`);
      return;
    }

    /**
     * Two collisions worth naming before anyone writes:
     *
     * - `dup_daily` — a daily event already covers this (user, shift, place), so
     *   promoting adds nothing; the materializer's (user, date, shift, place) key
     *   would skip its rows anyway.
     * - `batch_siblings > 1` — the SAME (user, shift, place) appears more than
     *   once among the candidates. Left-over test events look exactly like this,
     *   and promoting every copy makes the mess permanent instead of one-day.
     *
     * Neither is auto-skipped — a human reads the list and decides — but they are
     * called out so a clean batch is obvious at a glance.
     */
    const flagged = candidates.filter((c) => c.dup_daily || Number(c.batch_siblings) > 1);
    console.log(`\n${candidates.length} event(s) would become recurring DAILY:\n`);
    const pad = (v: string | null, n: number): string => (v ?? '—').padEnd(n).slice(0, n);
    console.log(
      `  ${pad('WORKER', 28)} ${pad('ROLE', 7)} ${pad('SHIFT', 8)} ${pad('SCOPE', 9)} ${pad('PLACE', 22)} WARN`,
    );
    console.log(`  ${'-'.repeat(88)}`);
    for (const c of candidates) {
      const warn = [
        c.dup_daily ? 'already-daily' : '',
        Number(c.batch_siblings) > 1 ? `x${c.batch_siblings}-same-slot` : '',
      ]
        .filter(Boolean)
        .join(' ');
      console.log(
        `  ${pad(c.is_team ? '(team event)' : c.username, 28)} ${pad(c.role, 7)} ${pad(
          c.shift_name,
          8,
        )} ${pad(c.scope, 9)} ${pad(c.place, 22)} ${warn}`,
      );
    }

    if (flagged.length) {
      console.log(
        `\n  ⚠ ${flagged.length} of ${candidates.length} are flagged above. Several one-offs for the\n` +
          '    same worker+shift+place are usually left-over test events — promoting every\n' +
          '    copy makes them permanent. Review before --apply, or delete them first.',
      );
    }

    if (skipped.length) {
      console.log('');
      for (const s of skipped) console.log(`  skipped: ${s.count} × ${s.reason}`);
    }

    if (!APPLY) {
      console.log('\nDRY RUN — nothing written. Re-run with --apply to convert.\n');
      return;
    }

    const ids = candidates.map((c) => c.id);
    await qr.startTransaction();
    try {
      // recurrence_config stays NULL: `daily` needs no parameters, and leaving a
      // stale config behind would confuse the expander.
      const res: [unknown[], number] = await qr.query(
        `
        UPDATE schedule_events
           SET recurrence_type = 'daily',
               recurrence_config = NULL,
               notes = CASE
                         WHEN notes IS NULL OR notes = '' THEN $2
                         WHEN notes LIKE '%' || $2 || '%' THEN notes
                         ELSE notes || ' · ' || $2
                       END,
               updated_at = now()
         WHERE id = ANY($1::uuid[])
           AND recurrence_type = 'none'
        `,
        [ids, NOTE],
      );
      await qr.commitTransaction();
      const changed = Array.isArray(res) ? res[1] : ids.length;
      console.log(`\n✓ Promoted ${changed} event(s) to daily.`);
      console.log(
        '  Roster rows are NOT generated here — the materializer fills the horizon on\n' +
          '  its next run (boot self-heal / 00:15 + 17:00 WIB), or trigger it now with\n' +
          '  POST /schedules/generate. Re-run this script to confirm 0 remaining.\n',
      );
    } catch (err) {
      await qr.rollbackTransaction();
      throw err;
    }
  } finally {
    await qr.release();
    await AppDataSource.destroy();
  }
}

main().catch((err) => {
  console.error('convert-schedules-to-daily failed:', err);
  process.exit(1);
});
