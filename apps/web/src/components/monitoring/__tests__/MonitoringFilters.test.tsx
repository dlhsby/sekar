/**
 * Unit tests: MonitoringFilters cascade gating — Kawasan + Lokasi comboboxes stay
 * disabled until a district is chosen, Kawasan stays disabled for a district with no
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
  districtId: 'all',
  regionId: 'all',
  locationId: 'all',
  jenis: 'individu',
  role: 'all',
  teamId: 'all',
};

const renderFilters = (over: Partial<MonitoringFiltersProps>) => {
  const props: MonitoringFiltersProps = {
    filters: baseFilters,
    onChange: jest.fn(),
    districtOptions: [{ id: 'r1', name: 'Rayon 1' }],
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

// The combobox trigger is a <button> carrying the field id; its text is the
// placeholder while nothing is selected.
const trigger = (c: HTMLElement, id: string) => c.querySelector<HTMLButtonElement>(`#${id}`)!;

describe('MonitoringFilters cascade', () => {
  it('disables Kawasan + Lokasi until a district is picked', () => {
    const { container } = renderFilters({}); // districtId = 'all'
    expect(trigger(container, 'mon-region').disabled).toBe(true);
    expect(trigger(container, 'mon-location').disabled).toBe(true);
    expect(trigger(container, 'mon-region').textContent).toContain(
      'monitoring:filters.pickDistrictFirst'
    );
  });

  it('enables both once a district with kawasan is selected', () => {
    const { container } = renderFilters({
      filters: { ...baseFilters, districtId: 'r1' },
      regionOptions: [{ id: 'k1', name: 'Kawasan 1' }],
      locationOptions: [{ id: 'l1', name: 'Lokasi 1' }],
    });
    expect(trigger(container, 'mon-region').disabled).toBe(false);
    expect(trigger(container, 'mon-location').disabled).toBe(false);
  });

  it('keeps Kawasan disabled for a district with no kawasan (Taman Aktif) but enables Lokasi', () => {
    const { container } = renderFilters({
      filters: { ...baseFilters, districtId: 'r1' },
      regionOptions: [], // no kawasan in this district
      locationOptions: [{ id: 'l1', name: 'Lokasi Langsung' }],
    });
    expect(trigger(container, 'mon-region').disabled).toBe(true);
    expect(trigger(container, 'mon-region').textContent).toContain('monitoring:filters.noKawasan');
    expect(trigger(container, 'mon-location').disabled).toBe(false);
  });

  it('shows a loading placeholder (not "no kawasan") while the hierarchy resolves', () => {
    const { container } = renderFilters({
      filters: { ...baseFilters, districtId: 'r1' },
      regionOptions: [], // empty because still fetching, not because there are none
      regionLoading: true,
    });
    expect(trigger(container, 'mon-region').disabled).toBe(true);
    expect(trigger(container, 'mon-region').textContent).toContain('common:actions.loading');
  });

  it('shows Peran for jenis=individu and Jenis Tim for jenis=team (never both)', () => {
    const { container, rerender } = renderFilters({
      filters: { ...baseFilters, jenis: 'individu' },
      roleOptions: ['satgas' as never],
      teamOptions: [{ id: 't1', name: 'Penyiraman' }],
    });
    // Individu → role control present, team control absent.
    expect(container.querySelector('#mon-role')).not.toBeNull();
    expect(container.querySelector('#mon-team')).toBeNull();
    // No Petugas picker exists any more.
    expect(container.querySelector('#mon-worker')).toBeNull();

    rerender(
      <MonitoringFilters
        filters={{ ...baseFilters, jenis: 'team' }}
        onChange={jest.fn()}
        districtOptions={[{ id: 'r1', name: 'Rayon 1' }]}
        regionOptions={[]}
        locationOptions={[]}
        roleOptions={['satgas' as never]}
        teamOptions={[{ id: 't1', name: 'Penyiraman' }]}
        total={0}
        matched={0}
        showSearch={false}
      />
    );
    // Team → team control present, role control absent.
    expect(container.querySelector('#mon-team')).not.toBeNull();
    expect(container.querySelector('#mon-role')).toBeNull();
  });
});
