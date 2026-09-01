import { render, screen, fireEvent } from '@testing-library/react';
import { MonitoringSidebar } from '../MonitoringSidebar';
import type { SnapshotWorker } from '@/lib/api/monitoring-v2';

const worker = (over: Partial<SnapshotWorker> = {}): SnapshotWorker =>
  ({
    user_id: 'u-1',
    full_name: 'Budi Santoso',
    role: 'satgas',
    lat: -7.25,
    lng: 112.75,
    status: 'active',
    location_id: 'loc-1',
    location_name: 'Taman Bungkul',
    district_id: 'd-1',
    district_name: 'Rayon Pusat',
    last_update: new Date().toISOString(),
    is_within_area: true,
    battery_level: 80,
    ...over,
  }) as SnapshotWorker;

const base = {
  nodes: [],
  onDrillNode: jest.fn(),
  selectedId: null,
  selectedWorker: null,
  onSelect: jest.fn(),
};

describe('MonitoringSidebar — hiding a petugas', () => {
  it('drops a hidden worker from the list', () => {
    render(
      <MonitoringSidebar
        {...base}
        workers={[worker({ user_id: 'a', full_name: 'Budi' }), worker({ user_id: 'b', full_name: 'Siti' })]}
        isHidden={(kind, id) => kind === 'workers' && id === 'a'}
        onToggleHidden={jest.fn()}
        onShowAllHidden={jest.fn()}
      />
    );
    expect(screen.queryByText('Budi')).toBeNull();
    expect(screen.getByText('Siti')).toBeInTheDocument();
  });

  it('announces the hidden count with a way back', () => {
    const onShowAll = jest.fn();
    render(
      <MonitoringSidebar
        {...base}
        workers={[worker({ user_id: 'a' }), worker({ user_id: 'b' })]}
        isHidden={(kind, id) => kind === 'workers' && id === 'a'}
        onToggleHidden={jest.fn()}
        onShowAllHidden={onShowAll}
      />
    );
    expect(screen.getByText(/1 disembunyikan/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /tampilkan semua/i }));
    expect(onShowAll).toHaveBeenCalledWith('workers');
  });

  it('reports which worker was hidden, by kind', () => {
    const onToggle = jest.fn();
    render(
      <MonitoringSidebar
        {...base}
        workers={[worker({ user_id: 'a', full_name: 'Budi' })]}
        onToggleHidden={onToggle}
      />
    );
    fireEvent.click(screen.getByRole('button', { name: /sembunyikan budi/i }));
    expect(onToggle).toHaveBeenCalledWith('workers', 'a');
  });

  it('selecting a worker still works beside the hide control', () => {
    // The row had to split into two targets — a button nested in a button is
    // invalid HTML — so the primary action needs its own coverage.
    const onSelect = jest.fn();
    render(
      <MonitoringSidebar
        {...base}
        onSelect={onSelect}
        workers={[worker({ user_id: 'a', full_name: 'Budi' })]}
        onToggleHidden={jest.fn()}
      />
    );
    fireEvent.click(screen.getByText('Budi'));
    expect(onSelect).toHaveBeenCalledWith('a');
  });

  it('renders no hide control when the caller does not opt in', () => {
    render(<MonitoringSidebar {...base} workers={[worker()]} />);
    expect(screen.queryByRole('button', { name: /sembunyikan/i })).toBeNull();
  });
});
