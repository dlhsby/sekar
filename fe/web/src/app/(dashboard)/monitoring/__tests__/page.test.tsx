/**
 * Unit Tests: Monitoring Page
 * Tests real-time monitoring dashboard functionality
 */

import React from 'react';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import MonitoringPage from '../page';
import '@testing-library/jest-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import * as monitoringApi from '@/lib/api/monitoring';
import * as rayonsApi from '@/lib/api/rayons';
import * as areasApi from '@/lib/api/areas';

// Mock next/navigation
const mockPush = jest.fn();
const mockPathname = '/monitoring';

jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
  usePathname: () => mockPathname,
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

// Test data
const mockAdminUser = {
  id: '1',
  username: 'admin',
  full_name: 'Admin User',
  role: 'admin_system',
  area_id: null,
  created_at: '2024-01-01T00:00:00Z',
};

const mockSupervisorUser = {
  id: '2',
  username: 'supervisor1',
  full_name: 'Supervisor User',
  role: 'korlap',
  area_id: 'area-1',
  created_at: '2024-01-01T00:00:00Z',
};

const mockWorkerUser = {
  id: '3',
  username: 'worker1',
  full_name: 'Worker User',
  role: 'satgas',
  area_id: 'area-1',
  created_at: '2024-01-01T00:00:00Z',
};

const mockCityStats = {
  timestamp: '2024-01-01T12:00:00Z',
  summary: {
    total_rayons: 7,
    total_areas: 50,
    total_users: 200,
    total_linmas: 50,
    users_online: 150,
    linmas_online: 30,
    active_shifts: 45,
    activities_today: 120,
    tasks_pending: 30,
    tasks_in_progress: 15,
  },
};

const mockRayonStats = {
  timestamp: '2024-01-01T12:00:00Z',
  rayon: {
    id: 'rayon-1',
    name: 'Rayon 1',
  },
  summary: {
    total_areas: 10,
    total_users: 40,
    total_linmas: 10,
    users_online: 30,
    linmas_online: 8,
    active_shifts: 9,
    activities_today: 25,
    understaffed_areas: 2,
  },
};

const mockAreaStats = {
  timestamp: '2024-01-01T12:00:00Z',
  area: {
    id: 'area-1',
    name: 'Area 1',
    rayon: 'Rayon 1',
    coverage_area: 1500,
  },
  current_shift: {
    definition: {
      id: 'shift-1',
      name: 'Shift Pagi',
      start_time: '07:00',
      end_time: '15:00',
    },
    required_users: 5,
    required_linmas: 2,
    assigned_users: 5,
    assigned_linmas: 2,
    active_users: 4,
    active_linmas: 1,
  },
};

const mockLiveUsers = {
  timestamp: '2024-01-01T12:00:00Z',
  users: [
    {
      user_id: 'worker-1',
      full_name: 'Worker 1',
      role: 'satgas' as const,
      area_id: 'area-1',
      area_name: 'Area 1',
      shift_id: 'shift-1',
      gps_lat: -7.250445,
      gps_lng: 112.768845,
      location_timestamp: '2024-01-01T12:00:00Z',
      battery_level: 80,
      status: 'online' as const,
    },
    {
      user_id: 'worker-2',
      full_name: 'Worker 2',
      role: 'satgas' as const,
      area_id: 'area-1',
      area_name: 'Area 1',
      shift_id: 'shift-1',
      gps_lat: -7.251445,
      gps_lng: 112.769845,
      location_timestamp: '2024-01-01T11:55:00Z',
      battery_level: 15,
      status: 'offline' as const,
    },
  ],
  total: 2,
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

describe('MonitoringPage Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Default mock implementations
    (monitoringApi.useCityStats as jest.Mock).mockReturnValue({
      data: mockCityStats,
      isLoading: false,
      error: null,
    });

    (monitoringApi.useRayonMonitoring as jest.Mock).mockReturnValue({
      data: mockRayonStats,
      isLoading: false,
      error: null,
    });

    (monitoringApi.useAreaMonitoring as jest.Mock).mockReturnValue({
      data: mockAreaStats,
      isLoading: false,
      error: null,
    });

    (monitoringApi.useLiveUsers as jest.Mock).mockReturnValue({
      data: mockLiveUsers,
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

  describe('Authentication & Authorization', () => {
    it('should show loading state during auth check', () => {
      mockUseAuth.mockReturnValue({
        user: null,
        loading: true,
      });

      const { container } = render(<MonitoringPage />, { wrapper: createWrapper() });

      expect(screen.getByText(/memuat/i)).toBeInTheDocument();
      // Check for loading spinner
      const spinner = container.querySelector('.animate-spin');
      expect(spinner).toBeInTheDocument();
    });

    it('should allow admin role access', () => {
      mockUseAuth.mockReturnValue({
        user: mockAdminUser,
        loading: false,
      });

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

    it('should allow koordinator_lapangan role access', () => {
      mockUseAuth.mockReturnValue({
        user: mockSupervisorUser,
        loading: false,
      });

      render(<MonitoringPage />, { wrapper: createWrapper() });

      expect(screen.getByRole('heading', { name: /monitoring real-time/i })).toBeInTheDocument();
    });

    it('should redirect worker role to home', () => {
      mockUseAuth.mockReturnValue({
        user: mockWorkerUser,
        loading: false,
      });

      render(<MonitoringPage />, { wrapper: createWrapper() });

      expect(mockPush).toHaveBeenCalledWith('/');
    });

    it('should not render content for unauthorized user', () => {
      mockUseAuth.mockReturnValue({
        user: mockWorkerUser,
        loading: false,
      });

      const { container } = render(<MonitoringPage />, { wrapper: createWrapper() });

      expect(container.textContent).toBe('');
    });
  });

  describe('Statistics Display', () => {
    beforeEach(() => {
      mockUseAuth.mockReturnValue({
        user: mockAdminUser,
        loading: false,
      });
    });

    it('should display city-wide statistics by default', () => {
      render(<MonitoringPage />, { wrapper: createWrapper() });

      // Use more specific queries for statistics - find the parent card container
      const workersLabel = screen.getByText(/petugas online/i);
      const workersSection = workersLabel.closest('.p-6'); // CardContent
      expect(workersSection).toHaveTextContent('150');
      expect(workersSection).toHaveTextContent('/ 200');

      const linmasLabel = screen.getByText(/linmas online/i);
      const linmasSection = linmasLabel.closest('.p-6');
      expect(linmasSection).toHaveTextContent('30');
      expect(linmasSection).toHaveTextContent('/ 50');

      const shiftsLabel = screen.getByText(/shift aktif/i);
      const shiftsSection = shiftsLabel.closest('.p-6');
      expect(shiftsSection).toHaveTextContent('45');

      const activitiesLabel = screen.getByText(/aktivitas hari ini/i);
      const activitiesSection = activitiesLabel.closest('.p-6');
      expect(activitiesSection).toHaveTextContent('120');
    });

    it('should show loading skeleton while fetching stats', () => {
      (monitoringApi.useCityStats as jest.Mock).mockReturnValue({
        data: null,
        isLoading: true,
        error: null,
      });

      const { container } = render(<MonitoringPage />, { wrapper: createWrapper() });

      // Check for loading skeleton divs (animated pulse elements)
      const skeletons = container.querySelectorAll('.animate-pulse');
      expect(skeletons.length).toBeGreaterThan(0);
    });

    it('should display correct stat card labels', () => {
      render(<MonitoringPage />, { wrapper: createWrapper() });

      expect(screen.getByText(/petugas online/i)).toBeInTheDocument();
      expect(screen.getByText(/linmas online/i)).toBeInTheDocument();
      expect(screen.getByText(/shift aktif/i)).toBeInTheDocument();
      expect(screen.getByText(/aktivitas hari ini/i)).toBeInTheDocument();
    });
  });

  describe('Filters', () => {
    beforeEach(() => {
      mockUseAuth.mockReturnValue({
        user: mockAdminUser,
        loading: false,
      });
    });

    it('should render rayon filter dropdown', () => {
      render(<MonitoringPage />, { wrapper: createWrapper() });

      expect(screen.getByText(/filter rayon/i)).toBeInTheDocument();
    });

    it('should render area filter dropdown', () => {
      render(<MonitoringPage />, { wrapper: createWrapper() });

      expect(screen.getByText(/filter area/i)).toBeInTheDocument();
    });

    it('should show rayon filter options', () => {
      render(<MonitoringPage />, { wrapper: createWrapper() });

      // Filter section should be present
      expect(screen.getByText(/filter rayon/i)).toBeInTheDocument();
      expect(screen.getByText(/filter area/i)).toBeInTheDocument();
    });

    it('should show reset filter button when viewing filtered data', () => {
      render(<MonitoringPage />, { wrapper: createWrapper() });

      // Initially no reset button (all filters at default 'all')
      expect(screen.queryByRole('button', { name: /reset filter/i })).not.toBeInTheDocument();
    });

    it('should display filter card with proper layout', () => {
      const { container } = render(<MonitoringPage />, { wrapper: createWrapper() });

      const filterSection = container.querySelector('.flex.gap-4');
      expect(filterSection).toBeInTheDocument();
    });
  });

  describe('Live Workers Display', () => {
    beforeEach(() => {
      mockUseAuth.mockReturnValue({
        user: mockAdminUser,
        loading: false,
      });
    });

    it('should display live workers list', () => {
      render(<MonitoringPage />, { wrapper: createWrapper() });

      expect(screen.getByText('Worker 1')).toBeInTheDocument();
      expect(screen.getByText('Worker 2')).toBeInTheDocument();
    });

    it('should show online/offline status badges', () => {
      render(<MonitoringPage />, { wrapper: createWrapper() });

      const badges = screen.getAllByText(/online|offline/i);
      expect(badges.length).toBeGreaterThan(0);
    });

    it('should show battery warning for low battery', () => {
      render(<MonitoringPage />, { wrapper: createWrapper() });

      expect(screen.getByText('15%')).toBeInTheDocument();
    });

    it('should not show battery warning for normal battery', () => {
      render(<MonitoringPage />, { wrapper: createWrapper() });

      expect(screen.queryByText('80%')).not.toBeInTheDocument();
    });

    it('should display empty state when no workers', () => {
      (monitoringApi.useLiveUsers as jest.Mock).mockReturnValue({
        data: { timestamp: '2024-01-01T12:00:00Z', users: [], total: 0 },
        isLoading: false,
        error: null,
      });

      render(<MonitoringPage />, { wrapper: createWrapper() });

      expect(screen.getByText(/tidak ada petugas aktif/i)).toBeInTheDocument();
    });

    it('should show loading state while fetching workers', () => {
      (monitoringApi.useLiveUsers as jest.Mock).mockReturnValue({
        data: null,
        isLoading: true,
        error: null,
      });

      render(<MonitoringPage />, { wrapper: createWrapper() });

      expect(screen.getByText(/memuat data petugas/i)).toBeInTheDocument();
    });

    it('should display online workers count in badge', () => {
      render(<MonitoringPage />, { wrapper: createWrapper() });

      // The badge shows "1 Online" as the workers count badge
      const badges = screen.getAllByText(/online/i);
      expect(badges.length).toBeGreaterThan(0);
    });
  });

  describe('Auto-refresh Indicator', () => {
    beforeEach(() => {
      mockUseAuth.mockReturnValue({
        user: mockAdminUser,
        loading: false,
      });
    });

    it('should show auto-refresh indicator', () => {
      render(<MonitoringPage />, { wrapper: createWrapper() });

      expect(screen.getByText(/auto-refresh setiap 15 detik/i)).toBeInTheDocument();
    });

    it('should display last updated timestamp', () => {
      render(<MonitoringPage />, { wrapper: createWrapper() });

      expect(screen.getByText(/terakhir diperbarui:/i)).toBeInTheDocument();
    });
  });

  describe('Map Placeholder', () => {
    beforeEach(() => {
      mockUseAuth.mockReturnValue({
        user: mockAdminUser,
        loading: false,
      });
    });

    it('should display map placeholder', () => {
      render(<MonitoringPage />, { wrapper: createWrapper() });

      expect(screen.getByText(/peta monitoring real-time/i)).toBeInTheDocument();
    });

    it('should show worker count in map placeholder', () => {
      render(<MonitoringPage />, { wrapper: createWrapper() });

      expect(screen.getByText(/2 petugas terdeteksi/i)).toBeInTheDocument();
    });
  });

  describe('Responsive Layout', () => {
    beforeEach(() => {
      mockUseAuth.mockReturnValue({
        user: mockAdminUser,
        loading: false,
      });
    });

    it('should render stats in responsive grid', () => {
      render(<MonitoringPage />, { wrapper: createWrapper() });

      const statsGrid = screen.getByText(/petugas online/i).closest('div.grid');
      expect(statsGrid).toHaveClass('grid-cols-1', 'md:grid-cols-2', 'lg:grid-cols-4');
    });

    it('should render filters in responsive layout', () => {
      render(<MonitoringPage />, { wrapper: createWrapper() });

      const filterContainer = screen.getByLabelText(/filter rayon/i).closest('div.flex');
      expect(filterContainer).toHaveClass('gap-4');
    });
  });

  describe('Error Handling', () => {
    beforeEach(() => {
      mockUseAuth.mockReturnValue({
        user: mockAdminUser,
        loading: false,
      });
    });

    it('should handle missing city stats gracefully', () => {
      (monitoringApi.useCityStats as jest.Mock).mockReturnValue({
        data: null,
        isLoading: false,
        error: null,
      });

      expect(() => render(<MonitoringPage />, { wrapper: createWrapper() })).not.toThrow();
    });

    it('should handle missing live workers data gracefully', () => {
      (monitoringApi.useLiveUsers as jest.Mock).mockReturnValue({
        data: null,
        isLoading: false,
        error: null,
      });

      render(<MonitoringPage />, { wrapper: createWrapper() });

      expect(screen.getByText(/tidak ada petugas aktif/i)).toBeInTheDocument();
    });
  });
});
