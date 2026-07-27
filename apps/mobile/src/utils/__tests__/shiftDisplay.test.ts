import { pickDisplayShift, formatShiftLabel } from '../shiftDisplay';
import type { ShiftOption } from '../../types/api.types';
import type { ShiftDefinition } from '../../types/models.types';

const opt = (over: Partial<ShiftOption>): ShiftOption => ({
  shift_definition_id: 'sd-1',
  shift_name: 'Shift 1',
  start_time: '06:00:00',
  end_time: '15:00:00',
  crosses_midnight: false,
  service_day: '2026-07-27',
  phase: 'covering',
  minutes_to_start: -10,
  is_default: true,
  ...over,
});

const ROSTER: ShiftDefinition = {
  id: 'sd-2',
  name: 'Shift 2',
  start_time: '15:00:00',
  end_time: '23:00:00',
  crosses_midnight: false,
} as ShiftDefinition;

const NO_SHIFT = 'Tidak Ada Shift';

describe('pickDisplayShift — attribution-first precedence', () => {
  it('prefers the attribution default option over the roster shift', () => {
    const result = pickDisplayShift([opt({})], ROSTER);
    expect(result).toEqual({ name: 'Shift 1', start_time: '06:00:00', end_time: '15:00:00' });
  });

  it('picks the is_default option when several are offered', () => {
    const options = [
      opt({ shift_definition_id: 'a', shift_name: 'Shift A', is_default: false }),
      opt({ shift_definition_id: 'b', shift_name: 'Shift B', start_time: '21:00:00', end_time: '05:00:00', is_default: true }),
    ];
    expect(pickDisplayShift(options, ROSTER)?.name).toBe('Shift B');
  });

  it('falls back to the first option when none is flagged default', () => {
    const options = [opt({ shift_name: 'First', is_default: false })];
    expect(pickDisplayShift(options, ROSTER)?.name).toBe('First');
  });

  it('falls back to the roster shift when there are no attribution options', () => {
    expect(pickDisplayShift([], ROSTER)).toEqual({
      name: 'Shift 2',
      start_time: '15:00:00',
      end_time: '23:00:00',
    });
  });

  it('falls back to the roster shift when options is null/undefined', () => {
    expect(pickDisplayShift(null, ROSTER)?.name).toBe('Shift 2');
    expect(pickDisplayShift(undefined, ROSTER)?.name).toBe('Shift 2');
  });

  it('returns null when neither an option nor a roster shift is present', () => {
    expect(pickDisplayShift([], null)).toBeNull();
  });
});

describe('formatShiftLabel', () => {
  it('formats "Name · HH:MM–HH:MM", trimming seconds', () => {
    expect(
      formatShiftLabel({ name: 'Shift 1', start_time: '06:00:00', end_time: '15:00:00' }, NO_SHIFT),
    ).toBe('Shift 1 · 06:00–15:00');
  });

  it('accepts already-trimmed HH:MM times', () => {
    expect(
      formatShiftLabel({ name: 'Shift 3', start_time: '21:00', end_time: '05:00' }, NO_SHIFT),
    ).toBe('Shift 3 · 21:00–05:00');
  });

  it('returns the no-shift label when shift is null', () => {
    expect(formatShiftLabel(null, NO_SHIFT)).toBe(NO_SHIFT);
  });
});
