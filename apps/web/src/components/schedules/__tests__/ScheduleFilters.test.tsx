/**
 * Unit tests: ScheduleFilterChips — the calendar's active filter slice.
 *
 * The chips ARE the multi-criteria UI: each hit picked in ScheduleSearch adds
 * one, they AND together, and each removes in isolation. (CalendarFilters and
 * its Rayon▸Kawasan▸Lokasi cascade were deleted with the "Lanjutan" panel — the
 * cascade only existed to keep that panel's own selects consistent.)
 */
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
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
