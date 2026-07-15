/* eslint-disable sekar-design/no-inline-hex-colors -- test fixtures use literal marker colors */
import {
  buildDayBoard,
  buildWeekCoverage,
  rayonCountsFor,
  pruneDayBoard,
  autoExpandedIds,
  COUNTABLE_ROLES,
  CITY_NODE_ID,
  type BoardMasterData,
  type BoardRayon,
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

// ---------------------------------------------------------------------------
// pruneDayBoard / autoExpandedIds — the search's effect on the board.
//
// The range query filters occurrences server-side, but the tree's skeleton comes
// from master data: filtering alone removed the people and left every rayon
// standing at "0 petugas". These pin the two pruning rules apart.
// ---------------------------------------------------------------------------

const twoRayonMaster: BoardMasterData = {
  rayons: [
    { id: 'ry1', name: 'Rayon Barat 1' },
    { id: 'ry2', name: 'Rayon Pusat' },
  ],
  regions: [
    { id: 'kw1', name: 'Kawasan Bungkul', rayon_id: 'ry1' },
    { id: 'kw2', name: 'Kawasan Pusat', rayon_id: 'ry2' },
  ],
  locations: [
    { id: 'loc1', name: 'Taman Bungkul', rayon_id: 'ry1', region_id: 'kw1' },
    { id: 'loc2', name: 'Taman Loose', rayon_id: 'ry1', region_id: null },
    { id: 'loc3', name: 'Taman Pusat', rayon_id: 'ry2', region_id: 'kw2' },
  ],
  shifts: [shift('s1', 'Shift 1')],
};

const names = (tree: BoardRayon[]) => tree.map((r) => r.name);

describe('pruneDayBoard', () => {
  it('returns the tree untouched when nothing is filtered', () => {
    const tree = buildDayBoard([], twoRayonMaster);
    expect(pruneDayBoard(tree, {})).toBe(tree);
  });

  it('drops rayons that cannot contain a filtered lokasi, even with no occurrences', () => {
    // The reported bug: searching a lokasi left all rayons rendered at 0 petugas.
    const tree = buildDayBoard([], twoRayonMaster);

    const pruned = pruneDayBoard(tree, { locationId: 'loc1' });

    expect(names(pruned)).toEqual(['Rayon Barat 1']);
    expect(pruned[0].regions.map((r) => r.name)).toEqual(['Kawasan Bungkul']);
    expect(pruned[0].regions[0].locations.map((l) => l.name)).toEqual(['Taman Bungkul']);
    expect(pruned[0].looseLocations).toEqual([]);
  });

  it('keeps an empty lokasi that was named by a geography filter', () => {
    // "Nobody is at Taman Bungkul today" is an answer, and it's where you'd assign.
    const tree = buildDayBoard([], twoRayonMaster);

    const pruned = pruneDayBoard(tree, { locationId: 'loc1' });

    expect(pruned[0].regions[0].locations[0].total).toBe(0);
  });

  it('keeps only the named kawasan and its lokasi', () => {
    const tree = buildDayBoard([], twoRayonMaster);

    const pruned = pruneDayBoard(tree, { regionId: 'kw1' });

    expect(names(pruned)).toEqual(['Rayon Barat 1']);
    expect(pruned[0].regions.map((r) => r.name)).toEqual(['Kawasan Bungkul']);
    // A kawasan filter is not asking about the rayon's loose lokasi.
    expect(pruned[0].looseLocations).toEqual([]);
  });

  it('keeps a whole rayon when the rayon itself is the filter', () => {
    const tree = buildDayBoard([], twoRayonMaster);

    const pruned = pruneDayBoard(tree, { rayonId: 'ry1' });

    expect(names(pruned)).toEqual(['Rayon Barat 1']);
    expect(pruned[0].regions).toHaveLength(1);
    expect(pruned[0].looseLocations).toHaveLength(1);
  });

  it('drops empty containers for a subject filter, keeping only where they are', () => {
    // Searching a petugas: an empty lokasi is noise, not an answer.
    const tree = buildDayBoard(
      [occ({ location_id: 'loc3', user: { id: 'u9', full_name: 'Budi', username: 'b', role: 'satgas' } })],
      twoRayonMaster
    );

    const pruned = pruneDayBoard(tree, { userId: 'u9' });

    expect(names(pruned)).toEqual(['Rayon Pusat']);
    expect(pruned[0].regions[0].locations.map((l) => l.name)).toEqual(['Taman Pusat']);
  });

  it('keeps a kawasan as the path to a matching lokasi under it', () => {
    const tree = buildDayBoard([occ({ location_id: 'loc1' })], twoRayonMaster);

    const pruned = pruneDayBoard(tree, { userId: 'u' });

    expect(pruned[0].regions.map((r) => r.name)).toEqual(['Kawasan Bungkul']);
    expect(pruned[0].regions[0].total).toBe(1);
  });

  it('returns an empty tree when a subject filter matches nothing', () => {
    const tree = buildDayBoard([], twoRayonMaster);

    expect(pruneDayBoard(tree, { userId: 'nobody' })).toEqual([]);
  });

  it('keeps the city node for a subject filter but never for a geography one', () => {
    const tree = buildDayBoard([occ({ user_id: 'u9' })], twoRayonMaster); // no location/region/rayon

    expect(pruneDayBoard(tree, { userId: 'u9' })[0].id).toBe(CITY_NODE_ID);
    expect(pruneDayBoard(tree, { rayonId: 'ry1' }).map((r) => r.id)).not.toContain(CITY_NODE_ID);
  });
});

describe('autoExpandedIds', () => {
  it('opens nothing when nothing is filtered', () => {
    const tree = buildDayBoard([occ({ location_id: 'loc1' })], twoRayonMaster);

    expect(autoExpandedIds(tree, {})).toEqual(new Set());
  });

  it('opens the whole ancestor chain down to a matching lokasi', () => {
    const tree = buildDayBoard([occ({ location_id: 'loc1' })], twoRayonMaster);

    const ids = autoExpandedIds(tree, { userId: 'u' });

    expect(ids).toEqual(new Set(['ry1', 'kw1', 'loc1']));
  });

  it('opens a lokasi named by a geography filter even though it is empty', () => {
    const tree = buildDayBoard([], twoRayonMaster);

    expect(autoExpandedIds(tree, { locationId: 'loc1' })).toEqual(new Set(['ry1', 'kw1', 'loc1']));
  });

  it('does not open empty lokasi just because their rayon was filtered', () => {
    // A rayon filter must not blow all 87 lokasi open — that is worse than none.
    const tree = buildDayBoard([occ({ location_id: 'loc1' })], twoRayonMaster);

    const ids = autoExpandedIds(tree, { rayonId: 'ry1' });

    expect(ids).toContain('ry1');
    expect(ids).toContain('loc1');
    expect(ids).not.toContain('loc2'); // empty loose lokasi stays shut
  });

  it('opens a placement block that holds a match', () => {
    const tree = buildDayBoard([occ({ rayon_id: 'ry1' })], twoRayonMaster);

    const ids = autoExpandedIds(tree, { userId: 'u' });

    expect(ids).toContain('ry1:placement');
    expect(ids).toContain('ry1');
  });
});
