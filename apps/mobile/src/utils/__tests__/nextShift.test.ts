import { resolveNextShift } from '../nextShift';

const row = (id: string, defId: string, name: string, start: string, end: string): any => ({
  id,
  shift_definition_id: defId,
  shift_definition: { id: defId, name, start_time: start, end_time: end },
});

const shift1 = () => row('r1', 'sd1', 'Shift 1', '06:00:00', '14:00:00');
const shift2 = () => row('r2', 'sd2', 'Shift 2', '14:00:00', '22:00:00');

describe('resolveNextShift', () => {
  it('returns the upcoming shift after now, excluding the current one', () => {
    const next = resolveNextShift([shift1(), shift2()], 8 * 60, 'sd1'); // 08:00, on shift 1
    expect(next?.shift_definition?.id).toBe('sd2');
  });

  it('returns null when no shift starts later today', () => {
    const next = resolveNextShift([shift1(), shift2()], 20 * 60, 'sd2'); // 20:00, on shift 2, nothing after
    expect(next).toBeNull();
  });

  it('picks the earliest upcoming shift when several remain', () => {
    const shift3 = row('r3', 'sd3', 'Shift 3', '21:00:00', '05:00:00');
    const next = resolveNextShift([shift2(), shift3], 10 * 60, null); // 10:00, shift 2 then 3 ahead
    expect(next?.shift_definition?.id).toBe('sd2');
  });

  it('returns one shift when multi-place rows share it (ADR-053)', () => {
    const s2a = row('r2a', 'sd2', 'Shift 2', '14:00:00', '22:00:00');
    const s2b = row('r2b', 'sd2', 'Shift 2', '14:00:00', '22:00:00');
    const next = resolveNextShift([s2a, s2b], 8 * 60, 'sd1');
    expect(next?.shift_definition?.id).toBe('sd2');
  });

  it('ignores rows with no shift definition', () => {
    const off: any = { id: 'off', shift_definition_id: null, shift_definition: null };
    const next = resolveNextShift([off, shift2()], 8 * 60, 'sd1');
    expect(next?.shift_definition?.id).toBe('sd2');
  });
});
