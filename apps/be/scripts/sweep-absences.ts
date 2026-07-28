/**
 * Run the absence sweep on demand, with an explicit lookback.
 *
 * The hourly `ScheduleAbsenceCron` is deliberately bounded to
 * `schedule.absence_sweep_lookback_days` (default 7) so that the first tick on a
 * database which has never swept cannot rewrite the whole backlog in one
 * transaction. That bound leaves a gap: rows older than the window are never
 * persisted `absent`. The UI still flips them at render time, but anything
 * reading raw `status` — a report, a CSV export, a hand-written query — sees
 * `planned` forever.
 *
 * This is the deliberate one-off backfill for that gap. Run it once after a
 * first deploy (verifier §8 reports how far back to reach), then let the hourly
 * cron keep up.
 *
 * Dry run by default: it reports what WOULD change without writing, because
 * "mark a few thousand people absent" deserves a look first.
 *
 *   npm run schedules:sweep-absences                      # dry run, 7-day window
 *   npm run schedules:sweep-absences -- --lookback 90     # dry run, 90 days
 *   npm run schedules:sweep-absences -- --all --apply     # backfill everything
 */
import AppDataSource from '../src/database/data-source';
import { SchedulesService } from '../src/modules/schedules/schedules.service';
import { Schedule } from '../src/modules/schedules/entities/schedule.entity';
import { Shift } from '../src/modules/shifts/entities/shift.entity';
import { TimezoneUtil } from '../src/common/utils/timezone.util';

const args = process.argv.slice(2);
const APPLY = args.includes('--apply');
const ALL = args.includes('--all');
const lookbackArg = args.indexOf('--lookback');
const LOOKBACK = ALL ? 0 : lookbackArg >= 0 ? Number(args[lookbackArg + 1]) : undefined;

if (LOOKBACK !== undefined && (!Number.isInteger(LOOKBACK) || LOOKBACK < 0)) {
  console.error('--lookback must be a non-negative integer (0 = unbounded)');
  process.exit(1);
}

async function main(): Promise<void> {
  // A bare DataSource, NOT a Nest application context.
  //
  // Booting AppModule runs every lifecycle hook, and the materializer's
  // `onApplicationBootstrap` self-heal fires immediately — so a *dry run* would
  // start writing roster rows. A script that promises to change nothing has to
  // avoid the framework's startup entirely.
  //
  // That leaves the service hand-wired, whose risk is a silently wrong argument
  // count. `tsconfig.scripts.json` now typechecks this directory, so that risk
  // is a build error rather than a 3am surprise.
  await AppDataSource.initialize();
  const qr = AppDataSource.createQueryRunner();
  await qr.connect();

  try {
    const scope = ALL ? 'ALL history' : LOOKBACK !== undefined ? `${LOOKBACK} days` : 'configured default';
    console.log('');
    console.log('='.repeat(72));
    console.log(` sweep-absences — ${APPLY ? 'APPLY' : 'DRY RUN'} · lookback: ${scope}`);
    console.log('='.repeat(72));

    // What the sweep would consider, and how far back the backlog reaches. Read
    // straight from SQL so the dry run costs nothing and cannot itself write.
    const [pending] = (await qr.query(
      `
      SELECT count(*)::int                    AS planned_rows,
             min(schedule_date)::text         AS oldest,
             max(schedule_date)::text         AS newest,
             (CURRENT_DATE - min(schedule_date))::int AS days_back
      FROM schedules
      WHERE deleted_at IS NULL
        AND status = 'planned'
        AND schedule_date < CURRENT_DATE
        AND ($1::int = 0 OR schedule_date >= CURRENT_DATE - $1::int)
      `,
      [LOOKBACK ?? 7],
    )) as Array<{ planned_rows: number; oldest: string | null; newest: string | null; days_back: number | null }>;

    if (pending.planned_rows === 0) {
      console.log('\nNothing pending — no past `planned` rows in this window.\n');
      return;
    }

    console.log(
      `\n${pending.planned_rows} past 'planned' row(s) in scope · ${pending.oldest} → ${pending.newest} ` +
        `(${pending.days_back} days back)\n`,
    );
    console.log(
      '  Rows whose shift window + cutoff_grace has closed become `absent`;\n' +
        '  any that turn out to have a session are self-healed to `present`.\n',
    );

    if (!APPLY) {
      console.log('DRY RUN — nothing written. Re-run with --apply.\n');
      return;
    }

    // Reuse the real service rather than reimplementing the window rule: a second
    // implementation of "is this a no-show" is exactly how surfaces drift apart.
    // Only the roster + shift repos are touched on this path; the rest are never
    // dereferenced by sweepAbsences. Reusing the real service keeps ONE
    // implementation of "is this a no-show".
    const service = new SchedulesService(
      AppDataSource.getRepository(Schedule),
      undefined as never,
      undefined as never,
      undefined as never,
      undefined as never,
      AppDataSource.getRepository(Shift),
      undefined as never,
      undefined as never,
      undefined as never,
      undefined as never,
    );
    const res = await service.sweepAbsences(TimezoneUtil.jakartaNow(), LOOKBACK);
    console.log(`✓ marked ${res.absent} absent, self-healed ${res.present} to present.\n`);
    console.log(
      '  Re-run the dry run to confirm 0 pending, then leave the hourly cron to\n' +
        '  keep up within its configured window.\n',
    );
  } finally {
    await qr.release();
    await AppDataSource.destroy();
  }
}

main().catch((err) => {
  console.error('sweep-absences failed:', err);
  process.exit(1);
});
