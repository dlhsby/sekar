/**
 * RosterPresenceService — the batching + windowing layer around the pure
 * derivation (which is covered in `lib/__tests__/roster-presence.spec.ts`).
 *
 * The regression that motivated most of this file: `attach` originally defaulted
 * `now` to `TimezoneUtil.jakartaNow()`, but `jakartaDateString` applies the +7h
 * offset itself and `derivePresenceState` compares against real instants. The
 * clock ended up 14h ahead, which quietly derived TOMORROW's rows and aged
 * today's toward `tidak_hadir`. The pure tests could not catch it because they
 * pass real instants — so the boundary is asserted here.
 */
import { RosterPresenceService } from '../roster-presence.service';
import { ScheduleStatus, type Schedule } from '../../entities/schedule.entity';
import type { Shift } from '../../../shifts/entities/shift.entity';

const SHIFT_1 = {
  id: 's1',
  name: 'Shift 1',
  start_time: '06:00:00',
  end_time: '15:00:00',
  crosses_midnight: false,
};

const row = (over: Partial<Schedule> = {}): Schedule =>
  ({
    id: `r-${Math.random().toString(36).slice(2)}`,
    user_id: 'u1',
    schedule_date: '2026-07-27',
    shift_definition_id: 's1',
    status: ScheduleStatus.PLANNED,
    shift_definition: SHIFT_1,
    ...over,
  }) as unknown as Schedule;

/** A fix taken `min` minutes before the scenario clock. */
const fixAt = (min: number, base = '2026-07-27T10:00:00+07:00'): Date =>
  new Date(new Date(base).getTime() - min * 60_000);

function build(
  sessions: Partial<Shift>[] = [],
  tracking: Array<{
    user_id: string;
    is_within_area: boolean;
    last_location_at?: Date | null;
  }> = [],
) {
  const shiftRepo = { find: jest.fn().mockResolvedValue(sessions) };
  const trackingRepo = { find: jest.fn().mockResolvedValue(tracking) };
  const config = { getNumber: jest.fn().mockReturnValue(900) };
  const service = new RosterPresenceService(
    shiftRepo as never,
    trackingRepo as never,
    config as never,
  );
  return { service, shiftRepo, trackingRepo, config };
}

/** A real instant for a WIB wall-clock time. */
const wib = (hhmm: string, day = '2026-07-27'): Date => new Date(`${day}T${hhmm}:00+07:00`);

describe('RosterPresenceService', () => {
  it('returns the input untouched when there are no rows, hitting no DB', async () => {
    const { service, shiftRepo, trackingRepo } = build();
    await expect(service.attach([])).resolves.toEqual([]);
    expect(shiftRepo.find).not.toHaveBeenCalled();
    expect(trackingRepo.find).not.toHaveBeenCalled();
  });

  describe('the today boundary (the 14h double-shift regression)', () => {
    it('derives today but NOT tomorrow, evaluated late in the WIB evening', async () => {
      // 18:40 WIB — the exact condition that used to roll `today` to the 28th.
      const now = wib('18:40');
      const { service } = build();
      const [today, tomorrow] = await service.attach(
        [row({ schedule_date: '2026-07-27' }), row({ schedule_date: '2026-07-28' })],
        now,
      );

      expect(today.lifecycle_state).toBe('tidak_hadir'); // window closed at 15:00
      expect(tomorrow.lifecycle_state).toBeNull(); // not applicable, not "off duty"
      expect(tomorrow.lifecycle_flags).toEqual([]);
    });

    it('still treats the current WIB day as today just before midnight', async () => {
      const { service } = build();
      const [r] = await service.attach([row({ schedule_date: '2026-07-27' })], wib('23:50'));
      expect(r.lifecycle_state).toBe('tidak_hadir');
    });

    it('treats a row as future right after WIB midnight rolls over', async () => {
      const { service } = build();
      const [r] = await service.attach(
        [row({ schedule_date: '2026-07-28' })],
        wib('00:10', '2026-07-28'),
      );
      // 00:10 on the 28th: the row IS today now, and its shift has not started.
      expect(r.lifecycle_state).toBe('belum_hadir');
    });

    it('skips the DB entirely when every row is in the future', async () => {
      const { service, shiftRepo, trackingRepo } = build();
      const out = await service.attach([row({ schedule_date: '2026-09-01' })], wib('10:00'));
      expect(out[0].lifecycle_state).toBeUndefined();
      expect(shiftRepo.find).not.toHaveBeenCalled();
      expect(trackingRepo.find).not.toHaveBeenCalled();
    });
  });

  describe('batching', () => {
    it('issues exactly one session query and one tracking query for many rows', async () => {
      const { service, shiftRepo, trackingRepo } = build();
      const rows = Array.from({ length: 50 }, (_, i) =>
        row({ user_id: `u${i % 10}`, schedule_date: i % 2 ? '2026-07-26' : '2026-07-27' }),
      );
      await service.attach(rows, wib('18:00'));
      expect(shiftRepo.find).toHaveBeenCalledTimes(1);
      expect(trackingRepo.find).toHaveBeenCalledTimes(1);
    });
  });

  describe('session matching', () => {
    it('matches a session on its exact shift', async () => {
      const { service } = build([
        {
          user_id: 'u1',
          service_day: '2026-07-27',
          shift_definition_id: 's1',
          clock_in_time: wib('06:05'),
          clock_out_time: null,
        },
      ]);
      const [r] = await service.attach([row()], wib('10:00'));
      expect(r.lifecycle_state).toBe('bertugas');
    });

    it('does NOT let a session for another shift answer for this one', async () => {
      // A Shift 2 punch must not mark the Shift 1 row present — that would hide a
      // genuine no-show behind an unrelated attendance record.
      const { service } = build([
        {
          user_id: 'u1',
          service_day: '2026-07-27',
          shift_definition_id: 's2',
          clock_in_time: wib('15:05'),
          clock_out_time: null,
        },
      ]);
      const [r] = await service.attach([row()], wib('18:00'));
      expect(r.lifecycle_state).toBe('tidak_hadir');
    });

    it('falls back to an UNATTRIBUTED session, so a stray punch still counts', async () => {
      const { service } = build([
        {
          user_id: 'u1',
          service_day: '2026-07-27',
          shift_definition_id: null,
          clock_in_time: wib('06:05'),
          clock_out_time: null,
        },
      ]);
      const [r] = await service.attach([row()], wib('10:00'));
      expect(r.lifecycle_state).toBe('bertugas');
    });
  });

  describe('the inside/outside axis', () => {
    const onDuty = [
      {
        user_id: 'u1',
        service_day: '2026-07-27',
        shift_definition_id: 's1',
        clock_in_time: wib('06:05'),
        clock_out_time: null,
      },
    ];

    it('carries is_within_area while on duty', async () => {
      const { service } = build(onDuty, [
        { user_id: 'u1', is_within_area: false, last_location_at: fixAt(2) },
      ]);
      const [r] = await service.attach([row()], wib('10:00'));
      expect(r.lifecycle_state).toBe('bertugas');
      expect(r.is_within_area).toBe(false); // the amber case the board could never show
    });

    it('ignores a snapshot whose GPS fix is older than active_max_age_sec', async () => {
      // `user_tracking_status` keeps one row per worker forever. On the staging
      // clone 899 of 1121 rows were >2 days old, so trusting them made a worker
      // on duty today read "inside area / green" off a days-old fix — while the
      // monitoring map called the same worker offline.
      const { service } = build(onDuty, [
        { user_id: 'u1', is_within_area: true, last_location_at: fixAt(60) }, // default cutoff 10 min
      ]);
      const [r] = await service.attach([row({ status: ScheduleStatus.PRESENT })], wib('10:00'));
      expect(r.lifecycle_state).toBe('bertugas');
      expect(r.is_within_area).toBeNull();
    });

    it('drops a snapshot with no fix at all rather than reporting false', async () => {
      // `false` would accuse them of being out of area; absent means "unknown".
      const { service } = build(onDuty, [
        { user_id: 'u1', is_within_area: false, last_location_at: null },
      ]);
      const [r] = await service.attach([row({ status: ScheduleStatus.PRESENT })], wib('10:00'));
      expect(r.is_within_area).toBeNull();
    });

    it('suppresses a snapshot when the worker is NOT on duty', async () => {
      // Last week's "inside area" must not paint a planned row green/amber.
      const { service } = build(
        [],
        [{ user_id: 'u1', is_within_area: true, last_location_at: fixAt(1) }],
      );
      const [r] = await service.attach([row()], wib('18:00'));
      expect(r.lifecycle_state).toBe('tidak_hadir');
      expect(r.is_within_area).toBeNull();
    });

    it('reads lembur from a SEPARATE overtime session (S23)', async () => {
      // The service filtered overtime sessions out entirely, so `lembur` was
      // unreachable on a roster read and past-end presence always accused the
      // worker of forgetting to clock out. Caught by an end-to-end run.
      const { service } = build([
        ...onDuty,
        {
          user_id: 'u1',
          service_day: '2026-07-27',
          shift_definition_id: 's1',
          clock_in_time: wib('15:10'),
          clock_out_time: null,
          is_overtime: true,
        },
      ]);
      const [r] = await service.attach([row({ status: ScheduleStatus.PRESENT })], wib('17:00'));
      expect(r.lifecycle_flags).toContain('lembur');
      expect(r.lifecycle_flags).not.toContain('lupa_clock_out');
    });

    it('an overtime session never matches the roster row itself', async () => {
      // Only an overtime session exists: the normal roster row has no attendance,
      // so it must still read as a no-show rather than borrowing the overtime.
      const { service } = build([
        {
          user_id: 'u1',
          service_day: '2026-07-27',
          shift_definition_id: 's1',
          clock_in_time: wib('15:10'),
          clock_out_time: null,
          is_overtime: true,
        },
      ]);
      const [r] = await service.attach([row()], wib('18:00'));
      expect(r.lifecycle_state).toBe('tidak_hadir');
    });

    it('survives a tracking-table failure — presence is decoration, not truth', async () => {
      const { service, trackingRepo } = build(onDuty);
      trackingRepo.find.mockRejectedValue(new Error('relation missing'));
      const [r] = await service.attach([row()], wib('10:00'));
      expect(r.lifecycle_state).toBe('bertugas');
      expect(r.is_within_area).toBeNull();
    });
  });

  it('never mutates the rows it was given', async () => {
    const { service } = build();
    const input = row();
    const snapshot = { ...input };
    await service.attach([input], wib('18:00'));
    expect(input).toEqual(snapshot);
  });
});
