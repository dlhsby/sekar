import { requirementTotalMap, type StaffRequirement } from '../location-staff-requirements';

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
      req({ rayon_id: 'RY1', shift_definition_id: 's2', role: 'satgas', required_count: 9 }),
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
