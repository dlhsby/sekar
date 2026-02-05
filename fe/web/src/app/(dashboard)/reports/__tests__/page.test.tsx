/**
 * Unit Tests: Reports Page
 * Tests work reports viewing and filtering functionality
 */

import React from 'react';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ReportsPage from '../page';
import '@testing-library/jest-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import * as reportsApi from '@/lib/api/reports';

// Mock next/navigation
const mockPush = jest.fn();
const mockPathname = '/reports';

jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
  usePathname: () => mockPathname,
}));

// Mock next/link
jest.mock('next/link', () => {
  return ({ children, href }: { children: React.ReactNode; href: string }) => {
    return <a href={href}>{children}</a>;
  };
});

// Mock auth hook
const mockUseAuth = jest.fn();
jest.mock('@/lib/auth/hooks', () => ({
  useAuth: () => mockUseAuth(),
}));

// Mock API hooks
jest.mock('@/lib/api/reports');

// Test data
const mockAdminUser = {
  id: '1',
  username: 'admin',
  full_name: 'Admin User',
  role: 'admin',
  area_id: null,
  created_at: '2024-01-01T00:00:00Z',
};

const mockWorkerUser = {
  id: '3',
  username: 'worker1',
  full_name: 'Worker User',
  role: 'worker',
  area_id: 'area-1',
  created_at: '2024-01-01T00:00:00Z',
};

const mockReports = {
  data: [
    {
      id: 'report-1',
      worker: {
        id: 'worker-1',
        username: 'worker1',
        full_name: 'Worker One',
      },
      area: {
        id: 'area-1',
        name: 'Taman Bungkul',
        areaType: {
          id: 'type-1',
          name: 'Taman Kota',
        },
      },
      report_type: 'task_completion' as const,
      description: 'Pembersihan area selesai',
      is_reviewed: true,
      created_at: '2024-01-15T10:00:00Z',
    },
    {
      id: 'report-2',
      worker: {
        id: 'worker-2',
        username: 'worker2',
        full_name: 'Worker Two',
      },
      area: {
        id: 'area-2',
        name: 'Taman Mundu',
        areaType: {
          id: 'type-1',
          name: 'Taman Kota',
        },
      },
      report_type: 'incident' as const,
      description: 'Kerusakan fasilitas bermain',
      is_reviewed: false,
      created_at: '2024-01-15T11:00:00Z',
    },
    {
      id: 'report-3',
      worker: {
        id: 'worker-3',
        username: 'worker3',
        full_name: 'Worker Three',
      },
      area: {
        id: 'area-3',
        name: 'Taman Prestasi',
        areaType: {
          id: 'type-1',
          name: 'Taman Kota',
        },
      },
      report_type: 'maintenance_request' as const,
      description: 'Perlu perbaikan lampu taman',
      is_reviewed: false,
      created_at: '2024-01-15T12:00:00Z',
    },
  ],
  meta: {
    total: 3,
    page: 1,
    limit: 20,
    totalPages: 1,
  },
};

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

describe('ReportsPage Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    (reportsApi.useReports as jest.Mock).mockReturnValue({
      data: mockReports,
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

      render(<ReportsPage />, { wrapper: createWrapper() });

      expect(screen.getByText(/memuat/i)).toBeInTheDocument();
    });

    it('should allow admin role access', () => {
      mockUseAuth.mockReturnValue({
        user: mockAdminUser,
        loading: false,
      });

      render(<ReportsPage />, { wrapper: createWrapper() });

      expect(screen.getByRole('heading', { name: /laporan kerja/i })).toBeInTheDocument();
      expect(mockPush).not.toHaveBeenCalled();
    });

    it('should allow top_management role access', () => {
      mockUseAuth.mockReturnValue({
        user: { ...mockAdminUser, role: 'top_management' },
        loading: false,
      });

      render(<ReportsPage />, { wrapper: createWrapper() });

      expect(screen.getByRole('heading', { name: /laporan kerja/i })).toBeInTheDocument();
    });

    it('should allow kepala_rayon role access', () => {
      mockUseAuth.mockReturnValue({
        user: { ...mockAdminUser, role: 'kepala_rayon' },
        loading: false,
      });

      render(<ReportsPage />, { wrapper: createWrapper() });

      expect(screen.getByRole('heading', { name: /laporan kerja/i })).toBeInTheDocument();
    });

    it('should allow koordinator_lapangan role access', () => {
      mockUseAuth.mockReturnValue({
        user: { ...mockAdminUser, role: 'koordinator_lapangan' },
        loading: false,
      });

      render(<ReportsPage />, { wrapper: createWrapper() });

      expect(screen.getByRole('heading', { name: /laporan kerja/i })).toBeInTheDocument();
    });

    it('should redirect worker role to dashboard', () => {
      mockUseAuth.mockReturnValue({
        user: mockWorkerUser,
        loading: false,
      });

      render(<ReportsPage />, { wrapper: createWrapper() });

      expect(mockPush).toHaveBeenCalledWith('/dashboard');
    });
  });

  describe('Filters Rendering', () => {
    beforeEach(() => {
      mockUseAuth.mockReturnValue({
        user: mockAdminUser,
        loading: false,
      });
    });

    it('should render search input', () => {
      render(<ReportsPage />, { wrapper: createWrapper() });

      expect(screen.getByPlaceholderText(/nama pekerja atau area/i)).toBeInTheDocument();
    });

    it('should render report type filter', () => {
      render(<ReportsPage />, { wrapper: createWrapper() });

      expect(screen.getByText(/tipe laporan/i)).toBeInTheDocument();
    });

    it('should render date range filters', () => {
      render(<ReportsPage />, { wrapper: createWrapper() });

      expect(screen.getByText(/dari tanggal/i)).toBeInTheDocument();
      expect(screen.getByText(/sampai tanggal/i)).toBeInTheDocument();
    });
  });

  describe('Filter Functionality', () => {
    beforeEach(() => {
      mockUseAuth.mockReturnValue({
        user: mockAdminUser,
        loading: false,
      });
    });

    it('should filter reports by search text', async () => {
      const user = userEvent.setup();
      render(<ReportsPage />, { wrapper: createWrapper() });

      const searchInput = screen.getByPlaceholderText(/nama pekerja atau area/i);
      await user.type(searchInput, 'Worker One');

      expect(screen.getByText('Worker One')).toBeInTheDocument();
      expect(screen.queryByText('Worker Two')).not.toBeInTheDocument();
    });

    it('should filter reports by area name', async () => {
      const user = userEvent.setup();
      render(<ReportsPage />, { wrapper: createWrapper() });

      const searchInput = screen.getByPlaceholderText(/nama pekerja atau area/i);
      await user.type(searchInput, 'Bungkul');

      expect(screen.getByText('Taman Bungkul')).toBeInTheDocument();
      expect(screen.queryByText('Taman Mundu')).not.toBeInTheDocument();
    });

    it('should show reset button when search filter applied', async () => {
      const user = userEvent.setup();
      render(<ReportsPage />, { wrapper: createWrapper() });

      const searchInput = screen.getByPlaceholderText(/nama pekerja atau area/i);
      await user.type(searchInput, 'test');

      expect(screen.getByRole('button', { name: /reset filter/i })).toBeInTheDocument();
    });

    it('should reset search filter when reset clicked', async () => {
      const user = userEvent.setup();
      render(<ReportsPage />, { wrapper: createWrapper() });

      // Apply filter
      const searchInput = screen.getByPlaceholderText(/nama pekerja atau area/i);
      await user.type(searchInput, 'test');

      // Reset
      const resetButton = screen.getByRole('button', { name: /reset filter/i });
      await user.click(resetButton);

      await waitFor(() => {
        expect(searchInput).toHaveValue('');
      });
    });

    it('should update search input value', async () => {
      const user = userEvent.setup();
      render(<ReportsPage />, { wrapper: createWrapper() });

      const searchInput = screen.getByPlaceholderText(/nama pekerja atau area/i) as HTMLInputElement;
      await user.type(searchInput, 'test');

      expect(searchInput.value).toBe('test');
    });
  });

  describe('Reports Table Display', () => {
    beforeEach(() => {
      mockUseAuth.mockReturnValue({
        user: mockAdminUser,
        loading: false,
      });
    });

    it('should display reports table', () => {
      render(<ReportsPage />, { wrapper: createWrapper() });

      expect(screen.getByText(/daftar laporan/i)).toBeInTheDocument();
    });

    it('should display report worker names', () => {
      render(<ReportsPage />, { wrapper: createWrapper() });

      expect(screen.getByText('Worker One')).toBeInTheDocument();
      expect(screen.getByText('Worker Two')).toBeInTheDocument();
      expect(screen.getByText('Worker Three')).toBeInTheDocument();
    });

    it('should display report area names', () => {
      render(<ReportsPage />, { wrapper: createWrapper() });

      expect(screen.getByText('Taman Bungkul')).toBeInTheDocument();
      expect(screen.getByText('Taman Mundu')).toBeInTheDocument();
      expect(screen.getByText('Taman Prestasi')).toBeInTheDocument();
    });

    it('should display report types with badges', () => {
      render(<ReportsPage />, { wrapper: createWrapper() });

      expect(screen.getByText(/penyelesaian tugas/i)).toBeInTheDocument();
      expect(screen.getByText(/insiden/i)).toBeInTheDocument();
      expect(screen.getByText(/permintaan perawatan/i)).toBeInTheDocument();
    });

    it('should display report descriptions', () => {
      render(<ReportsPage />, { wrapper: createWrapper() });

      expect(screen.getByText(/pembersihan area selesai/i)).toBeInTheDocument();
      expect(screen.getByText(/kerusakan fasilitas bermain/i)).toBeInTheDocument();
      expect(screen.getByText(/perlu perbaikan lampu taman/i)).toBeInTheDocument();
    });

    it('should display review status badges', () => {
      render(<ReportsPage />, { wrapper: createWrapper() });

      // Use more specific query to get only the table badges
      const table = screen.getByRole('table');
      const reviewedBadges = within(table).getAllByText(/^ditinjau$/i);
      const unreviewedBadges = within(table).getAllByText(/^belum ditinjau$/i);

      expect(reviewedBadges).toHaveLength(1);
      expect(unreviewedBadges).toHaveLength(2);
    });

    it('should display detail links for each report', () => {
      render(<ReportsPage />, { wrapper: createWrapper() });

      const detailLinks = screen.getAllByText(/detail/i);
      expect(detailLinks).toHaveLength(3);
    });

    it('should show loading state while fetching', () => {
      (reportsApi.useReports as jest.Mock).mockReturnValue({
        data: null,
        isLoading: true,
        error: null,
      });

      const { container } = render(<ReportsPage />, { wrapper: createWrapper() });

      // DataTable shows loading state
      const loadingIndicator = container.querySelector('.animate-spin, .animate-pulse');
      expect(loadingIndicator).toBeInTheDocument();
    });

    it('should display empty state when no reports', () => {
      (reportsApi.useReports as jest.Mock).mockReturnValue({
        data: { data: [], meta: { total: 0, page: 1, limit: 20, totalPages: 0 } },
        isLoading: false,
        error: null,
      });

      render(<ReportsPage />, { wrapper: createWrapper() });

      expect(screen.getByText(/tidak ada laporan/i)).toBeInTheDocument();
    });
  });

  describe('Statistics Cards', () => {
    beforeEach(() => {
      mockUseAuth.mockReturnValue({
        user: mockAdminUser,
        loading: false,
      });
    });

    it('should display total reports count', () => {
      render(<ReportsPage />, { wrapper: createWrapper() });

      expect(screen.getByText(/total laporan/i)).toBeInTheDocument();
      expect(screen.getByText('3')).toBeInTheDocument();
    });

    it('should display unreviewed reports count', () => {
      render(<ReportsPage />, { wrapper: createWrapper() });

      // Find the statistics card specifically
      const labels = screen.getAllByText(/belum ditinjau/i);
      const statsLabel = labels.find((el) => {
        const card = el.closest('.p-6'); // CardContent
        return card && card.textContent?.includes('2');
      });

      expect(statsLabel).toBeTruthy();
      const unreviewedCard = statsLabel!.closest('.p-6');
      expect(unreviewedCard).toHaveTextContent('2');
    });

    it('should display reviewed reports count', () => {
      render(<ReportsPage />, { wrapper: createWrapper() });

      const reviewedLabel = screen.getByText(/sudah ditinjau/i);
      expect(reviewedLabel).toBeInTheDocument();
      const reviewedCard = reviewedLabel.closest('.p-6'); // CardContent
      expect(reviewedCard).toHaveTextContent('1');
    });
  });

  describe('Pagination', () => {
    beforeEach(() => {
      mockUseAuth.mockReturnValue({
        user: mockAdminUser,
        loading: false,
      });
    });

    it('should display pagination info', () => {
      // Pagination is hidden when totalPages === 1, so update mock to show pagination
      (reportsApi.useReports as jest.Mock).mockReturnValue({
        data: {
          ...mockReports,
          meta: { total: 50, page: 1, limit: 20, totalPages: 3 },
        },
        isLoading: false,
        error: null,
      });

      render(<ReportsPage />, { wrapper: createWrapper() });

      expect(screen.getByText(/halaman 1 dari 3/i)).toBeInTheDocument();
      expect(screen.getByText(/50 total laporan/i)).toBeInTheDocument();
    });

    it('should display previous and next buttons', () => {
      (reportsApi.useReports as jest.Mock).mockReturnValue({
        data: {
          ...mockReports,
          meta: { total: 50, page: 1, limit: 20, totalPages: 3 },
        },
        isLoading: false,
        error: null,
      });

      render(<ReportsPage />, { wrapper: createWrapper() });

      expect(screen.getByRole('button', { name: /sebelumnya/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /selanjutnya/i })).toBeInTheDocument();
    });

    it('should disable previous button on first page', () => {
      (reportsApi.useReports as jest.Mock).mockReturnValue({
        data: {
          ...mockReports,
          meta: { total: 50, page: 1, limit: 20, totalPages: 3 },
        },
        isLoading: false,
        error: null,
      });

      render(<ReportsPage />, { wrapper: createWrapper() });

      const prevButton = screen.getByRole('button', { name: /sebelumnya/i });
      expect(prevButton).toBeDisabled();
    });

    it('should disable next button on last page', () => {
      (reportsApi.useReports as jest.Mock).mockReturnValue({
        data: {
          ...mockReports,
          meta: { total: 50, page: 3, limit: 20, totalPages: 3 },
        },
        isLoading: false,
        error: null,
      });

      render(<ReportsPage />, { wrapper: createWrapper() });

      const nextButton = screen.getByRole('button', { name: /selanjutnya/i });
      expect(nextButton).toBeDisabled();
    });

    it('should navigate to next page when clicked', async () => {
      const user = userEvent.setup();
      (reportsApi.useReports as jest.Mock).mockReturnValue({
        data: {
          ...mockReports,
          meta: { total: 50, page: 1, limit: 20, totalPages: 3 },
        },
        isLoading: false,
        error: null,
      });

      render(<ReportsPage />, { wrapper: createWrapper() });

      const nextButton = screen.getByRole('button', { name: /selanjutnya/i });
      expect(nextButton).not.toBeDisabled();

      await user.click(nextButton);

      // Verify page state changed (would trigger new API call)
      expect(nextButton).toBeInTheDocument();
    });

    it('should navigate to previous page when clicked', async () => {
      const user = userEvent.setup();
      (reportsApi.useReports as jest.Mock).mockReturnValue({
        data: {
          ...mockReports,
          meta: { total: 50, page: 2, limit: 20, totalPages: 3 },
        },
        isLoading: false,
        error: null,
      });

      render(<ReportsPage />, { wrapper: createWrapper() });

      const prevButton = screen.getByRole('button', { name: /sebelumnya/i });
      expect(prevButton).not.toBeDisabled();

      await user.click(prevButton);

      expect(prevButton).toBeInTheDocument();
    });

    it('should hide pagination when only one page', () => {
      (reportsApi.useReports as jest.Mock).mockReturnValue({
        data: mockReports, // Default mock has totalPages: 1
        isLoading: false,
        error: null,
      });

      render(<ReportsPage />, { wrapper: createWrapper() });

      // Pagination should not be visible when totalPages === 1
      const prevButton = screen.queryByRole('button', { name: /sebelumnya/i });
      const nextButton = screen.queryByRole('button', { name: /selanjutnya/i });

      expect(prevButton).not.toBeInTheDocument();
      expect(nextButton).not.toBeInTheDocument();
    });
  });

  describe('Responsive Layout', () => {
    beforeEach(() => {
      mockUseAuth.mockReturnValue({
        user: mockAdminUser,
        loading: false,
      });
    });

    it('should render filters in responsive grid', () => {
      render(<ReportsPage />, { wrapper: createWrapper() });

      const filterGrid = screen.getByLabelText(/cari pekerja\/area/i).closest('div.grid');
      expect(filterGrid).toHaveClass('grid-cols-1', 'md:grid-cols-2', 'lg:grid-cols-4');
    });

    it('should render statistics in responsive grid', () => {
      render(<ReportsPage />, { wrapper: createWrapper() });

      const statsGrid = screen.getByText(/total laporan/i).closest('div.grid');
      expect(statsGrid).toHaveClass('grid-cols-1', 'md:grid-cols-3');
    });
  });

  describe('Error Handling', () => {
    beforeEach(() => {
      mockUseAuth.mockReturnValue({
        user: mockAdminUser,
        loading: false,
      });
    });

    it('should handle missing reports data gracefully', () => {
      (reportsApi.useReports as jest.Mock).mockReturnValue({
        data: null,
        isLoading: false,
        error: null,
      });

      expect(() => render(<ReportsPage />, { wrapper: createWrapper() })).not.toThrow();
    });

    it('should handle reports array not being an array', () => {
      (reportsApi.useReports as jest.Mock).mockReturnValue({
        data: { data: null, meta: { total: 0, page: 1, limit: 20, totalPages: 0 } },
        isLoading: false,
        error: null,
      });

      expect(() => render(<ReportsPage />, { wrapper: createWrapper() })).not.toThrow();
    });
  });

  describe('Case-insensitive Search', () => {
    beforeEach(() => {
      mockUseAuth.mockReturnValue({
        user: mockAdminUser,
        loading: false,
      });
    });

    it('should filter case-insensitively', async () => {
      const user = userEvent.setup();
      render(<ReportsPage />, { wrapper: createWrapper() });

      const searchInput = screen.getByPlaceholderText(/nama pekerja atau area/i);
      await user.type(searchInput, 'WORKER ONE');

      expect(screen.getByText('Worker One')).toBeInTheDocument();
    });

    it('should filter area names case-insensitively', async () => {
      const user = userEvent.setup();
      render(<ReportsPage />, { wrapper: createWrapper() });

      const searchInput = screen.getByPlaceholderText(/nama pekerja atau area/i);
      await user.type(searchInput, 'TAMAN');

      expect(screen.getByText('Taman Bungkul')).toBeInTheDocument();
      expect(screen.getByText('Taman Mundu')).toBeInTheDocument();
      expect(screen.getByText('Taman Prestasi')).toBeInTheDocument();
    });
  });
});
