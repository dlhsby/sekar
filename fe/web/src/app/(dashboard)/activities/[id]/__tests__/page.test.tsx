/**
 * Unit Tests: Activity Detail Page
 * Tests activity detail display and approval workflow
 */

import React from 'react';
import { render, screen, act } from '@testing-library/react';
import ActivityDetailPage from '../page';
import '@testing-library/jest-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import * as activitiesApi from '@/lib/api/activities';

const mockPush = jest.fn();
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
  usePathname: () => '/activities/activity-1',
}));

jest.mock('next/link', () => {
  const MockLink = ({
    href,
    children,
    ...rest
  }: {
    href: string;
    children: React.ReactNode;
    [k: string]: unknown;
  }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  );
  MockLink.displayName = 'MockLink';
  return MockLink;
});

const mockUseAuth = jest.fn();
jest.mock('@/lib/auth/hooks', () => ({
  useAuth: () => mockUseAuth(),
}));

jest.mock('@/lib/api/activities');

const mockActivity = {
  id: 'activity-1',
  user_id: 'user-1',
  user: { id: 'user-1', username: 'satgas1', full_name: 'Satgas One', role: 'satgas' as const },
  shift_id: 'shift-1',
  area_id: 'area-1',
  area: { id: 'area-1', name: 'Taman Bungkul' },
  activity_type_id: 'type-1',
  activity_type: { id: 'type-1', code: 'SWEEPING', name: 'Penyapuan' },
  description: 'Penyapuan area taman pagi',
  photo_urls: ['photo1.jpg', 'photo2.jpg'],
  gps_lat: -7.289383,
  gps_lng: 112.742308,
  status: 'pending' as const,
  created_at: '2026-02-16T08:00:00Z',
};

const mockApprovedActivity = {
  ...mockActivity,
  status: 'approved' as const,
  reviewed_by: 'korlap-1',
  reviewer: { id: 'korlap-1', full_name: 'Korlap One' },
  reviewed_at: '2026-02-16T10:00:00Z',
};

const mockRejectedActivity = {
  ...mockActivity,
  status: 'rejected' as const,
  reviewed_by: 'korlap-1',
  reviewer: { id: 'korlap-1', full_name: 'Korlap One' },
  reviewed_at: '2026-02-16T10:00:00Z',
  rejection_reason: 'Foto tidak jelas',
};

const mockKorlapUser = {
  id: 'korlap-1',
  username: 'korlap1',
  full_name: 'Korlap One',
  role: 'korlap' as const,
  area_id: 'area-1',
  created_at: '2024-01-01T00:00:00Z',
};

const mockAdminDataUser = {
  id: 'admin-1',
  username: 'admin_data1',
  full_name: 'Admin Data',
  role: 'admin_data' as const,
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

async function renderPage(id = 'activity-1') {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let result: any;
  await act(async () => {
    result = render(<ActivityDetailPage params={Promise.resolve({ id })} />, {
      wrapper: createWrapper(),
    });
  });
  return result as ReturnType<typeof render>;
}

describe('ActivityDetailPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (activitiesApi.useActivity as jest.Mock).mockReturnValue({
      data: mockActivity,
      isLoading: false,
    });
    (activitiesApi.useApproveActivity as jest.Mock).mockReturnValue({
      mutateAsync: mockMutateAsync,
      isPending: false,
    });
    (activitiesApi.useRejectActivity as jest.Mock).mockReturnValue({
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

    it('should redirect unauthorized user', async () => {
      mockUseAuth.mockReturnValue({
        user: { id: '1', role: 'satgas', full_name: 'Worker', username: 'w1', created_at: '' },
        loading: false,
      });
      await renderPage();
      expect(mockPush).toHaveBeenCalledWith('/');
    });
  });

  describe('Activity Display', () => {
    beforeEach(() => {
      mockUseAuth.mockReturnValue({ user: mockKorlapUser, loading: false });
    });

    it('should display activity type and status badges', async () => {
      await renderPage();
      const typeMatches = screen.getAllByText('Penyapuan');
      expect(typeMatches.length).toBeGreaterThanOrEqual(1);
      expect(screen.getByText('Menunggu')).toBeInTheDocument();
    });

    it('should display user information', async () => {
      await renderPage();
      expect(screen.getByText('Satgas One')).toBeInTheDocument();
      expect(screen.getByText('satgas1')).toBeInTheDocument();
    });

    it('should display area name', async () => {
      await renderPage();
      expect(screen.getByText('Taman Bungkul')).toBeInTheDocument();
    });

    it('should display description', async () => {
      await renderPage();
      expect(screen.getByText('Penyapuan area taman pagi')).toBeInTheDocument();
    });

    it('should display photo count', async () => {
      await renderPage();
      expect(screen.getByText('Foto (2)')).toBeInTheDocument();
    });

    it('should show not found when activity is null', async () => {
      (activitiesApi.useActivity as jest.Mock).mockReturnValue({
        data: null,
        isLoading: false,
      });
      await renderPage('nonexistent');
      expect(screen.getByText(/aktivitas tidak ditemukan/i)).toBeInTheDocument();
    });
  });

  describe('Approval Workflow', () => {
    it('should show approve/reject buttons for korlap with pending activity', async () => {
      mockUseAuth.mockReturnValue({ user: mockKorlapUser, loading: false });
      await renderPage();
      expect(screen.getByRole('button', { name: /setujui/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /tolak/i })).toBeInTheDocument();
    });

    it('should NOT show approve/reject for non-approver roles', async () => {
      mockUseAuth.mockReturnValue({ user: mockAdminDataUser, loading: false });
      await renderPage();
      expect(screen.queryByRole('button', { name: /setujui/i })).not.toBeInTheDocument();
    });

    it('should NOT show approve/reject for approved activity', async () => {
      mockUseAuth.mockReturnValue({ user: mockKorlapUser, loading: false });
      (activitiesApi.useActivity as jest.Mock).mockReturnValue({
        data: mockApprovedActivity,
        isLoading: false,
      });
      await renderPage();
      expect(screen.queryByRole('button', { name: /setujui/i })).not.toBeInTheDocument();
    });

    it('should display reviewer info for approved activity', async () => {
      mockUseAuth.mockReturnValue({ user: mockKorlapUser, loading: false });
      (activitiesApi.useActivity as jest.Mock).mockReturnValue({
        data: mockApprovedActivity,
        isLoading: false,
      });
      await renderPage();
      expect(screen.getByText('Persetujuan')).toBeInTheDocument();
      expect(screen.getByText('Korlap One')).toBeInTheDocument();
    });

    it('should display rejection reason for rejected activity', async () => {
      mockUseAuth.mockReturnValue({ user: mockKorlapUser, loading: false });
      (activitiesApi.useActivity as jest.Mock).mockReturnValue({
        data: mockRejectedActivity,
        isLoading: false,
      });
      await renderPage();
      expect(screen.getByText('Penolakan')).toBeInTheDocument();
      expect(screen.getByText('Foto tidak jelas')).toBeInTheDocument();
    });
  });

  describe('Navigation', () => {
    beforeEach(() => {
      mockUseAuth.mockReturnValue({ user: mockKorlapUser, loading: false });
    });

    it('should have breadcrumb link to activities list', async () => {
      await renderPage();
      const breadcrumbLink = screen.getByRole('link', { name: /aktivitas/i });
      expect(breadcrumbLink).toHaveAttribute('href', '/activities');
    });

    it('should have back button', async () => {
      await renderPage();
      expect(screen.getByRole('button', { name: /kembali/i })).toBeInTheDocument();
    });
  });
});
