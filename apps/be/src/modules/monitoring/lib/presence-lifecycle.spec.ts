import {
  derivePresenceState,
  resolveShiftWindow,
  isClockInLate,
  PresenceFacts,
} from './presence-lifecycle';

/**
 * Presence lifecycle engine — the pure derivation (ADR-050).
 * Cases map to `specs/testing/presence-model-matrix.md`: Layer 1 (PM-L),
 * grace (PM-G), cross-midnight (PM-X). Instants are ISO with an explicit
 * `+07:00` (WIB) offset, so the assertions are timezone-independent.
 */
describe('presence-lifecycle', () => {
  // Day shift 08:00–16:00 WIB on the service day; 15-min grace.
  const SHIFT_START = new Date('2026-07-16T08:00:00+07:00');
  const SHIFT_END = new Date('2026-07-16T16:00:00+07:00');
  const GRACE_MS = 15 * 60_000;

  const at = (iso: string) => new Date(iso);
  const facts = (over: Partial<PresenceFacts> = {}): PresenceFacts => ({
    scheduled: true,
    clockIn: null,
    clockOut: null,
    shiftStart: SHIFT_START,
    shiftEnd: SHIFT_END,
    graceMs: GRACE_MS,
    overtimeApproved: false,
    leave: 'none',
    ...over,
  });

  describe('Layer 1 — lifecycle derivation (PM-L)', () => {
    const NOON = at('2026-07-16T12:00:00+07:00');

    it('PM-L01 · not scheduled, not clocked in → tidak_bertugas', () => {
      const r = derivePresenceState(
        facts({ scheduled: false, shiftStart: null, shiftEnd: null }),
        NOON,
      );
      expect(r.state).toBe('tidak_bertugas');
      expect(r.flags).toEqual([]);
    });

    it('PM-L02 · not scheduled + libur → tidak_bertugas, excused', () => {
      const r = derivePresenceState(
        facts({ scheduled: false, leave: 'libur', shiftStart: null, shiftEnd: null }),
        NOON,
      );
      expect(r.state).toBe('tidak_bertugas');
      expect(r.flags).toContain('excused');
      expect(r.leaveReason).toBe('libur');
    });

    it('PM-L03 · scheduled, before start → belum_hadir', () => {
      const r = derivePresenceState(facts(), at('2026-07-16T07:50:00+07:00'));
      expect(r.state).toBe('belum_hadir');
    });

    it('PM-L04 · scheduled, within grace after start → belum_hadir', () => {
      const r = derivePresenceState(facts(), at('2026-07-16T08:10:00+07:00'));
      expect(r.state).toBe('belum_hadir');
    });

    it('PM-L05 · scheduled, past start+grace, before end → terlambat', () => {
      const r = derivePresenceState(facts(), at('2026-07-16T08:30:00+07:00'));
      expect(r.state).toBe('terlambat');
    });

    it('PM-L06 · scheduled, after end, never in → tidak_hadir', () => {
      const r = derivePresenceState(facts(), at('2026-07-16T17:00:00+07:00'));
      expect(r.state).toBe('tidak_hadir');
      expect(r.flags).toEqual([]);
    });

    it('PM-L07 · scheduled, after end, sakit → tidak_hadir, excused', () => {
      const r = derivePresenceState(facts({ leave: 'sakit' }), at('2026-07-16T17:00:00+07:00'));
      expect(r.state).toBe('tidak_hadir');
      expect(r.flags).toContain('excused');
      expect(r.leaveReason).toBe('sakit');
    });

    it('PM-L08 · clocked in on time, not out → bertugas, not late', () => {
      const r = derivePresenceState(facts({ clockIn: at('2026-07-16T08:05:00+07:00') }), NOON);
      expect(r.state).toBe('bertugas');
      expect(r.flags).not.toContain('is_late');
    });

    it('PM-L09 · clocked in late → bertugas + is_late', () => {
      const r = derivePresenceState(facts({ clockIn: at('2026-07-16T08:30:00+07:00') }), NOON);
      expect(r.state).toBe('bertugas');
      expect(r.flags).toContain('is_late');
    });

    it('PM-L10 · clocked in and out → pulang', () => {
      const r = derivePresenceState(
        facts({ clockIn: SHIFT_START, clockOut: SHIFT_END }),
        at('2026-07-16T17:00:00+07:00'),
      );
      expect(r.state).toBe('pulang');
      expect(r.flags).not.toContain('early');
    });

    it('PM-L11 · clocked out before end → pulang + early', () => {
      const r = derivePresenceState(
        facts({ clockIn: SHIFT_START, clockOut: at('2026-07-16T15:00:00+07:00') }),
        at('2026-07-16T17:00:00+07:00'),
      );
      expect(r.state).toBe('pulang');
      expect(r.flags).toContain('early');
    });

    it('PM-L12 · unscheduled clock-in → bertugas + ad_hoc', () => {
      const r = derivePresenceState(
        facts({
          scheduled: false,
          shiftStart: null,
          shiftEnd: null,
          clockIn: at('2026-07-16T10:00:00+07:00'),
        }),
        at('2026-07-16T10:30:00+07:00'),
      );
      expect(r.state).toBe('bertugas');
      expect(r.flags).toContain('ad_hoc');
      expect(r.flags).not.toContain('is_late');
    });

    it('PM-L13 · past end, still in, no overtime → bertugas + lupa_clock_out', () => {
      const r = derivePresenceState(
        facts({ clockIn: SHIFT_START }),
        at('2026-07-16T17:00:00+07:00'),
      );
      expect(r.state).toBe('bertugas');
      expect(r.flags).toContain('lupa_clock_out');
      expect(r.flags).not.toContain('lembur');
    });

    it('PM-L14 · past end, still in, approved overtime → bertugas + lembur', () => {
      const r = derivePresenceState(
        facts({ clockIn: SHIFT_START, overtimeApproved: true }),
        at('2026-07-16T17:00:00+07:00'),
      );
      expect(r.state).toBe('bertugas');
      expect(r.flags).toContain('lembur');
      expect(r.flags).not.toContain('lupa_clock_out');
    });

    it('PM-L15 · second shift after a prior pulang → bertugas again', () => {
      // Same day, a fresh clock-in with no clock-out re-enters the live state.
      const r = derivePresenceState(facts({ clockIn: at('2026-07-16T09:00:00+07:00') }), NOON);
      expect(r.state).toBe('bertugas');
    });
  });

  describe('grace (PM-G)', () => {
    const NOON = at('2026-07-16T12:00:00+07:00');

    it('PM-G01 · 10 min after start, 15-min grace → not late', () => {
      const r = derivePresenceState(facts({ clockIn: at('2026-07-16T08:10:00+07:00') }), NOON);
      expect(r.flags).not.toContain('is_late');
    });

    it('PM-G02 · 20 min after start, 15-min grace → late', () => {
      const r = derivePresenceState(facts({ clockIn: at('2026-07-16T08:20:00+07:00') }), NOON);
      expect(r.flags).toContain('is_late');
    });

    it('PM-G03 · 20 min after start, 30-min grace (per-shift override) → not late', () => {
      const r = derivePresenceState(
        facts({ clockIn: at('2026-07-16T08:20:00+07:00'), graceMs: 30 * 60_000 }),
        NOON,
      );
      expect(r.flags).not.toContain('is_late');
    });

    it('PM-G04 · scheduled, never in, now exactly at shift end → tidak_hadir (inclusive)', () => {
      const r = derivePresenceState(facts(), SHIFT_END);
      expect(r.state).toBe('tidak_hadir');
    });
  });

  describe('cross-midnight — shift 3 (PM-X)', () => {
    it('PM-X01 · shift 3 at 02:00 is bertugas, NOT lupa_clock_out (judged on real end)', () => {
      const w = resolveShiftWindow('2026-07-16', '21:00:00', '05:00:00', true);
      const r = derivePresenceState(
        facts({
          shiftStart: w.start,
          shiftEnd: w.end,
          clockIn: w.start, // clocked in 21:00
        }),
        at('2026-07-17T02:00:00+07:00'), // 02:00 next day, before the 05:00 end
      );
      expect(r.state).toBe('bertugas');
      expect(r.flags).not.toContain('lupa_clock_out');
    });

    it('PM-X02 · day shift still open at 02:00 next day → lupa_clock_out', () => {
      const r = derivePresenceState(
        facts({ clockIn: SHIFT_START }), // day shift ends 16:00 same day
        at('2026-07-17T02:00:00+07:00'), // long past its real end
      );
      expect(r.state).toBe('bertugas');
      expect(r.flags).toContain('lupa_clock_out');
    });
  });

  describe('resolveShiftWindow', () => {
    it('day shift: end stays on the service day', () => {
      const w = resolveShiftWindow('2026-07-16', '08:00:00', '16:00:00', false);
      expect(w.start.toISOString()).toBe('2026-07-16T01:00:00.000Z'); // 08:00 WIB
      expect(w.end.toISOString()).toBe('2026-07-16T09:00:00.000Z'); // 16:00 WIB
    });

    it('shift 3: end lands on the next day, window is 8 h', () => {
      const w = resolveShiftWindow('2026-07-16', '21:00:00', '05:00:00', true);
      expect(w.start.toISOString()).toBe('2026-07-16T14:00:00.000Z'); // 21:00 WIB
      // 05:00 WIB on the 17th == 22:00 UTC on the 16th (WIB is +7).
      expect(w.end.toISOString()).toBe('2026-07-16T22:00:00.000Z');
      expect(w.end.getTime() - w.start.getTime()).toBe(8 * 60 * 60 * 1000);
    });

    it('accepts HH:mm as well as HH:mm:ss', () => {
      const a = resolveShiftWindow('2026-07-16', '08:00', '16:00', false);
      const b = resolveShiftWindow('2026-07-16', '08:00:00', '16:00:00', false);
      expect(a.start.getTime()).toBe(b.start.getTime());
      expect(a.end.getTime()).toBe(b.end.getTime());
    });
  });

  describe('totality — every combination returns a defined state', () => {
    it('never yields undefined and flags is always an array', () => {
      const now = at('2026-07-16T12:00:00+07:00');
      const bools = [true, false];
      const times = [null, SHIFT_START, SHIFT_END];
      const leaves = ['none', 'cuti', 'sakit', 'izin', 'libur'] as const;
      for (const scheduled of bools) {
        for (const clockIn of times) {
          for (const clockOut of times) {
            for (const overtimeApproved of bools) {
              for (const leave of leaves) {
                const r = derivePresenceState(
                  facts({ scheduled, clockIn, clockOut, overtimeApproved, leave }),
                  now,
                );
                expect(r.state).toBeDefined();
                expect(Array.isArray(r.flags)).toBe(true);
              }
            }
          }
        }
      }
    });
  });

  describe('isClockInLate', () => {
    it('is true strictly past start + grace', () => {
      expect(isClockInLate(at('2026-07-16T08:16:00+07:00'), SHIFT_START, GRACE_MS)).toBe(true);
      expect(isClockInLate(at('2026-07-16T08:15:00+07:00'), SHIFT_START, GRACE_MS)).toBe(false);
    });
  });
});
