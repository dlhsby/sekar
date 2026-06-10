/**
 * Unit Tests: Kecamatan "Permintaan Saya" list (KEC-1)
 */

import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import MyPruningRequestsPage from '../my/page';

const mockUseMy = jest.fn();
jest.mock('@/lib/api/pruning-requests', () => ({
  useMyPruningRequests: () => mockUseMy(),
}));
jest.mock('next/navigation', () => ({ useRouter: () => ({ push: jest.fn() }) }));

const baseReq = {
  id: 'r1',
  referenceCode: 'PR-001',
  address: 'Jalan Darmo No. 1, Surabaya',
  status: 'submitted' as const,
  createdAt: '2026-06-01T00:00:00Z',
  expectedDate: null,
  expectedYear: 2026,
  expectedIsoWeek: 23,
};

describe('MyPruningRequestsPage', () => {
  beforeEach(() => jest.clearAllMocks());

  it('shows a skeleton while loading', () => {
    mockUseMy.mockReturnValue({ data: undefined, isLoading: true, isError: false });
    const { container } = render(<MyPruningRequestsPage />);
    expect(container.querySelector('.animate-shimmer')).toBeInTheDocument();
  });

  it('renders an empty state when there are no requests', () => {
    mockUseMy.mockReturnValue({ data: [], isLoading: false, isError: false });
    render(<MyPruningRequestsPage />);
    expect(screen.getByText(/belum ada permintaan/i)).toBeInTheDocument();
  });

  it('lists submissions with reference code, address and status', () => {
    mockUseMy.mockReturnValue({ data: [baseReq], isLoading: false, isError: false });
    render(<MyPruningRequestsPage />);
    expect(screen.getByText('PR-001')).toBeInTheDocument();
    expect(screen.getByText(/jalan darmo no\. 1/i)).toBeInTheDocument();
    expect(screen.getByText(/terkirim/i)).toBeInTheDocument();
    expect(screen.getByText(/minggu 23\/2026/i)).toBeInTheDocument();
  });

  it('surfaces an error state', () => {
    mockUseMy.mockReturnValue({ data: undefined, isLoading: false, isError: true });
    render(<MyPruningRequestsPage />);
    expect(screen.getByText(/gagal memuat/i)).toBeInTheDocument();
  });
});
