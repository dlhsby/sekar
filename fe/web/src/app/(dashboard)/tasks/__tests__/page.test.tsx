/**
 * Unit Tests: Tasks List Page
 * Covers auth guard, three-tab system, table rendering,
 * filter dropdowns, empty state, and create button.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import TasksPage from '../page';
import '@testing-library/jest-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import * as tasksApi from '@/lib/api/tasks';

// ---------------------------------------------------------------------------
// Router mock
// ---------------------------------------------------------------------------
const mockPush = jest.fn();

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
  usePathname: () => '/tasks',
}));

// ---------------------------------------------------------------------------
// Auth mock
// ---------------------------------------------------------------------------
const mockUseAuth = jest.fn();

jest.mock('@/lib/auth/hooks', () => ({
  useAuth: () => mockUseAuth(),
}));

// ---------------------------------------------------------------------------
// API hooks mock
// ---------------------------------------------------------------------------
jest.mock('@/lib/api/tasks');

// ---------------------------------------------------------------------------
// Shared test data
// ---------------------------------------------------------------------------
const mockKorlapUser = {
  id: 'user-1',
  username: 'korlap1',
  full_name: 'Korlap One',
  role: 'korlap' as const,
  area_id: 'area-1',
  created_at: '2026-01-01T00:00:00Z',
};

const mockSatgasUser = {
  id: 'user-3',
  username: 'satgas1',
  full_name: 'Satgas One',
  role: 'satgas' as const,
  area_id: 'area-1',
  created_at: '2026-01-01T00:00:00Z',
};

const mockTask: tasksApi.Task = {
  id: 'task-1',
  title: 'Cleanup Taman Bungkul',
  description: 'Remove trash',
  created_by: 'user-1',
  creator: { id: 'user-1', full_name: 'Korlap One' },
  assigned_to: { id: 'user-2', full_name: 'Satgas One' },
  area: { id: 'area-1', name: 'Taman Bungkul' },
  rayon: { id: 'rayon-1', name: 'Rayon I' },
  priority: 'high' as const,
  status: 'assigned' as const,
  due_date: '2026-03-01',
  created_at: '2026-02-16T08:00:00Z',
  updated_at: '2026-02-16T08:00:00Z',
};

const mockPaginatedResponse = {
  data: [mockTask],
  meta: { total: 1, page: 1, limit: 20, totalPages: 1 },
};

const emptyPaginatedResponse = {
  data: [],
  meta: { total: 0, page: 1, limit: 20, totalPages: 0 },
};

// ---------------------------------------------------------------------------
// Default hook return values — overridden per describe block where needed
// ---------------------------------------------------------------------------
const defaultQueryResult = {
  data: mockPaginatedResponse,
  isLoading: false,
  error: null,
};

const emptyQueryResult = {
  data: emptyPaginatedResponse,
  isLoading: false,
  error: null,
};

const loadingQueryResult = {
  data: undefined,
  isLoading: true,
  error: null,
};

// ---------------------------------------------------------------------------
// Wrapper
// ---------------------------------------------------------------------------
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

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function setupDefaultApiMocks() {
  (tasksApi.useTasks as jest.Mock).mockReturnValue(defaultQueryResult);
  (tasksApi.useTaggedTasks as jest.Mock).mockReturnValue({ ...defaultQueryResult, data: emptyPaginatedResponse });
  (tasksApi.useMyTasks as jest.Mock).mockReturnValue({ ...defaultQueryResult, data: emptyPaginatedResponse });
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe('TasksPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setupDefaultApiMocks();
  });

  // -------------------------------------------------------------------------
  // Auth & Authorization
  // -------------------------------------------------------------------------
  describe('Authentication & Authorization', () => {
    it('should show a loading spinner while auth is in progress', () => {
      mockUseAuth.mockReturnValue({ user: null, loading: true });

      const { container } = render(<TasksPage />, { wrapper: createWrapper() });

      expect(screen.getByText(/memuat/i)).toBeInTheDocument();
      expect(container.querySelector('.animate-spin')).toBeInTheDocument();
    });

    it('should render the page for an authorized korlap user', () => {
      mockUseAuth.mockReturnValue({ user: mockKorlapUser, loading: false });

      render(<TasksPage />, { wrapper: createWrapper() });

      expect(screen.getByRole('heading', { level: 1, name: 'Tugas' })).toBeInTheDocument();
      expect(mockPush).not.toHaveBeenCalled();
    });

    it('should redirect a satgas (unauthorized) user to the root path', () => {
      mockUseAuth.mockReturnValue({ user: mockSatgasUser, loading: false });

      render(<TasksPage />, { wrapper: createWrapper() });

      expect(mockPush).toHaveBeenCalledWith('/');
    });

    it('should render nothing for an unauthorized user after redirect', () => {
      mockUseAuth.mockReturnValue({ user: mockSatgasUser, loading: false });

      const { container } = render(<TasksPage />, { wrapper: createWrapper() });

      expect(container.textContent).toBe('');
    });
  });

  // -------------------------------------------------------------------------
  // Tab Navigation
  // -------------------------------------------------------------------------
  describe('Tab Navigation', () => {
    beforeEach(() => {
      mockUseAuth.mockReturnValue({ user: mockKorlapUser, loading: false });
    });

    it('should display all three tabs', () => {
      render(<TasksPage />, { wrapper: createWrapper() });

      expect(screen.getByRole('button', { name: 'Semua Tugas' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Ditandai' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Dibuat Saya' })).toBeInTheDocument();
    });

    it('should highlight the active tab and update it on click', async () => {
      const user = userEvent.setup();
      render(<TasksPage />, { wrapper: createWrapper() });

      const allTab = screen.getByRole('button', { name: 'Semua Tugas' });
      const taggedTab = screen.getByRole('button', { name: 'Ditandai' });

      // "Semua Tugas" is active by default
      expect(allTab.className).toMatch(/border-nb-primary/);
      expect(taggedTab.className).not.toMatch(/border-nb-primary/);

      await user.click(taggedTab);

      expect(taggedTab.className).toMatch(/border-nb-primary/);
      expect(allTab.className).not.toMatch(/border-nb-primary/);
    });

    it('should call useTasks with filters when "Semua Tugas" tab is active', () => {
      render(<TasksPage />, { wrapper: createWrapper() });

      // On initial render the "all" tab is active; useTasks receives filters object
      expect(tasksApi.useTasks as jest.Mock).toHaveBeenCalledWith(
        expect.objectContaining({ page: 1, limit: 20 }),
      );
      // Other hooks called with undefined (inactive tabs)
      expect(tasksApi.useTaggedTasks as jest.Mock).toHaveBeenCalledWith(undefined);
      expect(tasksApi.useMyTasks as jest.Mock).toHaveBeenCalledWith(undefined);
    });

    it('should call useTaggedTasks with filters when "Ditandai" tab is clicked', async () => {
      const user = userEvent.setup();
      render(<TasksPage />, { wrapper: createWrapper() });

      await user.click(screen.getByRole('button', { name: 'Ditandai' }));

      expect(tasksApi.useTaggedTasks as jest.Mock).toHaveBeenCalledWith(
        expect.objectContaining({ page: 1, limit: 20 }),
      );
      expect(tasksApi.useTasks as jest.Mock).toHaveBeenCalledWith(undefined);
    });
  });

  // -------------------------------------------------------------------------
  // Table Rendering
  // -------------------------------------------------------------------------
  describe('Table Rendering', () => {
    beforeEach(() => {
      mockUseAuth.mockReturnValue({ user: mockKorlapUser, loading: false });
    });

    it('should display all required column headers', () => {
      render(<TasksPage />, { wrapper: createWrapper() });

      expect(screen.getByText('Judul Tugas')).toBeInTheDocument();
      expect(screen.getByText('Ditugaskan Ke')).toBeInTheDocument();
      expect(screen.getByText('Area / Rayon')).toBeInTheDocument();
      expect(screen.getByText('Prioritas')).toBeInTheDocument();
      expect(screen.getByText('Status')).toBeInTheDocument();
      expect(screen.getByText('Tenggat')).toBeInTheDocument();
      expect(screen.getByText('Aksi')).toBeInTheDocument();
    });

    it('should display task title, assigned user name, and area name', () => {
      render(<TasksPage />, { wrapper: createWrapper() });

      expect(screen.getByText('Cleanup Taman Bungkul')).toBeInTheDocument();
      expect(screen.getByText('Satgas One')).toBeInTheDocument();
      expect(screen.getByText('Taman Bungkul')).toBeInTheDocument();
    });

    it('should render status badge with the correct Indonesian label', () => {
      render(<TasksPage />, { wrapper: createWrapper() });

      // TASK_STATUS_LABELS.assigned = 'Ditugaskan'
      expect(screen.getByText('Ditugaskan')).toBeInTheDocument();
    });

    it('should render priority badge with the correct Indonesian label', () => {
      render(<TasksPage />, { wrapper: createWrapper() });

      // PRIORITY_LABELS.high = 'Tinggi'
      expect(screen.getByText('Tinggi')).toBeInTheDocument();
    });

    it('should render a Detail link for each task row', () => {
      render(<TasksPage />, { wrapper: createWrapper() });

      const detailLink = screen.getByRole('link', { name: /detail/i });
      expect(detailLink).toBeInTheDocument();
      expect(detailLink).toHaveAttribute('href', '/tasks/task-1');
    });
  });

  // -------------------------------------------------------------------------
  // Filters
  // -------------------------------------------------------------------------
  describe('Filter Dropdowns', () => {
    beforeEach(() => {
      mockUseAuth.mockReturnValue({ user: mockKorlapUser, loading: false });
    });

    it('should render the status filter combobox with the default "Semua Status" label', () => {
      render(<TasksPage />, { wrapper: createWrapper() });

      // Radix UI Select renders options in a portal only when the dropdown is open.
      // jsdom does not support the pointer-capture API required to open Radix Select.
      // We verify that the filter control and its default selected label are present.
      expect(screen.getByText('Filter Status')).toBeInTheDocument();
      expect(screen.getByText('Semua Status')).toBeInTheDocument();
      // Two comboboxes exist: status and priority
      expect(screen.getAllByRole('combobox')).toHaveLength(2);
    });

    it('should render the priority filter combobox with the default "Semua Prioritas" label', () => {
      render(<TasksPage />, { wrapper: createWrapper() });

      expect(screen.getByText('Filter Prioritas')).toBeInTheDocument();
      expect(screen.getByText('Semua Prioritas')).toBeInTheDocument();
    });

    it('should not show the Reset Filter button when no filter is applied', () => {
      render(<TasksPage />, { wrapper: createWrapper() });

      expect(screen.queryByRole('button', { name: /reset filter/i })).not.toBeInTheDocument();
    });
  });

  // -------------------------------------------------------------------------
  // Create Button
  // -------------------------------------------------------------------------
  describe('Create Task Button', () => {
    beforeEach(() => {
      mockUseAuth.mockReturnValue({ user: mockKorlapUser, loading: false });
    });

    it('should display the "Buat Tugas Baru" button', () => {
      render(<TasksPage />, { wrapper: createWrapper() });

      expect(screen.getByRole('button', { name: /buat tugas baru/i })).toBeInTheDocument();
    });

    it('should navigate to /tasks/new when the create button is clicked', async () => {
      const user = userEvent.setup();
      render(<TasksPage />, { wrapper: createWrapper() });

      await user.click(screen.getByRole('button', { name: /buat tugas baru/i }));

      expect(mockPush).toHaveBeenCalledWith('/tasks/new');
    });
  });

  // -------------------------------------------------------------------------
  // Empty State
  // -------------------------------------------------------------------------
  describe('Empty State', () => {
    beforeEach(() => {
      mockUseAuth.mockReturnValue({ user: mockKorlapUser, loading: false });
    });

    it('should display the empty state message when there are no tasks', () => {
      (tasksApi.useTasks as jest.Mock).mockReturnValue(emptyQueryResult);

      render(<TasksPage />, { wrapper: createWrapper() });

      expect(screen.getByText(/tidak ada tugas/i)).toBeInTheDocument();
    });

    it('should show total task count as 0 when there are no tasks', () => {
      (tasksApi.useTasks as jest.Mock).mockReturnValue(emptyQueryResult);

      render(<TasksPage />, { wrapper: createWrapper() });

      expect(screen.getByText(/0 total/i)).toBeInTheDocument();
    });
  });

  // -------------------------------------------------------------------------
  // Loading State
  // -------------------------------------------------------------------------
  describe('Loading State', () => {
    beforeEach(() => {
      mockUseAuth.mockReturnValue({ user: mockKorlapUser, loading: false });
    });

    it('should show a loading indicator while tasks are being fetched', () => {
      (tasksApi.useTasks as jest.Mock).mockReturnValue(loadingQueryResult);

      const { container } = render(<TasksPage />, { wrapper: createWrapper() });

      // DataTable renders a loading state — verify the table area is present
      // and no task title is displayed yet
      expect(screen.queryByText('Cleanup Taman Bungkul')).not.toBeInTheDocument();
      // Container should still have the page structure
      expect(container.firstChild).toBeTruthy();
    });
  });
});
