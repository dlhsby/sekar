/**
 * Unit tests: MonitoringFilters cascade gating — Kawasan + Lokasi stay disabled
 * until a rayon is chosen, and Kawasan stays disabled for a rayon with no
 * kawasan (e.g. Taman Aktif → lokasi sit directly under the rayon).
 */
import { render } from '@testing-library/react';
import {
  MonitoringFilters,
  type MonitoringFilterState,
  type MonitoringFiltersProps,
} from '../MonitoringFilters';

jest.mock('react-i18next', () => ({ useTranslation: () => ({ t: (k: string) => k }) }));
jest.mock('@/lib/constants/monitoring', () => ({
  getStatusLabels: () => ({ active: 'Aktif', offline: 'Offline', absent: 'Tidak Hadir' }),
}));
jest.mock('@/lib/constants/roles', () => ({ roleLabel: (r: string) => r }));

const baseFilters: MonitoringFilterState = {
  search: '',
  statuses: new Set(),
  rayonId: 'all',
  regionId: 'all',
  locationId: 'all',
  role: 'all',
  teamId: 'all',
};

const renderFilters = (over: Partial<MonitoringFiltersProps>) => {
  const props: MonitoringFiltersProps = {
    filters: baseFilters,
    onChange: jest.fn(),
    statusCounts: { active: 0, offline: 0, absent: 0 },
    rayonOptions: [{ id: 'r1', name: 'Rayon 1' }],
    regionOptions: [],
    locationOptions: [],
    roleOptions: [],
    teamOptions: [],
    total: 0,
    matched: 0,
    showSearch: false,
    ...over,
  };
  return render(<MonitoringFilters {...props} />);
};

const region = (c: HTMLElement) => c.querySelector<HTMLSelectElement>('#mon-region')!;
const location = (c: HTMLElement) => c.querySelector<HTMLSelectElement>('#mon-location')!;

describe('MonitoringFilters cascade', () => {
  it('disables Kawasan + Lokasi until a rayon is picked', () => {
    const { container } = renderFilters({}); // rayonId = 'all'
    expect(region(container).disabled).toBe(true);
    expect(location(container).disabled).toBe(true);
    // Placeholder hints the user to pick a rayon first.
    expect(region(container).querySelector('option')?.textContent).toBe(
      'monitoring:filters.pickRayonFirst'
    );
  });

  it('enables both once a rayon with kawasan is selected', () => {
    const { container } = renderFilters({
      filters: { ...baseFilters, rayonId: 'r1' },
      regionOptions: [{ id: 'k1', name: 'Kawasan 1' }],
      locationOptions: [{ id: 'l1', name: 'Lokasi 1' }],
    });
    expect(region(container).disabled).toBe(false);
    expect(location(container).disabled).toBe(false);
  });

  it('keeps Kawasan disabled for a rayon with no kawasan (Taman Aktif) but enables Lokasi', () => {
    const { container } = renderFilters({
      filters: { ...baseFilters, rayonId: 'r1' },
      regionOptions: [], // no kawasan in this rayon
      locationOptions: [{ id: 'l1', name: 'Lokasi Langsung' }],
    });
    expect(region(container).disabled).toBe(true);
    expect(region(container).querySelector('option')?.textContent).toBe(
      'monitoring:filters.noKawasan'
    );
    expect(location(container).disabled).toBe(false);
  });
});
