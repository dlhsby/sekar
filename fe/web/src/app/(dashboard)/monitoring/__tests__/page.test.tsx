/**
 * Unit Tests: Monitoring Page (Phase 4-R minimal baseline)
 * Header + status summary + full-width map. Auth/role gating.
 */
import { render, screen } from '@testing-library/react';
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

const snapshotData = {
  data: {
    data: {
      workers: [
        { user_id: 'w1', full_name: 'A', lat: -7.25, lng: 112.75, status: 'active' },
        { user_id: 'w2', full_name: 'B', lat: -7.26, lng: 112.76, status: 'missing' },
      ],
      area_summaries: [],
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

describe('MonitoringPage (minimal)', () => {
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

  it('renders the header, status summary and map for an admin', () => {
    render(<MonitoringPage />, { wrapper: createWrapper() });
    expect(screen.getByRole('heading', { name: /monitoring real-time/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /segarkan/i })).toBeInTheDocument();
    // status summary renders the three activity chips
    expect(screen.getByText('Aktif')).toBeInTheDocument();
    expect(screen.getByText('Tidak terdeteksi')).toBeInTheDocument();
  });

  it('passes the snapshot workers to the map', () => {
    render(<MonitoringPage />, { wrapper: createWrapper() });
    expect(screen.getByTestId('map')).toHaveAttribute('data-count', '2');
  });
});
