/**
 * Unit Tests: Monitoring Page (Phase 4-R)
 * Full-bleed map with floating overlays: top search, dismissible filter panel,
 * dismissible worker/area sheet. Auth/role gating + client-side filtering.
 */
import { render, screen, fireEvent, within } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import MonitoringPage from '../page';
import '@testing-library/jest-dom';

const mockPush = jest.fn();
jest.mock('next/navigation', () => ({ useRouter: () => ({ push: mockPush }) }));

const mockUseAuth = jest.fn();
jest.mock('@/lib/auth/hooks', () => ({ useAuth: () => mockUseAuth() }));

const mockSnapshot = jest.fn();
const mockAggregate = jest.fn(() => ({
  data: undefined,
  isLoading: false,
  isFetching: false,
  refetch: jest.fn(),
}));
jest.mock('@/lib/api/monitoring-v2', () => ({
  useMonitoringSnapshot: () => mockSnapshot(),
  useMonitoringAggregate: () => mockAggregate(),
}));

const mockBoundaries = jest.fn();
jest.mock('@/lib/api/monitoring', () => ({
  useBoundaries: () => mockBoundaries(),
}));

// The real map needs Google Maps/WebGL — assert we hand it the worker list
// instead. (The page imports through the lazy next/dynamic wrapper — mock it.)
jest.mock('@/components/monitoring/SimpleMonitoringMapLazy', () => ({
  SimpleMonitoringMap: ({ workers }: { workers: { user_id: string }[] }) => (
    <div data-testid="map" data-count={workers.length} />
  ),
}));

const adminUser = { id: 'u1', full_name: 'Admin', role: 'admin_system' };

const worker = (over: Record<string, unknown>) => ({
  user_id: 'w1',
  full_name: 'Andi',
  role: 'satgas',
  lat: -7.25,
  lng: 112.75,
  status: 'active',
  area_id: 'a1',
  area_name: 'Taman A',
  rayon_id: 'r1',
  rayon_name: 'Rayon Pusat',
  last_update: new Date().toISOString(),
  is_within_area: true,
  battery_level: 80,
  ...over,
});

const snapshotData = {
  data: {
    data: {
      workers: [
        worker({ user_id: 'w1', full_name: 'Andi', status: 'active' }),
        worker({ user_id: 'w2', full_name: 'Budi', status: 'missing', rayon_id: 'r2', rayon_name: 'Rayon Timur' }),
      ],
      area_summaries: [
        { area_id: 'a1', area_name: 'Taman A', rayon_id: 'r1', rayon_name: 'Rayon Pusat', active_count: 1, required_count: 3, is_understaffed: true },
      ],
      total_active: 1,
      total_inactive: 0,
      total_outside_area: 0,
      total_missing: 1,
      total_offline: 0,
      generated_at: new Date().toISOString(),
    },
  },
  isLoading: false,
  refetch: jest.fn(),
};

const createWrapper = () => {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const Wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={qc}>{children}</QueryClientProvider>
  );
  Wrapper.displayName = 'TestWrapper';
  return Wrapper;
};

describe('MonitoringPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseAuth.mockReturnValue({ user: adminUser, loading: false });
    mockSnapshot.mockReturnValue(snapshotData);
    mockBoundaries.mockReturnValue({ data: undefined });
  });

  it('shows a loading state until auth resolves', () => {
    mockUseAuth.mockReturnValue({ user: null, loading: true });
    render(<MonitoringPage />, { wrapper: createWrapper() });
    expect(screen.getByText(/memuat/i)).toBeInTheDocument();
  });

  it('redirects a role without monitoring access', () => {
    mockUseAuth.mockReturnValue({ user: { ...adminUser, role: 'satgas' }, loading: false });
    render(<MonitoringPage />, { wrapper: createWrapper() });
    expect(mockPush).toHaveBeenCalledWith('/');
  });

  it('renders the floating search, refresh and status pills for an admin', () => {
    render(<MonitoringPage />, { wrapper: createWrapper() });
    expect(screen.getByLabelText(/cari petugas/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /segarkan/i })).toBeInTheDocument();
    expect(screen.getByText('Aktif')).toBeInTheDocument();
    expect(screen.getByText('Tidak hadir')).toBeInTheDocument();
  });

  it('passes all snapshot workers to the map by default', () => {
    render(<MonitoringPage />, { wrapper: createWrapper() });
    expect(screen.getByTestId('map')).toHaveAttribute('data-count', '2');
  });

  it('selecting a search result opens the worker sheet and shows detail', () => {
    render(<MonitoringPage />, { wrapper: createWrapper() });
    fireEvent.change(screen.getByLabelText(/cari petugas/i), { target: { value: 'Andi' } });
    fireEvent.click(screen.getByRole('button', { name: /^andi/i }));
    expect(screen.getByRole('button', { name: /kembali ke daftar/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Andi' })).toBeInTheDocument();
  });

  // A korlap floors at area scope, so the unified drill-down lands directly on
  // the worker view (no mode toggle) — the individual worker list renders.
  const korlapUser = { id: 'k1', full_name: 'Korlap', role: 'korlap', area_id: 'a1', rayon_id: 'r1' };

  it('opens the worker sheet and shows detail when a worker is selected', () => {
    mockUseAuth.mockReturnValue({ user: korlapUser, loading: false });
    render(<MonitoringPage />, { wrapper: createWrapper() });
    fireEvent.click(screen.getByRole('button', { name: /daftar petugas/i }));
    fireEvent.click(screen.getByRole('button', { name: /andi/i }));
    expect(screen.getByRole('button', { name: /kembali ke daftar/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Andi' })).toBeInTheDocument();
  });

  it('lists area staffing on the Area tab', () => {
    mockUseAuth.mockReturnValue({ user: korlapUser, loading: false });
    render(<MonitoringPage />, { wrapper: createWrapper() });
    fireEvent.click(screen.getByRole('button', { name: /daftar petugas/i }));
    fireEvent.click(screen.getByRole('tab', { name: /area/i }));
    const region = screen.getByText('Taman A');
    expect(within(region.closest('li') as HTMLElement).getByText(/kurang/i)).toBeInTheDocument();
  });

  it('opens the filter panel from the top bar', () => {
    render(<MonitoringPage />, { wrapper: createWrapper() });
    fireEvent.click(screen.getByRole('button', { name: /^filter$/i }));
    expect(screen.getByRole('heading', { name: /filter petugas/i })).toBeInTheDocument();
  });
});
