/**
 * Unit Tests: Overtime Detail Page
 * Tests overtime detail display and approval workflow
 */

import React from 'react';
import { render, screen, act } from '@testing-library/react';
import OvertimeDetailPage from '../page';
import '@testing-library/jest-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import * as overtimeApi from '@/lib/api/overtime';

const mockPush = jest.fn();
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
  usePathname: () => '/overtime/ot-1',
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

jest.mock('@/lib/api/overtime');

const mockOvertime = {
  id: 'ot-1',
  user_id: 'user-1',
  user: { id: 'user-1', username: 'satgas1', full_name: 'Satgas One', role: 'satgas' as const },
  area_id: 'area-1',
  area: { id: 'area-1', name: 'Taman Bungkul' },
  start_datetime: '2026-02-16T17:00:00+07:00',
  end_datetime: '2026-02-16T20:00:00+07:00',
  status: 'pending' as const,
  activity_type_id: 'type-1',
  activity_type: { id: 'type-1', code: 'PLANTING', name: 'Penanaman' },
  description: 'Lembur penanaman pohon',
  photo_urls: ['photo1.jpg'],
  notes: null,
  created_at: '2026-02-16T08:00:00Z',
};

const mockApprovedOvertime = {
  ...mockOvertime,
  status: 'approved' as const,
  approved_by: 'korlap-1',
  approver: { id: 'korlap-1', full_name: 'Korlap One' },
  approved_at: '2026-02-16T18:00:00Z',
};

const mockRejectedOvertime = {
  ...mockOvertime,
  status: 'rejected' as const,
  approved_by: 'korlap-1',
  approver: { id: 'korlap-1', full_name: 'Korlap One' },
  approved_at: '2026-02-16T18:00:00Z',
  rejection_reason: 'Tidak sesuai kebutuhan',
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
  username: 'admin_rayon1',
  full_name: 'Admin Data',
  role: 'admin_rayon' as const,
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

async function renderPage(id = 'ot-1') {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let result: any;
  await act(async () => {
    result = render(<OvertimeDetailPage params={Promise.resolve({ id })} />, {
      wrapper: createWrapper(),
    });
  });
  return result as ReturnType<typeof render>;
}

describe('OvertimeDetailPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (overtimeApi.useOvertime as jest.Mock).mockReturnValue({
      data: mockOvertime,
      isLoading: false,
    });
    (overtimeApi.useApproveOvertime as jest.Mock).mockReturnValue({
      mutateAsync: mockMutateAsync,
      isPending: false,
    });
    (overtimeApi.useRejectOvertime as jest.Mock).mockReturnValue({
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

  describe('Overtime Display', () => {
    beforeEach(() => {
      mockUseAuth.mockReturnValue({ user: mockKorlapUser, loading: false });
    });

    it('should display status badge', async () => {
      await renderPage();
      expect(screen.getByText('Menunggu')).toBeInTheDocument();
    });

    it('should display user information', async () => {
      await renderPage();
      expect(screen.getByText('Satgas One')).toBeInTheDocument();
    });

    it('should display area name', async () => {
      await renderPage();
      expect(screen.getByText('Taman Bungkul')).toBeInTheDocument();
    });

    it('should display activity type', async () => {
      await renderPage();
      expect(screen.getByText('Penanaman')).toBeInTheDocument();
    });

    it('should display description', async () => {
      await renderPage();
      expect(screen.getByText('Lembur penanaman pohon')).toBeInTheDocument();
    });

    it('should show not found for null overtime', async () => {
      (overtimeApi.useOvertime as jest.Mock).mockReturnValue({
        data: null,
        isLoading: false,
      });
      await renderPage('nonexistent');
      expect(screen.getByText(/lembur tidak ditemukan/i)).toBeInTheDocument();
    });
  });

  describe('Approval Workflow', () => {
    it('should show approve/reject for korlap with pending overtime', async () => {
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

    it('should display approver info for approved overtime', async () => {
      mockUseAuth.mockReturnValue({ user: mockKorlapUser, loading: false });
      (overtimeApi.useOvertime as jest.Mock).mockReturnValue({
        data: mockApprovedOvertime,
        isLoading: false,
      });
      await renderPage();
      expect(screen.getByText('Persetujuan')).toBeInTheDocument();
      expect(screen.getByText('Korlap One')).toBeInTheDocument();
    });

    it('should display rejection reason for rejected overtime', async () => {
      mockUseAuth.mockReturnValue({ user: mockKorlapUser, loading: false });
      (overtimeApi.useOvertime as jest.Mock).mockReturnValue({
        data: mockRejectedOvertime,
        isLoading: false,
      });
      await renderPage();
      expect(screen.getByText('Penolakan')).toBeInTheDocument();
      expect(screen.getByText('Tidak sesuai kebutuhan')).toBeInTheDocument();
    });
  });

  describe('Navigation', () => {
    beforeEach(() => {
      mockUseAuth.mockReturnValue({ user: mockKorlapUser, loading: false });
    });

    it('should have breadcrumb to overtime list', async () => {
      await renderPage();
      const link = screen.getByRole('link', { name: /lembur/i });
      expect(link).toHaveAttribute('href', '/overtime');
    });

    it('should have back button', async () => {
      await renderPage();
      expect(screen.getByRole('button', { name: /kembali/i })).toBeInTheDocument();
    });
  });
});
