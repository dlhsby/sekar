import { render, screen, fireEvent } from '@testing-library/react';
import { MonitoringSearch } from '../MonitoringSearch';
import type { SnapshotWorker } from '@/lib/api/monitoring-v2';
import type { DistrictBoundary } from '@/lib/api/monitoring-types';

// 5.7b: the component queries the server for petugas via useQuery; stub it empty
// so these tests exercise the client-side (props-driven) search without needing a
// QueryClientProvider. Keep the rest of the module real (types, other hooks).
jest.mock('@/lib/api/monitoring-v2', () => ({
  ...jest.requireActual('@/lib/api/monitoring-v2'),
  useMonitoringSearchQuery: () => ({ data: { users: [] } }),
}));

const workers: SnapshotWorker[] = [
  {
    user_id: 'w1',
    full_name: 'Budi Santoso',
    role: 'satgas',
    lat: -7.25,
    lng: 112.75,
    status: 'active',
    location_id: 'a1',
    location_name: 'Taman Bungkul',
    district_id: 'r1',
    district_name: 'Rayon Pusat',
    last_update: '',
    is_within_area: true,
    battery_level: 80,
  },
];

const districts: DistrictBoundary[] = [
  {
    id: 'r1',
    name: 'Rayon Pusat',
    border_color: 'var(--color-nb-primary)',
    boundary_polygon: null,
    center_lat: -7.29,
    center_lng: 112.74,
    area_count: 2,
    is_understaffed: false,
    understaffed_area_count: 0,
    regions: [],
    areas: [
      {
        id: 'a1',
        name: 'Taman Bungkul',
        boundary_polygon: null,
        center_lat: -7.29,
        center_lng: 112.74,
        district_id: 'r1',
        district_name: 'Rayon Pusat',
        assigned_count: 3,
        is_understaffed: false,
        staffing_summary: [],
      },
    ],
  },
];

describe('MonitoringSearch', () => {
  beforeEach(() => window.localStorage.clear());

  it('shows grouped results and reports the picked result', () => {
    const onSelect = jest.fn();
    render(<MonitoringSearch workers={workers} districts={districts} onSelect={onSelect} />);

    const input = screen.getByRole('searchbox');
    fireEvent.change(input, { target: { value: 'budi' } });

    const row = screen.getByText('Budi Santoso');
    fireEvent.click(row);

    expect(onSelect).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'w1', type: 'petugas', latitude: -7.25 })
    );
  });

  it('stores a picked result as a recent search', () => {
    render(<MonitoringSearch workers={workers} districts={districts} onSelect={jest.fn()} />);
    const input = screen.getByRole('searchbox');

    fireEvent.change(input, { target: { value: 'taman' } });
    fireEvent.click(screen.getByText('Taman Bungkul'));

    const stored = JSON.parse(window.localStorage.getItem('monitoring.recentSearches.v1')!);
    expect(stored[0]).toEqual(expect.objectContaining({ id: 'a1', type: 'area' }));
  });

  it('shows an empty-results message for no match', () => {
    render(<MonitoringSearch workers={workers} districts={districts} onSelect={jest.fn()} />);
    fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'zzzzz' } });
    expect(screen.getByText(/tidak ada hasil/i)).toBeInTheDocument();
  });
});
