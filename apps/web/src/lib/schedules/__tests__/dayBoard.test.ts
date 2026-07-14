/* eslint-disable sekar-design/no-inline-hex-colors -- test fixtures use literal marker colors */
import {
  buildDayBoard,
  buildWeekCoverage,
  rayonCountsFor,
  COUNTABLE_ROLES,
  CITY_NODE_ID,
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

  it('adds a city-wide node first only when city occurrences exist', () => {
    // No city node without city occurrences.
    expect(buildDayBoard([], master).some((n) => n.id === CITY_NODE_ID)).toBe(false);

    // A city occurrence (no location/region/rayon) surfaces as the first node.
    const cityOcc = occ({ scope: 'city', location_id: null, region_id: null, rayon_id: null });
    const tree = buildDayBoard([cityOcc], master);
    expect(tree[0].id).toBe(CITY_NODE_ID);
    expect(tree[0].total).toBe(1);
    expect(tree[0].regions).toHaveLength(0);
    // The real rayon still follows.
    expect(tree.some((n) => n.id === 'ry1')).toBe(true);
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

  it('breaks a week cell down by shift and role', () => {
    const days = ['2026-07-13'];
    const rows = buildWeekCoverage(
      [
        occ({ location_id: 'loc1', shift_definition_id: 's1', schedule_date: '2026-07-13' }),
        occ({
          location_id: 'loc1',
          shift_definition_id: 's1',
          schedule_date: '2026-07-13',
          user: { id: 'u2', full_name: 'L', username: 'l', role: 'linmas' } as never,
        }),
        occ({ location_id: 'loc1', shift_definition_id: 's2', schedule_date: '2026-07-13' }),
      ],
      master,
      days
    );
    const [cellS1, cellS2] = rows[0].cells[0];
    expect(cellS1).toMatchObject({ label: '1', roleCounts: { satgas: 1, linmas: 1 }, total: 2 });
    expect(cellS2).toMatchObject({ label: '2', roleCounts: { satgas: 1 }, total: 1 });
  });

  it('returns every rayon in week coverage (even with no schedule)', () => {
    const twoRayon: BoardMasterData = {
      ...master,
      rayons: [
        { id: 'ry1', name: 'Rayon Pusat' },
        { id: 'ry2', name: 'Rayon Utara' },
      ],
    };
    const rows = buildWeekCoverage([occ({ location_id: 'loc1' })], twoRayon, ['2026-07-13']);
    expect(rows.map((r) => r.rayonId)).toEqual(['ry1', 'ry2']);
    expect(rows[1].total).toBe(0);
  });

  it('groups a day into per-rayon counts (highest first, empties dropped)', () => {
    const counts = rayonCountsFor(
      [
        occ({ location_id: 'loc1' }),
        occ({ location_id: 'loc2' }),
        occ({ region_id: 'kw1', location_id: null }),
      ],
      master
    );
    expect(counts).toEqual([{ rayonId: 'ry1', rayonName: 'Rayon Pusat', count: 3 }]);
  });

  it('places rayon-scoped occurrences (no location/region) into rayon placement', () => {
    const tree = buildDayBoard(
      [occ({ location_id: null, region_id: null, rayon_id: 'ry1', scope: 'rayon' as never })],
      master
    );
    expect(tree[0].placement.reduce((a, s) => a + s.total, 0)).toBe(1);
    expect(tree[0].total).toBe(1);
    // Not double-counted into any region/location.
    expect(tree[0].regions.every((r) => r.total === 0)).toBe(true);
  });

  it('maps rayon-scoped occurrences into week + per-rayon counts via rayon_id', () => {
    const weekRows = buildWeekCoverage(
      [occ({ location_id: null, region_id: null, rayon_id: 'ry1', scope: 'rayon' as never })],
      master,
      ['2026-07-13']
    );
    expect(weekRows[0].total).toBe(1);
    const counts = rayonCountsFor(
      [occ({ location_id: null, region_id: null, rayon_id: 'ry1', scope: 'rayon' as never })],
      master
    );
    expect(counts).toEqual([{ rayonId: 'ry1', rayonName: 'Rayon Pusat', count: 1 }]);
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
