/**
 * Unit tests: DayBoard (the Jadwal day coverage board).
 *
 * `buildDayBoard` (the tree logic) is covered in lib/schedules/__tests__; this
 * covers the COMPONENT: lazy tree expansion, understaffing pills at the subject
 * level the rayon's staffing_level dictates (kawasan vs park), the capacity gear's
 * subject, and — critically — that "+ Tugaskan" reports the geography of the
 * container it was clicked in (the pre-fill contract).
 */
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DayBoard } from '../DayBoard';
import { CITY_NODE_ID, type BoardMasterData } from '@/lib/schedules/dayBoard';
import type { ScheduleOccurrence } from '@/lib/api/schedule-events';
import type { StaffingLevel } from '@/types/models';

const shift = (id: string, name: string) => ({
  id,
  name,
  start_time: '06:00:00',
  end_time: '15:00:00',
});

/**
 * The rayon's `staffing_level` decides which single tier owns capacity. Build a
 * master for a given level — the board must never infer it from tree position.
 */
const masterAt = (level: StaffingLevel): BoardMasterData => ({
  ...master,
  rayons: [{ id: 'ry1', name: 'Rayon Pusat', staffing_level: level }],
});

const master: BoardMasterData = {
  // No staffing_level → falls back to the entity default (`region`).
  rayons: [{ id: 'ry1', name: 'Rayon Pusat' }],
  regions: [{ id: 'kw1', name: 'Kawasan Pusat', rayon_id: 'ry1' }],
  locations: [
    { id: 'loc1', name: 'Taman Bungkul', rayon_id: 'ry1', region_id: 'kw1' },
    { id: 'loc2', name: 'Taman Aktif Park', rayon_id: 'ry1', region_id: null },
  ],
  shifts: [shift('s1', 'Shift 1')],
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
    user: { id: 'u', full_name: 'Budi', username: 'budi', role: 'satgas' },
    shift_definition: null,
    ...o,
  }) as ScheduleOccurrence;

function renderBoard(props: Partial<React.ComponentProps<typeof DayBoard>> = {}) {
  return render(
    <DayBoard
      occurrences={[]}
      master={master}
      onOccurrenceClick={jest.fn()}
      {...props}
    />
  );
}

/** The card/section whose header shows `label` — scopes pill queries to one tier. */
const card = (label: RegExp) =>
  screen.getByRole('button', { name: label }).closest('section, div') as HTMLElement;

/** Expand a collapsed node by its visible label. */
async function expand(user: ReturnType<typeof userEvent.setup>, label: RegExp | string) {
  await user.click(screen.getByRole('button', { expanded: false, name: label }));
}

describe('DayBoard', () => {
  it('shows the empty-day banner when there are no occurrences', () => {
    renderBoard();
    expect(screen.getByText(/belum ada jadwal/i)).toBeInTheDocument();
  });

  it('renders rayons collapsed and only reveals children once expanded', async () => {
    const user = userEvent.setup();
    renderBoard({ occurrences: [occ({ location_id: 'loc1' })] });

    // Collapsed: the rayon header is there, its kawasan is not.
    expect(screen.getByText('Rayon Pusat')).toBeInTheDocument();
    expect(screen.queryByText('Kawasan Pusat')).not.toBeInTheDocument();

    await expand(user, /Rayon Pusat/);
    expect(screen.getByText('Kawasan Pusat')).toBeInTheDocument();
    // The location inside the kawasan is still nested one level deeper.
    expect(screen.queryByText('Taman Bungkul')).not.toBeInTheDocument();

    await expand(user, /Kawasan Pusat/);
    expect(screen.getByText('Taman Bungkul')).toBeInTheDocument();
  });

  it('flags kawasan understaffing against the kawasan target (reg: key)', async () => {
    const user = userEvent.setup();
    renderBoard({
      occurrences: [occ({ location_id: 'loc1' })], // 1 countable satgas
      capacities: new Map([['reg:kw1:s1', 3]]),
    });
    await expand(user, /Rayon Pusat/);

    // 1 of 3 → understaffed pill on the kawasan row.
    // The kawasan owns the target; the rayon rolls the same 3 up, so both pills
    // read 1/3 — assert on the count rather than a single match.
    expect(screen.getAllByText(/S1·1\/3/)).toHaveLength(2);
  });

  it('flags park (location-level) understaffing against the loc: target', async () => {
    const user = userEvent.setup();
    renderBoard({
      master: masterAt('location'),
      occurrences: [occ({ location_id: 'loc2' })], // loose location = Taman Aktif park
      capacities: new Map([['loc:loc2:s1', 2]]),
    });
    await expand(user, /Rayon Pusat/);

    // Lokasi owns it; the rayon rolls it up → two pills with the same numbers.
    expect(screen.getAllByText(/S1·1\/2/)).toHaveLength(2);
  });

  it('ignores a lokasi target when the rayon is kawasan-scoped', async () => {
    // A stale loc-level row can exist (the API used to accept any level); it must
    // not surface once the rayon says the kawasan owns capacity.
    const user = userEvent.setup();
    renderBoard({
      master: masterAt('region'),
      occurrences: [occ({ location_id: 'loc2' })],
      capacities: new Map([['loc:loc2:s1', 2]]),
    });
    await expand(user, /Rayon Pusat/);

    expect(screen.queryByText(/S1·1\/2/)).not.toBeInTheDocument();
  });

  it('does not show a target pill on a location nested under a kawasan', async () => {
    const user = userEvent.setup();
    renderBoard({
      occurrences: [occ({ location_id: 'loc1' })],
      // A loc target exists, but staffing for grouped rayons lives on the kawasan.
      capacities: new Map([['loc:loc1:s1', 5]]),
    });
    await expand(user, /Rayon Pusat/);
    await expand(user, /Kawasan Pusat/);

    // Counts only (S1·1), never the "1/5" target form, for the nested location.
    expect(screen.queryByText(/S1·1\/5/)).not.toBeInTheDocument();
  });

  it('offers the capacity gear on exactly one tier — the kawasan — when rayon is kawasan-scoped', async () => {
    const user = userEvent.setup();
    const onEditCapacity = jest.fn();
    renderBoard({
      master: masterAt('region'),
      occurrences: [occ({ location_id: 'loc1' }), occ({ location_id: 'loc2' })],
      onEditCapacity,
    });
    await expand(user, /Rayon Pusat/);

    const gears = screen.getAllByRole('button', { name: /atur kapasitas/i });
    expect(gears).toHaveLength(1);

    await user.click(gears[0]);
    expect(onEditCapacity).toHaveBeenCalledWith({
      type: 'region',
      id: 'kw1',
      name: 'Kawasan Pusat',
    });
  });

  it('offers the gear on the lokasi — including one nested under a kawasan — when rayon is lokasi-scoped', async () => {
    const user = userEvent.setup();
    const onEditCapacity = jest.fn();
    renderBoard({
      master: masterAt('location'),
      occurrences: [occ({ location_id: 'loc1' }), occ({ location_id: 'loc2' })],
      onEditCapacity,
    });
    await expand(user, /Rayon Pusat/);
    await expand(user, /Kawasan Pusat/);

    // No kawasan gear at lokasi scope...
    const gears = screen.getAllByRole('button', { name: /atur kapasitas/i });
    expect(gears).toHaveLength(2); // the nested lokasi + the loose park

    await user.click(gears[0]);
    // ...and a lokasi under a kawasan still owns its capacity (it previously
    // never got a gear at all, because the level was inferred from nesting).
    expect(onEditCapacity).toHaveBeenCalledWith({
      type: 'location',
      id: 'loc1',
      name: 'Taman Bungkul',
    });
  });

  it('offers the gear on the rayon itself when rayon-scoped, and nowhere below', async () => {
    const user = userEvent.setup();
    const onEditCapacity = jest.fn();
    renderBoard({
      master: masterAt('rayon'),
      occurrences: [occ({ location_id: 'loc1' }), occ({ location_id: 'loc2' })],
      onEditCapacity,
    });

    // Visible before expanding: the gear sits on the rayon header itself.
    const gears = screen.getAllByRole('button', { name: /atur kapasitas/i });
    expect(gears).toHaveLength(1);

    await user.click(gears[0]);
    expect(onEditCapacity).toHaveBeenCalledWith({
      type: 'rayon',
      id: 'ry1',
      name: 'Rayon Pusat',
    });

    // Nothing below the rayon offers one.
    await expand(user, /Rayon Pusat/);
    await expand(user, /Kawasan Pusat/);
    expect(screen.getAllByRole('button', { name: /atur kapasitas/i })).toHaveLength(1);
  });

  it('never offers capacity on the city node (a sentinel, not a rayon)', async () => {
    renderBoard({
      occurrences: [occ({})], // no geography → city-wide
      onEditCapacity: jest.fn(),
    });

    expect(screen.queryByRole('button', { name: /atur kapasitas/i })).not.toBeInTheDocument();
  });

  it('"+ Tugaskan" reports the clicked container’s geography (pre-fill contract)', async () => {
    const user = userEvent.setup();
    const onAssign = jest.fn();
    // Lokasi-scoped: the kawasan has no assign table of its own here, so the
    // first "+ Tugaskan" is unambiguously the lokasi's.
    renderBoard({
      master: masterAt('location'),
      occurrences: [occ({ location_id: 'loc1' })],
      canAssign: true,
      onAssign,
    });
    await expand(user, /Rayon Pusat/);
    await expand(user, /Kawasan Pusat/);
    await expand(user, /Taman Bungkul/);

    await user.click(screen.getAllByRole('button', { name: /tugaskan/i })[0]);

    expect(onAssign).toHaveBeenCalledWith(
      expect.objectContaining({
        rayon_id: 'ry1',
        region_id: 'kw1',
        location_id: 'loc1',
        shiftId: 's1',
      })
    );
  });

  it('offers an assign table on the kawasan itself when kawasan-scoped, even with nobody on it yet', async () => {
    const user = userEvent.setup();
    const onAssign = jest.fn();
    // Previously the kawasan's table only rendered once it already had someone,
    // so a kawasan target could never be staffed at the kawasan — the only
    // "+ Tugaskan" was on a lokasi.
    renderBoard({
      master: masterAt('region'),
      occurrences: [],
      canAssign: true,
      onAssign,
    });
    await expand(user, /Rayon Pusat/);
    await expand(user, /Kawasan Pusat/);
    await expand(user, /penempatan kawasan/i);

    await user.click(screen.getAllByRole('button', { name: /tugaskan/i })[0]);

    expect(onAssign).toHaveBeenCalledWith(
      expect.objectContaining({ rayon_id: 'ry1', region_id: 'kw1', shiftId: 's1' })
    );
    expect(onAssign.mock.calls[0][0]).not.toHaveProperty('location_id');
  });

  it('offers an assign table on the rayon itself when rayon-scoped, even when empty', async () => {
    const user = userEvent.setup();
    const onAssign = jest.fn();
    renderBoard({
      master: masterAt('rayon'),
      occurrences: [],
      canAssign: true,
      onAssign,
    });
    await expand(user, /Rayon Pusat/);
    await expand(user, /penempatan rayon/i);

    await user.click(screen.getAllByRole('button', { name: /tugaskan/i })[0]);

    expect(onAssign).toHaveBeenCalledWith(
      expect.objectContaining({ rayon_id: 'ry1', shiftId: 's1' })
    );
    expect(onAssign.mock.calls[0][0]).not.toHaveProperty('region_id');
  });

  it('counts lokasi workers toward a kawasan target (everything inside counts)', async () => {
    const user = userEvent.setup();
    renderBoard({
      master: masterAt('region'),
      // Nobody assigned at the kawasan itself — one satgas on its lokasi.
      occurrences: [occ({ location_id: 'loc1' })],
      roleCapacities: new Map([['reg:kw1:s1:satgas', 1]]),
    });
    await expand(user, /Rayon Pusat/);
    await expand(user, /Kawasan Pusat/);

    // The kawasan's own table lists nobody, but its target is met by the lokasi.
    await expand(user, /penempatan kawasan/i);
    expect(screen.getAllByText('1/1').length).toBeGreaterThan(0);
  });

  it('marks a city-wide node as city in the assign context', async () => {
    const user = userEvent.setup();
    const onAssign = jest.fn();
    renderBoard({
      occurrences: [occ({ scope: 'city', location_id: null })],
      canAssign: true,
      onAssign,
    });
    // Surabaya's shift+role table IS its body — no "Penempatan" wrapper, since
    // it has no kawasan/lokasi siblings to distinguish it from.
    await expand(user, /Surabaya/);

    await user.click(screen.getAllByRole('button', { name: /tugaskan/i })[0]);
    expect(onAssign).toHaveBeenCalledWith(
      expect.objectContaining({ city: true, shiftId: 's1' })
    );
    // The city node carries no rayon geography.
    expect(onAssign.mock.calls[0][0].rayon_id).toBeUndefined();
    expect(CITY_NODE_ID).toBe('__city__');
  });

  it('hides assign affordances when the user cannot assign', async () => {
    const user = userEvent.setup();
    renderBoard({ occurrences: [occ({ location_id: 'loc1' })], canAssign: false });
    await expand(user, /Rayon Pusat/);
    await expand(user, /Kawasan Pusat/);
    await expand(user, /Taman Bungkul/);

    expect(screen.queryByRole('button', { name: /tugaskan/i })).not.toBeInTheDocument();
  });
});


describe('subject pills (rayon / kawasan)', () => {
  /**
   * Regression: these pills are built from a SYNTHETIC per-shift group that has
   * no `byRole` — an `as BoardShiftGroup` cast hid that from tsc, and reading
   * `group.byRole[role]` for the hint's breakdown crashed the whole accordion
   * with "Cannot read properties of undefined (reading 'satgas')". They only
   * render when the aggregate `capacities` map has a target, which is why a
   * roleCapacities-only test never reached the crash.
   */
  it('renders a kawasan pill with a per-role hint without crashing', async () => {
    const user = userEvent.setup();
    renderBoard({
      master: masterAt('region'),
      occurrences: [occ({ location_id: 'loc1' })],
      capacities: new Map([['reg:kw1:s1', 3]]),
      roleCapacities: new Map([['reg:kw1:s1:satgas', 3]]),
    });
    await expand(user, /Rayon Pusat/);

    // Both the kawasan (owner) and the rayon (roll-up) render it.
    expect(screen.getAllByText(/S1·1\/3/)).toHaveLength(2);
  });

  it('names the short role in the kawasan hint, counting the whole subtree', async () => {
    const user = userEvent.setup();
    renderBoard({
      master: masterAt('region'),
      occurrences: [occ({ location_id: 'loc1' })], // one satgas, on a lokasi
      capacities: new Map([['reg:kw1:s1', 3]]),
      roleCapacities: new Map([['reg:kw1:s1:satgas', 3]]),
    });
    await expand(user, /Rayon Pusat/);

    // The hint must say WHICH role, and count the lokasi worker toward the
    // kawasan — a synthetic group's own byRole would have said 0.
    expect(screen.getByTitle(/Satgas 1\/3/)).toBeInTheDocument();
  });

  it('renders a rayon pill with a per-role hint without crashing', async () => {
    renderBoard({
      master: masterAt('rayon'),
      occurrences: [occ({ location_id: 'loc1' })],
      capacities: new Map([['ray:ry1:s1', 2]]),
      roleCapacities: new Map([['ray:ry1:s1:satgas', 2]]),
    });

    // Rayon pills sit on the header, visible before expanding.
    expect(screen.getByText(/S1·1\/2/)).toBeInTheDocument();
    expect(screen.getByTitle(/Satgas 1\/2/)).toBeInTheDocument();
  });
});


describe('roll-up pills on a parent tier', () => {
  /**
   * A parent carries no target of its own, but an operator must be able to scan
   * rayons and see which needs staffing without expanding all 11 kawasan. So a
   * parent sums the targets of whichever tier owns them below it — rendered
   * dashed, since it is summed from below and has no gear.
   */
  const twoKawasan: BoardMasterData = {
    ...master,
    rayons: [{ id: 'ry1', name: 'Rayon Pusat', staffing_level: 'region' }],
    regions: [
      { id: 'kw1', name: 'Kawasan Pusat', rayon_id: 'ry1' },
      { id: 'kw2', name: 'Kawasan Dua', rayon_id: 'ry1' },
    ],
  };

  it('sums the kawasan targets onto the rayon header', () => {
    renderBoard({
      master: twoKawasan,
      occurrences: [],
      capacities: new Map([
        ['reg:kw1:s1', 10],
        ['reg:kw2:s1', 5],
      ]),
    });

    // 10 + 5 — visible without expanding, which is the whole point.
    expect(screen.getByText(/S1·0\/15/)).toBeInTheDocument();
  });

  it('marks the rolled-up pill as summed, not settable', () => {
    renderBoard({
      master: twoKawasan,
      occurrences: [],
      capacities: new Map([['reg:kw1:s1', 10]]),
    });

    // Dashed border distinguishes "summed from below" from an owned target.
    expect(screen.getByText(/S1·0\/10/).className).toContain('border-dashed');
  });

  it('does not mark an OWNED target as rolled up', () => {
    renderBoard({
      master: masterAt('rayon'),
      occurrences: [],
      capacities: new Map([['ray:ry1:s1', 4]]),
    });

    expect(screen.getByText(/S1·0\/4/).className).not.toContain('border-dashed');
  });

  it('climbs as lokasi under the kawasan get staffed', () => {
    renderBoard({
      master: twoKawasan,
      occurrences: [occ({ location_id: 'loc1' })], // one satgas on a kawasan's lokasi
      capacities: new Map([['reg:kw1:s1', 10]]),
    });

    // The rayon roll-up counts the whole subtree, so staffing anywhere shows here.
    expect(screen.getByText(/S1·1\/10/)).toBeInTheDocument();
  });

  it('shows no rayon pill when nothing below defines a target', () => {
    renderBoard({ master: twoKawasan, occurrences: [], capacities: new Map() });

    expect(screen.queryByText(/S1·\d+\//)).not.toBeInTheDocument();
  });
});


describe('hierarchy depth', () => {
  /**
   * Depth follows the tree, and every container reads the same way: its own
   * "Penempatan" block sits at the container's level, its children step in by
   * one. So a lokasi under a kawasan lands deeper than one hanging straight off
   * the rayon — which is exactly what they are. This is also the hierarchy's
   * only non-colour channel: the border hues (primary/info/warning) alone fail
   * WCAG 2.1 AA.
   */
  const lokasiCard = (name: string) =>
    screen.getByText(name).closest('div[class*="border-l-nb-warning"]') as HTMLElement;
  const kawasanCard = (name: RegExp) =>
    screen.getByText(name).closest('div[class*="border-l-nb-info"]') as HTMLElement;

  it('steps the kawasan in from the rayon’s own Penempatan block', async () => {
    const user = userEvent.setup();
    renderBoard({ occurrences: [] });
    await expand(user, /Rayon Pusat/);

    // PENEMPATAN RAYON is rayon-level (depth 0); its kawasan are children.
    expect(kawasanCard(/Kawasan Pusat/).className).toContain('ml-4');
  });

  it('steps a lokasi hanging off the rayon past the kawasan level', async () => {
    const user = userEvent.setup();
    renderBoard({ occurrences: [] });
    await expand(user, /Rayon Pusat/);

    // Two steps: past PENEMPATAN RAYON, then past the kawasan tier.
    expect(lokasiCard('Taman Aktif Park').className).toContain('ml-8');
  });

  it('steps a lokasi inside a kawasan in from that kawasan’s Penempatan block', async () => {
    const user = userEvent.setup();
    renderBoard({ occurrences: [] });
    await expand(user, /Rayon Pusat/);
    await expand(user, /Kawasan Pusat/);

    // One step inside its kawasan — which is itself already indented, so it
    // ends up deeper than a loose lokasi. That is the real structure.
    expect(lokasiCard('Taman Bungkul').className).toContain('ml-4');
    expect(lokasiCard('Taman Bungkul').className).not.toContain('ml-8');
  });
});


describe('group rail', () => {
  /**
   * One continuous 2px rail per children-group, in the container's own accent —
   * "these belong to that". Chosen over per-row git-style elbows: hairline
   * connectors fight NB's 2px/hard-shadow language and would sit right beside
   * each card's existing 6px accent border, two strokes doing one job.
   */
  it('rails the rayon’s children in the rayon’s accent', async () => {
    const user = userEvent.setup();
    const { container } = renderBoard({ occurrences: [] });
    await expand(user, /Rayon Pusat/);

    expect(container.querySelector('.border-nb-primary\\/40')).toBeInTheDocument();
  });

  it('rails a kawasan’s lokasi in the kawasan’s accent', async () => {
    const user = userEvent.setup();
    const { container } = renderBoard({ occurrences: [] });
    await expand(user, /Rayon Pusat/);
    await expand(user, /Kawasan Pusat/);

    expect(container.querySelector('.border-nb-info\\/40')).toBeInTheDocument();
  });

  it('draws no rail when a container has no children to group', async () => {
    const user = userEvent.setup();
    // A rayon with only city-wide placement has neither kawasan nor lokasi.
    const { container } = renderBoard({
      master: { ...master, regions: [], locations: [] },
      occurrences: [],
    });
    await expand(user, /Rayon Pusat/);

    expect(container.querySelector('.border-nb-primary\\/40')).not.toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// Search integration — the reported bug: filtering narrowed the OCCURRENCES
// server-side but the tree's skeleton came from `master`, so every rayon stayed
// on screen at "0 petugas" and nothing opened. (The prune/expand rules
// themselves are unit-tested in lib/schedules/__tests__.)
// ---------------------------------------------------------------------------

describe('DayBoard — search', () => {
  const twoRayon: BoardMasterData = {
    ...master,
    rayons: [
      { id: 'ry1', name: 'Rayon Pusat' },
      { id: 'ry2', name: 'Rayon Barat' },
    ],
  };

  it('renders every rayon when nothing is filtered', () => {
    renderBoard({ master: twoRayon });

    expect(screen.getByRole('button', { name: /Rayon Pusat/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Rayon Barat/ })).toBeInTheDocument();
  });

  it('drops rayons that cannot hold the searched lokasi', () => {
    renderBoard({ master: twoRayon, filters: { locationId: 'loc1' } });

    expect(screen.getByRole('button', { name: /Rayon Pusat/ })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Rayon Barat/ })).not.toBeInTheDocument();
  });

  it('opens the path to the searched lokasi instead of leaving it collapsed', () => {
    // The old board made you open Rayon ▸ Kawasan ▸ Lokasi by hand to find it.
    renderBoard({ master: twoRayon, filters: { locationId: 'loc1' } });

    expect(screen.getByRole('button', { expanded: true, name: /Rayon Pusat/ })).toBeInTheDocument();
    expect(
      screen.getByRole('button', { expanded: true, name: /Kawasan Pusat/ })
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { expanded: true, name: /Taman Bungkul/ })).toBeInTheDocument();
  });

  it('stops opening at the searched kawasan and leaves its lokasi shut', () => {
    // Searching a kawasan is a request to focus on it — unfurling every lokasi
    // under it (even ones with a roster) buries the thing that was asked for.
    renderBoard({
      master: twoRayon,
      occurrences: [occ({ location_id: 'loc1' })],
      filters: { regionId: 'kw1' },
    });

    expect(screen.getByRole('button', { expanded: true, name: /Kawasan Pusat/ })).toBeInTheDocument();
    expect(
      screen.getByRole('button', { expanded: false, name: /Taman Bungkul/ })
    ).toBeInTheDocument();
  });

  it('opens all the way to a searched worker, wherever they are', () => {
    renderBoard({
      master: twoRayon,
      occurrences: [occ({ location_id: 'loc1' })],
      filters: { userId: 'u' },
    });

    expect(screen.getByRole('button', { expanded: true, name: /Taman Bungkul/ })).toBeInTheDocument();
    expect(screen.getByText('Budi')).toBeInTheDocument();
  });

  it('shows an explicit not-found state, not the empty-day message, when nothing matches', async () => {
    const onClearFilters = jest.fn();
    const user = userEvent.setup();
    renderBoard({ master: twoRayon, filters: { userId: 'ghost' }, onClearFilters });

    expect(screen.getByText(/tidak ada jadwal yang cocok/i)).toBeInTheDocument();
    expect(screen.queryByText(/belum ada jadwal untuk hari ini/i)).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /hapus filter/i }));
    expect(onClearFilters).toHaveBeenCalled();
  });

  it('shows the matched lokasi rather than "no schedule today" when it is simply empty', () => {
    // An empty geography match is an answer ("nobody is here"), so emptyDay
    // would be a lie — and this is exactly where an operator wants to assign.
    renderBoard({ master: twoRayon, filters: { locationId: 'loc1' } });

    expect(screen.queryByText(/belum ada jadwal untuk hari ini/i)).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Taman Bungkul/ })).toBeInTheDocument();
  });

  it('re-seeds the open containers when the criteria change', () => {
    const { rerender } = render(
      <DayBoard
        occurrences={[]}
        master={twoRayon}
        onOccurrenceClick={jest.fn()}
        filters={{ locationId: 'loc1' }}
      />
    );
    expect(screen.getByRole('button', { expanded: true, name: /Taman Bungkul/ })).toBeInTheDocument();

    rerender(
      <DayBoard
        occurrences={[]}
        master={twoRayon}
        onOccurrenceClick={jest.fn()}
        filters={{ locationId: 'loc2' }}
      />
    );

    expect(screen.queryByRole('button', { name: /Taman Bungkul/ })).not.toBeInTheDocument();
    expect(
      screen.getByRole('button', { expanded: true, name: /Taman Aktif Park/ })
    ).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// Surabaya (city-wide) node. It rendered only once city occurrences existed,
// which made a city-scope schedule impossible to create from the board: no node
// → no "+ Tugaskan" → no occurrence → no node.
// ---------------------------------------------------------------------------

describe('DayBoard — Surabaya node', () => {
  it('renders at the very top even on a day with no city-wide schedule', () => {
    renderBoard();

    const headers = screen.getAllByRole('button', { expanded: false });
    expect(headers[0]).toHaveAccessibleName(expect.stringContaining('Surabaya'));
  });

  it('shows the shift + role table directly, with no kawasan/lokasi furniture', async () => {
    const user = userEvent.setup();
    renderBoard({ canAssign: true, onAssign: jest.fn() });

    await expand(user, /Surabaya/);

    // Surabaya is city-wide by definition: "0 kawasan · 0 lokasi" would read as
    // a defect, and "Belum ada kawasan atau lokasi" is simply untrue.
    expect(screen.queryByText(/0 kawasan/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/belum ada kawasan atau lokasi/i)).not.toBeInTheDocument();
    // The table is the body — role columns are right there to assign into.
    expect(screen.getAllByText(/satgas/i).length).toBeGreaterThan(0);
  });
});
