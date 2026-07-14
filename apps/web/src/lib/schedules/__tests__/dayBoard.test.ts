/* eslint-disable sekar-design/no-inline-hex-colors -- test fixtures use literal marker colors */
import {
  buildDayBoard,
  buildWeekCoverage,
  COUNTABLE_ROLES,
  type BoardMasterData,
} from '../dayBoard';
import type { ScheduleOccurrence } from '@/lib/api/schedule-events';

const shift = (id: string, name: string): BoardMasterData['shifts'][number] => ({
  id,
  name,
  start_time: '06:00:00',
  end_time: '15:00:00',
});

const master: BoardMasterData = {
  rayons: [{ id: 'ry1', name: 'Rayon Pusat' }],
  regions: [{ id: 'kw1', name: 'Kawasan Pusat', rayon_id: 'ry1' }],
  locations: [
    { id: 'loc1', name: 'Taman Bungkul', rayon_id: 'ry1', region_id: 'kw1' },
    { id: 'loc2', name: 'Taman Loose', rayon_id: 'ry1', region_id: null },
  ],
  shifts: [shift('s1', 'Shift 1'), shift('s2', 'Shift 2')],
};

const occ = (o: Partial<ScheduleOccurrence>): ScheduleOccurrence =>
  ({
    id: Math.random().toString(),
    user_id: 'u',
    schedule_date: '2026-07-13',
    shift_definition_id: 's1',
    scope: 'static',
    status: 'planned',
    is_detached: false,
    user: { id: 'u', full_name: 'X', username: 'x', role: 'satgas' },
    shift_definition: null,
    ...o,
  }) as ScheduleOccurrence;

describe('buildDayBoard', () => {
  it('nests region locations under rayon and keeps loose locations separate', () => {
    const tree = buildDayBoard([], master);
    expect(tree).toHaveLength(1);
    expect(tree[0].regions).toHaveLength(1);
    expect(tree[0].regions[0].locations.map((l) => l.id)).toEqual(['loc1']);
    expect(tree[0].looseLocations.map((l) => l.id)).toEqual(['loc2']);
  });

  it('renders every shift even when empty', () => {
    const tree = buildDayBoard([], master);
    const loc = tree[0].regions[0].locations[0];
    expect(loc.shifts.map((s) => s.shift.id)).toEqual(['s1', 's2']);
    expect(loc.shifts.every((s) => s.total === 0)).toBe(true);
  });

  it('groups individuals by role and counts only satgas+linmas', () => {
    const tree = buildDayBoard(
      [
        occ({
          location_id: 'loc1',
          user: { id: 'a', full_name: 'A', username: 'a', role: 'satgas' },
        }),
        occ({
          location_id: 'loc1',
          user: { id: 'b', full_name: 'B', username: 'b', role: 'linmas' },
        }),
        occ({
          location_id: 'loc1',
          user: { id: 'c', full_name: 'C', username: 'c', role: 'korlap' },
        }),
      ],
      master
    );
    const s1 = tree[0].regions[0].locations[0].shifts[0];
    expect(Object.keys(s1.byRole).sort()).toEqual(['korlap', 'linmas', 'satgas']);
    expect(s1.total).toBe(3);
    expect(s1.countable).toBe(2); // korlap excluded
    expect(COUNTABLE_ROLES).toEqual(['satgas', 'linmas']);
  });

  it('collapses team members into one Tim entry with a count', () => {
    const team = {
      schedule_event_id: 'ev1',
      team_category: { id: 't1', name: 'Perawatan', marker_color: '#7FBC8C' },
    };
    const tree = buildDayBoard(
      [
        occ({
          location_id: 'loc1',
          ...team,
          user: { id: 'a', full_name: 'A', username: 'a', role: 'satgas' },
        }),
        occ({
          location_id: 'loc1',
          ...team,
          user: { id: 'b', full_name: 'B', username: 'b', role: 'linmas' },
        }),
      ],
      master
    );
    const s1 = tree[0].regions[0].locations[0].shifts[0];
    expect(s1.teams).toHaveLength(1);
    expect(s1.teams[0]).toMatchObject({ name: 'Perawatan', count: 2, markerColor: '#7FBC8C' });
    expect(Object.keys(s1.byRole)).toHaveLength(0); // team members not in role columns
  });

  it('counts week coverage per rayon per day via location/region mapping', () => {
    const days = ['2026-07-13', '2026-07-14'];
    const rows = buildWeekCoverage(
      [
        occ({ location_id: 'loc1', schedule_date: '2026-07-13' }),
        occ({ location_id: 'loc2', schedule_date: '2026-07-13' }),
        occ({ location_id: null, region_id: 'kw1', schedule_date: '2026-07-14', scope: 'mobile' }),
      ],
      master,
      days
    );
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ rayonId: 'ry1', counts: [2, 1], total: 3 });
  });

  it('places region-scoped (mobile, no location) occurrences into kawasan placement', () => {
    const tree = buildDayBoard(
      [occ({ location_id: null, region_id: 'kw1', scope: 'mobile' })],
      master
    );
    const region = tree[0].regions[0];
    expect(region.placement[0].total).toBe(1);
    expect(region.total).toBe(1);
  });
});
