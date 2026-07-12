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
import * as areasApi from '@/lib/api/locations';

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
jest.mock('@/lib/api/locations');

// ─── Test Users ───────────────────────────────────────────────────────────────

const mockAdminSystemUser = {
  id: 'user-admin',
  username: 'admin_system1',
  full_name: 'Admin Sistem',
  role: 'admin_system' as const,
  location_id: null,
  created_at: '2026-01-01T00:00:00Z',
};

const mockKorlapUser = {
  id: 'user-korlap',
  username: 'korlap1',
  full_name: 'Koordinator Lapangan',
  role: 'korlap' as const,
  location_id: 'area-1',
  created_at: '2026-01-01T00:00:00Z',
};

const mockKepalaRayonUser = {
  id: 'user-kepala',
  username: 'kepala_rayon1',
  full_name: 'Kepala Rayon',
  role: 'kepala_rayon' as const,
  location_id: 'area-1',
  created_at: '2026-01-01T00:00:00Z',
};

const mockAdminDataUser = {
  id: 'user-admin-data',
  username: 'admin_data1',
  full_name: 'Admin Data',
  role: 'admin_data' as const,
  location_id: null,
  created_at: '2026-01-01T00:00:00Z',
};

const mockSatgasUser = {
  id: 'user-satgas',
  username: 'satgas1',
  full_name: 'Satgas One',
  role: 'satgas' as const,
  location_id: 'area-1',
  created_at: '2026-01-01T00:00:00Z',
};

// ─── Test Data ────────────────────────────────────────────────────────────────

const mockActivityPending = {
  id: 'activity-1',
  user_id: 'user-satgas',
  user: { id: 'user-satgas', username: 'satgas1', full_name: 'Satgas One', role: 'satgas' },
  shift_id: 'shift-1',
  location_id: 'area-1',
  location: { id: 'area-1', name: 'Taman Bungkul' },
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
const mockCreateActivityMutation = { mutateAsync: mockMutate, isPending: false, isError: false, error: null };
const mockUpdateActivityMutation = { mutateAsync: mockMutate, isPending: false, isError: false, error: null };
const mockDeleteActivityMutation = { mutateAsync: mockMutate, isPending: false, isError: false, error: null };

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
    (activitiesApi.useCreateActivity as jest.Mock).mockReturnValue(mockCreateActivityMutation);
    (activitiesApi.useUpdateActivity as jest.Mock).mockReturnValue(mockUpdateActivityMutation);
    (activitiesApi.useDeleteActivity as jest.Mock).mockReturnValue(mockDeleteActivityMutation);
    (activitiesApi.useRejectActivity as jest.Mock).mockReturnValue(mockRejectMutation);

    (activityTypesApi.useActivityTypes as jest.Mock).mockReturnValue({
      data: mockActivityTypes,
      isLoading: false,
    });

    (areasApi.useLocations as jest.Mock).mockReturnValue({
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

    it('should render the Rentang Tanggal date range picker', () => {
      render(<ActivitiesPage />, { wrapper: createWrapper() });

      expect(screen.getByText(/rentang tanggal/i)).toBeInTheDocument();
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

      expect(screen.queryByRole('button', { name: /atur ulang/i })).not.toBeInTheDocument();
    });

    it('should show Reset Filter button when the from-date filter is set', async () => {
      const user = userEvent.setup();
      render(<ActivitiesPage />, { wrapper: createWrapper() });

      // Find the DateRangePicker by its label text and interact with its trigger button
      const labelElement = screen.getByText(/rentang tanggal/i);
      const fieldContainer = labelElement.closest('div');
      const triggerButton = fieldContainer?.querySelector('button');

      if (triggerButton) {
        await user.click(triggerButton);
        // A preset chip commits the range immediately (a single calendar click only
        // sets the start), which activates the filter and reveals Reset.
        await user.click(await screen.findByRole('button', { name: '7 Hari' }));
      }

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /atur ulang/i })).toBeInTheDocument();
      });
    });

    it('should clear date filters when Reset Filter is clicked', async () => {
      const user = userEvent.setup();
      render(<ActivitiesPage />, { wrapper: createWrapper() });

      // Find the DateRangePicker by its label text and interact with its trigger button
      const labelElement = screen.getByText(/rentang tanggal/i);
      const fieldContainer = labelElement.closest('div');
      const triggerButton = fieldContainer?.querySelector('button');

      if (triggerButton) {
        await user.click(triggerButton);
        // A preset chip commits the range immediately (a single calendar click
        // only sets the start), which activates the filter and reveals Reset.
        await user.click(await screen.findByRole('button', { name: '7 Hari' }));
      }

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /atur ulang/i })).toBeInTheDocument();
      });

      await user.click(screen.getByRole('button', { name: /atur ulang/i }));

      await waitFor(() => {
        expect(screen.queryByRole('button', { name: /atur ulang/i })).not.toBeInTheDocument();
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

    it('should render a "Lihat" menuitem for each activity row (via kebab menu)', async () => {
      const user = userEvent.setup();
      render(<ActivitiesPage />, { wrapper: createWrapper() });

      const kebabTriggers = screen.getAllByRole('button', { name: /aksi/i });
      expect(kebabTriggers).toHaveLength(3);

      // Open first row's kebab menu
      await user.click(kebabTriggers[0]);

      // Find the "Lihat" menuitem
      const lihatItem = screen.getByRole('menuitem', { name: /lihat/i });
      expect(lihatItem).toBeInTheDocument();
    });

    it('should open a read-only detail modal when Lihat menuitem is clicked', async () => {
      const user = userEvent.setup();
      render(<ActivitiesPage />, { wrapper: createWrapper() });

      const kebabTriggers = screen.getAllByRole('button', { name: /aksi/i });
      await user.click(kebabTriggers[0]);

      const lihatItem = screen.getByRole('menuitem', { name: /lihat/i });
      await user.click(lihatItem);

      expect(await screen.findByRole('dialog')).toBeInTheDocument();
      expect(screen.getByText('Detail Aktivitas')).toBeInTheDocument();
      expect(mockPush).not.toHaveBeenCalled();
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

      // The DataTable loading state renders NB Skeletons (animate-shimmer + role=status).
      const skeletons = container.querySelectorAll('.animate-shimmer, [role="status"]');
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
    it('should show Setujui and Tolak menuitems for korlap when an activity is pending', async () => {
      const user = userEvent.setup();
      mockUseAuth.mockReturnValue({ user: mockKorlapUser, loading: false });

      render(<ActivitiesPage />, { wrapper: createWrapper() });

      const kebabTriggers = screen.getAllByRole('button', { name: /aksi/i });
      await user.click(kebabTriggers[0]); // Open kebab for first (pending) activity

      expect(screen.getByRole('menuitem', { name: /setujui/i })).toBeInTheDocument();
      expect(screen.getByRole('menuitem', { name: /^tolak$/i })).toBeInTheDocument();
    });

    it('should show Setujui and Tolak menuitems for kepala_rayon when an activity is pending', async () => {
      const user = userEvent.setup();
      mockUseAuth.mockReturnValue({ user: mockKepalaRayonUser, loading: false });

      render(<ActivitiesPage />, { wrapper: createWrapper() });

      const kebabTriggers = screen.getAllByRole('button', { name: /aksi/i });
      await user.click(kebabTriggers[0]); // Open kebab for first (pending) activity

      expect(screen.getByRole('menuitem', { name: /setujui/i })).toBeInTheDocument();
      expect(screen.getByRole('menuitem', { name: /^tolak$/i })).toBeInTheDocument();
    });

    it('should NOT show approve/reject menuitems when no activities are pending', async () => {
      const user = userEvent.setup();
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

      const kebabTriggers = screen.getAllByRole('button', { name: /aksi/i });
      await user.click(kebabTriggers[0]); // Open kebab for first (approved) activity

      expect(screen.queryByRole('menuitem', { name: /setujui/i })).not.toBeInTheDocument();
      expect(screen.queryByRole('menuitem', { name: /^tolak$/i })).not.toBeInTheDocument();
    });

    it('should call approve mutation with the activity id when Setujui menuitem is clicked', async () => {
      const user = userEvent.setup();
      mockUseAuth.mockReturnValue({ user: mockKorlapUser, loading: false });
      mockMutate.mockResolvedValueOnce({ id: 'activity-1', status: 'approved' });

      render(<ActivitiesPage />, { wrapper: createWrapper() });

      const kebabTriggers = screen.getAllByRole('button', { name: /aksi/i });
      await user.click(kebabTriggers[0]);

      const setujuiItem = screen.getByRole('menuitem', { name: /setujui/i });
      await user.click(setujuiItem);

      expect(mockMutate).toHaveBeenCalledWith('activity-1');
    });

    it('should open reject reason form when Tolak menuitem is clicked', async () => {
      const user = userEvent.setup();
      mockUseAuth.mockReturnValue({ user: mockKorlapUser, loading: false });

      render(<ActivitiesPage />, { wrapper: createWrapper() });

      const kebabTriggers = screen.getAllByRole('button', { name: /aksi/i });
      await user.click(kebabTriggers[0]);

      const tolakItem = screen.getByRole('menuitem', { name: /^tolak$/i });
      await user.click(tolakItem);

      await waitFor(() => {
        expect(screen.getByText(/alasan penolakan aktivitas/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/alasan/i)).toBeInTheDocument();
      });
    });

    it('should disable the Tolak Aktivitas submit button when the reason field is empty', async () => {
      const user = userEvent.setup();
      mockUseAuth.mockReturnValue({ user: mockKorlapUser, loading: false });

      render(<ActivitiesPage />, { wrapper: createWrapper() });

      const kebabTriggers = screen.getAllByRole('button', { name: /aksi/i });
      await user.click(kebabTriggers[0]);

      const tolakItem = screen.getByRole('menuitem', { name: /^tolak$/i });
      await user.click(tolakItem);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /tolak aktivitas/i })).toBeDisabled();
      });
    });

    it('should enable the Tolak Aktivitas button after a reason is entered', async () => {
      const user = userEvent.setup();
      mockUseAuth.mockReturnValue({ user: mockKorlapUser, loading: false });

      render(<ActivitiesPage />, { wrapper: createWrapper() });

      const kebabTriggers = screen.getAllByRole('button', { name: /aksi/i });
      await user.click(kebabTriggers[0]);

      const tolakItem = screen.getByRole('menuitem', { name: /^tolak$/i });
      await user.click(tolakItem);

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

      const kebabTriggers = screen.getAllByRole('button', { name: /aksi/i });
      await user.click(kebabTriggers[0]);

      const tolakItem = screen.getByRole('menuitem', { name: /^tolak$/i });
      await user.click(tolakItem);

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

      const kebabTriggers = screen.getAllByRole('button', { name: /aksi/i });
      await user.click(kebabTriggers[0]);

      const tolakItem = screen.getByRole('menuitem', { name: /^tolak$/i });
      await user.click(tolakItem);

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
    it('should NOT show Setujui menuitem for admin_system role', async () => {
      const user = userEvent.setup();
      mockUseAuth.mockReturnValue({ user: mockAdminSystemUser, loading: false });

      render(<ActivitiesPage />, { wrapper: createWrapper() });

      const kebabTriggers = screen.getAllByRole('button', { name: /aksi/i });
      await user.click(kebabTriggers[0]); // Open kebab for first (pending) activity

      expect(screen.queryByRole('menuitem', { name: /setujui/i })).not.toBeInTheDocument();
    });

    it('should NOT show Tolak menuitem for admin_system role', async () => {
      const user = userEvent.setup();
      mockUseAuth.mockReturnValue({ user: mockAdminSystemUser, loading: false });

      render(<ActivitiesPage />, { wrapper: createWrapper() });

      const kebabTriggers = screen.getAllByRole('button', { name: /aksi/i });
      await user.click(kebabTriggers[0]); // Open kebab for first (pending) activity

      expect(screen.queryByRole('menuitem', { name: /^tolak$/i })).not.toBeInTheDocument();
    });

    it('should NOT show Setujui menuitem for admin_data role', async () => {
      const user = userEvent.setup();
      mockUseAuth.mockReturnValue({ user: mockAdminDataUser, loading: false });

      render(<ActivitiesPage />, { wrapper: createWrapper() });

      const kebabTriggers = screen.getAllByRole('button', { name: /aksi/i });
      await user.click(kebabTriggers[0]); // Open kebab for first (pending) activity

      expect(screen.queryByRole('menuitem', { name: /setujui/i })).not.toBeInTheDocument();
    });

    it('should NOT show Tolak menuitem for admin_data role', async () => {
      const user = userEvent.setup();
      mockUseAuth.mockReturnValue({ user: mockAdminDataUser, loading: false });

      render(<ActivitiesPage />, { wrapper: createWrapper() });

      const kebabTriggers = screen.getAllByRole('button', { name: /aksi/i });
      await user.click(kebabTriggers[0]); // Open kebab for first (pending) activity

      expect(screen.queryByRole('menuitem', { name: /^tolak$/i })).not.toBeInTheDocument();
    });

    it('should still render "Lihat" menuitems for non-approver roles', async () => {
      const user = userEvent.setup();
      mockUseAuth.mockReturnValue({ user: mockAdminDataUser, loading: false });

      render(<ActivitiesPage />, { wrapper: createWrapper() });

      const kebabTriggers = screen.getAllByRole('button', { name: /aksi/i });
      expect(kebabTriggers).toHaveLength(3);

      // Verify all rows have kebab menus with "Lihat"
      for (let i = 0; i < kebabTriggers.length; i++) {
        // Close any open menu from previous iteration
        const existingMenuitems = screen.queryAllByRole('menuitem');
        if (existingMenuitems.length > 0) {
          await user.keyboard('{Escape}');
        }

        await user.click(kebabTriggers[i]);
        expect(await screen.findByRole('menuitem', { name: /lihat/i })).toBeInTheDocument();
      }
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
    it('should call useActivities with korlap location_id when user is korlap', async () => {
      mockUseAuth.mockReturnValue({ user: mockKorlapUser, loading: false });

      render(<ActivitiesPage />, { wrapper: createWrapper() });

      // After the auto-scope effect fires, the API should be called with the korlap's location_id
      await waitFor(() => {
        const calls = (activitiesApi.useActivities as jest.Mock).mock.calls;
        const lastCallFilters = calls[calls.length - 1][0];
        expect(lastCallFilters.location_id).toBe('area-1');
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
      (areasApi.useLocations as jest.Mock).mockReturnValue({
        data: undefined,
        isLoading: false,
      });

      expect(() => render(<ActivitiesPage />, { wrapper: createWrapper() })).not.toThrow();
    });
  });
});
