/**
 * Unit tests: MonitoringFilters cascade gating — Kawasan + Lokasi comboboxes stay
 * disabled until a rayon is chosen, Kawasan stays disabled for a rayon with no
 * kawasan (e.g. Taman Aktif), and an in-flight fetch reads "loading" not "no
 * kawasan". The controls are type-to-search comboboxes (trigger = a button that
 * shows the placeholder until something is picked).
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
  userId: 'all',
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
    workerOptions: [],
    total: 0,
    matched: 0,
    showSearch: false,
    ...over,
  };
  return render(<MonitoringFilters {...props} />);
};

// The combobox trigger is a <button> carrying the field id; its text is the
// placeholder while nothing is selected.
const trigger = (c: HTMLElement, id: string) => c.querySelector<HTMLButtonElement>(`#${id}`)!;

describe('MonitoringFilters cascade', () => {
  it('disables Kawasan + Lokasi until a rayon is picked', () => {
    const { container } = renderFilters({}); // rayonId = 'all'
    expect(trigger(container, 'mon-region').disabled).toBe(true);
    expect(trigger(container, 'mon-location').disabled).toBe(true);
    expect(trigger(container, 'mon-region').textContent).toContain(
      'monitoring:filters.pickRayonFirst'
    );
  });

  it('enables both once a rayon with kawasan is selected', () => {
    const { container } = renderFilters({
      filters: { ...baseFilters, rayonId: 'r1' },
      regionOptions: [{ id: 'k1', name: 'Kawasan 1' }],
      locationOptions: [{ id: 'l1', name: 'Lokasi 1' }],
    });
    expect(trigger(container, 'mon-region').disabled).toBe(false);
    expect(trigger(container, 'mon-location').disabled).toBe(false);
  });

  it('keeps Kawasan disabled for a rayon with no kawasan (Taman Aktif) but enables Lokasi', () => {
    const { container } = renderFilters({
      filters: { ...baseFilters, rayonId: 'r1' },
      regionOptions: [], // no kawasan in this rayon
      locationOptions: [{ id: 'l1', name: 'Lokasi Langsung' }],
    });
    expect(trigger(container, 'mon-region').disabled).toBe(true);
    expect(trigger(container, 'mon-region').textContent).toContain('monitoring:filters.noKawasan');
    expect(trigger(container, 'mon-location').disabled).toBe(false);
  });

  it('shows a loading placeholder (not "no kawasan") while the hierarchy resolves', () => {
    const { container } = renderFilters({
      filters: { ...baseFilters, rayonId: 'r1' },
      regionOptions: [], // empty because still fetching, not because there are none
      regionLoading: true,
    });
    expect(trigger(container, 'mon-region').disabled).toBe(true);
    expect(trigger(container, 'mon-region').textContent).toContain('common:actions.loading');
  });

  it('renders the Petugas picker only when workers cascade in', () => {
    const { container, rerender } = renderFilters({ workerOptions: [] });
    expect(container.querySelector('#mon-worker')).toBeNull();
    rerender(
      <MonitoringFilters
        filters={baseFilters}
        onChange={jest.fn()}
        statusCounts={{ active: 0, offline: 0, absent: 0 }}
        rayonOptions={[{ id: 'r1', name: 'Rayon 1' }]}
        regionOptions={[]}
        locationOptions={[]}
        roleOptions={[]}
        teamOptions={[]}
        workerOptions={[{ id: 'u1', name: 'Budi' }]}
        total={0}
        matched={0}
        showSearch={false}
      />
    );
    expect(container.querySelector('#mon-worker')).not.toBeNull();
  });
});
