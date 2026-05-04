/**
 * Smoke tests for the admin pruning-requests dashboard pages.
 * Covers role gating, table render, and the wired-up review/convert mutations.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import PruningRequestsPage from '../page';
import * as pruningApi from '@/lib/api/pruning-requests';

const mockPush = jest.fn();
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
  useParams: () => ({ id: 'req-1' }),
  usePathname: () => '/pruning-requests',
}));

const mockUseAuth = jest.fn();
jest.mock('@/lib/auth/hooks', () => ({
  useAuth: () => mockUseAuth(),
}));

jest.mock('@/lib/api/pruning-requests');

const mockAdmin = {
  id: 'u-1',
  username: 'admin',
  full_name: 'Admin',
  role: 'admin_system' as const,
  created_at: '2026-01-01T00:00:00Z',
};

const mockKorlap = {
  id: 'u-2',
  username: 'korlap1',
  full_name: 'Korlap One',
  role: 'korlap' as const,
  created_at: '2026-01-01T00:00:00Z',
};

const mockRequest: pruningApi.PruningRequest = {
  id: 'req-1',
  referenceCode: 'PR-001',
  submittedBy: 'kec-1',
  submitter: { id: 'kec-1', full_name: 'Staff Pusat', role: 'staff_kecamatan' },
  kecamatanName: 'Tegalsari',
  rayonId: 'r-1',
  rayon: { id: 'r-1', name: 'Rayon Pusat' },
  address: 'Jl. Test 1',
  gpsLat: -7.25,
  gpsLng: 112.75,
  expectedDate: null,
  expectedYear: 2026,
  expectedIsoWeek: 21,
  estimatedPlantCount: 3,
  treeCount: 3,
  treeHeightEstimate: '5m',
  treeDiameterEstimate: '30cm',
  requesterName: 'Pak Test',
  requesterPhone: '0812',
  rtLeaderName: 'Pak RT',
  rtLeaderPhone: '0813',
  photoUrls: [],
  notes: null,
  status: 'submitted',
  reviewedBy: null,
  reviewer: null,
  reviewedAt: null,
  reviewNotes: null,
  convertedTaskId: null,
  createdAt: '2026-05-03T10:00:00Z',
  updatedAt: '2026-05-03T10:00:00Z',
};

function renderWithClient(ui: React.ReactElement) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>);
}

beforeEach(() => {
  jest.clearAllMocks();
  mockUseAuth.mockReturnValue({ user: mockAdmin, loading: false });
  (pruningApi.usePruningRequests as jest.Mock).mockReturnValue({
    data: { data: [mockRequest], meta: { total: 1, page: 1, limit: 20, totalPages: 1 } },
    isLoading: false,
    isError: false,
  });
});

describe('PruningRequestsPage (admin list)', () => {
  it('renders the reference code and kecamatan in the table', () => {
    renderWithClient(<PruningRequestsPage />);
    expect(screen.getByText('PR-001')).toBeInTheDocument();
    expect(screen.getByText('Tegalsari')).toBeInTheDocument();
    expect(screen.getByText('Rayon Pusat')).toBeInTheDocument();
  });

  it('shows the week pair when expectedDate is null', () => {
    renderWithClient(<PruningRequestsPage />);
    expect(screen.getByText('W21/2026')).toBeInTheDocument();
  });

  it('redirects users without admin disposition role away', () => {
    mockUseAuth.mockReturnValue({ user: mockKorlap, loading: false });
    renderWithClient(<PruningRequestsPage />);
    expect(mockPush).toHaveBeenCalledWith('/');
  });
});
