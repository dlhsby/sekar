/**
 * Unit Tests: Monitoring Page (Phase 4-R)
 * Three-pane layout: filter rail · map · worker/area sidebar.
 * Auth/role gating + client-side filtering + selection.
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
jest.mock('@/lib/api/monitoring-v2', () => ({
  useMonitoringSnapshot: () => mockSnapshot(),
}));

// The real map needs Mapbox/WebGL — assert we hand it the worker list instead.
jest.mock('@/components/monitoring/SimpleMonitoringMap', () => ({
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
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={qc}>{children}</QueryClientProvider>
  );
};

describe('MonitoringPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseAuth.mockReturnValue({ user: adminUser, loading: false });
    mockSnapshot.mockReturnValue(snapshotData);
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

  it('renders the header, status summary, filters and map for an admin', () => {
    render(<MonitoringPage />, { wrapper: createWrapper() });
    expect(screen.getByRole('heading', { name: /monitoring real-time/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /segarkan/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/cari petugas/i)).toBeInTheDocument();
  });

  it('passes all snapshot workers to the map by default', () => {
    render(<MonitoringPage />, { wrapper: createWrapper() });
    expect(screen.getByTestId('map')).toHaveAttribute('data-count', '2');
  });

  it('filters workers by search and narrows the map', () => {
    render(<MonitoringPage />, { wrapper: createWrapper() });
    fireEvent.change(screen.getByLabelText(/cari petugas/i), { target: { value: 'Andi' } });
    expect(screen.getByTestId('map')).toHaveAttribute('data-count', '1');
  });

  it('shows worker detail when a worker row is selected', () => {
    render(<MonitoringPage />, { wrapper: createWrapper() });
    fireEvent.click(screen.getByRole('button', { name: /andi/i }));
    expect(screen.getByRole('button', { name: /kembali ke daftar/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Andi' })).toBeInTheDocument();
  });

  it('lists area staffing on the Area tab', () => {
    render(<MonitoringPage />, { wrapper: createWrapper() });
    fireEvent.click(screen.getByRole('tab', { name: /area/i }));
    const region = screen.getByText('Taman A');
    expect(region).toBeInTheDocument();
    expect(within(region.closest('li') as HTMLElement).getByText(/kurang/i)).toBeInTheDocument();
  });
});
