/**
 * Unit Tests: Activities List Page (Phase 2C)
 * Tests activity listing, filtering, status badges, and approval workflow.
 *
 * NOTE: FormSelect uses Radix UI Select (role="combobox"), not a native <select>.
 * Table column headers come from the DataTable component's <th> elements.
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ActivitiesPage from '../page';
import '@testing-library/jest-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import * as activitiesApi from '@/lib/api/activities';
import * as activityTypesApi from '@/lib/api/activity-types';
import * as areasApi from '@/lib/api/areas';

// ─── Next.js Mocks ────────────────────────────────────────────────────────────

const mockPush = jest.fn();
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
  usePathname: () => '/activities',
}));

jest.mock('next/link', () => {
  const MockLink = ({
    href,
    children,
    className,
  }: {
    href: string;
    children: React.ReactNode;
    className?: string;
  }) => (
    <a href={href} className={className}>
      {children}
    </a>
  );
  MockLink.displayName = 'MockLink';
  return MockLink;
});

// ─── Auth Mock ────────────────────────────────────────────────────────────────

const mockUseAuth = jest.fn();
jest.mock('@/lib/auth/hooks', () => ({
  useAuth: () => mockUseAuth(),
}));

// ─── API Mocks ────────────────────────────────────────────────────────────────

jest.mock('@/lib/api/activities');
jest.mock('@/lib/api/activity-types');
jest.mock('@/lib/api/areas');

// ─── Test Users ───────────────────────────────────────────────────────────────

const mockAdminSystemUser = {
  id: 'user-admin',
  username: 'admin_system1',
  full_name: 'Admin Sistem',
  role: 'admin_system' as const,
  area_id: null,
  created_at: '2026-01-01T00:00:00Z',
};

const mockKorlapUser = {
  id: 'user-korlap',
  username: 'korlap1',
  full_name: 'Koordinator Lapangan',
  role: 'korlap' as const,
  area_id: 'area-1',
  created_at: '2026-01-01T00:00:00Z',
};

const mockKepalaRayonUser = {
  id: 'user-kepala',
  username: 'kepala_rayon1',
  full_name: 'Kepala Rayon',
  role: 'kepala_rayon' as const,
  area_id: 'area-1',
  created_at: '2026-01-01T00:00:00Z',
};

const mockAdminDataUser = {
  id: 'user-admin-data',
  username: 'admin_data1',
  full_name: 'Admin Data',
  role: 'admin_data' as const,
  area_id: null,
  created_at: '2026-01-01T00:00:00Z',
};

const mockSatgasUser = {
  id: 'user-satgas',
  username: 'satgas1',
  full_name: 'Satgas One',
  role: 'satgas' as const,
  area_id: 'area-1',
  created_at: '2026-01-01T00:00:00Z',
};

// ─── Test Data ────────────────────────────────────────────────────────────────

const mockActivityPending = {
  id: 'activity-1',
  user_id: 'user-satgas',
  user: { id: 'user-satgas', username: 'satgas1', full_name: 'Satgas One', role: 'satgas' },
  shift_id: 'shift-1',
  area_id: 'area-1',
  area: { id: 'area-1', name: 'Taman Bungkul' },
  activity_type_id: 'type-1',
  activity_type: { id: 'type-1', code: 'SWEEPING', name: 'Penyapuan' },
  description: 'Penyapuan area taman',
  photo_urls: ['photo1.jpg'],
  gps_lat: -7.289383,
  gps_lng: 112.742308,
  status: 'pending' as const,
  created_at: '2026-02-16T08:00:00Z',
};

const mockActivityApproved = {
  ...mockActivityPending,
  id: 'activity-2',
  status: 'approved' as const,
  created_at: '2026-02-15T08:00:00Z',
};

const mockActivityRejected = {
  ...mockActivityPending,
  id: 'activity-3',
  status: 'rejected' as const,
  created_at: '2026-02-14T08:00:00Z',
};

const mockActivitiesData = {
  data: [mockActivityPending, mockActivityApproved, mockActivityRejected],
  meta: { total: 3, page: 1, limit: 20, totalPages: 1 },
};

const mockActivityTypes = [
  { id: 'type-1', code: 'SWEEPING', name: 'Penyapuan' },
  { id: 'type-2', code: 'WATERING', name: 'Penyiraman' },
];

const mockAreasData = {
  data: [
    { id: 'area-1', name: 'Taman Bungkul', code: 'TB' },
    { id: 'area-2', name: 'Taman Mundu', code: 'TM' },
  ],
  meta: { total: 2, page: 1, limit: 20, totalPages: 1 },
};

const mockMutate = jest.fn();
const mockApproveMutation = { mutateAsync: mockMutate, isPending: false };
const mockRejectMutation = { mutateAsync: mockMutate, isPending: false };

// ─── Wrapper ──────────────────────────────────────────────────────────────────

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

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('ActivitiesPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    (activitiesApi.useActivities as jest.Mock).mockReturnValue({
      data: mockActivitiesData,
      isLoading: false,
      error: null,
    });

    (activitiesApi.useApproveActivity as jest.Mock).mockReturnValue(mockApproveMutation);
    (activitiesApi.useRejectActivity as jest.Mock).mockReturnValue(mockRejectMutation);

    (activityTypesApi.useActivityTypes as jest.Mock).mockReturnValue({
      data: mockActivityTypes,
      isLoading: false,
    });

    (areasApi.useAreas as jest.Mock).mockReturnValue({
      data: mockAreasData,
      isLoading: false,
    });
  });

  // ── Authentication & Authorization ─────────────────────────────────────────

  describe('Authentication & Authorization', () => {
    it('should show loading spinner while auth is resolving', () => {
      mockUseAuth.mockReturnValue({ user: null, loading: true });

      const { container } = render(<ActivitiesPage />, { wrapper: createWrapper() });

      expect(screen.getByText(/memuat/i)).toBeInTheDocument();
      expect(container.querySelector('.animate-spin')).toBeInTheDocument();
    });

    it('should show loading state when user is null regardless of loading flag', () => {
      mockUseAuth.mockReturnValue({ user: null, loading: false });

      const { container } = render(<ActivitiesPage />, { wrapper: createWrapper() });

      expect(container.querySelector('.animate-spin')).toBeInTheDocument();
    });

    it('should allow admin_system role to access the page', () => {
      mockUseAuth.mockReturnValue({ user: mockAdminSystemUser, loading: false });

      render(<ActivitiesPage />, { wrapper: createWrapper() });

      expect(screen.getByText(/kelola dan tinjau aktivitas kerja/i)).toBeInTheDocument();
      expect(mockPush).not.toHaveBeenCalled();
    });

    it('should allow korlap role to access the page', () => {
      mockUseAuth.mockReturnValue({ user: mockKorlapUser, loading: false });

      render(<ActivitiesPage />, { wrapper: createWrapper() });

      expect(screen.getByText(/kelola dan tinjau aktivitas kerja/i)).toBeInTheDocument();
      expect(mockPush).not.toHaveBeenCalled();
    });

    it('should allow kepala_rayon role to access the page', () => {
      mockUseAuth.mockReturnValue({ user: mockKepalaRayonUser, loading: false });

      render(<ActivitiesPage />, { wrapper: createWrapper() });

      expect(screen.getByText(/kelola dan tinjau aktivitas kerja/i)).toBeInTheDocument();
      expect(mockPush).not.toHaveBeenCalled();
    });

    it('should allow admin_data role to access the page', () => {
      mockUseAuth.mockReturnValue({ user: mockAdminDataUser, loading: false });

      render(<ActivitiesPage />, { wrapper: createWrapper() });

      expect(screen.getByText(/kelola dan tinjau aktivitas kerja/i)).toBeInTheDocument();
      expect(mockPush).not.toHaveBeenCalled();
    });

    it('should redirect satgas role to home', () => {
      mockUseAuth.mockReturnValue({ user: mockSatgasUser, loading: false });

      render(<ActivitiesPage />, { wrapper: createWrapper() });

      expect(mockPush).toHaveBeenCalledWith('/');
    });

    it('should render nothing for unauthorized satgas role', () => {
      mockUseAuth.mockReturnValue({ user: mockSatgasUser, loading: false });

      const { container } = render(<ActivitiesPage />, { wrapper: createWrapper() });

      expect(container.textContent).toBe('');
    });
  });

  // ── Page Structure ─────────────────────────────────────────────────────────

  describe('Page Structure', () => {
    beforeEach(() => {
      mockUseAuth.mockReturnValue({ user: mockAdminSystemUser, loading: false });
    });

    it('should render the page subtitle', () => {
      render(<ActivitiesPage />, { wrapper: createWrapper() });

      expect(screen.getByText(/kelola dan tinjau aktivitas kerja/i)).toBeInTheDocument();
    });

    it('should render the Daftar Aktivitas section heading', () => {
      render(<ActivitiesPage />, { wrapper: createWrapper() });

      expect(
        screen.getByRole('heading', { name: /daftar aktivitas/i, level: 2 })
      ).toBeInTheDocument();
    });
  });

  // ── Filter Rendering ───────────────────────────────────────────────────────
  //
  // FormSelect uses Radix UI Select which renders a <button role="combobox">.
  // The label text is rendered as a <label> element. We test for the label text
  // and the combobox trigger presence; we do NOT inspect option values since
  // Radix renders them via a portal (invisible in JSDOM until opened).

  describe('Filter Rendering', () => {
    beforeEach(() => {
      mockUseAuth.mockReturnValue({ user: mockAdminSystemUser, loading: false });
    });

    it('should render the "Tipe Aktivitas" filter label', () => {
      render(<ActivitiesPage />, { wrapper: createWrapper() });

      // "Tipe Aktivitas" appears as both a filter label and a table column header
      const matches = screen.getAllByText('Tipe Aktivitas');
      expect(matches.length).toBeGreaterThanOrEqual(1);
    });

    it('should render the "Status" filter label', () => {
      render(<ActivitiesPage />, { wrapper: createWrapper() });

      // "Status" appears as both a filter label and a table column header
      const matches = screen.getAllByText('Status');
      expect(matches.length).toBeGreaterThanOrEqual(1);
    });

    it('should render the "Area" filter label', () => {
      render(<ActivitiesPage />, { wrapper: createWrapper() });

      // "Area" appears as both a filter label and a table column header
      const matches = screen.getAllByText('Area');
      expect(matches.length).toBeGreaterThanOrEqual(1);
    });

    it('should render the Dari Tanggal date input', () => {
      render(<ActivitiesPage />, { wrapper: createWrapper() });

      expect(screen.getByLabelText(/dari tanggal/i)).toBeInTheDocument();
    });

    it('should render the Sampai Tanggal date input', () => {
      render(<ActivitiesPage />, { wrapper: createWrapper() });

      expect(screen.getByLabelText(/sampai tanggal/i)).toBeInTheDocument();
    });

    it('should render three combobox filter triggers (Tipe, Status, Area)', () => {
      render(<ActivitiesPage />, { wrapper: createWrapper() });

      const comboboxes = screen.getAllByRole('combobox');
      expect(comboboxes.length).toBe(3);
    });

    it('should display default "Semua Tipe" value for the activity type filter', () => {
      render(<ActivitiesPage />, { wrapper: createWrapper() });

      expect(screen.getByText('Semua Tipe')).toBeInTheDocument();
    });

    it('should display default "Semua Status" value for the status filter', () => {
      render(<ActivitiesPage />, { wrapper: createWrapper() });

      expect(screen.getByText('Semua Status')).toBeInTheDocument();
    });

    it('should display default "Semua Area" value for the area filter', () => {
      render(<ActivitiesPage />, { wrapper: createWrapper() });

      expect(screen.getByText('Semua Area')).toBeInTheDocument();
    });

    it('should NOT show Reset Filter button when no filters are active', () => {
      render(<ActivitiesPage />, { wrapper: createWrapper() });

      expect(screen.queryByRole('button', { name: /reset filter/i })).not.toBeInTheDocument();
    });

    it('should show Reset Filter button when the from-date filter is set', async () => {
      const user = userEvent.setup();
      render(<ActivitiesPage />, { wrapper: createWrapper() });

      const fromDateInput = screen.getByLabelText(/dari tanggal/i);
      await user.type(fromDateInput, '2026-02-01');

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /reset filter/i })).toBeInTheDocument();
      });
    });

    it('should clear date filters when Reset Filter is clicked', async () => {
      const user = userEvent.setup();
      render(<ActivitiesPage />, { wrapper: createWrapper() });

      const fromDateInput = screen.getByLabelText(/dari tanggal/i) as HTMLInputElement;
      await user.type(fromDateInput, '2026-02-01');

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /reset filter/i })).toBeInTheDocument();
      });

      await user.click(screen.getByRole('button', { name: /reset filter/i }));

      await waitFor(() => {
        expect(screen.queryByRole('button', { name: /reset filter/i })).not.toBeInTheDocument();
        expect(fromDateInput.value).toBe('');
      });
    });
  });

  // ── Table Rendering ────────────────────────────────────────────────────────

  describe('Table Rendering', () => {
    beforeEach(() => {
      mockUseAuth.mockReturnValue({ user: mockAdminSystemUser, loading: false });
    });

    it('should render all table column headers', () => {
      render(<ActivitiesPage />, { wrapper: createWrapper() });

      // Column headers come from DataTable <th> cells
      const headers = screen.getAllByRole('columnheader').map((h) => h.textContent);
      expect(headers).toContain('Tanggal');
      expect(headers).toContain('Pengguna');
      expect(headers).toContain('Tipe Aktivitas');
      expect(headers).toContain('Area');
      expect(headers).toContain('Status');
      expect(headers).toContain('Foto');
      expect(headers).toContain('Aksi');
    });

    it('should render user full name in the table', () => {
      render(<ActivitiesPage />, { wrapper: createWrapper() });

      expect(screen.getAllByText('Satgas One').length).toBeGreaterThan(0);
    });

    it('should render user username in the table', () => {
      render(<ActivitiesPage />, { wrapper: createWrapper() });

      expect(screen.getAllByText('satgas1').length).toBeGreaterThan(0);
    });

    it('should render activity type name as badge', () => {
      render(<ActivitiesPage />, { wrapper: createWrapper() });

      expect(screen.getAllByText('Penyapuan').length).toBeGreaterThan(0);
    });

    it('should render area name in the table', () => {
      render(<ActivitiesPage />, { wrapper: createWrapper() });

      expect(screen.getAllByText('Taman Bungkul').length).toBeGreaterThan(0);
    });

    it('should render photo count badge for each activity', () => {
      render(<ActivitiesPage />, { wrapper: createWrapper() });

      expect(screen.getAllByText('1 foto').length).toBeGreaterThan(0);
    });

    it('should render a Detail link for each activity row', () => {
      render(<ActivitiesPage />, { wrapper: createWrapper() });

      const detailLinks = screen.getAllByRole('link', { name: /detail/i });
      expect(detailLinks).toHaveLength(3);
    });

    it('should render Detail links with the correct activity href', () => {
      render(<ActivitiesPage />, { wrapper: createWrapper() });

      const detailLinks = screen.getAllByRole('link', { name: /detail/i });
      expect(detailLinks[0]).toHaveAttribute('href', '/activities/activity-1');
    });
  });

  // ── Status Badges ──────────────────────────────────────────────────────────

  describe('Status Badges', () => {
    beforeEach(() => {
      mockUseAuth.mockReturnValue({ user: mockAdminSystemUser, loading: false });
    });

    it('should display "Menunggu" label for pending status', () => {
      render(<ActivitiesPage />, { wrapper: createWrapper() });

      expect(screen.getByText('Menunggu')).toBeInTheDocument();
    });

    it('should display "Disetujui" label for approved status', () => {
      render(<ActivitiesPage />, { wrapper: createWrapper() });

      expect(screen.getByText('Disetujui')).toBeInTheDocument();
    });

    it('should display "Ditolak" label for rejected status', () => {
      render(<ActivitiesPage />, { wrapper: createWrapper() });

      expect(screen.getByText('Ditolak')).toBeInTheDocument();
    });
  });

  // ── Loading State ──────────────────────────────────────────────────────────

  describe('Loading State', () => {
    beforeEach(() => {
      mockUseAuth.mockReturnValue({ user: mockAdminSystemUser, loading: false });
    });

    it('should show loading skeleton rows while fetching activities', () => {
      (activitiesApi.useActivities as jest.Mock).mockReturnValue({
        data: undefined,
        isLoading: true,
        error: null,
      });

      const { container } = render(<ActivitiesPage />, { wrapper: createWrapper() });

      const skeletons = container.querySelectorAll('.animate-pulse');
      expect(skeletons.length).toBeGreaterThan(0);
    });
  });

  // ── Empty State ────────────────────────────────────────────────────────────

  describe('Empty State', () => {
    beforeEach(() => {
      mockUseAuth.mockReturnValue({ user: mockAdminSystemUser, loading: false });
    });

    it('should display empty message when no activities are returned', () => {
      (activitiesApi.useActivities as jest.Mock).mockReturnValue({
        data: { data: [], meta: { total: 0, page: 1, limit: 20, totalPages: 1 } },
        isLoading: false,
        error: null,
      });

      render(<ActivitiesPage />, { wrapper: createWrapper() });

      expect(screen.getByText(/tidak ada aktivitas/i)).toBeInTheDocument();
    });

    it('should display 0 total when no activities exist', () => {
      (activitiesApi.useActivities as jest.Mock).mockReturnValue({
        data: { data: [], meta: { total: 0, page: 1, limit: 20, totalPages: 1 } },
        isLoading: false,
        error: null,
      });

      render(<ActivitiesPage />, { wrapper: createWrapper() });

      expect(screen.getByText('0 total')).toBeInTheDocument();
    });
  });

  // ── Approve/Reject Actions — Approver Roles ────────────────────────────────

  describe('Approve/Reject Actions for Approver Roles', () => {
    it('should show Setujui and Tolak buttons for korlap when an activity is pending', () => {
      mockUseAuth.mockReturnValue({ user: mockKorlapUser, loading: false });

      render(<ActivitiesPage />, { wrapper: createWrapper() });

      expect(screen.getByRole('button', { name: /setujui/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /^tolak$/i })).toBeInTheDocument();
    });

    it('should show Setujui and Tolak buttons for kepala_rayon when an activity is pending', () => {
      mockUseAuth.mockReturnValue({ user: mockKepalaRayonUser, loading: false });

      render(<ActivitiesPage />, { wrapper: createWrapper() });

      expect(screen.getByRole('button', { name: /setujui/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /^tolak$/i })).toBeInTheDocument();
    });

    it('should NOT show approve/reject buttons when no activities are pending', () => {
      mockUseAuth.mockReturnValue({ user: mockKorlapUser, loading: false });

      (activitiesApi.useActivities as jest.Mock).mockReturnValue({
        data: {
          data: [mockActivityApproved, mockActivityRejected],
          meta: { total: 2, page: 1, limit: 20, totalPages: 1 },
        },
        isLoading: false,
        error: null,
      });

      render(<ActivitiesPage />, { wrapper: createWrapper() });

      expect(screen.queryByRole('button', { name: /setujui/i })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /^tolak$/i })).not.toBeInTheDocument();
    });

    it('should call approve mutation with the activity id when Setujui is clicked', async () => {
      const user = userEvent.setup();
      mockUseAuth.mockReturnValue({ user: mockKorlapUser, loading: false });
      mockMutate.mockResolvedValueOnce({ id: 'activity-1', status: 'approved' });

      render(<ActivitiesPage />, { wrapper: createWrapper() });

      await user.click(screen.getByRole('button', { name: /setujui/i }));

      expect(mockMutate).toHaveBeenCalledWith('activity-1');
    });

    it('should open reject reason form when Tolak button is clicked', async () => {
      const user = userEvent.setup();
      mockUseAuth.mockReturnValue({ user: mockKorlapUser, loading: false });

      render(<ActivitiesPage />, { wrapper: createWrapper() });

      await user.click(screen.getByRole('button', { name: /^tolak$/i }));

      await waitFor(() => {
        expect(screen.getByText(/alasan penolakan aktivitas/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/alasan/i)).toBeInTheDocument();
      });
    });

    it('should disable the Tolak Aktivitas submit button when the reason field is empty', async () => {
      const user = userEvent.setup();
      mockUseAuth.mockReturnValue({ user: mockKorlapUser, loading: false });

      render(<ActivitiesPage />, { wrapper: createWrapper() });

      await user.click(screen.getByRole('button', { name: /^tolak$/i }));

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /tolak aktivitas/i })).toBeDisabled();
      });
    });

    it('should enable the Tolak Aktivitas button after a reason is entered', async () => {
      const user = userEvent.setup();
      mockUseAuth.mockReturnValue({ user: mockKorlapUser, loading: false });

      render(<ActivitiesPage />, { wrapper: createWrapper() });

      await user.click(screen.getByRole('button', { name: /^tolak$/i }));

      await waitFor(() => {
        expect(screen.getByLabelText(/alasan/i)).toBeInTheDocument();
      });

      await user.type(screen.getByLabelText(/alasan/i), 'Foto tidak sesuai');

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /tolak aktivitas/i })).not.toBeDisabled();
      });
    });

    it('should dismiss the reject reason form when Batal is clicked', async () => {
      const user = userEvent.setup();
      mockUseAuth.mockReturnValue({ user: mockKorlapUser, loading: false });

      render(<ActivitiesPage />, { wrapper: createWrapper() });

      await user.click(screen.getByRole('button', { name: /^tolak$/i }));

      await waitFor(() => {
        expect(screen.getByText(/alasan penolakan aktivitas/i)).toBeInTheDocument();
      });

      await user.click(screen.getByRole('button', { name: /batal/i }));

      await waitFor(() => {
        expect(screen.queryByText(/alasan penolakan aktivitas/i)).not.toBeInTheDocument();
      });
    });

    it('should call reject mutation with id and reason when Tolak Aktivitas is confirmed', async () => {
      const user = userEvent.setup();
      mockUseAuth.mockReturnValue({ user: mockKorlapUser, loading: false });
      mockMutate.mockResolvedValueOnce({ id: 'activity-1', status: 'rejected' });

      render(<ActivitiesPage />, { wrapper: createWrapper() });

      await user.click(screen.getByRole('button', { name: /^tolak$/i }));

      await waitFor(() => {
        expect(screen.getByLabelText(/alasan/i)).toBeInTheDocument();
      });

      await user.type(screen.getByLabelText(/alasan/i), 'Deskripsi tidak lengkap');
      await user.click(screen.getByRole('button', { name: /tolak aktivitas/i }));

      expect(mockMutate).toHaveBeenCalledWith({
        id: 'activity-1',
        reason: 'Deskripsi tidak lengkap',
      });
    });
  });

  // ── No Approve/Reject for Non-Approver Roles ───────────────────────────────

  describe('No Approve/Reject Actions for Non-Approver Roles', () => {
    it('should NOT show Setujui button for admin_system role', () => {
      mockUseAuth.mockReturnValue({ user: mockAdminSystemUser, loading: false });

      render(<ActivitiesPage />, { wrapper: createWrapper() });

      expect(screen.queryByRole('button', { name: /setujui/i })).not.toBeInTheDocument();
    });

    it('should NOT show Tolak button for admin_system role', () => {
      mockUseAuth.mockReturnValue({ user: mockAdminSystemUser, loading: false });

      render(<ActivitiesPage />, { wrapper: createWrapper() });

      expect(screen.queryByRole('button', { name: /^tolak$/i })).not.toBeInTheDocument();
    });

    it('should NOT show Setujui button for admin_data role', () => {
      mockUseAuth.mockReturnValue({ user: mockAdminDataUser, loading: false });

      render(<ActivitiesPage />, { wrapper: createWrapper() });

      expect(screen.queryByRole('button', { name: /setujui/i })).not.toBeInTheDocument();
    });

    it('should NOT show Tolak button for admin_data role', () => {
      mockUseAuth.mockReturnValue({ user: mockAdminDataUser, loading: false });

      render(<ActivitiesPage />, { wrapper: createWrapper() });

      expect(screen.queryByRole('button', { name: /^tolak$/i })).not.toBeInTheDocument();
    });

    it('should still render Detail links for non-approver roles', () => {
      mockUseAuth.mockReturnValue({ user: mockAdminDataUser, loading: false });

      render(<ActivitiesPage />, { wrapper: createWrapper() });

      expect(screen.getAllByRole('link', { name: /detail/i })).toHaveLength(3);
    });
  });

  // ── Pagination ─────────────────────────────────────────────────────────────

  describe('Pagination', () => {
    beforeEach(() => {
      mockUseAuth.mockReturnValue({ user: mockAdminSystemUser, loading: false });
    });

    it('should NOT show pagination when only one page exists', () => {
      render(<ActivitiesPage />, { wrapper: createWrapper() });

      expect(screen.queryByRole('button', { name: /sebelumnya/i })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /selanjutnya/i })).not.toBeInTheDocument();
    });

    it('should show Sebelumnya and Selanjutnya buttons when multiple pages exist', () => {
      (activitiesApi.useActivities as jest.Mock).mockReturnValue({
        data: {
          data: [mockActivityPending],
          meta: { total: 40, page: 1, limit: 20, totalPages: 2 },
        },
        isLoading: false,
        error: null,
      });

      render(<ActivitiesPage />, { wrapper: createWrapper() });

      expect(screen.getByRole('button', { name: /sebelumnya/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /selanjutnya/i })).toBeInTheDocument();
    });

    it('should disable Sebelumnya button on the first page', () => {
      (activitiesApi.useActivities as jest.Mock).mockReturnValue({
        data: {
          data: [mockActivityPending],
          meta: { total: 40, page: 1, limit: 20, totalPages: 2 },
        },
        isLoading: false,
        error: null,
      });

      render(<ActivitiesPage />, { wrapper: createWrapper() });

      expect(screen.getByRole('button', { name: /sebelumnya/i })).toBeDisabled();
    });

    it('should disable Selanjutnya button on the last page', () => {
      (activitiesApi.useActivities as jest.Mock).mockReturnValue({
        data: {
          data: [mockActivityPending],
          meta: { total: 40, page: 2, limit: 20, totalPages: 2 },
        },
        isLoading: false,
        error: null,
      });

      render(<ActivitiesPage />, { wrapper: createWrapper() });

      expect(screen.getByRole('button', { name: /selanjutnya/i })).toBeDisabled();
    });

    it('should display current page and total pages text', () => {
      (activitiesApi.useActivities as jest.Mock).mockReturnValue({
        data: {
          data: [mockActivityPending],
          meta: { total: 40, page: 1, limit: 20, totalPages: 2 },
        },
        isLoading: false,
        error: null,
      });

      render(<ActivitiesPage />, { wrapper: createWrapper() });

      expect(screen.getByText(/halaman 1 dari 2/i)).toBeInTheDocument();
    });

    it('should display the total activity count from pagination meta', () => {
      render(<ActivitiesPage />, { wrapper: createWrapper() });

      expect(screen.getByText('3 total')).toBeInTheDocument();
    });
  });

  // ── korlap Area Auto-scope ─────────────────────────────────────────────────

  describe('korlap Area Auto-scope', () => {
    it('should call useActivities with korlap area_id when user is korlap', async () => {
      mockUseAuth.mockReturnValue({ user: mockKorlapUser, loading: false });

      render(<ActivitiesPage />, { wrapper: createWrapper() });

      // After the auto-scope effect fires, the API should be called with the korlap's area_id
      await waitFor(() => {
        const calls = (activitiesApi.useActivities as jest.Mock).mock.calls;
        const lastCallFilters = calls[calls.length - 1][0];
        expect(lastCallFilters.area_id).toBe('area-1');
      });
    });
  });

  // ── Error Handling ─────────────────────────────────────────────────────────

  describe('Error Handling', () => {
    beforeEach(() => {
      mockUseAuth.mockReturnValue({ user: mockAdminSystemUser, loading: false });
    });

    it('should handle missing activities data gracefully without throwing', () => {
      (activitiesApi.useActivities as jest.Mock).mockReturnValue({
        data: undefined,
        isLoading: false,
        error: null,
      });

      expect(() => render(<ActivitiesPage />, { wrapper: createWrapper() })).not.toThrow();
    });

    it('should handle undefined activity types gracefully without throwing', () => {
      (activityTypesApi.useActivityTypes as jest.Mock).mockReturnValue({
        data: undefined,
        isLoading: false,
      });

      expect(() => render(<ActivitiesPage />, { wrapper: createWrapper() })).not.toThrow();
    });

    it('should handle undefined areas data gracefully without throwing', () => {
      (areasApi.useAreas as jest.Mock).mockReturnValue({
        data: undefined,
        isLoading: false,
      });

      expect(() => render(<ActivitiesPage />, { wrapper: createWrapper() })).not.toThrow();
    });
  });
});
