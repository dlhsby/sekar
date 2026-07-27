/**
 * Scenario matrix S29–S39 (see specs/features/scheduling/PROCESS.md).
 *
 * These are the rows an operator reads off the Jadwal board. Before this module
 * existed a roster read could only say planned / present / absent / leave, so
 * "on duty but outside the area", "terlambat", "pulang" and "ad-hoc" were
 * unreachable — the board rendered a 9-tone legend it could never satisfy.
 *
 * `now` is injected everywhere: the whole matrix is evaluated at a fixed clock,
 * so none of these can go green or red because CI ran at the wrong hour.
 */
import { ScheduleStatus } from '../../entities/schedule.entity';
import { deriveRosterPresence, scheduleStatusToLeave, sessionKey } from '../roster-presence';

/** Shift 1, 06:00–15:00 WIB, no midnight crossing. */
const SHIFT_1 = { start_time: '06:00:00', end_time: '15:00:00', crosses_midnight: false };
/** Shift 3, 21:00–05:00 WIB — the cross-midnight case. */
const SHIFT_3 = { start_time: '21:00:00', end_time: '05:00:00', crosses_midnight: true };

const DAY = '2026-07-27';
const GRACE_MS = 15 * 60 * 1000; // monitoring.late_grace_sec default (900s)

/** WIB wall-clock → instant, so the tests read in the operator's timezone. */
const wib = (hhmm: string, day = DAY): Date => new Date(`${day}T${hhmm}:00+07:00`);

describe('deriveRosterPresence', () => {
  describe('scheduled, never clocked in (S29, S30)', () => {
    it('S29 · before start + grace → belum_hadir', () => {
      const r = deriveRosterPresence(
        ScheduleStatus.PLANNED,
        DAY,
        SHIFT_1,
        null,
        GRACE_MS,
        wib('06:10'),
      );
      expect(r.lifecycle_state).toBe('belum_hadir');
      expect(r.lifecycle_flags).toEqual([]);
    });

    it('past start + grace, still inside the window → terlambat', () => {
      const r = deriveRosterPresence(
        ScheduleStatus.PLANNED,
        DAY,
        SHIFT_1,
        null,
        GRACE_MS,
        wib('09:00'),
      );
      expect(r.lifecycle_state).toBe('terlambat');
    });

    it('S30 · past the shift end → tidak_hadir (the accountable no-show)', () => {
      const r = deriveRosterPresence(
        ScheduleStatus.PLANNED,
        DAY,
        SHIFT_1,
        null,
        GRACE_MS,
        wib('16:00'),
      );
      expect(r.lifecycle_state).toBe('tidak_hadir');
    });

    it('agrees with the persisted status once the absence cron has run', () => {
      // Same facts, status already swept to `absent`: the reading must not change,
      // or the lazy display and the cron would contradict each other.
      const r = deriveRosterPresence(
        ScheduleStatus.ABSENT,
        DAY,
        SHIFT_1,
        null,
        GRACE_MS,
        wib('16:00'),
      );
      expect(r.lifecycle_state).toBe('tidak_hadir');
    });
  });

  describe('on duty (S31–S33)', () => {
    const openSession = { clock_in_time: wib('06:05'), clock_out_time: null };

    it('S31/S32 · clocked in, not out → bertugas, no flags', () => {
      const r = deriveRosterPresence(
        ScheduleStatus.PRESENT,
        DAY,
        SHIFT_1,
        openSession,
        GRACE_MS,
        wib('10:00'),
      );
      expect(r.lifecycle_state).toBe('bertugas');
      expect(r.lifecycle_flags).toEqual([]);
    });

    it('S17 · clocked in after start + grace → bertugas + is_late', () => {
      const r = deriveRosterPresence(
        ScheduleStatus.PRESENT,
        DAY,
        SHIFT_1,
        { clock_in_time: wib('08:30'), clock_out_time: null },
        GRACE_MS,
        wib('10:00'),
      );
      expect(r.lifecycle_state).toBe('bertugas');
      expect(r.lifecycle_flags).toContain('is_late');
    });

    it('S22 · still open past the shift end → lupa_clock_out, never auto-lembur', () => {
      const r = deriveRosterPresence(
        ScheduleStatus.PRESENT,
        DAY,
        SHIFT_1,
        openSession,
        GRACE_MS,
        wib('17:00'),
      );
      expect(r.lifecycle_state).toBe('bertugas');
      expect(r.lifecycle_flags).toContain('lupa_clock_out');
      expect(r.lifecycle_flags).not.toContain('lembur');
    });

    it('S23 · past end WITH approved overtime → lembur, not a forgotten clock-out', () => {
      // Overtime is its own session, so it can never be the session matched to a
      // normal roster row — the caller passes the fact in. Asserting it via
      // `session.is_overtime` alone passed while the service could never produce
      // it, which an end-to-end run caught.
      const r = deriveRosterPresence(
        ScheduleStatus.PRESENT,
        DAY,
        SHIFT_1,
        openSession,
        GRACE_MS,
        wib('17:00'),
        true, // overtimeApproved
      );
      expect(r.lifecycle_flags).toContain('lembur');
      expect(r.lifecycle_flags).not.toContain('lupa_clock_out');
    });

    it('S22 · past end with NO overtime stays lupa_clock_out', () => {
      const r = deriveRosterPresence(
        ScheduleStatus.PRESENT,
        DAY,
        SHIFT_1,
        openSession,
        GRACE_MS,
        wib('17:00'),
        false,
      );
      expect(r.lifecycle_flags).toContain('lupa_clock_out');
      expect(r.lifecycle_flags).not.toContain('lembur');
    });
  });

  describe('clocked out (S34)', () => {
    it('clocked in and out → pulang', () => {
      const r = deriveRosterPresence(
        ScheduleStatus.PRESENT,
        DAY,
        SHIFT_1,
        { clock_in_time: wib('06:05'), clock_out_time: wib('15:05') },
        GRACE_MS,
        wib('16:00'),
      );
      expect(r.lifecycle_state).toBe('pulang');
      expect(r.lifecycle_flags).not.toContain('early');
    });

    it('clocked out before the end → pulang + early', () => {
      const r = deriveRosterPresence(
        ScheduleStatus.PRESENT,
        DAY,
        SHIFT_1,
        { clock_in_time: wib('06:05'), clock_out_time: wib('12:00') },
        GRACE_MS,
        wib('16:00'),
      );
      expect(r.lifecycle_flags).toContain('early');
    });
  });

  describe('leave (S35, S36)', () => {
    it('S35 · cuti reads as off duty, excused — not a no-show', () => {
      const r = deriveRosterPresence(
        ScheduleStatus.LEAVE_ANNUAL,
        DAY,
        SHIFT_1,
        null,
        GRACE_MS,
        wib('16:00'),
      );
      expect(r.lifecycle_state).toBe('tidak_bertugas');
      expect(r.leave_reason).toBe('cuti');
      expect(r.lifecycle_flags).toContain('excused');
    });

    it('S36 · sakit/izin is an EXCUSED absence — tidak_hadir but flagged', () => {
      for (const [status, reason] of [
        [ScheduleStatus.LEAVE_SICK, 'sakit'],
        [ScheduleStatus.LEAVE_PERMIT, 'izin'],
      ] as const) {
        const r = deriveRosterPresence(status, DAY, SHIFT_1, null, GRACE_MS, wib('16:00'));
        expect(r.lifecycle_state).toBe('tidak_hadir');
        expect(r.leave_reason).toBe(reason);
        // The flag is what stops the UI reading this as an unexcused no-show.
        expect(r.lifecycle_flags).toContain('excused');
      }
    });

    it('leave wins over the window — even mid-shift it never reads terlambat', () => {
      const r = deriveRosterPresence(
        ScheduleStatus.LEAVE_ANNUAL,
        DAY,
        SHIFT_1,
        null,
        GRACE_MS,
        wib('09:00'),
      );
      expect(r.lifecycle_state).toBe('tidak_bertugas');
    });
  });

  describe('rows that expect nobody (S37, S38)', () => {
    it.each([
      [ScheduleStatus.OFF, 'off'],
      [ScheduleStatus.REPLACED, 'replaced'],
    ])('%s is not scheduled, so it can never become a no-show', (status) => {
      const r = deriveRosterPresence(status, DAY, SHIFT_1, null, GRACE_MS, wib('23:00'));
      expect(r.is_scheduled).toBe(false);
      expect(r.lifecycle_state).toBe('tidak_bertugas');
    });
  });

  describe('cross-midnight (S21)', () => {
    it('a Shift 3 worker at 02:00 the NEXT day is still on duty, not overdue', () => {
      const r = deriveRosterPresence(
        ScheduleStatus.PRESENT,
        DAY,
        SHIFT_3,
        { clock_in_time: wib('21:05'), clock_out_time: null },
        GRACE_MS,
        wib('02:00', '2026-07-28'),
      );
      expect(r.lifecycle_state).toBe('bertugas');
      expect(r.lifecycle_flags).not.toContain('lupa_clock_out');
    });

    it('past 05:00 the next day with no clock-out → forgotten clock-out', () => {
      const r = deriveRosterPresence(
        ScheduleStatus.PRESENT,
        DAY,
        SHIFT_3,
        { clock_in_time: wib('21:05'), clock_out_time: null },
        GRACE_MS,
        wib('06:00', '2026-07-28'),
      );
      expect(r.lifecycle_flags).toContain('lupa_clock_out');
    });

    it('never clocked in, evaluated at 23:00 → still only terlambat, not absent', () => {
      // The window has not closed yet: end is 05:00 tomorrow. Calling this a
      // no-show at 23:00 would accuse a worker whose shift is still running.
      const r = deriveRosterPresence(
        ScheduleStatus.PLANNED,
        DAY,
        SHIFT_3,
        null,
        GRACE_MS,
        wib('23:00'),
      );
      expect(r.lifecycle_state).toBe('terlambat');
    });
  });

  describe('degenerate inputs', () => {
    it('a row with no shift definition still resolves (no throw, no window)', () => {
      const r = deriveRosterPresence(
        ScheduleStatus.PLANNED,
        DAY,
        null,
        null,
        GRACE_MS,
        wib('16:00'),
      );
      expect(r.lifecycle_state).toBe('tidak_hadir');
    });

    it('accepts ISO strings for punch times, as the driver may return them', () => {
      const r = deriveRosterPresence(
        ScheduleStatus.PRESENT,
        DAY,
        SHIFT_1,
        { clock_in_time: '2026-07-26T23:05:00.000Z', clock_out_time: null }, // 06:05 WIB
        GRACE_MS,
        wib('10:00'),
      );
      expect(r.lifecycle_state).toBe('bertugas');
      expect(r.lifecycle_flags).not.toContain('is_late');
    });
  });
});

describe('scheduleStatusToLeave', () => {
  it('maps only the three leave statuses; everything else carries no leave', () => {
    expect(scheduleStatusToLeave(ScheduleStatus.LEAVE_SICK)).toBe('sakit');
    expect(scheduleStatusToLeave(ScheduleStatus.LEAVE_ANNUAL)).toBe('cuti');
    expect(scheduleStatusToLeave(ScheduleStatus.LEAVE_PERMIT)).toBe('izin');
    for (const s of [
      ScheduleStatus.PLANNED,
      ScheduleStatus.PRESENT,
      ScheduleStatus.ABSENT,
      ScheduleStatus.OFF,
      ScheduleStatus.REPLACED,
    ]) {
      expect(scheduleStatusToLeave(s)).toBe('none');
    }
  });
});

describe('sessionKey', () => {
  it('treats a missing shift definition as the empty segment, not "null"', () => {
    expect(sessionKey('u1', DAY, null)).toBe(`u1|${DAY}|`);
    expect(sessionKey('u1', DAY, undefined)).toBe(sessionKey('u1', DAY, null));
    expect(sessionKey('u1', DAY, 's1')).toBe(`u1|${DAY}|s1`);
  });
});
