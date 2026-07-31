import { buildPunchWarnings } from '../punchWarnings';
import type { PunchWarningInput } from '../punchWarnings';
import type { ShiftDefinition } from '../../types/models.types';

const shift = (): ShiftDefinition =>
  ({
    id: 'sd-1',
    name: 'Shift 1',
    start_time: '06:00:00',
    end_time: '15:00:00',
    crosses_midnight: false,
    is_active: true,
  } as ShiftDefinition);

const nightShift = () =>
  ({ ...shift(), name: 'Shift 3', start_time: '21:00:00', end_time: '05:00:00', crosses_midnight: true } as ShiftDefinition);

/** Local-clock `Date` for today at HH:MM (the rules read wall-clock fields). */
const at = (hh: number, mm = 0): Date => {
  const d = new Date(2026, 6, 31, hh, mm, 0);
  return d;
};

const base: PunchWarningInput = {
  action: 'clock_in',
  areaState: 'within',
  attendanceState: 'on_time',
  rosterShift: shift(),
  now: at(6, 0),
};

const codes = (input: Partial<PunchWarningInput>) =>
  buildPunchWarnings({ ...base, ...input }).map((w) => w.code);

describe('buildPunchWarnings', () => {
  describe('the nominal punch', () => {
    it('warns about nothing when on time, inside the area and scheduled', () => {
      expect(buildPunchWarnings(base)).toEqual([]);
    });

    it('does not warn when clocking out at or after the shift end', () => {
      expect(codes({ action: 'clock_out', now: at(15, 0) })).toEqual([]);
      expect(codes({ action: 'clock_out', now: at(16, 30) })).toEqual([]);
    });
  });

  describe('area', () => {
    it('warns when GPS is outside the boundary, carrying the area name', () => {
      const [warning] = buildPunchWarnings({ ...base, areaState: 'outside', areaName: 'Taman Barat 2' });
      expect(warning).toEqual({ code: 'outside_area', areaName: 'Taman Barat 2' });
    });

    it('warns on clock-out too, not just clock-in', () => {
      expect(codes({ action: 'clock_out', areaState: 'outside', now: at(15, 0) })).toEqual(['outside_area']);
    });

    it('stays silent for a scope with no polygon and for an unassigned worker', () => {
      // Both are stated inline on the screen and neither means the worker is
      // somewhere they should not be — a dialog here would be noise.
      expect(codes({ areaState: 'scope' })).toEqual([]);
      expect(codes({ areaState: 'none' })).toEqual([]);
    });

    it('omits the area name when there is none to show', () => {
      const [warning] = buildPunchWarnings({ ...base, areaState: 'outside', areaName: null });
      expect(warning.areaName).toBeUndefined();
    });
  });

  describe('lateness on clock-in', () => {
    it('reports minutes past the start and the start time itself', () => {
      const [warning] = buildPunchWarnings({ ...base, attendanceState: 'late', now: at(8, 15) });
      expect(warning).toEqual({ code: 'late', minutes: 135, time: '06:00' });
    });

    it('wraps forward across midnight for a night shift', () => {
      // Shift 3 starts 21:00; clocking in at 01:00 is 4h late, not 20h early.
      const [warning] = buildPunchWarnings({
        ...base,
        attendanceState: 'late',
        rosterShift: nightShift(),
        now: at(1, 0),
      });
      expect(warning).toEqual({ code: 'late', minutes: 240, time: '21:00' });
    });

    it('reports the closed window instead of lateness once the shift is over', () => {
      const [warning] = buildPunchWarnings({ ...base, attendanceState: 'outside_window', now: at(21, 54) });
      expect(warning).toEqual({ code: 'outside_window', time: '15:00' });
    });

    it('never reports both late and outside_window', () => {
      expect(codes({ attendanceState: 'outside_window', now: at(21, 54) })).toEqual(['outside_window']);
    });

    it('survives a shift with no usable start time', () => {
      const broken = { ...shift(), start_time: '' } as ShiftDefinition;
      const [warning] = buildPunchWarnings({ ...base, attendanceState: 'late', rosterShift: broken });
      expect(warning).toEqual({ code: 'late', minutes: undefined, time: undefined });
    });
  });

  describe('early leave on clock-out', () => {
    it('reports the minutes still remaining in the shift', () => {
      const [warning] = buildPunchWarnings({ ...base, action: 'clock_out', now: at(13, 30) });
      expect(warning).toEqual({ code: 'early_leave', minutes: 90, time: '15:00' });
    });

    it('projects against now rather than a clock-out that has not happened', () => {
      // The worker is still on shift; nothing has been recorded yet.
      expect(codes({ action: 'clock_out', now: at(14, 59) })).toEqual(['early_leave']);
    });

    it('wraps forward across midnight for a night shift', () => {
      // Shift 3 ends 05:00; clocking out at 23:00 leaves 6h unworked.
      const [warning] = buildPunchWarnings({
        ...base,
        action: 'clock_out',
        rosterShift: nightShift(),
        now: at(23, 0),
      });
      expect(warning).toEqual({ code: 'early_leave', minutes: 360, time: '05:00' });
    });

    it('does not warn about early leave on clock-in', () => {
      expect(codes({ now: at(6, 5) })).toEqual([]);
    });

    it('cannot judge early leave without a roster shift', () => {
      expect(codes({ action: 'clock_out', attendanceState: 'no_schedule', rosterShift: null, now: at(13, 30) })).toEqual([
        'no_schedule',
      ]);
    });
  });

  describe('unscheduled (ad-hoc) punches', () => {
    it('warns that the punch will not be counted', () => {
      expect(codes({ attendanceState: 'no_schedule', rosterShift: null })).toEqual(['no_schedule']);
    });

    it('warns on clock-out as well', () => {
      expect(codes({ action: 'clock_out', attendanceState: 'no_schedule', rosterShift: null })).toEqual(['no_schedule']);
    });

    it('is never late — lateness needs a roster to judge against', () => {
      expect(codes({ attendanceState: 'no_schedule', rosterShift: null, now: at(23, 0) })).not.toContain('late');
    });
  });

  describe('several reasons at once', () => {
    it('lists area before time, and the ad-hoc note last', () => {
      expect(
        codes({
          areaState: 'outside',
          attendanceState: 'late',
          now: at(8, 15),
        }),
      ).toEqual(['outside_area', 'late']);
    });

    it('combines outside-area with the unscheduled note', () => {
      expect(
        codes({ areaState: 'outside', attendanceState: 'no_schedule', rosterShift: null }),
      ).toEqual(['outside_area', 'no_schedule']);
    });
  });
});
