import {
  WEEKDAYS_MON_FRI,
  customToValues,
  presetToValues,
  resolvePreset,
  valuesToCustom,
  weekdayOf,
  type RecurrenceValues,
} from '../recurrencePresets';

const base: RecurrenceValues = {
  recurrence_type: 'none',
  weekdays: [],
  dates: [],
  end_date: '',
};

// 2026-07-27 is a Monday; 2026-08-01 a Saturday.
const MONDAY = '2026-07-27';
const SATURDAY = '2026-08-01';

describe('weekdayOf', () => {
  it('reads the weekday as a LOCAL date, not UTC midnight', () => {
    expect(weekdayOf(MONDAY)).toBe(1);
    expect(weekdayOf(SATURDAY)).toBe(6);
  });

  it('returns null for a missing or malformed date', () => {
    expect(weekdayOf(undefined)).toBeNull();
    expect(weekdayOf('')).toBeNull();
    expect(weekdayOf('27/07/2026')).toBeNull();
  });
});

describe('resolvePreset', () => {
  it('treats an unset or none recurrence as the one-off preset', () => {
    expect(resolvePreset(base, MONDAY)).toBe('none');
    expect(resolvePreset({ ...base, recurrence_type: '' }, MONDAY)).toBe('none');
  });

  it('names weekly-on-the-start-day when the weekday set is exactly that day', () => {
    expect(
      resolvePreset({ ...base, recurrence_type: 'weekly', weekdays: [1] }, MONDAY)
    ).toBe('weekly_on_day');
    // Same rule, different start date → no longer the derived preset.
    expect(resolvePreset({ ...base, recurrence_type: 'weekly', weekdays: [1] }, SATURDAY)).toBe(
      'custom'
    );
  });

  it('names Mon–Fri regardless of the start date', () => {
    const v = { ...base, recurrence_type: 'weekly' as const, weekdays: [...WEEKDAYS_MON_FRI] };
    expect(resolvePreset(v, MONDAY)).toBe('weekdays');
    expect(resolvePreset(v, SATURDAY)).toBe('weekdays');
  });

  it('sends every_n_days and odd weekday sets to custom', () => {
    expect(
      resolvePreset({ ...base, recurrence_type: 'every_n_days', interval_n: 3 }, MONDAY)
    ).toBe('custom');
    expect(
      resolvePreset({ ...base, recurrence_type: 'weekly', weekdays: [1, 4] }, MONDAY)
    ).toBe('custom');
  });

  it('sends any rule carrying an end date to custom — "Berakhir" only exists there', () => {
    expect(
      resolvePreset({ ...base, recurrence_type: 'daily', end_date: '2026-08-30' }, MONDAY)
    ).toBe('custom');
  });

  it('keeps specific_dates its own preset even with an end date', () => {
    expect(
      resolvePreset(
        { ...base, recurrence_type: 'specific_dates', dates: ['2026-07-28'] },
        MONDAY
      )
    ).toBe('specific_dates');
  });
});

describe('presetToValues', () => {
  it('derives the weekday set from the chosen date', () => {
    expect(presetToValues('weekly_on_day', SATURDAY)).toEqual({
      recurrence_type: 'weekly',
      weekdays: [6],
      end_date: '',
    });
  });

  it('expands the weekday preset to Mon–Fri', () => {
    expect(presetToValues('weekdays', MONDAY).weekdays).toEqual(WEEKDAYS_MON_FRI);
  });

  it('clears any end date — presets are open-ended by definition', () => {
    for (const p of ['none', 'daily', 'weekly_on_day', 'weekdays', 'specific_dates'] as const) {
      expect(presetToValues(p, MONDAY).end_date).toBe('');
    }
  });
});

describe('custom dialog mapping', () => {
  it('maps every-1-day to daily and every-N-days to the interval rule', () => {
    expect(customToValues({ unit: 'day', interval: 1, weekdays: [], endDate: '' })).toEqual({
      recurrence_type: 'daily',
      interval_n: undefined,
      weekdays: [],
      end_date: '',
    });
    expect(customToValues({ unit: 'day', interval: 4, weekdays: [], endDate: '' })).toEqual({
      recurrence_type: 'every_n_days',
      interval_n: 4,
      weekdays: [],
      end_date: '',
    });
  });

  it('maps the week unit to weekly with a sorted weekday set', () => {
    expect(
      customToValues({ unit: 'week', interval: 1, weekdays: [5, 1, 3], endDate: '2026-09-01' })
    ).toEqual({
      recurrence_type: 'weekly',
      interval_n: undefined,
      weekdays: [1, 3, 5],
      end_date: '2026-09-01',
    });
  });

  it('round-trips a custom rule through the dialog unchanged', () => {
    const v: RecurrenceValues = {
      recurrence_type: 'every_n_days',
      interval_n: 7,
      weekdays: [],
      dates: [],
      end_date: '2026-10-26',
    };
    const back = customToValues(valuesToCustom(v, MONDAY));
    expect(back.recurrence_type).toBe('every_n_days');
    expect(back.interval_n).toBe(7);
    expect(back.end_date).toBe('2026-10-26');
  });

  it('seeds the weekday toggles from the start date when the rule has none', () => {
    expect(valuesToCustom(base, SATURDAY)).toEqual({
      unit: 'day',
      interval: 1,
      weekdays: [6],
      endDate: '',
    });
  });
});
