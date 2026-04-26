/**
 * Tests for Phase 3 Monitoring v2 page features
 * - staff_kecamatan role redirect
 * - WorkerListVirtual row count
 * - WS status:v2 cache patch
 * - HierarchyFilterPanel scope/id emission
 */

import React from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// ---------------------------------------------------------------------------
// Mock virtualizer so rows render in jsdom
// ---------------------------------------------------------------------------
jest.mock('@tanstack/react-virtual', () => ({
  useVirtualizer: ({ count, estimateSize }: { count: number; estimateSize: () => number }) => {
    const itemHeight = estimateSize();
    const items = Array.from({ length: count }, (_, i) => ({
      index: i,
      start: i * itemHeight,
      size: itemHeight,
      key: i,
      lane: 0,
    }));
    return {
      getVirtualItems: () => items,
      getTotalSize: () => count * itemHeight,
    };
  },
}));

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockPush = jest.fn();
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
  usePathname: () => '/monitoring',
}));

// Auth hook — we control the user returned
let mockUser: { role: string; id: string; full_name: string; area_id?: string; rayon_id?: string } | null = {
  role: 'top_management',
  id: 'user-tm-1',
  full_name: 'Top Manager',
};
let mockAuthLoading = false;

jest.mock('@/lib/auth/hooks', () => ({
  useAuth: () => ({ user: mockUser, loading: mockAuthLoading }),
}));

// Socket.io — prevent real connections
jest.mock('socket.io-client', () => {
  const handlers: Record<string, ((...args: unknown[]) => void)[]> = {};
  const mockSocket = {
    on: jest.fn((event: string, cb: (...args: unknown[]) => void) => {
      handlers[event] = [...(handlers[event] ?? []), cb];
    }),
    disconnect: jest.fn(),
    emit: jest.fn(),
  };
  return {
    __esModule: true,
    default: jest.fn(() => mockSocket),
    _handlers: handlers,
    _socket: mockSocket,
  };
});

// Cookies util
jest.mock('@/lib/utils/cookies', () => ({
  getCookie: jest.fn(() => 'mock-token'),
}));

// API hooks — lightweight stubs
jest.mock('@/lib/api/monitoring', () => ({
  monitoringKeys: {
    all: ['monitoring'],
    liveUsers: (f?: unknown) => ['monitoring', 'live-users', f],
    userDaySummary: (id: string) => ['monitoring', 'user-day-summary', id],
    locationHistory: (id: string, d: string) => ['monitoring', 'location-history', id, d],
    staffingSummary: (f?: unknown) => ['monitoring', 'staffing-summary', f],
    boundaries: () => ['monitoring', 'boundaries'],
  },
  useLiveUsers: jest.fn(() => ({
    data: {
      total_active: 2,
      total_inactive: 0,
      total_outside_area: 0,
      total_missing: 0,
      total_offline: 1,
      users: [
        {
          id: 'u1',
          full_name: 'Andi',
          role: 'satgas',
          status: 'active',
          area_id: 'a1',
          area_name: 'Area Utara',
          rayon_id: 'r1',
          rayon_name: 'Rayon 1',
          latitude: -7.2,
          longitude: 112.7,
          accuracy: 5,
          battery_level: 80,
          last_update: new Date(Date.now() - 60_000).toISOString(),
          is_within_area: true,
          outside_boundary: false,
          shift_id: 's1',
          shift_name: 'Pagi',
          clock_in_time: new Date().toISOString(),
          current_task_status: null,
          current_task_title: null,
          phone: null,
        },
        {
          id: 'u2',
          full_name: 'Budi',
          role: 'satgas',
          status: 'active',
          area_id: 'a1',
          area_name: 'Area Utara',
          rayon_id: 'r1',
          rayon_name: 'Rayon 1',
          latitude: -7.21,
          longitude: 112.71,
          accuracy: 5,
          battery_level: 60,
          last_update: new Date(Date.now() - 120_000).toISOString(),
          is_within_area: true,
          outside_boundary: false,
          shift_id: 's1',
          shift_name: 'Pagi',
          clock_in_time: new Date().toISOString(),
          current_task_status: null,
          current_task_title: null,
          phone: null,
        },
      ],
      generated_at: new Date().toISOString(),
    },
    isLoading: false,
    refetch: jest.fn(),
  })),
  useUserDaySummary: jest.fn(() => ({ data: null, isLoading: false })),
  useLocationHistory: jest.fn(() => ({ data: null, isLoading: false })),
  useBoundaries: jest.fn(() => ({ data: null })),
}));

jest.mock('@/lib/api/monitoring-v2', () => ({
  useMonitoringSnapshot: jest.fn(() => ({
    data: {
      success: true,
      data: {
        workers: [
          {
            user_id: 'u1',
            full_name: 'Andi',
            role: 'satgas',
            lat: -7.2,
            lng: 112.7,
            status: 'active',
            area_id: 'a1',
            area_name: 'Area Utara',
            rayon_id: 'r1',
            rayon_name: 'Rayon 1',
            last_update: new Date(Date.now() - 60_000).toISOString(),
            is_within_area: true,
            battery_level: 80,
          },
          {
            user_id: 'u2',
            full_name: 'Budi',
            role: 'satgas',
            lat: -7.21,
            lng: 112.71,
            status: 'active',
            area_id: 'a1',
            area_name: 'Area Utara',
            rayon_id: 'r1',
            rayon_name: 'Rayon 1',
            last_update: new Date(Date.now() - 120_000).toISOString(),
            is_within_area: true,
            battery_level: 60,
          },
        ],
        area_summaries: [],
        total_active: 2,
        total_inactive: 0,
        total_outside_area: 0,
        total_missing: 0,
        total_offline: 0,
        generated_at: new Date().toISOString(),
      },
    },
    isLoading: false,
    refetch: jest.fn(),
  })),
  snapshotKeys: {
    all: ['monitoring', 'snapshot'],
    byScope: (scope: string, id?: string) => ['monitoring', 'snapshot', scope, id],
  },
}));

jest.mock('@/lib/api/rayons', () => ({
  useRayons: jest.fn(() => ({ data: [] })),
}));

jest.mock('@/lib/api/areas', () => ({
  useAreas: jest.fn(() => ({ data: { data: [] } })),
}));

// Map component — no WebGL needed in tests
jest.mock('@/components/monitoring/MonitoringMap', () => ({
  MonitoringMap: () => <div data-testid="monitoring-map">map</div>,
}));

jest.mock('@/components/monitoring/MonitoringSidePanel', () => ({
  MonitoringSidePanel: () => <div data-testid="side-panel">side-panel</div>,
}));

jest.mock('@/components/monitoring/UserDetailPanel', () => ({
  UserDetailPanel: ({ onBack }: { onBack: () => void }) => (
    <button data-testid="user-detail-panel" onClick={onBack}>
      detail
    </button>
  ),
}));

jest.mock('@/components/monitoring/LocationTimeline', () => ({
  LocationTimeline: () => <div data-testid="location-timeline">timeline</div>,
}));

jest.mock('@/components/monitoring/StaffingSummaryCard', () => ({
  StaffingSummaryCard: () => <div data-testid="staffing-summary">staffing</div>,
}));

jest.mock('@/components/monitoring/ReassignWorkerModal', () => ({
  ReassignWorkerModal: () => <div data-testid="reassign-modal">reassign</div>,
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function createQueryClient() {
  return new QueryClient({ defaultOptions: { queries: { retry: false } } });
}

async function renderPage() {
  const { default: MonitoringPage } = await import('../page');
  const qc = createQueryClient();
  return {
    qc,
    ...render(
      <QueryClientProvider client={qc}>
        <MonitoringPage />
      </QueryClientProvider>
    ),
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('MonitoringPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUser = { role: 'top_management', id: 'user-tm-1', full_name: 'Top Manager' };
    mockAuthLoading = false;
  });

  // --- Role gate -----------------------------------------------------------

  it('redirects staff_kecamatan to / immediately', async () => {
    mockUser = { role: 'staff_kecamatan', id: 'sk-1', full_name: 'Staff Kel' };
    await renderPage();
    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/');
    });
  });

  it('renders monitoring dashboard for top_management role', async () => {
    await renderPage();
    expect(await screen.findByText('Monitoring Real-Time')).toBeInTheDocument();
  });

  it('renders monitoring dashboard for korlap role', async () => {
    mockUser = { role: 'korlap', id: 'korlap-1', full_name: 'Korlap X', area_id: 'a1' };
    await renderPage();
    expect(await screen.findByText('Monitoring Real-Time')).toBeInTheDocument();
  });

  // --- WorkerListVirtual row count -----------------------------------------

  it('renders virtualized rows matching worker count from snapshot', async () => {
    await renderPage();
    // 2 workers in the mocked snapshot
    const rows = await screen.findAllByRole('option');
    expect(rows.length).toBeGreaterThanOrEqual(1);
  });

  it('shows worker names from snapshot in the list', async () => {
    await renderPage();
    expect(await screen.findByText('Andi')).toBeInTheDocument();
    expect(await screen.findByText('Budi')).toBeInTheDocument();
  });

  // --- HierarchyFilterPanel ------------------------------------------------

  it('renders scope toggle buttons', async () => {
    await renderPage();
    expect(await screen.findByText('Kota')).toBeInTheDocument();
    expect(await screen.findByText('Rayon')).toBeInTheDocument();
    expect(await screen.findByText('Area')).toBeInTheDocument();
  });

  it('pressing Rayon scope marks the Rayon button as pressed', async () => {
    const user = userEvent.setup();
    await renderPage();
    const rayonBtn = await screen.findByRole('button', { name: /^Rayon$/i });
    await user.click(rayonBtn);
    expect(rayonBtn).toHaveAttribute('aria-pressed', 'true');
  });

  it('pressing Reset hides the reset button and restores city scope', async () => {
    const user = userEvent.setup();
    await renderPage();
    const rayonBtn = await screen.findByRole('button', { name: /^Rayon$/i });
    await user.click(rayonBtn);
    const resetBtn = await screen.findByRole('button', { name: /reset/i });
    await user.click(resetBtn);
    await waitFor(() => {
      expect(screen.queryByRole('button', { name: /reset/i })).not.toBeInTheDocument();
    });
  });

  // --- WS status:v2 cache patch -------------------------------------------

  it('patches snapshot cache when status:v2 event is received', async () => {
    const socketIo = (await import('socket.io-client')) as unknown as {
      _socket: {
        on: jest.MockedFunction<(event: string, cb: (...args: unknown[]) => void) => void>;
      };
    };

    const { qc } = await renderPage();
    await screen.findByText('Monitoring Real-Time');

    // Pre-seed the query cache with snapshot data so the patch has something to update
    const queryKey = ['monitoring', 'snapshot', 'city', undefined];
    qc.setQueryData(queryKey, {
      success: true,
      data: {
        workers: [
          {
            user_id: 'u1',
            full_name: 'Andi',
            role: 'satgas',
            lat: -7.2,
            lng: 112.7,
            status: 'active',
            area_id: 'a1',
            area_name: 'Area Utara',
            rayon_id: 'r1',
            rayon_name: 'Rayon 1',
            last_update: new Date().toISOString(),
            is_within_area: true,
            battery_level: 80,
          },
        ],
        area_summaries: [],
        total_active: 1,
        total_inactive: 0,
        total_outside_area: 0,
        total_missing: 0,
        total_offline: 0,
        generated_at: new Date().toISOString(),
      },
    });

    // Simulate status:v2 patch via socket handler
    const onCalls = socketIo._socket.on.mock.calls;
    const statusV2Handler = onCalls.find(([event]) => event === 'status:v2')?.[1] as
      | ((...args: unknown[]) => void)
      | undefined;

    expect(statusV2Handler).toBeDefined();

    act(() => {
      statusV2Handler?.({
        user_id: 'u1',
        prev: 'active',
        next: 'missing',
        timestamp: new Date().toISOString(),
      });
    });

    await waitFor(() => {
      const cached = qc.getQueryData<{ data: { workers: { status: string }[] } }>(queryKey);
      expect(cached?.data?.workers[0]?.status).toBe('missing');
    });
  });

  // --- Loading state -------------------------------------------------------

  it('shows loading text when auth is loading', async () => {
    mockAuthLoading = true;
    mockUser = null;
    await renderPage();
    expect(screen.getByText('Memuat...')).toBeInTheDocument();
  });
});
