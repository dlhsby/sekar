/**
 * Unit tests: CalendarFilters + ScheduleFilterChips — the calendar's active
 * filter slice.
 *
 * The load-bearing logic is the Rayon → Kawasan → Lokasi cascade: picking a
 * broader level must CLEAR the narrower ones, or the query keeps a stale
 * location that contradicts the new rayon and the board comes back empty.
 */
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CalendarFilters } from '../CalendarFilters';
import { ScheduleFilterChips } from '../ScheduleFilterChips';
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

const USERS = [{ id: 'u1', full_name: 'Budi Santoso', username: 'budi', role: 'satgas' }];
const RAYONS = [
  { id: 'ry1', name: 'Rayon Pusat' },
  { id: 'ry2', name: 'Rayon Timur' },
];
const REGIONS = [{ id: 'kw1', name: 'Kawasan Tunjungan', rayon_id: 'ry1' }];
const LOCATIONS = [
  { id: 'loc1', name: 'Taman Bungkul', rayon_id: 'ry1', region_id: 'kw1' },
  { id: 'loc2', name: 'Taman Apsari', rayon_id: 'ry1', region_id: null },
];
const SHIFTS = [{ id: 's1', name: 'Shift 1' }];
const TEAMS = [{ id: 't1', name: 'Tim Patroli' }];

beforeEach(() => {
  (useUsers as jest.Mock).mockReturnValue({ data: { data: USERS } });
  (useRayons as jest.Mock).mockReturnValue({ data: RAYONS });
  (useRegions as jest.Mock).mockReturnValue({ data: REGIONS });
  (useLocations as jest.Mock).mockReturnValue({ data: { data: LOCATIONS } });
  (useShiftDefinitions as jest.Mock).mockReturnValue({ data: SHIFTS });
  (useTeamCategories as jest.Mock).mockReturnValue({ data: TEAMS });
});

/** Open a combobox by its label and choose an option. */
async function pickCombobox(user: ReturnType<typeof userEvent.setup>, label: RegExp, option: string) {
  await user.click(screen.getByRole('combobox', { name: label }));
  await user.click(await screen.findByRole('option', { name: option }));
}

describe('CalendarFilters', () => {
  const setup = (value = {}, lockRayon = false) => {
    const onChange = jest.fn();
    render(<CalendarFilters value={value} onChange={onChange} lockRayon={lockRayon} />);
    return { onChange };
  };

  it('narrows by rayon and clears the narrower levels with it', async () => {
    const user = userEvent.setup();
    const { onChange } = setup({ rayonId: 'ry1', regionId: 'kw1', locationId: 'loc1' });

    await pickCombobox(user, /rayon/i, 'Rayon Timur');

    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ rayonId: 'ry2', regionId: undefined, locationId: undefined })
    );
  });

  it('clears the location when the kawasan changes', async () => {
    const user = userEvent.setup();
    const { onChange } = setup({ rayonId: 'ry1', locationId: 'loc1' });

    await pickCombobox(user, /kawasan/i, 'Kawasan Tunjungan');

    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ regionId: 'kw1', locationId: undefined })
    );
  });

  it('offers only the locations inside the chosen kawasan', async () => {
    const user = userEvent.setup();
    setup({ rayonId: 'ry1', regionId: 'kw1' });

    await user.click(screen.getByRole('combobox', { name: /lokasi/i }));

    expect(await screen.findByRole('option', { name: 'Taman Bungkul' })).toBeInTheDocument();
    // Taman Apsari sits outside kw1.
    expect(screen.queryByRole('option', { name: 'Taman Apsari' })).not.toBeInTheDocument();
  });

  it('scopes the kawasan query to the chosen rayon', () => {
    setup({ rayonId: 'ry1' });
    expect(useRegions).toHaveBeenCalledWith('ry1');
  });

  it('hides the rayon filter for a rayon-scoped role', () => {
    setup({}, true);
    expect(screen.queryByRole('combobox', { name: /rayon/i })).not.toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: /kawasan/i })).toBeInTheDocument();
  });

  it('offers a reset only once something is filtered', async () => {
    const user = userEvent.setup();
    const { rerender } = render(<CalendarFilters value={{}} onChange={jest.fn()} />);
    expect(screen.queryByRole('button', { name: /hapus filter|reset|clear/i })).not.toBeInTheDocument();

    const onChange = jest.fn();
    rerender(<CalendarFilters value={{ userId: 'u1' }} onChange={onChange} />);
    await user.click(screen.getByRole('button', { name: /hapus filter|reset|clear/i }));

    expect(onChange).toHaveBeenCalledWith({});
  });
});

describe('ScheduleFilterChips', () => {
  const setup = (filters = {}, lockRayon = false) => {
    const onChange = jest.fn();
    render(<ScheduleFilterChips filters={filters} onChange={onChange} lockRayon={lockRayon} />);
    return { onChange };
  };

  it('renders nothing when no filter is active', () => {
    const { container } = render(<ScheduleFilterChips filters={{}} onChange={jest.fn()} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('names each active filter rather than showing its id', () => {
    setup({ userId: 'u1', locationId: 'loc1', shiftDefinitionId: 's1' });

    expect(screen.getByText(/Budi Santoso/)).toBeInTheDocument();
    expect(screen.getByText(/Taman Bungkul/)).toBeInTheDocument();
    expect(screen.getByText(/Shift 1/)).toBeInTheDocument();
    expect(screen.queryByText(/loc1/)).not.toBeInTheDocument();
  });

  it('removing a chip clears only its own filter', async () => {
    const user = userEvent.setup();
    const { onChange } = setup({ userId: 'u1', rayonId: 'ry1' });

    await user.click(screen.getByRole('button', { name: /Budi Santoso/ }));

    expect(onChange).toHaveBeenCalledWith({ userId: undefined, rayonId: 'ry1' });
  });

  it('clears everything at once', async () => {
    const user = userEvent.setup();
    const { onChange } = setup({ userId: 'u1', rayonId: 'ry1' });

    await user.click(screen.getByRole('button', { name: /hapus filter|reset|clear/i }));

    expect(onChange).toHaveBeenCalledWith({});
  });

  it('hides the rayon chip for a rayon-scoped role', () => {
    setup({ rayonId: 'ry1', userId: 'u1' }, true);

    expect(screen.queryByText(/Rayon Pusat/)).not.toBeInTheDocument();
    expect(screen.getByText(/Budi Santoso/)).toBeInTheDocument();
  });

  it('renders no chip for an id that resolves to nothing', () => {
    // A filter left over from a deleted record must not render a bare id.
    const { container } = render(
      <ScheduleFilterChips filters={{ userId: 'ghost' }} onChange={jest.fn()} />
    );
    expect(container).toBeEmptyDOMElement();
  });
});
