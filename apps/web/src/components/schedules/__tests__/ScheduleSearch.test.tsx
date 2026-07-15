/**
 * Unit tests: ScheduleSearch — the collapsed-icon search that expands over the
 * toolbar, with grouped autocomplete. The "Lanjutan" panel is gone; shift and
 * team category are autocomplete groups now, so every criterion is reachable
 * from the one box.
 *
 * Two behaviours carry the feature: a hit sets the FILTER for its own kind
 * (without disturbing the others), while a date hit NAVIGATES instead of
 * filtering — they are different outcomes from the same suggestion list.
 */
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ScheduleSearch } from '../ScheduleSearch';
import { useUsers } from '@/lib/api/users';
import { useRayons } from '@/lib/api/rayons';
import { useRegions } from '@/lib/api/regions';
import { useLocations } from '@/lib/api/locations';
import { useShiftDefinitions } from '@/lib/api/shift-definitions';
import { useTeamCategories } from '@/lib/api/teams';

jest.mock('@/lib/api/users', () => ({ useUsers: jest.fn() }));
jest.mock('@/lib/api/rayons', () => ({ useRayons: jest.fn() }));
jest.mock('@/lib/api/regions', () => ({ useRegions: jest.fn() }));
jest.mock('@/lib/api/locations', () => ({ useLocations: jest.fn() }));
jest.mock('@/lib/api/shift-definitions', () => ({ useShiftDefinitions: jest.fn() }));
jest.mock('@/lib/api/teams', () => ({ useTeamCategories: jest.fn() }));

const USERS = [
  { id: 'u1', full_name: 'Budi Santoso', username: 'budi', role: 'satgas' },
  { id: 'u2', full_name: 'Sari Dewi', username: 'sari', role: 'linmas' },
];
const RAYONS = [{ id: 'ry1', name: 'Rayon Pusat' }];
const REGIONS = [{ id: 'kw1', name: 'Kawasan Tunjungan' }];
const LOCATIONS = [{ id: 'loc1', name: 'Taman Bungkul' }];
const SHIFTS = [{ id: 's1', name: 'Shift 1' }];
const TEAMS = [{ id: 't1', name: 'Tim Bungkul' }];

beforeEach(() => {
  (useUsers as jest.Mock).mockReturnValue({ data: { data: USERS } });
  (useRayons as jest.Mock).mockReturnValue({ data: RAYONS });
  (useRegions as jest.Mock).mockReturnValue({ data: REGIONS });
  (useLocations as jest.Mock).mockReturnValue({ data: { data: LOCATIONS } });
  (useShiftDefinitions as jest.Mock).mockReturnValue({ data: SHIFTS });
  (useTeamCategories as jest.Mock).mockReturnValue({ data: TEAMS });
});

function setup(filters = {}, lockRayon = false) {
  const onChange = jest.fn();
  const onNavigateDate = jest.fn();
  render(
    <ScheduleSearch
      filters={filters}
      onChange={onChange}
      onNavigateDate={onNavigateDate}
      lockRayon={lockRayon}
    />
  );
  return { onChange, onNavigateDate, user: userEvent.setup() };
}

const searchBox = () => screen.getByRole('textbox');

/** Expand the bar and type a query. */
async function search(user: ReturnType<typeof userEvent.setup>, query: string) {
  await user.click(screen.getByRole('button', { name: /cari|search/i }));
  await user.type(searchBox(), query);
}

describe('ScheduleSearch', () => {
  it('starts collapsed and expands into a focused input', async () => {
    const { user } = setup();
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /cari|search/i }));

    expect(searchBox()).toHaveFocus();
  });

  it('suggests nothing until something is typed', async () => {
    const { user } = setup();
    await user.click(screen.getByRole('button', { name: /cari|search/i }));

    expect(screen.queryByText('Budi Santoso')).not.toBeInTheDocument();
  });

  it('matches a person by name or username, and shows their role', async () => {
    const { user } = setup();
    await search(user, 'budi');

    expect(screen.getByText('Budi Santoso')).toBeInTheDocument();
    expect(screen.getByText('satgas')).toBeInTheDocument();
    expect(screen.queryByText('Sari Dewi')).not.toBeInTheDocument();
  });

  it('picking a person filters by them and keeps the other filters', async () => {
    const { user, onChange } = setup({ shiftDefinitionId: 's1' });
    await search(user, 'budi');

    await user.click(screen.getByText('Budi Santoso'));

    expect(onChange).toHaveBeenCalledWith({ shiftDefinitionId: 's1', userId: 'u1' });
  });

  it('picking a place filters by the level it came from', async () => {
    const { user, onChange } = setup();
    await search(user, 'bungkul');

    await user.click(screen.getByText('Taman Bungkul'));

    expect(onChange).toHaveBeenCalledWith({ locationId: 'loc1' });
  });

  it('collapses once a hit is chosen', async () => {
    const { user } = setup();
    await search(user, 'budi');

    await user.click(screen.getByText('Budi Santoso'));

    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
  });

  it('a date query navigates the board instead of filtering it', async () => {
    const { user, onChange, onNavigateDate } = setup();
    await search(user, '2026-07-15');

    await user.click(screen.getByText(/15 Juli 2026|15 July 2026/));

    expect(onNavigateDate).toHaveBeenCalledWith('2026-07-15');
    expect(onChange).not.toHaveBeenCalled();
  });

  it('searches across every level at once', async () => {
    const { user } = setup();
    // "Pusat"/"Tunjungan" are distinct levels; a shared substring surfaces both.
    await search(user, 'an');

    expect(screen.getByText('Budi Santoso')).toBeInTheDocument(); // "Santoso"
    expect(screen.getByText('Kawasan Tunjungan')).toBeInTheDocument();
  });

  it('says so when nothing matches', async () => {
    const { user } = setup();
    await search(user, 'zzzz');

    expect(screen.getByText(/zzzz/)).toBeInTheDocument();
    expect(screen.queryByText('Budi Santoso')).not.toBeInTheDocument();
  });

  it('escape closes the bar', async () => {
    const { user } = setup();
    await search(user, 'budi');

    await user.keyboard('{Escape}');

    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
  });

  it('clears the query first, and only closes on a second clear', async () => {
    const { user } = setup();
    await search(user, 'budi');

    await user.click(screen.getByRole('button', { name: /bersihkan|clear/i }));
    expect(searchBox()).toHaveValue('');

    await user.click(screen.getByRole('button', { name: /bersihkan|clear/i }));
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
  });

  // Shift + team used to live only behind the "Lanjutan" chevron, so deleting
  // that panel would have dropped two filters had they not become groups here.
  describe('criteria reachable from the one box', () => {
    it('filters by shift from a shift hit', async () => {
      const { user, onChange } = setup();
      await search(user, 'Shift 1');

      await user.click(await screen.findByRole('button', { name: /Shift 1/ }));

      expect(onChange).toHaveBeenCalledWith({ shiftDefinitionId: 's1' });
    });

    it('filters by team category from a team hit', async () => {
      const { user, onChange } = setup();
      await search(user, 'Tim Bungkul');

      await user.click(await screen.findByRole('button', { name: /Tim Bungkul/ }));

      expect(onChange).toHaveBeenCalledWith({ teamCategoryId: 't1' });
    });

    it('groups one query hitting several kinds under their own headings', async () => {
      const { user } = setup();
      // "bungkul" hits a lokasi AND a team — the grouping is what disambiguates.
      await search(user, 'Bungkul');

      expect(await screen.findByText('Taman Bungkul')).toBeInTheDocument();
      expect(screen.getByText('Tim Bungkul')).toBeInTheDocument();
    });

    it('never offers a rayon hit to a rayon-scoped role', async () => {
      // The rayon is pinned server-side; offering it here let a scoped user
      // filter to a rayon that is not theirs (the old panel hid its select but
      // the autocomplete still listed them).
      const { user } = setup({}, true);
      await search(user, 'Rayon Pusat');

      expect(screen.queryByText('Rayon Pusat')).not.toBeInTheDocument();
    });
  });
});
