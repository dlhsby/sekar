import { formatShiftOptionLabel } from '../shiftDisplay';
import type { ShiftOption } from '../../types/api.types';

const option = (over: Partial<ShiftOption> = {}): ShiftOption =>
  ({
    shift_definition_id: 'sd-3',
    shift_name: 'Shift 3',
    start_time: '21:00:00',
    end_time: '05:00:00',
    crosses_midnight: true,
    service_day: '2026-07-31',
    phase: 'early',
    minutes_to_start: 85,
    is_default: false,
    ...over,
  }) as ShiftOption;

describe('formatShiftOptionLabel', () => {
  it('omits the date when the shift belongs to the day already shown', () => {
    expect(formatShiftOptionLabel(option(), '2026-07-31')).toBe('Shift 3 · 21:00–05:00');
  });

  it('states the date when the shift belongs to a DIFFERENT service day', () => {
    // A past-midnight candidate attributes to yesterday — without the date the
    // worker cannot tell which day they would be punching into.
    const label = formatShiftOptionLabel(option({ service_day: '2026-07-30' }), '2026-07-31');
    expect(label).toContain('Shift 3 · 21:00–05:00');
    expect(label).toContain('30');
    expect(label.startsWith('Shift')).toBe(false);
  });

  it('omits the date when the option carries none', () => {
    expect(formatShiftOptionLabel(option({ service_day: undefined }), '2026-07-31')).toBe(
      'Shift 3 · 21:00–05:00',
    );
  });
});
