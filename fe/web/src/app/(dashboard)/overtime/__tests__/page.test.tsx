/**
 * Unit Tests: Overtime List Page (Phase 2C)
 * Tests overtime listing, filtering, approval/rejection, and access control.
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import OvertimePage from '../page';
import '@testing-library/jest-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Mock next/navigation
const mockPush = jest.fn();
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
  usePathname: () => '/overtime',
}));

// Mock next/link so hrefs are rendered as simple anchors
jest.mock('next/link', () => {
  const MockLink = ({
    href,
    children,
    ...rest
  }: {
    href: string;
    children: React.ReactNode;
    [key: string]: unknown;
  }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  );
  MockLink.displayName = 'MockLink';
  return MockLink;
});

// Mock auth hook
const mockUseAuth = jest.fn();
jest.mock('@/lib/auth/hooks', () => ({
  useAuth: () => mockUseAuth(),
}));

// Mock the entire overtime API module
jest.mock('@/lib/api/overtime');

// Import mocked module so we can control return values
import * as overtimeApi from '@/lib/api/overtime';

// ─── Test Data ────────────────────────────────────────────────────────────────

const mockOvertime = {
  id: 'ot-1',
  user_id: 'user-1',
  user: { id: 'user-1', username: 'satgas1', full_name: 'Satgas One', role: 'satgas' },
  area_id: 'area-1',
  area: { id: 'area-1', name: 'Taman Bungkul' },
  start_datetime: '2026-02-16T17:00:00+07:00',
  end_datetime: '2026-02-16T20:00:00+07:00',
  status: 'pending' as const,
  activity_type_id: 'type-1',
  activity_type: { id: 'type-1', code: 'PLANTING', name: 'Penanaman' },
  description: 'Lembur penanaman',
  photo_urls: ['photo1.jpg'],
  gps_lat: -7.289383,
  gps_lng: 112.742308,
  created_at: '2026-02-16T08:00:00Z',
};

const mockOvertimeApproved = {
  ...mockOvertime,
  id: 'ot-2',
  status: 'approved' as const,
  user: { id: 'user-2', username: 'satgas2', full_name: 'Satgas Two', role: 'satgas' },
};

const mockPaginatedResponse = {
  data: [mockOvertime],
  meta: { total: 1, page: 1, limit: 20, totalPages: 1 },
};

// Default mutation mock
const mockMutateAsync = jest.fn().mockResolvedValue({});
const defaultMutation = { mutateAsync: mockMutateAsync, isPending: false };

// ─── Users ────────────────────────────────────────────────────────────────────

const makeUser = (role: string) => ({
  id: 'u-1',
  username: `${role}1`,
  full_name: `User ${role}`,
  role,
  area_id: null,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
});

const adminSystemUser = makeUser('admin_system');
const korlapUser = makeUser('korlap');
const kepalaRayonUser = makeUser('kepala_rayon');
const adminDataUser = makeUser('admin_data');
const satgasUser = makeUser('satgas');

// ─── QueryClient Wrapper ───────────────────────────────────────────────────────

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  Wrapper.displayName = 'TestWrapper';
  return Wrapper;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function setupDefaultMocks() {
  (overtimeApi.useOvertimes as jest.Mock).mockReturnValue({
    data: mockPaginatedResponse,
    isLoading: false,
    error: null,
  });
  (overtimeApi.useApproveOvertime as jest.Mock).mockReturnValue(defaultMutation);
  (overtimeApi.useRejectOvertime as jest.Mock).mockReturnValue(defaultMutation);
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('OvertimePage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setupDefaultMocks();
  });

  // ── 1. Authentication & Authorization ────────────────────────────────────────

  describe('Authentication & Authorization', () => {
    it('should show a loading spinner while auth is resolving', () => {
      mockUseAuth.mockReturnValue({ user: null, loading: true });

      const { container } = render(<OvertimePage />, { wrapper: createWrapper() });

      expect(screen.getByText(/memuat/i)).toBeInTheDocument();
      expect(container.querySelector('.animate-spin')).toBeInTheDocument();
    });

    it('should render the page for admin_system role', () => {
      mockUseAuth.mockReturnValue({ user: adminSystemUser, loading: false });

      render(<OvertimePage />, { wrapper: createWrapper() });

      expect(screen.getByText(/kelola permintaan lembur/i)).toBeInTheDocument();
      expect(mockPush).not.toHaveBeenCalled();
    });

    it('should render the page for korlap role', () => {
      mockUseAuth.mockReturnValue({ user: korlapUser, loading: false });

      render(<OvertimePage />, { wrapper: createWrapper() });

      expect(screen.getByText(/kelola permintaan lembur/i)).toBeInTheDocument();
      expect(mockPush).not.toHaveBeenCalled();
    });

    it('should render the page for kepala_rayon role', () => {
      mockUseAuth.mockReturnValue({ user: kepalaRayonUser, loading: false });

      render(<OvertimePage />, { wrapper: createWrapper() });

      expect(screen.getByText(/kelola permintaan lembur/i)).toBeInTheDocument();
      expect(mockPush).not.toHaveBeenCalled();
    });

    it('should render the page for admin_data role', () => {
      mockUseAuth.mockReturnValue({ user: adminDataUser, loading: false });

      render(<OvertimePage />, { wrapper: createWrapper() });

      expect(screen.getByText(/kelola permintaan lembur/i)).toBeInTheDocument();
      expect(mockPush).not.toHaveBeenCalled();
    });

    it('should redirect satgas (unauthorized) to home', () => {
      mockUseAuth.mockReturnValue({ user: satgasUser, loading: false });

      render(<OvertimePage />, { wrapper: createWrapper() });

      expect(mockPush).toHaveBeenCalledWith('/');
    });

    it('should render nothing for an unauthorized user after redirect', () => {
      mockUseAuth.mockReturnValue({ user: satgasUser, loading: false });

      const { container } = render(<OvertimePage />, { wrapper: createWrapper() });

      // The page returns null after redirect for non-MONITORING_ROLES
      expect(container.textContent).toBe('');
    });
  });

  // ── 2. Table Rendering ────────────────────────────────────────────────────────

  describe('Table Rendering', () => {
    beforeEach(() => {
      mockUseAuth.mockReturnValue({ user: adminSystemUser, loading: false });
    });

    it('should display the page heading and description', () => {
      render(<OvertimePage />, { wrapper: createWrapper() });

      expect(screen.getByText(/kelola permintaan lembur/i)).toBeInTheDocument();
      expect(screen.getByText(/kelola permintaan lembur/i)).toBeInTheDocument();
    });

    it('should render the "Daftar Lembur" section heading', () => {
      render(<OvertimePage />, { wrapper: createWrapper() });

      expect(screen.getByText(/daftar lembur/i)).toBeInTheDocument();
    });

    it('should display the worker full name in the table', () => {
      render(<OvertimePage />, { wrapper: createWrapper() });

      expect(screen.getByText('Satgas One')).toBeInTheDocument();
    });

    it('should display the worker username below the full name', () => {
      render(<OvertimePage />, { wrapper: createWrapper() });

      expect(screen.getByText('satgas1')).toBeInTheDocument();
    });

    it('should display the area name', () => {
      render(<OvertimePage />, { wrapper: createWrapper() });

      expect(screen.getByText('Taman Bungkul')).toBeInTheDocument();
    });

    it('should display the activity type name', () => {
      render(<OvertimePage />, { wrapper: createWrapper() });

      expect(screen.getByText('Penanaman')).toBeInTheDocument();
    });

    it('should display the "Menunggu" status badge for a pending record', () => {
      render(<OvertimePage />, { wrapper: createWrapper() });

      // "Menunggu" now appears both as a filter tab and the row status pill.
      expect(screen.getAllByText('Menunggu').length).toBeGreaterThan(0);
    });

    it('should display the "Disetujui" status badge for an approved record', () => {
      (overtimeApi.useOvertimes as jest.Mock).mockReturnValue({
        data: {
          data: [mockOvertimeApproved],
          meta: { total: 1, page: 1, limit: 20, totalPages: 1 },
        },
        isLoading: false,
        error: null,
      });

      render(<OvertimePage />, { wrapper: createWrapper() });

      // Appears as both a filter tab and the row status pill.
      expect(screen.getAllByText('Disetujui').length).toBeGreaterThan(0);
    });

    it('should display a Lihat menu item for each row (via kebab)', async () => {
      const user = userEvent.setup();
      render(<OvertimePage />, { wrapper: createWrapper() });

      // Click the kebab trigger
      const triggers = screen.getAllByRole('button', { name: 'Aksi baris' });
      await user.click(triggers[0]);

      // Verify Lihat menu item exists
      expect(await screen.findByRole('menuitem', { name: /lihat/i })).toBeInTheDocument();
    });

    it('should display total count in the section header', () => {
      render(<OvertimePage />, { wrapper: createWrapper() });

      expect(screen.getByText('1 total')).toBeInTheDocument();
    });
  });

  // ── 3. Datetime Display ────────────────────────────────────────────────────────

  describe('Datetime Display', () => {
    beforeEach(() => {
      mockUseAuth.mockReturnValue({ user: adminSystemUser, loading: false });
    });

    it('should display the time range derived from start_datetime and end_datetime', () => {
      render(<OvertimePage />, { wrapper: createWrapper() });

      // The page formats time as HH.MM from ISO datetimes. The exact hours depend on
      // the CI/local timezone, so we only verify the time range format is present.
      const timeCell = screen.getByText(/\d{2}[.:]\d{2}\s*-\s*\d{2}[.:]\d{2}/);
      expect(timeCell).toBeInTheDocument();
    });

    it('should display the date derived from start_datetime (not a legacy "date" field)', () => {
      render(<OvertimePage />, { wrapper: createWrapper() });

      // start_datetime is '2026-02-16T17:00:00+07:00' = '2026-02-16T10:00:00Z'.
      // In UTC the date is still Feb 16. We match common Indonesian date formats.
      const dateCell = screen.getByText(/1[56][\-/]0?2[\-/]2026|2026[\-/]02[\-/]1[56]/);
      expect(dateCell).toBeInTheDocument();
    });

    it('should NOT render a legacy "date" column header', () => {
      // The column header is "Tanggal", which is fine; but the data should
      // come from start_datetime, not from a plain "date" property.
      // We verify the old field names are absent from the DOM output.
      render(<OvertimePage />, { wrapper: createWrapper() });

      // There should be no text exactly matching "start_time" or "end_time" (old field names)
      expect(screen.queryByText('start_time')).not.toBeInTheDocument();
      expect(screen.queryByText('end_time')).not.toBeInTheDocument();
    });
  });

  // ── 4. Approve / Reject Buttons ───────────────────────────────────────────────

  describe('Approve / Reject Buttons', () => {
    it('should show Setujui and Tolak menu items for korlap on a pending record', async () => {
      mockUseAuth.mockReturnValue({ user: korlapUser, loading: false });
      const user = userEvent.setup();

      render(<OvertimePage />, { wrapper: createWrapper() });

      // Click the kebab trigger
      const triggers = screen.getAllByRole('button', { name: 'Aksi baris' });
      await user.click(triggers[0]);

      expect(await screen.findByRole('menuitem', { name: /setujui/i })).toBeInTheDocument();
      expect(await screen.findByRole('menuitem', { name: /tolak/i })).toBeInTheDocument();
    });

    it('should show Setujui and Tolak menu items for kepala_rayon on a pending record', async () => {
      mockUseAuth.mockReturnValue({ user: kepalaRayonUser, loading: false });
      const user = userEvent.setup();

      render(<OvertimePage />, { wrapper: createWrapper() });

      // Click the kebab trigger
      const triggers = screen.getAllByRole('button', { name: 'Aksi baris' });
      await user.click(triggers[0]);

      expect(await screen.findByRole('menuitem', { name: /setujui/i })).toBeInTheDocument();
      expect(await screen.findByRole('menuitem', { name: /tolak/i })).toBeInTheDocument();
    });

    it('should NOT show Setujui / Tolak menu items for admin_data (view-only)', async () => {
      mockUseAuth.mockReturnValue({ user: adminDataUser, loading: false });
      const user = userEvent.setup();

      render(<OvertimePage />, { wrapper: createWrapper() });

      // Click the kebab trigger
      const triggers = screen.getAllByRole('button', { name: 'Aksi baris' });
      await user.click(triggers[0]);

      expect(screen.queryByRole('menuitem', { name: /setujui/i })).not.toBeInTheDocument();
      expect(screen.queryByRole('menuitem', { name: /tolak/i })).not.toBeInTheDocument();
    });

    it('should NOT show Setujui / Tolak menu items for admin_system (view-only)', async () => {
      mockUseAuth.mockReturnValue({ user: adminSystemUser, loading: false });
      const user = userEvent.setup();

      render(<OvertimePage />, { wrapper: createWrapper() });

      // Click the kebab trigger
      const triggers = screen.getAllByRole('button', { name: 'Aksi baris' });
      await user.click(triggers[0]);

      expect(screen.queryByRole('menuitem', { name: /setujui/i })).not.toBeInTheDocument();
      expect(screen.queryByRole('menuitem', { name: /tolak/i })).not.toBeInTheDocument();
    });

    it('should NOT show Setujui / Tolak menu items when the overtime is already approved', async () => {
      mockUseAuth.mockReturnValue({ user: korlapUser, loading: false });
      const user = userEvent.setup();
      (overtimeApi.useOvertimes as jest.Mock).mockReturnValue({
        data: {
          data: [mockOvertimeApproved],
          meta: { total: 1, page: 1, limit: 20, totalPages: 1 },
        },
        isLoading: false,
        error: null,
      });

      render(<OvertimePage />, { wrapper: createWrapper() });

      // Click the kebab trigger
      const triggers = screen.getAllByRole('button', { name: 'Aksi baris' });
      await user.click(triggers[0]);

      expect(screen.queryByRole('menuitem', { name: /setujui/i })).not.toBeInTheDocument();
      expect(screen.queryByRole('menuitem', { name: /tolak/i })).not.toBeInTheDocument();
    });

    it('should call approveOvertime mutateAsync when Setujui menu item is clicked', async () => {
      mockUseAuth.mockReturnValue({ user: korlapUser, loading: false });
      const user = userEvent.setup();
      render(<OvertimePage />, { wrapper: createWrapper() });

      // Click the kebab trigger
      const triggers = screen.getAllByRole('button', { name: 'Aksi baris' });
      await user.click(triggers[0]);

      // Click the Setujui menu item
      await user.click(await screen.findByRole('menuitem', { name: /setujui/i }));

      await waitFor(() => {
        expect(mockMutateAsync).toHaveBeenCalledWith('ot-1');
      });
    });

    it('should show the reject-reason dialog when Tolak menu item is clicked', async () => {
      mockUseAuth.mockReturnValue({ user: korlapUser, loading: false });
      const user = userEvent.setup();
      render(<OvertimePage />, { wrapper: createWrapper() });

      // Click the kebab trigger
      const triggers = screen.getAllByRole('button', { name: 'Aksi baris' });
      await user.click(triggers[0]);

      // Click the Tolak menu item
      await user.click(await screen.findByRole('menuitem', { name: /tolak/i }));

      expect(await screen.findByText(/alasan penolakan/i)).toBeInTheDocument();
      expect(screen.getByPlaceholderText(/masukkan alasan penolakan/i)).toBeInTheDocument();
    });

    it('should call rejectOvertime mutateAsync with id and reason when confirmed', async () => {
      const rejectMutateAsync = jest.fn().mockResolvedValue({});
      (overtimeApi.useRejectOvertime as jest.Mock).mockReturnValue({
        mutateAsync: rejectMutateAsync,
        isPending: false,
      });
      mockUseAuth.mockReturnValue({ user: korlapUser, loading: false });
      const user = userEvent.setup();
      render(<OvertimePage />, { wrapper: createWrapper() });

      // Click the kebab trigger
      const triggers = screen.getAllByRole('button', { name: 'Aksi baris' });
      await user.click(triggers[0]);

      // Open reject dialog by clicking Tolak menu item
      await user.click(await screen.findByRole('menuitem', { name: /tolak/i }));

      // Fill in the reason
      const reasonInput = await screen.findByPlaceholderText(/masukkan alasan penolakan/i);
      await user.type(reasonInput, 'Tidak sesuai prosedur');

      // Confirm rejection
      await user.click(screen.getByRole('button', { name: /tolak lembur/i }));

      await waitFor(() => {
        expect(rejectMutateAsync).toHaveBeenCalledWith({
          id: 'ot-1',
          reason: 'Tidak sesuai prosedur',
        });
      });
    });

    it('should keep the Tolak Lembur button disabled when reason is empty', async () => {
      mockUseAuth.mockReturnValue({ user: korlapUser, loading: false });
      const user = userEvent.setup();
      render(<OvertimePage />, { wrapper: createWrapper() });

      // Click the kebab trigger
      const triggers = screen.getAllByRole('button', { name: 'Aksi baris' });
      await user.click(triggers[0]);

      // Click the Tolak menu item
      await user.click(await screen.findByRole('menuitem', { name: /tolak/i }));

      const confirmButton = await screen.findByRole('button', { name: /tolak lembur/i });
      expect(confirmButton).toBeDisabled();
    });

    it('should dismiss the reject dialog when Batal is clicked', async () => {
      mockUseAuth.mockReturnValue({ user: korlapUser, loading: false });
      const user = userEvent.setup();
      render(<OvertimePage />, { wrapper: createWrapper() });

      // Click the kebab trigger
      const triggers = screen.getAllByRole('button', { name: 'Aksi baris' });
      await user.click(triggers[0]);

      // Click the Tolak menu item
      await user.click(await screen.findByRole('menuitem', { name: /tolak/i }));
      expect(await screen.findByText(/alasan penolakan/i)).toBeInTheDocument();

      await user.click(screen.getByRole('button', { name: /batal/i }));

      await waitFor(() => {
        expect(screen.queryByText(/alasan penolakan/i)).not.toBeInTheDocument();
      });
    });
  });

  // ── 5. Filter Card Rendering ──────────────────────────────────────────────────

  describe('Filter Card Rendering', () => {
    beforeEach(() => {
      mockUseAuth.mockReturnValue({ user: adminSystemUser, loading: false });
    });

    it('should render the status filter tabs', () => {
      render(<OvertimePage />, { wrapper: createWrapper() });

      // LBR-1: status filter is a three-tab queue (Semua/Menunggu/Disetujui/Ditolak).
      expect(screen.getByRole('tab', { name: 'Semua' })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: 'Disetujui' })).toBeInTheDocument();
    });

    it('should render the Rentang Tanggal date range picker', () => {
      render(<OvertimePage />, { wrapper: createWrapper() });

      expect(screen.getByText(/rentang tanggal/i)).toBeInTheDocument();
    });

    it('should NOT show the Reset Filter button when no filters are active', () => {
      render(<OvertimePage />, { wrapper: createWrapper() });

      expect(screen.queryByRole('button', { name: /reset filter/i })).not.toBeInTheDocument();
    });

    it('should show the Reset Filter button after a filter has been applied', async () => {
      const user = userEvent.setup();
      render(<OvertimePage />, { wrapper: createWrapper() });

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

      expect(await screen.findByRole('button', { name: /reset filter/i })).toBeInTheDocument();
    });

    it('should reset all filters when Reset Filter is clicked', async () => {
      const user = userEvent.setup();
      render(<OvertimePage />, { wrapper: createWrapper() });

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

      const resetButton = await screen.findByRole('button', { name: /reset filter/i });
      await user.click(resetButton);

      await waitFor(() => {
        expect(screen.queryByRole('button', { name: /reset filter/i })).not.toBeInTheDocument();
      });
    });
  });

  // ── 6. Loading State ──────────────────────────────────────────────────────────

  describe('Loading State', () => {
    beforeEach(() => {
      mockUseAuth.mockReturnValue({ user: adminSystemUser, loading: false });
    });

    it('should pass loading=true to DataTable while data is being fetched', () => {
      (overtimeApi.useOvertimes as jest.Mock).mockReturnValue({
        data: undefined,
        isLoading: true,
        error: null,
      });

      render(<OvertimePage />, { wrapper: createWrapper() });

      // When data is undefined and loading is true the DataTable renders its
      // loading skeleton; the page must not crash.
      expect(screen.getByText(/daftar lembur/i)).toBeInTheDocument();
    });
  });

  // ── 7. Empty State ────────────────────────────────────────────────────────────

  describe('Empty State', () => {
    beforeEach(() => {
      mockUseAuth.mockReturnValue({ user: adminSystemUser, loading: false });
    });

    it('should display the empty message when there are no overtime records', () => {
      (overtimeApi.useOvertimes as jest.Mock).mockReturnValue({
        data: { data: [], meta: { total: 0, page: 1, limit: 20, totalPages: 0 } },
        isLoading: false,
        error: null,
      });

      render(<OvertimePage />, { wrapper: createWrapper() });

      expect(screen.getByText(/tidak ada permintaan lembur/i)).toBeInTheDocument();
    });

    it('should show 0 total when there are no records', () => {
      (overtimeApi.useOvertimes as jest.Mock).mockReturnValue({
        data: { data: [], meta: { total: 0, page: 1, limit: 20, totalPages: 0 } },
        isLoading: false,
        error: null,
      });

      render(<OvertimePage />, { wrapper: createWrapper() });

      expect(screen.getByText('0 total')).toBeInTheDocument();
    });
  });

  // ── 8. Pagination ─────────────────────────────────────────────────────────────

  describe('Pagination', () => {
    beforeEach(() => {
      mockUseAuth.mockReturnValue({ user: adminSystemUser, loading: false });
    });

    it('should NOT show pagination controls when there is only one page', () => {
      render(<OvertimePage />, { wrapper: createWrapper() });

      expect(screen.queryByRole('button', { name: /sebelumnya/i })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /selanjutnya/i })).not.toBeInTheDocument();
    });

    it('should show pagination controls when there are multiple pages', () => {
      (overtimeApi.useOvertimes as jest.Mock).mockReturnValue({
        data: {
          data: [mockOvertime],
          meta: { total: 40, page: 1, limit: 20, totalPages: 2 },
        },
        isLoading: false,
        error: null,
      });

      render(<OvertimePage />, { wrapper: createWrapper() });

      expect(screen.getByRole('button', { name: /sebelumnya/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /selanjutnya/i })).toBeInTheDocument();
    });

    it('should disable the Sebelumnya button on the first page', () => {
      (overtimeApi.useOvertimes as jest.Mock).mockReturnValue({
        data: {
          data: [mockOvertime],
          meta: { total: 40, page: 1, limit: 20, totalPages: 2 },
        },
        isLoading: false,
        error: null,
      });

      render(<OvertimePage />, { wrapper: createWrapper() });

      expect(screen.getByRole('button', { name: /sebelumnya/i })).toBeDisabled();
    });

    it('should display the current page and total pages', () => {
      (overtimeApi.useOvertimes as jest.Mock).mockReturnValue({
        data: {
          data: [mockOvertime],
          meta: { total: 40, page: 1, limit: 20, totalPages: 2 },
        },
        isLoading: false,
        error: null,
      });

      render(<OvertimePage />, { wrapper: createWrapper() });

      expect(screen.getByText(/halaman 1 dari 2/i)).toBeInTheDocument();
    });
  });
});
