/**
 * Unit Tests: Tasks List Page (TSK-1 kanban/table revamp)
 * Covers auth guard, scope tabs, kanban (default) + table views,
 * filter dropdowns, empty state, and create button.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import TasksPage from '../page';
import '@testing-library/jest-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import * as tasksApi from '@/lib/api/tasks';

const mockPush = jest.fn();
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
  usePathname: () => '/tasks',
}));

const mockUseAuth = jest.fn();
jest.mock('@/lib/auth/hooks', () => ({ useAuth: () => mockUseAuth() }));

jest.mock('@/lib/api/tasks');

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
  meta: { total: 1, page: 1, limit: 100, totalPages: 1 },
};
const emptyPaginatedResponse = {
  data: [],
  meta: { total: 0, page: 1, limit: 100, totalPages: 0 },
};

const defaultQueryResult = { data: mockPaginatedResponse, isLoading: false, error: null };
const emptyQueryResult = { data: emptyPaginatedResponse, isLoading: false, error: null };
const loadingQueryResult = { data: undefined, isLoading: true, error: null };

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

function setupDefaultApiMocks() {
  (tasksApi.useTasks as jest.Mock).mockReturnValue(defaultQueryResult);
  (tasksApi.useTaggedTasks as jest.Mock).mockReturnValue({
    ...defaultQueryResult,
    data: emptyPaginatedResponse,
  });
  (tasksApi.useMyTasks as jest.Mock).mockReturnValue({
    ...defaultQueryResult,
    data: emptyPaginatedResponse,
  });
}

describe('TasksPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setupDefaultApiMocks();
  });

  describe('Authentication & Authorization', () => {
    it('shows a loading state while auth is in progress', () => {
      mockUseAuth.mockReturnValue({ user: null, loading: true });
      render(<TasksPage />, { wrapper: createWrapper() });
      expect(screen.getByText(/memuat/i)).toBeInTheDocument();
    });

    it('renders the page for an authorized korlap user', () => {
      mockUseAuth.mockReturnValue({ user: mockKorlapUser, loading: false });
      render(<TasksPage />, { wrapper: createWrapper() });
      expect(screen.getByRole('button', { name: /buat tugas/i })).toBeInTheDocument();
      expect(mockPush).not.toHaveBeenCalled();
    });

    it('redirects a satgas (unauthorized) user to the root path', () => {
      mockUseAuth.mockReturnValue({ user: mockSatgasUser, loading: false });
      render(<TasksPage />, { wrapper: createWrapper() });
      expect(mockPush).toHaveBeenCalledWith('/');
    });

    it('renders nothing for an unauthorized user after redirect', () => {
      mockUseAuth.mockReturnValue({ user: mockSatgasUser, loading: false });
      const { container } = render(<TasksPage />, { wrapper: createWrapper() });
      expect(container.textContent).toBe('');
    });
  });

  describe('Scope tabs', () => {
    beforeEach(() => {
      mockUseAuth.mockReturnValue({ user: mockKorlapUser, loading: false });
    });

    it('displays all three scope tabs', () => {
      render(<TasksPage />, { wrapper: createWrapper() });
      expect(screen.getByRole('tab', { name: 'Semua Tugas' })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: 'Ditandai' })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: 'Dibuat Saya' })).toBeInTheDocument();
    });

    it('marks the active scope tab via aria-selected and updates it on click', async () => {
      const user = userEvent.setup();
      render(<TasksPage />, { wrapper: createWrapper() });

      const allTab = screen.getByRole('tab', { name: 'Semua Tugas' });
      const taggedTab = screen.getByRole('tab', { name: 'Ditandai' });
      expect(allTab).toHaveAttribute('aria-selected', 'true');
      expect(taggedTab).toHaveAttribute('aria-selected', 'false');

      await user.click(taggedTab);
      expect(taggedTab).toHaveAttribute('aria-selected', 'true');
      expect(allTab).toHaveAttribute('aria-selected', 'false');
    });

    it('calls useTasks with the board window when the "all" scope is active', () => {
      render(<TasksPage />, { wrapper: createWrapper() });
      // Default view is the kanban board → wider window (limit 100).
      expect(tasksApi.useTasks as jest.Mock).toHaveBeenCalledWith(
        expect.objectContaining({ page: 1, limit: 100 }),
      );
      expect(tasksApi.useTaggedTasks as jest.Mock).toHaveBeenCalledWith(undefined);
      expect(tasksApi.useMyTasks as jest.Mock).toHaveBeenCalledWith(undefined);
    });

    it('calls useTaggedTasks when the "Ditandai" scope is clicked', async () => {
      const user = userEvent.setup();
      render(<TasksPage />, { wrapper: createWrapper() });
      await user.click(screen.getByRole('tab', { name: 'Ditandai' }));
      expect(tasksApi.useTaggedTasks as jest.Mock).toHaveBeenCalledWith(
        expect.objectContaining({ page: 1, limit: 100 }),
      );
      expect(tasksApi.useTasks as jest.Mock).toHaveBeenCalledWith(undefined);
    });
  });

  describe('Kanban view (default)', () => {
    beforeEach(() => {
      mockUseAuth.mockReturnValue({ user: mockKorlapUser, loading: false });
    });

    it('renders the four lanes and a task card with its details', () => {
      render(<TasksPage />, { wrapper: createWrapper() });
      expect(screen.getByRole('region', { name: /belum mulai/i })).toBeInTheDocument();
      expect(screen.getByRole('region', { name: /sedang dikerjakan/i })).toBeInTheDocument();
      // Card content
      expect(screen.getByText('Cleanup Taman Bungkul')).toBeInTheDocument();
      expect(screen.getByText('Satgas One')).toBeInTheDocument();
      expect(screen.getByText('Taman Bungkul')).toBeInTheDocument();
      expect(screen.getByText('Ditugaskan')).toBeInTheDocument(); // status pill
      expect(screen.getByText('Tinggi')).toBeInTheDocument(); // priority pill
    });

    it('renders each card as a link to its detail page', () => {
      render(<TasksPage />, { wrapper: createWrapper() });
      const card = screen.getByRole('link', { name: /cleanup taman bungkul/i });
      expect(card).toHaveAttribute('href', '/tasks/task-1');
    });
  });

  describe('Table view', () => {
    beforeEach(() => {
      mockUseAuth.mockReturnValue({ user: mockKorlapUser, loading: false });
    });

    async function switchToTable() {
      const user = userEvent.setup();
      await user.click(screen.getByRole('tab', { name: 'Tabel' }));
    }

    it('shows all column headers after switching to the table view', async () => {
      render(<TasksPage />, { wrapper: createWrapper() });
      await switchToTable();
      expect(screen.getByText('Judul Tugas')).toBeInTheDocument();
      expect(screen.getByText('Ditugaskan Ke')).toBeInTheDocument();
      expect(screen.getByText('Area / Rayon')).toBeInTheDocument();
      expect(screen.getByText('Prioritas')).toBeInTheDocument();
      expect(screen.getByText('Status')).toBeInTheDocument();
      expect(screen.getByText('Tenggat')).toBeInTheDocument();
      expect(screen.getByText('Aksi')).toBeInTheDocument();
    });

    it('renders a "Lihat" menu action per row in the table view via kebab menu', async () => {
      const user = userEvent.setup();
      render(<TasksPage />, { wrapper: createWrapper() });
      await switchToTable();
      // Open the kebab menu for the first row
      const kebabTriggers = screen.getAllByRole('button', { name: /aksi baris/i });
      await user.click(kebabTriggers[0]);
      // The "Lihat" menuitem should be visible and navigable
      const lihatMenuItem = screen.getByRole('menuitem', { name: /lihat/i });
      expect(lihatMenuItem).toBeInTheDocument();
      // Verify clicking it navigates to the task detail page
      await user.click(lihatMenuItem);
      expect(mockPush).toHaveBeenCalledWith('/tasks/task-1');
    });
  });

  describe('Filter Dropdowns', () => {
    beforeEach(() => {
      mockUseAuth.mockReturnValue({ user: mockKorlapUser, loading: false });
    });

    it('renders the status + priority filter comboboxes with their defaults', () => {
      render(<TasksPage />, { wrapper: createWrapper() });
      expect(screen.getByText('Filter Status')).toBeInTheDocument();
      expect(screen.getByText('Semua Status')).toBeInTheDocument();
      expect(screen.getByText('Filter Prioritas')).toBeInTheDocument();
      expect(screen.getByText('Semua Prioritas')).toBeInTheDocument();
      expect(screen.getAllByRole('combobox')).toHaveLength(2);
    });

    it('does not show the Reset Filter button when no filter is applied', () => {
      render(<TasksPage />, { wrapper: createWrapper() });
      expect(screen.queryByRole('button', { name: /reset filter/i })).not.toBeInTheDocument();
    });
  });

  describe('Create Task Button', () => {
    beforeEach(() => {
      mockUseAuth.mockReturnValue({ user: mockKorlapUser, loading: false });
    });

    it('navigates to /tasks/new when the create button is clicked', async () => {
      const user = userEvent.setup();
      render(<TasksPage />, { wrapper: createWrapper() });
      await user.click(screen.getByRole('button', { name: /buat tugas/i }));
      expect(mockPush).toHaveBeenCalledWith('/tasks/new');
    });
  });

  describe('Empty State', () => {
    beforeEach(() => {
      mockUseAuth.mockReturnValue({ user: mockKorlapUser, loading: false });
    });

    it('shows the empty lane message when there are no tasks (kanban)', () => {
      (tasksApi.useTasks as jest.Mock).mockReturnValue(emptyQueryResult);
      render(<TasksPage />, { wrapper: createWrapper() });
      // One "Tidak ada tugas" per empty lane.
      expect(screen.getAllByText(/tidak ada tugas/i).length).toBeGreaterThan(0);
    });
  });

  describe('Loading State', () => {
    beforeEach(() => {
      mockUseAuth.mockReturnValue({ user: mockKorlapUser, loading: false });
    });

    it('does not render task content while fetching', () => {
      (tasksApi.useTasks as jest.Mock).mockReturnValue(loadingQueryResult);
      const { container } = render(<TasksPage />, { wrapper: createWrapper() });
      expect(screen.queryByText('Cleanup Taman Bungkul')).not.toBeInTheDocument();
      expect(container.firstChild).toBeTruthy();
    });
  });
});
