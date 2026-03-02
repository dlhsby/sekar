/**
 * Unit Tests: Task Detail Page
 * Tests task detail display, verification workflow, and tagged users
 */

import React from 'react';
import { render, screen, act } from '@testing-library/react';
import TaskDetailPage from '../page';
import '@testing-library/jest-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import * as tasksApi from '@/lib/api/tasks';

const mockPush = jest.fn();
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
  usePathname: () => '/tasks/task-1',
}));

jest.mock('next/link', () => {
  const MockLink = ({ href, children, ...rest }: { href: string; children: React.ReactNode; [k: string]: unknown }) => (
    <a href={href} {...rest}>{children}</a>
  );
  MockLink.displayName = 'MockLink';
  return MockLink;
});

const mockUseAuth = jest.fn();
jest.mock('@/lib/auth/hooks', () => ({
  useAuth: () => mockUseAuth(),
}));

jest.mock('@/lib/api/tasks');

const mockTask = {
  id: 'task-1',
  title: 'Penyapuan Area Utara',
  description: 'Bersihkan area utara taman',
  created_by: 'korlap-1',
  creator: { id: 'korlap-1', full_name: 'Korlap One' },
  assigned_to: { id: 'satgas-1', full_name: 'Satgas One' },
  assigned_by: { id: 'korlap-1', full_name: 'Korlap One' },
  assigned_at: '2026-02-16T08:00:00Z',
  area: { id: 'area-1', name: 'Taman Bungkul' },
  rayon: { id: 'rayon-1', name: 'Rayon 1' },
  status: 'pending' as const,
  priority: 'high' as const,
  due_date: '2026-02-20T00:00:00Z',
  activity_type_id: 'type-1',
  activity_type: { id: 'type-1', code: 'SWEEP', name: 'Penyapuan' },
  tags: [],
  created_at: '2026-02-16T07:00:00Z',
};

const mockCompletedTask = {
  ...mockTask,
  status: 'completed' as const,
  completion_notes: 'Sudah selesai dibersihkan',
  completion_photo_urls: ['photo1.jpg', 'photo2.jpg'],
  completed_at: '2026-02-18T15:00:00Z',
};

const mockVerifiedTask = {
  ...mockCompletedTask,
  status: 'verified' as const,
  verified_by: 'korlap-1',
  verifier: { id: 'korlap-1', full_name: 'Korlap One' },
  verified_at: '2026-02-19T10:00:00Z',
};

const mockDeclinedTask = {
  ...mockTask,
  status: 'declined' as const,
  decline_reason: 'Area sudah ditugaskan ke orang lain',
  declined_at: '2026-02-17T09:00:00Z',
};

const mockRevisionTask = {
  ...mockCompletedTask,
  status: 'revision_needed' as const,
  revision_reason: 'Foto tidak lengkap',
};

const mockTaskWithTags = {
  ...mockTask,
  tags: [
    { id: 'tag-1', task_id: 'task-1', user_id: 'satgas-2', user: { id: 'satgas-2', full_name: 'Satgas Two' } },
    { id: 'tag-2', task_id: 'task-1', user_id: 'satgas-3', user: { id: 'satgas-3', full_name: 'Satgas Three' } },
  ],
};

const mockKorlapUser = {
  id: 'korlap-1',
  username: 'korlap1',
  full_name: 'Korlap One',
  role: 'korlap' as const,
  area_id: 'area-1',
  created_at: '2024-01-01T00:00:00Z',
};

/** admin_system is in TASK_MANAGER_ROLES but NOT in TASK_VERIFIER_ROLES */
const mockAdminSystemUser = {
  id: 'admin-sys-1',
  username: 'admin_system1',
  full_name: 'Admin System',
  role: 'admin_system' as const,
  created_at: '2024-01-01T00:00:00Z',
};

const mockMutateAsync = jest.fn();

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

async function renderPage(id = 'task-1') {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let result: any;
  await act(async () => {
    result = render(
      <TaskDetailPage params={Promise.resolve({ id })} />,
      { wrapper: createWrapper() }
    );
  });
  return result as ReturnType<typeof render>;
}

describe('TaskDetailPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (tasksApi.useTask as jest.Mock).mockReturnValue({
      data: mockTask,
      isLoading: false,
    });
    (tasksApi.useVerifyTask as jest.Mock).mockReturnValue({
      mutateAsync: mockMutateAsync,
      isPending: false,
    });
    (tasksApi.useRequestRevision as jest.Mock).mockReturnValue({
      mutateAsync: mockMutateAsync,
      isPending: false,
    });
    (tasksApi.useUntagTask as jest.Mock).mockReturnValue({
      mutateAsync: mockMutateAsync,
      isPending: false,
    });
  });

  describe('Authentication', () => {
    it('should show loading state', async () => {
      mockUseAuth.mockReturnValue({ user: null, loading: true });
      const { container } = await renderPage();
      expect(container.querySelector('.animate-spin')).toBeInTheDocument();
    });

    it('should redirect unauthorized satgas', async () => {
      mockUseAuth.mockReturnValue({
        user: { id: '1', role: 'satgas', full_name: 'Worker', username: 'w1', created_at: '' },
        loading: false,
      });
      await renderPage();
      expect(mockPush).toHaveBeenCalledWith('/');
    });
  });

  describe('Task Display', () => {
    beforeEach(() => {
      mockUseAuth.mockReturnValue({ user: mockKorlapUser, loading: false });
    });

    it('should display task title', async () => {
      await renderPage();
      expect(screen.getByText('Penyapuan Area Utara')).toBeInTheDocument();
    });

    it('should display status badge', async () => {
      await renderPage();
      expect(screen.getByText('Pending')).toBeInTheDocument();
    });

    it('should display priority badge', async () => {
      await renderPage();
      expect(screen.getByText('Tinggi')).toBeInTheDocument();
    });

    it('should display description', async () => {
      await renderPage();
      expect(screen.getByText('Bersihkan area utara taman')).toBeInTheDocument();
    });

    it('should display area and rayon', async () => {
      await renderPage();
      expect(screen.getByText('Taman Bungkul')).toBeInTheDocument();
      expect(screen.getByText('Rayon 1')).toBeInTheDocument();
    });

    it('should display creator and assignee', async () => {
      await renderPage();
      const korlapMatches = screen.getAllByText('Korlap One');
      expect(korlapMatches.length).toBeGreaterThanOrEqual(1);
      expect(screen.getByText('Satgas One')).toBeInTheDocument();
    });

    it('should display activity type', async () => {
      await renderPage();
      expect(screen.getByText('Penyapuan')).toBeInTheDocument();
    });

    it('should show not found for null task', async () => {
      (tasksApi.useTask as jest.Mock).mockReturnValue({
        data: null,
        isLoading: false,
      });
      await renderPage('nonexistent');
      expect(screen.getByText(/tugas tidak ditemukan/i)).toBeInTheDocument();
    });
  });

  describe('Tagged Users', () => {
    beforeEach(() => {
      mockUseAuth.mockReturnValue({ user: mockKorlapUser, loading: false });
    });

    it('should display tagged users section', async () => {
      (tasksApi.useTask as jest.Mock).mockReturnValue({
        data: mockTaskWithTags,
        isLoading: false,
      });
      await renderPage();
      expect(screen.getByText('Ditandai (2)')).toBeInTheDocument();
      expect(screen.getByText('Satgas Two')).toBeInTheDocument();
      expect(screen.getByText('Satgas Three')).toBeInTheDocument();
    });

    it('should show untag button when user is creator', async () => {
      (tasksApi.useTask as jest.Mock).mockReturnValue({
        data: mockTaskWithTags,
        isLoading: false,
      });
      await renderPage();
      const untagButtons = screen.getAllByRole('button', { name: /hapus tag/i });
      expect(untagButtons).toHaveLength(2);
    });

    it('should NOT show untag button when user is not creator', async () => {
      mockUseAuth.mockReturnValue({ user: mockAdminSystemUser, loading: false });
      (tasksApi.useTask as jest.Mock).mockReturnValue({
        data: mockTaskWithTags,
        isLoading: false,
      });
      await renderPage();
      expect(screen.queryByRole('button', { name: /hapus tag/i })).not.toBeInTheDocument();
    });
  });

  describe('Verification Workflow', () => {
    it('should show verify/revision buttons for completed task (korlap)', async () => {
      mockUseAuth.mockReturnValue({ user: mockKorlapUser, loading: false });
      (tasksApi.useTask as jest.Mock).mockReturnValue({
        data: mockCompletedTask,
        isLoading: false,
      });
      await renderPage();
      expect(screen.getByRole('button', { name: /verifikasi/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /minta revisi/i })).toBeInTheDocument();
    });

    it('should NOT show verify buttons for pending task', async () => {
      mockUseAuth.mockReturnValue({ user: mockKorlapUser, loading: false });
      await renderPage();
      expect(screen.queryByRole('button', { name: /verifikasi/i })).not.toBeInTheDocument();
    });

    it('should NOT show verify buttons for non-verifier roles (admin_system)', async () => {
      mockUseAuth.mockReturnValue({ user: mockAdminSystemUser, loading: false });
      (tasksApi.useTask as jest.Mock).mockReturnValue({
        data: mockCompletedTask,
        isLoading: false,
      });
      await renderPage();
      expect(screen.queryByRole('button', { name: /verifikasi/i })).not.toBeInTheDocument();
    });

    it('should display completion info for completed task', async () => {
      mockUseAuth.mockReturnValue({ user: mockKorlapUser, loading: false });
      (tasksApi.useTask as jest.Mock).mockReturnValue({
        data: mockCompletedTask,
        isLoading: false,
      });
      await renderPage();
      expect(screen.getByText('Penyelesaian')).toBeInTheDocument();
      expect(screen.getByText('Sudah selesai dibersihkan')).toBeInTheDocument();
      expect(screen.getByText('Foto (2)')).toBeInTheDocument();
    });

    it('should display verification info for verified task', async () => {
      mockUseAuth.mockReturnValue({ user: mockKorlapUser, loading: false });
      (tasksApi.useTask as jest.Mock).mockReturnValue({
        data: mockVerifiedTask,
        isLoading: false,
      });
      await renderPage();
      expect(screen.getByText('Verifikasi')).toBeInTheDocument();
    });
  });

  describe('Decline Info', () => {
    beforeEach(() => {
      mockUseAuth.mockReturnValue({ user: mockKorlapUser, loading: false });
    });

    it('should display decline reason', async () => {
      (tasksApi.useTask as jest.Mock).mockReturnValue({
        data: mockDeclinedTask,
        isLoading: false,
      });
      await renderPage();
      expect(screen.getByText('Penolakan')).toBeInTheDocument();
      expect(screen.getByText('Area sudah ditugaskan ke orang lain')).toBeInTheDocument();
    });
  });

  describe('Revision Info', () => {
    beforeEach(() => {
      mockUseAuth.mockReturnValue({ user: mockKorlapUser, loading: false });
    });

    it('should display revision reason', async () => {
      (tasksApi.useTask as jest.Mock).mockReturnValue({
        data: mockRevisionTask,
        isLoading: false,
      });
      await renderPage();
      expect(screen.getByText('Permintaan Revisi')).toBeInTheDocument();
      expect(screen.getByText('Foto tidak lengkap')).toBeInTheDocument();
    });
  });

  describe('Navigation', () => {
    beforeEach(() => {
      mockUseAuth.mockReturnValue({ user: mockKorlapUser, loading: false });
    });

    it('should have breadcrumb to tasks list', async () => {
      await renderPage();
      const link = screen.getByRole('link', { name: /tugas/i });
      expect(link).toHaveAttribute('href', '/tasks');
    });

    it('should have back button', async () => {
      await renderPage();
      expect(screen.getByRole('button', { name: /kembali/i })).toBeInTheDocument();
    });
  });
});
