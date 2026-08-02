import type { Repository } from 'typeorm';
import { In, IsNull, Not } from 'typeorm';
import { Schedule, ScheduleStatus } from './entities/schedule.entity';
import { Shift } from '../shifts/entities/shift.entity';
import { TimezoneUtil } from '../../common/utils/timezone.util';
import { DAY_MS } from './schedules.support';

/** What the roster reads need from `SchedulesService`. */
export interface ReadDeps {
  rosterRepo: Repository<Schedule>;
  shiftRepo: Repository<Shift>;
}

/**
 * Plain roster reads: a day's rows, a worker's rows, and the row that is
 * OPERATIVE RIGHT NOW (which is not simply "today's" — a cross-midnight shift
 * belongs to the day it started). Split out of `schedules.service.ts`.
 */
/** All roster rows for a WIB day, optionally scoped to one district. */
export async function findByDate(
  svc: ReadDeps,
  date: string,
  districtId?: string | null,
): Promise<Schedule[]> {
  const qb = svc.rosterRepo
    .createQueryBuilder('ds')
    // `user` is eager on the entity, but createQueryBuilder ignores eager
    // relations — join it explicitly or every row comes back with no user
    // (the web table reads row.user.full_name and crashes).
    //
    // Explicit column lists, NOT leftJoinAndSelect — same reason as
    // `findByDateRange`. `users.profile_picture_url` holds a base64 data URI
    // (legacy rows reach 5 MB), so selecting the whole user stamps that blob
    // onto every one of that worker's rows. Measured on the staging clone: an
    // unscoped day returned **190 MB in 5.4 s** for 3.4k rows. `location` and
    // `region` carry `boundary_polygon` for the same reason.
    .leftJoin('ds.user', 'u')
    .addSelect(['u.id', 'u.full_name', 'u.username', 'u.role', 'u.is_active'])
    .leftJoin('ds.shift_definition', 'sd')
    .addSelect([
      'sd.id',
      'sd.name',
      'sd.start_time',
      'sd.end_time',
      'sd.crosses_midnight',
      'sd.cutoff_grace_min',
    ])
    .leftJoin('ds.location', 'location')
    .addSelect(['location.id', 'location.name'])
    .leftJoin('ds.replacement_user', 'ru')
    .addSelect(['ru.id', 'ru.full_name', 'ru.username', 'ru.role'])
    .where('ds.schedule_date = :date', { date })
    .andWhere('ds.deleted_at IS NULL');
  if (districtId) {
    qb.andWhere('ds.district_id = :districtId', { districtId });
  }
  return qb.orderBy('ds.status', 'ASC').addOrderBy('ds.created_at', 'ASC').getMany();
}

/**
 * ALL of a worker's live roster rows for a day, ordered by shift start time.
 * A worker may hold multiple non-overlapping shifts per day (ADR-047).
 */
export async function findAllByUserAndDate(
  svc: ReadDeps,
  userId: string,
  date: string,
): Promise<Schedule[]> {
  const rows = await svc.rosterRepo.find({
    where: { user_id: userId, schedule_date: date },
    // `region` is loaded so the mobile clock-in screen can name a kawasan-scope
    // assignment instead of falling back to "no area".
    relations: ['shift_definition', 'location', 'district', 'region'],
  });
  return rows.sort((a, b) =>
    (a.shift_definition?.start_time ?? '99:99:99').localeCompare(
      b.shift_definition?.start_time ?? '99:99:99',
    ),
  );
}

/**
 * Clock-in transition (ADR schedule-status-lifecycle): flip the day's roster
 * row(s) `planned → present`. Scoped to `(user, service_day, shift)` and to
 * `planned` only, so it never disturbs a `leave_*`/`off`/`replaced` row or an
 * ad-hoc clock-in with no row. Idempotent (a repeat clock-in is a no-op).
 */
export async function markPresentForClockIn(
  svc: ReadDeps,
  userId: string,
  serviceDay: string,
  shiftDefinitionId: string,
): Promise<void> {
  await svc.rosterRepo.update(
    {
      user_id: userId,
      schedule_date: serviceDay,
      shift_definition_id: shiftDefinitionId,
      status: ScheduleStatus.PLANNED,
      deleted_at: IsNull(),
    },
    { status: ScheduleStatus.PRESENT },
  );
}

/**
 * The roster row that is OPERATIVE RIGHT NOW — today's, or a still-running
 * cross-midnight shift started yesterday.
 *
 * `/schedules/my` defaulted to today's WIB date, so at 03:26 a satgas on
 * Shift 3 (21:00–05:00, started yesterday) was told "belum ada jadwal hari
 * ini" and read as unassigned — mid-shift. The service day for a crossing
 * shift does not end at midnight; the row that owns it belongs to the START
 * date. Today wins when it has a covering/upcoming row, so an early-morning
 * shift starting today is never shadowed by yesterday's tail.
 */
export async function findCurrentForUser(svc: ReadDeps, userId: string): Promise<Schedule | null> {
  const now = TimezoneUtil.jakartaNow();
  const today = TimezoneUtil.jakartaDateString();
  const nowMin = now.getUTCHours() * 60 + now.getUTCMinutes();

  const minutesOf = (hms: string): number => {
    const [h, m] = hms.split(':').map(Number);
    return h * 60 + m;
  };

  // Yesterday's crossing tail first: it is the only row that can be *running*
  // before its own start time reads as "upcoming" on today's clock.
  const yesterday = addDaysToDate(today, -1);
  const carried = (await findAllByUserAndDate(svc, userId, yesterday)).find((r) => {
    const sd = r.shift_definition;
    if (!sd?.crosses_midnight) return false;
    return nowMin < minutesOf(sd.end_time);
  });

  const todays = await findByUserAndDate(svc, userId, today);
  const resolved = !carried
    ? todays
    : !todays?.shift_definition
      ? carried
      : // Both exist: today's row wins only once it has actually started.
        nowMin >= minutesOf(todays.shift_definition.start_time)
        ? todays
        : carried;

  // A still-open shift that has OVERRUN its window no longer matches the
  // carried-tail test above (`now >= end_time`), yet the worker is demonstrably
  // still on it — the attendance record has no clock-out. At 05:42 on a Shift 3
  // (21:00–05:00) that was never closed, the plain resolution is empty and the
  // worker was shown "belum ada jadwal / tanpa area" mid-shift. Fall back to the
  // open shift's own roster row so the home hero + clock-out screen show the
  // real schedule/area and the geofence tests the right boundary. Only when
  // nothing else is operative, so a genuine current-day shift is never shadowed.
  return resolved ?? (await rosterRowForOpenShift(svc, userId));
}

/**
 * The roster row a currently-open shift (clocked in, not yet clocked out) was
 * started from — matched by the shift's WIB service-day + its shift definition.
 * Null when there is no open shift, or it was an ad-hoc clock-in with no roster
 * row (a genuinely unscheduled worker, correctly still "belum ada jadwal").
 */
export async function rosterRowForOpenShift(
  svc: ReadDeps,
  userId: string,
): Promise<Schedule | null> {
  const open = await svc.shiftRepo.findOne({
    where: { user_id: userId, clock_out_time: IsNull() },
    order: { clock_in_time: 'DESC' },
  });
  if (!open?.shift_definition_id) return null;
  const startDate = TimezoneUtil.jakartaDateString(open.clock_in_time);
  const rows = await findAllByUserAndDate(svc, userId, startDate);
  return rows.find((r) => r.shift_definition_id === open.shift_definition_id) ?? null;
}

export function addDaysToDate(dateStr: string, days: number): string {
  const d = new Date(dateStr + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().split('T')[0];
}

/**
 * The worker's MOST RELEVANT roster row for a day. With a single row this is
 * simply that row; with multiple shifts it picks, in order: the shift whose
 * time window covers "now" (WIB, honoring crosses_midnight) → the next
 * upcoming shift today → the last shift of the day. Deterministic — callers
 * that need every shift use findAllByUserAndDate.
 */
export async function findByUserAndDate(
  svc: ReadDeps,
  userId: string,
  date: string,
): Promise<Schedule | null> {
  const rows = await findAllByUserAndDate(svc, userId, date);
  if (rows.length <= 1) return rows[0] ?? null;

  const now = TimezoneUtil.jakartaNow();
  const nowMin = now.getUTCHours() * 60 + now.getUTCMinutes();

  const minutesOf = (hms: string): number => {
    const [h, m] = hms.split(':').map(Number);
    return h * 60 + m;
  };
  // A crosses-midnight shift on THIS date covers from its start tonight into
  // tomorrow — the after-midnight tail is served by the PREVIOUS day's row
  // (callers querying yesterday's date), so coverage here is simply
  // [start, end-possibly-past-1440) against today's clock.
  const covering = rows.find((r) => {
    const sd = r.shift_definition;
    if (!sd) return false;
    const start = minutesOf(sd.start_time);
    const end = minutesOf(sd.end_time) + (sd.crosses_midnight ? 24 * 60 : 0);
    return nowMin >= start && nowMin < end;
  });
  if (covering) return covering;

  const upcoming = rows.find(
    (r) => r.shift_definition && minutesOf(r.shift_definition.start_time) > nowMin,
  );
  return upcoming ?? rows[rows.length - 1];
}
