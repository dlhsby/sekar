import { effectiveScheduleStatus, isScheduleWindowClosed } from '../scheduleStatus';

// Shift 1, 06:00–15:00, grace 60 → window closes 16:00 local.
const shift1 = { end_time: '15:00:00', crosses_midnight: false, cutoff_grace_min: 60 };
const day = '2026-07-26';

describe('effectiveScheduleStatus', () => {
  it('flips a past planned no-show to absent', () => {
    expect(effectiveScheduleStatus('planned', shift1, day, new Date('2026-07-26T20:00:00'))).toBe('absent');
  });

  it('keeps planned while the window (incl. grace) is still open', () => {
    expect(effectiveScheduleStatus('planned', shift1, day, new Date('2026-07-26T09:00:00'))).toBe('planned');
    expect(effectiveScheduleStatus('planned', shift1, day, new Date('2026-07-26T15:30:00'))).toBe('planned');
  });

  it('never rewrites a non-planned status', () => {
    const now = new Date('2026-07-26T20:00:00');
    for (const s of ['present', 'absent', 'leave_sick', 'leave_annual', 'leave_permit', 'replaced', 'off']) {
      expect(effectiveScheduleStatus(s, shift1, day, now)).toBe(s);
    }
  });

  it('defaults grace to 60 min when cutoff_grace_min is absent', () => {
    const noGrace = { end_time: '15:00:00', crosses_midnight: false };
    expect(effectiveScheduleStatus('planned', noGrace, day, new Date('2026-07-26T15:45:00'))).toBe('planned');
    expect(effectiveScheduleStatus('planned', noGrace, day, new Date('2026-07-26T16:30:00'))).toBe('absent');
  });

  it('returns the raw status when there is no shift window', () => {
    expect(effectiveScheduleStatus('planned', null, day, new Date('2026-07-26T20:00:00'))).toBe('planned');
  });

  it('rolls a crossing shift end into the next day', () => {
    const shift3 = { end_time: '05:00:00', crosses_midnight: true, cutoff_grace_min: 60 };
    expect(isScheduleWindowClosed(day, shift3, new Date('2026-07-27T05:30:00'))).toBe(false);
    expect(isScheduleWindowClosed(day, shift3, new Date('2026-07-27T06:30:00'))).toBe(true);
  });
});
