/**
 * Unit Tests: Monitoring Page (Phase 2D-10 Layout)
 * Full-screen split layout: map 65% + panel 35%
 * Tests auth/access, header stats, filters, side panel, and map integration.
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import MonitoringPage from '../page';
import '@testing-library/jest-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import * as monitoringApi from '@/lib/api/monitoring';
import * as rayonsApi from '@/lib/api/rayons';
import * as areasApi from '@/lib/api/areas';

// Mock mapbox-gl (not available in jsdom)
jest.mock('mapbox-gl', () => ({}));

// Mock MonitoringMap (uses WebGL via mapbox-gl)
jest.mock('@/components/monitoring/MonitoringMap', () => ({
  MonitoringMap: (props: { users: unknown[] }) => (
    <div data-testid="monitoring-map">
      {Array.isArray(props.users)
        ? `${props.users.length} petugas terdeteksi`
        : '0 petugas terdeteksi'}
    </div>
  ),
}));

// Mock StaffingSummaryCard and ReassignWorkerModal (use internal hooks)
jest.mock('@/components/monitoring/StaffingSummaryCard', () => ({
  StaffingSummaryCard: () => <div data-testid="staffing-summary">Staffing Summary</div>,
}));

jest.mock('@/components/monitoring/ReassignWorkerModal', () => ({
  ReassignWorkerModal: () => null,
}));

// Mock socket.io-client
jest.mock('socket.io-client', () => {
  const mockSocket = {
    on: jest.fn(),
    off: jest.fn(),
    emit: jest.fn(),
    disconnect: jest.fn(),
    connected: false,
  };
  const io = jest.fn(() => mockSocket);
  return { __esModule: true, default: io };
});

// Mock monitoring-v2 API (Phase 4-R)
jest.mock('@/lib/api/monitoring-v2', () => ({
  useMonitoringSnapshot: jest.fn(() => ({
    data: {
      success: true,
      data: {
        workers: [
          {
            user_id: 'worker-1',
            full_name: 'Worker 1',
            role: 'satgas',
            lat: -7.250445,
            lng: 112.768845,
            status: 'active',
            area_id: 'area-1',
            area_name: 'Area 1',
            rayon_id: 'rayon-1',
            rayon_name: 'Rayon 1',
            last_update: '2024-01-01T12:00:00Z',
            is_within_area: true,
            battery_level: 80,
          },
          {
            user_id: 'worker-2',
            full_name: 'Worker 2',
            role: 'satgas',
            lat: -7.251445,
            lng: 112.769845,
            status: 'outside_area',
            area_id: 'area-1',
            area_name: 'Area 1',
            rayon_id: 'rayon-1',
            rayon_name: 'Rayon 1',
            last_update: '2024-01-01T11:55:00Z',
            is_within_area: false,
            battery_level: 15,
          },
        ],
        area_summaries: [],
        total_active: 1,
        total_inactive: 0,
        total_outside_area: 1,
        total_missing: 0,
        total_offline: 0,
        generated_at: '2024-01-01T12:00:00Z',
      },
    },
    isLoading: false,
    refetch: jest.fn(),
  })),
  snapshotKeys: {
    all: ['monitoring', 'snapshot'],
    byScope: (scope: string, id?: string) => ['monitoring', 'snapshot', scope, id],
  },
}));

// Mock sonner toast
jest.mock('sonner', () => ({
  toast: { success: jest.fn(), error: jest.fn(), info: jest.fn(), warning: jest.fn() },
}));

// Mock next/navigation
const mockPush = jest.fn();
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
  usePathname: () => '/monitoring',
}));

// Mock auth hook
const mockUseAuth = jest.fn();
jest.mock('@/lib/auth/hooks', () => ({
  useAuth: () => mockUseAuth(),
}));

// Mock API hooks
jest.mock('@/lib/api/monitoring');
jest.mock('@/lib/api/rayons');
jest.mock('@/lib/api/areas');

// ---------------------------------------------------------------------------
// Test data
// ---------------------------------------------------------------------------

const mockAdminUser = {
  id: '1',
  username: 'admin',
  full_name: 'Admin User',
  role: 'admin_system',
  area_id: null,
  rayon_id: null,
  created_at: '2024-01-01T00:00:00Z',
};

const mockKorlapUser = {
  id: '2',
  username: 'korlap1',
  full_name: 'Korlap User',
  role: 'korlap',
  area_id: 'area-1',
  rayon_id: 'rayon-1',
  created_at: '2024-01-01T00:00:00Z',
};

const mockWorkerUser = {
  id: '3',
  username: 'worker1',
  full_name: 'Worker User',
  role: 'satgas',
  area_id: 'area-1',
  rayon_id: 'rayon-1',
  created_at: '2024-01-01T00:00:00Z',
};

const mockCityStats = {
  total_rayons: 7,
  total_areas: 50,
  total_workers: 200,
  workers_online: 150,
  workers_offline: 50,
  active_shifts: 45,
  tasks_pending: 30,
  tasks_in_progress: 15,
  tasks_completed_today: 10,
  activities_submitted_today: 120,
  generated_at: '2024-01-01T12:00:00Z',
};

const mockRayons = [
  { id: 'rayon-1', name: 'Rayon 1', code: 'R1' },
  { id: 'rayon-2', name: 'Rayon 2', code: 'R2' },
];

const mockAreas = {
  data: [
    { id: 'area-1', name: 'Area 1', code: 'A1', rayon_id: 'rayon-1' },
    { id: 'area-2', name: 'Area 2', code: 'A2', rayon_id: 'rayon-1' },
  ],
  meta: { total: 2, page: 1, limit: 20, totalPages: 1 },
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  Wrapper.displayName = 'TestWrapper';
  return Wrapper;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('MonitoringPage Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    (monitoringApi.useCityStats as jest.Mock).mockReturnValue({
      data: mockCityStats,
      isLoading: false,
      error: null,
    });

    (monitoringApi.useRayonMonitoring as jest.Mock).mockReturnValue({
      data: null,
      isLoading: false,
      error: null,
    });

    (monitoringApi.useAreaMonitoring as jest.Mock).mockReturnValue({
      data: null,
      isLoading: false,
      error: null,
    });


    (monitoringApi.useUserDaySummary as jest.Mock).mockReturnValue({
      data: null,
      isLoading: false,
      error: null,
    });

    (monitoringApi.useLocationHistory as jest.Mock).mockReturnValue({
      data: null,
      isLoading: false,
      error: null,
    });

    (monitoringApi.useBoundaries as jest.Mock).mockReturnValue({
      data: undefined,
      isLoading: false,
      error: null,
    });

    (rayonsApi.useRayons as jest.Mock).mockReturnValue({
      data: mockRayons,
      isLoading: false,
      error: null,
    });

    (areasApi.useAreas as jest.Mock).mockReturnValue({
      data: mockAreas,
      isLoading: false,
      error: null,
    });
  });

  // -------------------------------------------------------------------------
  // Authentication & Authorization
  // -------------------------------------------------------------------------

  describe('Authentication & Authorization', () => {
    it('should show loading state during auth check', () => {
      mockUseAuth.mockReturnValue({ user: null, loading: true });

      const { container } = render(<MonitoringPage />, { wrapper: createWrapper() });

      expect(screen.getByText(/memuat/i)).toBeInTheDocument();
      const spinner = container.querySelector('.animate-spin');
      expect(spinner).toBeInTheDocument();
    });

    it('should allow admin_system role access', () => {
      mockUseAuth.mockReturnValue({ user: mockAdminUser, loading: false });

      render(<MonitoringPage />, { wrapper: createWrapper() });

      expect(screen.getByRole('heading', { name: /monitoring real-time/i })).toBeInTheDocument();
      expect(mockPush).not.toHaveBeenCalled();
    });

    it('should allow top_management role access', () => {
      mockUseAuth.mockReturnValue({
        user: { ...mockAdminUser, role: 'top_management' },
        loading: false,
      });

      render(<MonitoringPage />, { wrapper: createWrapper() });

      expect(screen.getByRole('heading', { name: /monitoring real-time/i })).toBeInTheDocument();
    });

    it('should allow kepala_rayon role access', () => {
      mockUseAuth.mockReturnValue({
        user: { ...mockAdminUser, role: 'kepala_rayon' },
        loading: false,
      });

      render(<MonitoringPage />, { wrapper: createWrapper() });

      expect(screen.getByRole('heading', { name: /monitoring real-time/i })).toBeInTheDocument();
    });

    it('should allow korlap role access', () => {
      mockUseAuth.mockReturnValue({ user: mockKorlapUser, loading: false });

      render(<MonitoringPage />, { wrapper: createWrapper() });

      expect(screen.getByRole('heading', { name: /monitoring real-time/i })).toBeInTheDocument();
    });

    it('should redirect satgas role to home', () => {
      mockUseAuth.mockReturnValue({ user: mockWorkerUser, loading: false });

      render(<MonitoringPage />, { wrapper: createWrapper() });

      expect(mockPush).toHaveBeenCalledWith('/');
    });

    it('should not render content for unauthorized user', () => {
      mockUseAuth.mockReturnValue({ user: mockWorkerUser, loading: false });

      const { container } = render(<MonitoringPage />, { wrapper: createWrapper() });

      expect(container.textContent).toBe('');
    });
  });

  // -------------------------------------------------------------------------
  // Header bar & stats
  // -------------------------------------------------------------------------

  describe('Header bar', () => {
    beforeEach(() => {
      mockUseAuth.mockReturnValue({ user: mockAdminUser, loading: false });
    });

    it('should display last update time from snapshot', () => {
      render(<MonitoringPage />, { wrapper: createWrapper() });

      // Header shows update time from snapshot.generated_at
      expect(screen.getByText(/diperbarui/i)).toBeInTheDocument();
    });

    it('should render the Monitoring Real-Time heading', () => {
      render(<MonitoringPage />, { wrapper: createWrapper() });

      expect(screen.getByRole('heading', { name: /monitoring real-time/i })).toBeInTheDocument();
    });

    it('should render the Refresh button', () => {
      render(<MonitoringPage />, { wrapper: createWrapper() });

      expect(screen.getByRole('button', { name: /segarkan data monitoring/i })).toBeInTheDocument();
    });
  });

  // -------------------------------------------------------------------------
  // Filters
  // -------------------------------------------------------------------------

  describe('Filters', () => {
    beforeEach(() => {
      mockUseAuth.mockReturnValue({ user: mockAdminUser, loading: false });
    });

    it('should render HierarchyFilterPanel scope buttons', () => {
      render(<MonitoringPage />, { wrapper: createWrapper() });

      // HierarchyFilterPanel replaces old FormSelect dropdowns with scope toggle buttons
      expect(screen.getByRole('button', { name: /^Kota$/i })).toBeInTheDocument();
    });

    it('should not show Reset button when filters are at default', () => {
      render(<MonitoringPage />, { wrapper: createWrapper() });

      expect(screen.queryByRole('button', { name: /reset/i })).not.toBeInTheDocument();
    });
  });

  // -------------------------------------------------------------------------
  // Split layout
  // -------------------------------------------------------------------------

  describe('Split layout', () => {
    beforeEach(() => {
      mockUseAuth.mockReturnValue({ user: mockAdminUser, loading: false });
    });

    it('should render the map component', () => {
      render(<MonitoringPage />, { wrapper: createWrapper() });

      expect(screen.getByTestId('monitoring-map')).toBeInTheDocument();
    });

    it('should pass snapshot workers to the map component', () => {
      render(<MonitoringPage />, { wrapper: createWrapper() });

      expect(screen.getByText(/2 petugas terdeteksi/i)).toBeInTheDocument();
    });

    it('should render the staffing summary card when the worker-list overlay is opened', () => {
      render(<MonitoringPage />, { wrapper: createWrapper() });

      // The list + staffing are now a collapsible overlay over the full-width
      // map (collapsed by default) — open it via the toggle, then assert.
      fireEvent.click(screen.getByRole('button', { name: /daftar petugas/i }));
      expect(screen.getByTestId('staffing-summary')).toBeInTheDocument();
    });

    it('should render worker list header with count', () => {
      render(<MonitoringPage />, { wrapper: createWrapper() });

      // The WorkerListVirtual is mocked, so we check for the header instead
      expect(screen.getByText(/petugas \(2\)/i)).toBeInTheDocument();
    });
  });

  // -------------------------------------------------------------------------
  // Side panel interactions
  // -------------------------------------------------------------------------

  describe('Side panel interactions', () => {
    beforeEach(() => {
      mockUseAuth.mockReturnValue({ user: mockAdminUser, loading: false });
    });

    it('should render worker list from snapshot', () => {
      render(<MonitoringPage />, { wrapper: createWrapper() });

      expect(screen.getByText(/petugas \(2\)/i)).toBeInTheDocument();
    });

    it('should show loading state when snapshot is loading', () => {
      const monitoringV2Mock = jest.requireMock('@/lib/api/monitoring-v2');
      monitoringV2Mock.useMonitoringSnapshot.mockReturnValueOnce({
        data: null,
        isLoading: true,
        refetch: jest.fn(),
      });

      const { container } = render(<MonitoringPage />, { wrapper: createWrapper() });

      const skeletons = container.querySelectorAll('.animate-pulse');
      expect(skeletons.length).toBeGreaterThan(0);
    });
  });

  // -------------------------------------------------------------------------
  // Error Handling
  // -------------------------------------------------------------------------

  describe('Error Handling', () => {
    beforeEach(() => {
      mockUseAuth.mockReturnValue({ user: mockAdminUser, loading: false });
    });

    it('should handle missing snapshot data gracefully', () => {
      const monitoringV2Mock = jest.requireMock('@/lib/api/monitoring-v2');
      monitoringV2Mock.useMonitoringSnapshot.mockReturnValueOnce({
        data: null,
        isLoading: false,
        refetch: jest.fn(),
      });

      expect(() => render(<MonitoringPage />, { wrapper: createWrapper() })).not.toThrow();
    });

    it('should not crash when korlap has area_id', () => {
      mockUseAuth.mockReturnValue({ user: mockKorlapUser, loading: false });

      expect(() => render(<MonitoringPage />, { wrapper: createWrapper() })).not.toThrow();
      expect(screen.getByRole('heading', { name: /monitoring real-time/i })).toBeInTheDocument();
    });
  });
});
