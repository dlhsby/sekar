import {
  requirementTotalMap,
  requirementRoleMap,
  type StaffRequirement,
} from '../location-staff-requirements';

const req = (r: Partial<StaffRequirement>): StaffRequirement =>
  ({
    id: Math.random().toString(),
    location_id: null,
    shift_definition_id: 's1',
    role: 'satgas',
    day_type: 'WEEKDAY',
    required_count: 0,
    ...r,
  }) as StaffRequirement;

describe('requirementTotalMap', () => {
  it('keys by subject: loc / reg / ray, summing satgas+linmas for the day type', () => {
    const rows: StaffRequirement[] = [
      req({ location_id: 'L1', shift_definition_id: 's1', role: 'satgas', required_count: 3 }),
      req({ location_id: 'L1', shift_definition_id: 's1', role: 'linmas', required_count: 1 }),
      req({ region_id: 'R1', shift_definition_id: 's1', role: 'satgas', required_count: 5 }),
      req({ district_id: 'RY1', shift_definition_id: 's2', role: 'satgas', required_count: 9 }),
    ];
    const m = requirementTotalMap(rows, 'WEEKDAY');
    expect(m.get('loc:L1:s1')).toBe(4); // satgas 3 + linmas 1
    expect(m.get('reg:R1:s1')).toBe(5);
    expect(m.get('ray:RY1:s2')).toBe(9);
  });

  it('ignores rows of a different day type', () => {
    const rows = [
      req({ region_id: 'R1', role: 'satgas', required_count: 5, day_type: 'WEEKEND' }),
    ];
    expect(requirementTotalMap(rows, 'WEEKDAY').size).toBe(0);
    expect(requirementTotalMap(rows, 'WEEKEND').get('reg:R1:s1')).toBe(5);
  });

  it('skips a city-wide row (no subject id)', () => {
    const rows = [req({ role: 'satgas', required_count: 4 })];
    expect(requirementTotalMap(rows, 'WEEKDAY').size).toBe(0);
  });
});


describe('requirementRoleMap', () => {
  it('keeps the role, so a shift can say WHICH role is short', () => {
    // requirementTotalMap sums the roles into one number, which is why a hint
    // could only ever say "n of m Satgas+Linmas".
    const rows: StaffRequirement[] = [
      req({ location_id: 'L1', shift_definition_id: 's1', role: 'satgas', required_count: 3 }),
      req({ location_id: 'L1', shift_definition_id: 's1', role: 'linmas', required_count: 1 }),
    ];
    const m = requirementRoleMap(rows, 'WEEKDAY');

    expect(m.get('loc:L1:s1:satgas')).toBe(3);
    expect(m.get('loc:L1:s1:linmas')).toBe(1);
    // The aggregate stays available for the subject pill.
    expect(requirementTotalMap(rows, 'WEEKDAY').get('loc:L1:s1')).toBe(4);
  });

  it('keys by subject: loc / reg / ray', () => {
    const rows: StaffRequirement[] = [
      req({ region_id: 'R1', shift_definition_id: 's1', role: 'satgas', required_count: 5 }),
      req({ district_id: 'RY1', shift_definition_id: 's2', role: 'linmas', required_count: 9 }),
    ];
    const m = requirementRoleMap(rows, 'WEEKDAY');

    expect(m.get('reg:R1:s1:satgas')).toBe(5);
    expect(m.get('ray:RY1:s2:linmas')).toBe(9);
  });

  it('ignores rows of a different day type', () => {
    const rows = [
      req({ region_id: 'R1', role: 'satgas', required_count: 5, day_type: 'WEEKEND' }),
    ];
    expect(requirementRoleMap(rows, 'WEEKDAY').size).toBe(0);
  });

  it('keeps roles apart rather than summing them onto one key', () => {
    const rows: StaffRequirement[] = [
      req({ region_id: 'R1', shift_definition_id: 's1', role: 'satgas', required_count: 4 }),
      req({ region_id: 'R1', shift_definition_id: 's1', role: 'linmas', required_count: 6 }),
    ];
    const m = requirementRoleMap(rows, 'WEEKDAY');

    expect(m.get('reg:R1:s1:satgas')).toBe(4);
    expect(m.get('reg:R1:s1:linmas')).toBe(6);
    expect(m.get('reg:R1:s1')).toBeUndefined();
  });
});
