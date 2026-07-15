/**
 * Unit tests: ScheduleSearch — the collapsed-icon search that expands over the
 * toolbar, with grouped autocomplete plus an Advanced panel.
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

jest.mock('@/lib/api/users', () => ({ useUsers: jest.fn() }));
jest.mock('@/lib/api/rayons', () => ({ useRayons: jest.fn() }));
jest.mock('@/lib/api/regions', () => ({ useRegions: jest.fn() }));
jest.mock('@/lib/api/locations', () => ({ useLocations: jest.fn() }));

// The Advanced panel embeds CalendarFilters (covered by its own suite) and a
// DatePicker; stub both so this suite stays on the search behaviour.
jest.mock('@/components/schedules/CalendarFilters', () => ({
  CalendarFilters: () => <div data-testid="calendar-filters" />,
}));
jest.mock('@/components/ui/date-picker', () => ({
  DatePicker: ({ value, onValueChange }: { value?: string; onValueChange: (v: string) => void }) => (
    <input
      data-testid="date-picker"
      value={value ?? ''}
      onChange={(e) => onValueChange(e.target.value)}
    />
  ),
}));

const USERS = [
  { id: 'u1', full_name: 'Budi Santoso', username: 'budi', role: 'satgas' },
  { id: 'u2', full_name: 'Sari Dewi', username: 'sari', role: 'linmas' },
];
const RAYONS = [{ id: 'ry1', name: 'Rayon Pusat' }];
const REGIONS = [{ id: 'kw1', name: 'Kawasan Tunjungan' }];
const LOCATIONS = [{ id: 'loc1', name: 'Taman Bungkul' }];

beforeEach(() => {
  (useUsers as jest.Mock).mockReturnValue({ data: { data: USERS } });
  (useRayons as jest.Mock).mockReturnValue({ data: RAYONS });
  (useRegions as jest.Mock).mockReturnValue({ data: REGIONS });
  (useLocations as jest.Mock).mockReturnValue({ data: { data: LOCATIONS } });
});

function setup(filters = {}) {
  const onChange = jest.fn();
  const onNavigateDate = jest.fn();
  render(
    <ScheduleSearch filters={filters} onChange={onChange} onNavigateDate={onNavigateDate} />
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

  describe('advanced panel', () => {
    it('opens the full filter set', async () => {
      const { user } = setup();
      await user.click(screen.getByRole('button', { name: /cari|search/i }));

      expect(screen.queryByTestId('calendar-filters')).not.toBeInTheDocument();
      await user.click(screen.getByRole('button', { name: /lanjutan|advanced/i }));

      expect(screen.getByTestId('calendar-filters')).toBeInTheDocument();
    });

    it('only allows applying a range once a start date is set', async () => {
      const { user, onNavigateDate } = setup();
      await user.click(screen.getByRole('button', { name: /cari|search/i }));
      await user.click(screen.getByRole('button', { name: /lanjutan|advanced/i }));

      const apply = screen.getByRole('button', { name: /terapkan|apply/i });
      expect(apply).toBeDisabled();

      await user.type(screen.getAllByTestId('date-picker')[0], '2026-07-20');
      await user.click(screen.getByRole('button', { name: /terapkan|apply/i }));

      expect(onNavigateDate).toHaveBeenCalledWith('2026-07-20');
    });
  });
});
