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
    expect(screen.getByText(/S1·1\/3/)).toBeInTheDocument();
  });

  it('flags park (location-level) understaffing against the loc: target', async () => {
    const user = userEvent.setup();
    renderBoard({
      master: masterAt('location'),
      occurrences: [occ({ location_id: 'loc2' })], // loose location = Taman Aktif park
      capacities: new Map([['loc:loc2:s1', 2]]),
    });
    await expand(user, /Rayon Pusat/);

    expect(screen.getByText(/S1·1\/2/)).toBeInTheDocument();
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
    expect(screen.getByText('1/1')).toBeInTheDocument();
  });

  it('marks a city-wide node as city in the assign context', async () => {
    const user = userEvent.setup();
    const onAssign = jest.fn();
    renderBoard({
      occurrences: [occ({ scope: 'city', location_id: null })],
      canAssign: true,
      onAssign,
    });
    await expand(user, /Seluruh/);

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
