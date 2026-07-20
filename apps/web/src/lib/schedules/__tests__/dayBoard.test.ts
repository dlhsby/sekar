/* eslint-disable sekar-design/no-inline-hex-colors -- test fixtures use literal marker colors */
import {
  buildDayBoard,
  buildWeekCoverage,
  districtCountsFor,
  pruneDayBoard,
  autoExpandedIds,
  COUNTABLE_ROLES,
  CITY_NODE_ID,
  type BoardMasterData,
  type BoardDistrict,
} from '../dayBoard';
import type { ScheduleOccurrence } from '@/lib/api/schedule-events';

const shift = (id: string, name: string): BoardMasterData['shifts'][number] => ({
  id,
  name,
  start_time: '06:00:00',
  end_time: '15:00:00',
});

const master: BoardMasterData = {
  districts: [{ id: 'ry1', name: 'Rayon Pusat' }],
  regions: [{ id: 'kw1', name: 'Kawasan Pusat', district_id: 'ry1' }],
  locations: [
    { id: 'loc1', name: 'Taman Bungkul', district_id: 'ry1', region_id: 'kw1' },
    { id: 'loc2', name: 'Taman Loose', district_id: 'ry1', region_id: null },
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

/**
 * The city ("Surabaya") node is always tree[0] — it is a placement-only sentinel
 * that must render even when empty, or a city-wide schedule has nowhere to be
 * assigned from. Districts follow it.
 */
const districtOf = (tree: BoardDistrict[], id = 'ry1') => tree.find((r) => r.id === id)!;

describe('buildDayBoard', () => {
  it('nests region locations under district and keeps loose locations separate', () => {
    const tree = buildDayBoard([], master);
    const district = districtOf(tree);
    expect(district.regions).toHaveLength(1);
    expect(district.regions[0].locations.map((l) => l.id)).toEqual(['loc1']);
    expect(district.looseLocations.map((l) => l.id)).toEqual(['loc2']);
  });

  it('renders every shift even when empty', () => {
    const tree = buildDayBoard([], master);
    const loc = districtOf(tree).regions[0].locations[0];
    expect(loc.shifts.map((s) => s.shift.id)).toEqual(['s1', 's2']);
    expect(loc.shifts.every((s) => s.total === 0)).toBe(true);
  });

  // Surabaya renders ALWAYS, empty or not. Gating it on already-having-city
  // occurrences made a city-wide schedule impossible to create from the board:
  // no node, so no "+ Tugaskan", so no occurrence, so no node.
  it('puts an empty city-wide node first even with no city occurrences', () => {
    const tree = buildDayBoard([], master);

    expect(tree[0].id).toBe(CITY_NODE_ID);
    expect(tree[0].total).toBe(0);
    // It is city-wide by definition — never any kawasan or lokasi under it.
    expect(tree[0].regions).toEqual([]);
    expect(tree[0].looseLocations).toEqual([]);
    // Every shift is present so each can be assigned into.
    expect(tree[0].placement.map((g) => g.shift.id)).toEqual(['s1', 's2']);
  });

  it('collects unbound occurrences into the city node', () => {
    const cityOcc = occ({ scope: 'city', location_id: null, region_id: null, district_id: null });
    const tree = buildDayBoard([cityOcc], master);

    expect(tree[0].id).toBe(CITY_NODE_ID);
    expect(tree[0].total).toBe(1);
    // A sentinel, not a district — nothing to attach a capacity to.
    expect(tree[0].staffing_level).toBeUndefined();
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
    const s1 = districtOf(tree).regions[0].locations[0].shifts[0];
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
    const s1 = districtOf(tree).regions[0].locations[0].shifts[0];
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
    expect(rows[0]).toMatchObject({ districtId: 'ry1', counts: [2, 1], total: 3 });
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

  it('returns every district in week coverage (even with no schedule)', () => {
    const twoDistrict: BoardMasterData = {
      ...master,
      districts: [
        { id: 'ry1', name: 'Rayon Pusat' },
        { id: 'ry2', name: 'Rayon Utara' },
      ],
    };
    const rows = buildWeekCoverage([occ({ location_id: 'loc1' })], twoDistrict, ['2026-07-13']);
    expect(rows.map((r) => r.districtId)).toEqual(['ry1', 'ry2']);
    expect(rows[1].total).toBe(0);
  });

  it('groups a day into per-district counts (highest first, empties dropped)', () => {
    const counts = districtCountsFor(
      [
        occ({ location_id: 'loc1' }),
        occ({ location_id: 'loc2' }),
        occ({ region_id: 'kw1', location_id: null }),
      ],
      master
    );
    expect(counts).toEqual([{ districtId: 'ry1', districtName: 'Rayon Pusat', count: 3 }]);
  });

  it('places district-scoped occurrences (no location/region) into district placement', () => {
    const tree = buildDayBoard(
      [occ({ location_id: null, region_id: null, district_id: 'ry1', scope: 'district' as never })],
      master
    );
    expect(districtOf(tree).placement.reduce((a, s) => a + s.total, 0)).toBe(1);
    expect(districtOf(tree).total).toBe(1);
    // Not double-counted into any region/location.
    expect(districtOf(tree).regions.every((r) => r.total === 0)).toBe(true);
  });

  it('maps district-scoped occurrences into week + per-district counts via district_id', () => {
    const weekRows = buildWeekCoverage(
      [occ({ location_id: null, region_id: null, district_id: 'ry1', scope: 'district' as never })],
      master,
      ['2026-07-13']
    );
    expect(weekRows[0].total).toBe(1);
    const counts = districtCountsFor(
      [occ({ location_id: null, region_id: null, district_id: 'ry1', scope: 'district' as never })],
      master
    );
    expect(counts).toEqual([{ districtId: 'ry1', districtName: 'Rayon Pusat', count: 1 }]);
  });

  it('places region-scoped (mobile, no location) occurrences into kawasan placement', () => {
    const tree = buildDayBoard(
      [occ({ location_id: null, region_id: 'kw1', scope: 'mobile' })],
      master
    );
    const region = districtOf(tree).regions[0];
    expect(region.placement[0].total).toBe(1);
    expect(region.total).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// pruneDayBoard / autoExpandedIds — the search's effect on the board.
//
// The range query filters occurrences server-side, but the tree's skeleton comes
// from master data: filtering alone removed the people and left every district
// standing at "0 petugas". These pin the two pruning rules apart.
// ---------------------------------------------------------------------------

const twoDistrictMaster: BoardMasterData = {
  districts: [
    { id: 'ry1', name: 'Rayon Barat 1' },
    { id: 'ry2', name: 'Rayon Pusat' },
  ],
  regions: [
    { id: 'kw1', name: 'Kawasan Bungkul', district_id: 'ry1' },
    { id: 'kw2', name: 'Kawasan Pusat', district_id: 'ry2' },
  ],
  locations: [
    { id: 'loc1', name: 'Taman Bungkul', district_id: 'ry1', region_id: 'kw1' },
    { id: 'loc2', name: 'Taman Loose', district_id: 'ry1', region_id: null },
    { id: 'loc3', name: 'Taman Pusat', district_id: 'ry2', region_id: 'kw2' },
  ],
  shifts: [shift('s1', 'Shift 1')],
};

const names = (tree: BoardDistrict[]) => tree.map((r) => r.name);

describe('pruneDayBoard', () => {
  it('returns the tree untouched when nothing is filtered', () => {
    const tree = buildDayBoard([], twoDistrictMaster);
    expect(pruneDayBoard(tree, {})).toBe(tree);
  });

  it('drops districts that cannot contain a filtered lokasi, even with no occurrences', () => {
    // The reported bug: searching a lokasi left all districts rendered at 0 petugas.
    const tree = buildDayBoard([], twoDistrictMaster);

    const pruned = pruneDayBoard(tree, { locationId: 'loc1' });

    expect(names(pruned)).toEqual(['Rayon Barat 1']);
    expect(pruned[0].regions.map((r) => r.name)).toEqual(['Kawasan Bungkul']);
    expect(pruned[0].regions[0].locations.map((l) => l.name)).toEqual(['Taman Bungkul']);
    expect(pruned[0].looseLocations).toEqual([]);
  });

  it('keeps an empty lokasi that was named by a geography filter', () => {
    // "Nobody is at Taman Bungkul today" is an answer, and it's where you'd assign.
    const tree = buildDayBoard([], twoDistrictMaster);

    const pruned = pruneDayBoard(tree, { locationId: 'loc1' });

    expect(pruned[0].regions[0].locations[0].total).toBe(0);
  });

  it('keeps only the named kawasan and its lokasi', () => {
    const tree = buildDayBoard([], twoDistrictMaster);

    const pruned = pruneDayBoard(tree, { regionId: 'kw1' });

    expect(names(pruned)).toEqual(['Rayon Barat 1']);
    expect(pruned[0].regions.map((r) => r.name)).toEqual(['Kawasan Bungkul']);
    // A kawasan filter is not asking about the district's loose lokasi.
    expect(pruned[0].looseLocations).toEqual([]);
  });

  it('keeps a whole district when the district itself is the filter', () => {
    const tree = buildDayBoard([], twoDistrictMaster);

    const pruned = pruneDayBoard(tree, { districtId: 'ry1' });

    expect(names(pruned)).toEqual(['Rayon Barat 1']);
    expect(pruned[0].regions).toHaveLength(1);
    expect(pruned[0].looseLocations).toHaveLength(1);
  });

  it('drops empty containers for a subject filter, keeping only where they are', () => {
    // Searching a petugas: an empty lokasi is noise, not an answer.
    const tree = buildDayBoard(
      [occ({ location_id: 'loc3', user: { id: 'u9', full_name: 'Budi', username: 'b', role: 'satgas' } })],
      twoDistrictMaster
    );

    const pruned = pruneDayBoard(tree, { userId: 'u9' });

    expect(names(pruned)).toEqual(['Rayon Pusat']);
    expect(pruned[0].regions[0].locations.map((l) => l.name)).toEqual(['Taman Pusat']);
  });

  it('keeps a kawasan as the path to a matching lokasi under it', () => {
    const tree = buildDayBoard([occ({ location_id: 'loc1' })], twoDistrictMaster);

    const pruned = pruneDayBoard(tree, { userId: 'u' });

    expect(pruned[0].regions.map((r) => r.name)).toEqual(['Kawasan Bungkul']);
    expect(pruned[0].regions[0].total).toBe(1);
  });

  it('returns an empty tree when a subject filter matches nothing', () => {
    const tree = buildDayBoard([], twoDistrictMaster);

    expect(pruneDayBoard(tree, { userId: 'nobody' })).toEqual([]);
  });

  it('keeps the city node for a subject filter but never for a geography one', () => {
    const tree = buildDayBoard([occ({ user_id: 'u9' })], twoDistrictMaster); // no location/region/district

    expect(pruneDayBoard(tree, { userId: 'u9' })[0].id).toBe(CITY_NODE_ID);
    expect(pruneDayBoard(tree, { districtId: 'ry1' }).map((r) => r.id)).not.toContain(CITY_NODE_ID);
  });
});

/** Real usage: the board prunes first, then asks what to open. */
const expandFor = (occs: ScheduleOccurrence[], filters: Parameters<typeof pruneDayBoard>[1]) =>
  autoExpandedIds(pruneDayBoard(buildDayBoard(occs, twoDistrictMaster), filters), filters);

describe('autoExpandedIds', () => {
  it('opens nothing when nothing is filtered', () => {
    expect(expandFor([occ({ location_id: 'loc1' })], {})).toEqual(new Set());
  });

  // Geography names the destination: open the chain down to it and stop. What is
  // inside the named container is the answer's contents, not more search results.
  describe('geography search — opens down to the named level, no further', () => {
    it('stops at the district when a district was named', () => {
      // Searching "Rayon Barat 1" is a request to focus on it, not to unfurl its
      // 11 kawasan and 87 lokasi.
      const ids = expandFor([occ({ location_id: 'loc1' })], { districtId: 'ry1' });

      expect(ids).toEqual(new Set(['ry1']));
    });

    it('stops at the kawasan when a kawasan was named, leaving its lokasi shut', () => {
      // Even a lokasi that HAS a roster stays closed — it was not what was asked for.
      const ids = expandFor([occ({ location_id: 'loc1' })], { regionId: 'kw1' });

      expect(ids).toEqual(new Set(['ry1', 'kw1']));
      expect(ids).not.toContain('loc1');
    });

    it('opens the full chain to a lokasi when a lokasi was named, even if empty', () => {
      expect(expandFor([], { locationId: 'loc1' })).toEqual(new Set(['ry1', 'kw1', 'loc1']));
    });
  });

  // A subject is somewhere unknown, so the board has to go and find it.
  describe('subject search — opens all the way to the match', () => {
    it('opens the whole ancestor chain down to the matching lokasi', () => {
      expect(expandFor([occ({ location_id: 'loc1' })], { userId: 'u' })).toEqual(
        new Set(['ry1', 'kw1', 'loc1'])
      );
    });

    it('leaves containers without a match shut', () => {
      const ids = expandFor([occ({ location_id: 'loc1' })], { userId: 'u' });

      expect(ids).not.toContain('loc2'); // empty loose lokasi
      expect(ids).not.toContain('ry2');
    });

    it('opens a placement block that holds a match', () => {
      const ids = expandFor([occ({ district_id: 'ry1' })], { userId: 'u' });

      expect(ids).toContain('ry1:placement');
      expect(ids).toContain('ry1');
    });

    it('still reaches the worker when a geography filter is combined with it', () => {
      // "Budi, in Rayon Barat 1" still has to reach Budi — the subject wins the
      // depth question, or the combination would be less useful than either half.
      const ids = expandFor([occ({ location_id: 'loc1' })], { districtId: 'ry1', userId: 'u' });

      expect(ids).toEqual(new Set(['ry1', 'kw1', 'loc1']));
    });
  });
});

// ---------------------------------------------------------------------------
// Teams and staffing. A team event fans out to one occurrence PER MEMBER, each
// carrying that member's real role — so a team of 5 satgas IS 5 satgas on the
// ground. They were excluded from `countable`, leaving a kawasan reading 0/10
// with ten people standing in it.
// ---------------------------------------------------------------------------

describe('buildDayBoard — teams count toward staffing', () => {
  const teamOcc = (role: string, name: string) =>
    occ({
      location_id: 'loc1',
      user: { id: name, full_name: name, username: name, role },
      schedule_event_id: 'ev-team',
      team_category: { id: 'tc1', name: 'Tim Patroli', marker_color: null },
    } as Partial<ScheduleOccurrence>);

  it('counts team members toward countable, like individuals', () => {
    const tree = buildDayBoard([teamOcc('satgas', 'A'), teamOcc('linmas', 'B')], master);
    const s1 = districtOf(tree).regions[0].locations[0].shifts[0];

    expect(s1.countable).toBe(2);
  });

  it('counts team members per role, so a role target sees them', () => {
    const tree = buildDayBoard(
      [teamOcc('satgas', 'A'), teamOcc('satgas', 'B'), teamOcc('linmas', 'C')],
      master
    );
    const s1 = districtOf(tree).regions[0].locations[0].shifts[0];

    expect(s1.countableByRole).toEqual({ satgas: 2, linmas: 1 });
  });

  it('still excludes a team member whose role is not countable', () => {
    const tree = buildDayBoard([teamOcc('korlap', 'A')], master);
    const s1 = districtOf(tree).regions[0].locations[0].shifts[0];

    expect(s1.countable).toBe(0);
    expect(s1.countableByRole).toEqual({});
  });

  it('keeps team members OUT of byRole — a team is displayed as one Tim entry', () => {
    // The Tim column lists them; the role columns only COUNT them. Filing a team
    // under one role is what we cannot do — it is a combination of roles.
    const tree = buildDayBoard([teamOcc('satgas', 'A'), teamOcc('linmas', 'B')], master);
    const s1 = districtOf(tree).regions[0].locations[0].shifts[0];

    expect(s1.byRole).toEqual({});
    expect(s1.teams).toHaveLength(1);
    expect(s1.teams[0].count).toBe(2);
  });

  it('carries the member occurrences so the Tim row can open a detail', () => {
    const tree = buildDayBoard([teamOcc('satgas', 'A'), teamOcc('satgas', 'B')], master);
    const s1 = districtOf(tree).regions[0].locations[0].shifts[0];

    expect(s1.teams[0].occurrences).toHaveLength(2);
    expect(s1.teams[0].occurrences[0].user.full_name).toBe('A');
  });

  it('sums individuals and team members together', () => {
    const tree = buildDayBoard(
      [
        occ({ location_id: 'loc1', user: { id: 'x', full_name: 'X', username: 'x', role: 'satgas' } }),
        teamOcc('satgas', 'A'),
      ],
      master
    );
    const s1 = districtOf(tree).regions[0].locations[0].shifts[0];

    expect(s1.countable).toBe(2);
    expect(s1.countableByRole.satgas).toBe(2);
  });
});
