import { effectiveScheduleStatus, isScheduleWindowClosed } from '../effectiveStatus';

// Shift 1, 06:00–15:00, grace 60 → window closes 16:00 local.
const shift1 = { end_time: '15:00:00', crosses_midnight: false, cutoff_grace_min: 60 };
const day = '2026-07-26';

describe('effectiveScheduleStatus', () => {
  it('flips a past planned no-show to absent', () => {
    const now = new Date('2026-07-26T20:00:00'); // local, past 16:00 close
    expect(effectiveScheduleStatus('planned', shift1, day, now)).toBe('absent');
  });

  it('keeps a planned row planned while the window is still open (incl. grace)', () => {
    expect(effectiveScheduleStatus('planned', shift1, day, new Date('2026-07-26T09:00:00'))).toBe('planned');
    expect(effectiveScheduleStatus('planned', shift1, day, new Date('2026-07-26T15:30:00'))).toBe('planned'); // in grace
  });

  it('never rewrites a non-planned status', () => {
    const now = new Date('2026-07-26T20:00:00');
    for (const s of ['present', 'absent', 'leave_sick', 'leave_annual', 'leave_permit', 'replaced', 'off']) {
      expect(effectiveScheduleStatus(s, shift1, day, now)).toBe(s);
    }
  });

  it('defaults grace to 60 min when cutoff_grace_min is absent', () => {
    const shiftNoGrace = { end_time: '15:00:00', crosses_midnight: false };
    expect(effectiveScheduleStatus('planned', shiftNoGrace, day, new Date('2026-07-26T15:45:00'))).toBe('planned'); // still in default grace
    expect(effectiveScheduleStatus('planned', shiftNoGrace, day, new Date('2026-07-26T16:30:00'))).toBe('absent');
  });

  it('returns the raw status when there is no shift window', () => {
    expect(effectiveScheduleStatus('planned', null, day, new Date('2026-07-26T20:00:00'))).toBe('planned');
  });
});

describe('isScheduleWindowClosed — crossing shift', () => {
  // Shift 3, 21:00–05:00 (crosses), grace 60 → closes 06:00 next day.
  const shift3 = { end_time: '05:00:00', crosses_midnight: true, cutoff_grace_min: 60 };
  it('rolls the end into the next day', () => {
    expect(isScheduleWindowClosed(day, shift3, new Date('2026-07-27T05:30:00'))).toBe(false); // in grace
    expect(isScheduleWindowClosed(day, shift3, new Date('2026-07-27T06:30:00'))).toBe(true); // past grace
  });
});
