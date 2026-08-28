/**
 * Unit Tests: Monitoring Page (Phase 4-R)
 * Full-bleed map with floating overlays: top search, dismissible filter panel,
 * dismissible worker/area sheet. Auth/role gating + client-side filtering.
 */
import { render, screen, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import MonitoringPage from '../page';
import '@testing-library/jest-dom';

const mockPush = jest.fn();
jest.mock('next/navigation', () => ({ useRouter: () => ({ push: mockPush }) }));

const mockUseAuth = jest.fn();
jest.mock('@/lib/auth/hooks', () => ({ useAuth: () => mockUseAuth() }));

const mockSnapshot = jest.fn();
// Typed loosely on purpose: tests override `data` with real node fixtures, and
// inferring the shape from this default would pin it to `undefined`.
const mockAggregate = jest.fn<{ data?: unknown; isLoading: boolean; isFetching?: boolean; refetch: () => void }, []>(
  () => ({
    data: undefined,
    isLoading: false,
    isFetching: false,
    refetch: jest.fn(),
  })
);
jest.mock('@/lib/api/monitoring-v2', () => ({
  useMonitoringSnapshot: () => mockSnapshot(),
  useMonitoringAggregate: () => mockAggregate(),
  // 5.7b: MonitoringSearch queries the server for petugas; stub it empty here.
  useMonitoringSearchQuery: () => ({ data: { users: [] } }),
}));

const mockBoundaries = jest.fn();
jest.mock('@/lib/api/monitoring', () => ({
  useBoundaries: () => mockBoundaries(),
  // The worker trail query — the page reads `.data?.points`; no trail in tests.
  useLocationHistory: () => ({ data: undefined, isLoading: false }),
  // Worker-detail reads, both lazy on the selection. Undefined data exercises
  // the panel's own empty/loading handling rather than stubbing a summary.
  useUserDaySummary: () => ({ data: undefined, isLoading: false }),
  useReassignmentHistory: () => ({ data: undefined, isLoading: false }),
}));

// The real map needs Google Maps/WebGL — assert we hand it the worker list
// instead. (The page imports through the lazy next/dynamic wrapper — mock it.)
jest.mock('@/components/monitoring/SimpleMonitoringMapLazy', () => ({
  SimpleMonitoringMap: ({ workers }: { workers: { user_id: string }[] }) => (
    <div data-testid="map" data-count={workers.length} />
  ),
}));

const adminUser = { id: 'u1', full_name: 'Admin', role: 'admin_system' };

const worker = (over: Record<string, unknown>) => ({
  user_id: 'w1',
  full_name: 'Andi',
  role: 'satgas',
  lat: -7.25,
  lng: 112.75,
  status: 'active',
  location_id: 'a1',
  location_name: 'Taman A',
  district_id: 'r1',
  district_name: 'Rayon Pusat',
  // City-scheduled by default so they render at the default (city) drill scope.
  display_scope: 'city',
  display_scope_id: null,
  last_update: new Date().toISOString(),
  is_within_area: true,
  battery_level: 80,
  ...over,
});

/** Minimal AggregateNode — only the fields the Wilayah list reads. */
const aggNode = (over: Record<string, unknown>) => ({
  id: 'n1',
  name: 'Node',
  type: 'district',
  center_lat: -7.25,
  center_lng: 112.75,
  counts_by_status: { active: 0, offline: 0, absent: 0, outside_area: 0 },
  counts_by_role: {},
  worker_count: 0,
  online_count: 0,
  required: 0,
  is_understaffed: false,
  roster: { scheduled: 0, clocked_in: 0, belum_hadir: 0, tidak_hadir: 0 },
  presence: { aktif: { dalam: 0, luar: 0 }, tidak_aktif: { dalam: 0, luar: 0 } },
  district_id: null,
  region_id: null,
  ...over,
});

const snapshotData = {
  data: {
    data: {
      workers: [
        worker({ user_id: 'w1', full_name: 'Andi', status: 'active' }),
        worker({ user_id: 'w2', full_name: 'Budi', status: 'missing', district_id: 'r2', district_name: 'Rayon Timur' }),
      ],
      area_summaries: [
        { location_id: 'a1', location_name: 'Taman A', district_id: 'r1', district_name: 'Rayon Pusat', active_count: 1, required_count: 3, is_understaffed: true },
      ],
      total_active: 1,
      total_inactive: 0,
      total_outside_area: 0,
      total_missing: 1,
      total_offline: 0,
      generated_at: new Date().toISOString(),
    },
  },
  isLoading: false,
  refetch: jest.fn(),
};

const createWrapper = () => {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const Wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={qc}>{children}</QueryClientProvider>
  );
  Wrapper.displayName = 'TestWrapper';
  return Wrapper;
};

describe('MonitoringPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // The map mode is persisted per browser, so a test that sets it would
    // otherwise change the mode every later test runs under.
    window.localStorage.clear();
    // `clearAllMocks` clears calls, not implementations, so a `mockReturnValue`
    // set inside one test would otherwise be the aggregate every later test sees.
    mockAggregate.mockReturnValue({
      data: undefined,
      isLoading: false,
      isFetching: false,
      refetch: jest.fn(),
    });
    mockUseAuth.mockReturnValue({ user: adminUser, loading: false });
    mockSnapshot.mockReturnValue(snapshotData);
    mockBoundaries.mockReturnValue({ data: undefined });
  });

  it('shows a loading state until auth resolves', () => {
    mockUseAuth.mockReturnValue({ user: null, loading: true });
    render(<MonitoringPage />, { wrapper: createWrapper() });
    expect(screen.getByText(/memuat/i)).toBeInTheDocument();
  });

  it('redirects a role without monitoring access', () => {
    mockUseAuth.mockReturnValue({ user: { ...adminUser, role: 'satgas' }, loading: false });
    render(<MonitoringPage />, { wrapper: createWrapper() });
    expect(mockPush).toHaveBeenCalledWith('/');
  });

  it('renders the floating search, refresh and status pills for an admin', () => {
    render(<MonitoringPage />, { wrapper: createWrapper() });
    expect(screen.getByLabelText(/cari petugas/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /segarkan/i })).toBeInTheDocument();
    expect(screen.getByText('Aktif')).toBeInTheDocument();
    expect(screen.getByText('Tidak hadir')).toBeInTheDocument();
  });

  it('passes all snapshot workers to the map by default', () => {
    render(<MonitoringPage />, { wrapper: createWrapper() });
    expect(screen.getByTestId('map')).toHaveAttribute('data-count', '2');
  });

  it('selecting a search result opens the worker sheet and shows detail', () => {
    render(<MonitoringPage />, { wrapper: createWrapper() });
    fireEvent.change(screen.getByLabelText(/cari petugas/i), { target: { value: 'Andi' } });
    fireEvent.click(screen.getByRole('button', { name: /^andi/i }));
    expect(screen.getByRole('button', { name: /kembali ke daftar/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Andi' })).toBeInTheDocument();
  });

  it('opens the worker sheet and shows detail when a worker is selected', () => {
    // Admin at city scope; the mock workers are city-scheduled so they list here.
    render(<MonitoringPage />, { wrapper: createWrapper() });
    fireEvent.click(screen.getByRole('button', { name: /daftar area dan petugas/i }));
    fireEvent.click(screen.getByRole('button', { name: /^andi,/i }));
    expect(screen.getByRole('button', { name: /kembali ke daftar/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Andi' })).toBeInTheDocument();
  });

  it('shows workers in the Daftar Petugas at city scope (not just at lokasi)', () => {
    // The worker list is reachable from the Daftar Petugas at every level now —
    // previously only lokasi scope showed workers.
    render(<MonitoringPage />, { wrapper: createWrapper() });
    fireEvent.click(screen.getByRole('button', { name: /daftar area dan petugas/i }));
    expect(screen.getByRole('button', { name: /^andi/i })).toBeInTheDocument();
  });

  it('lists ONE level in the Wilayah tab in zoom mode, not the whole subtree', async () => {
    // Zoom and viewport used to list the whole flattened subtree here — 370 rows
    // at city scope on the real hierarchy, which makes the tab useless for the
    // thing it is for. The map's job in those modes is to draw everything; the
    // list's job is to let you go somewhere, so it stays one level deep in every
    // mode.
    window.localStorage.setItem('monitoring.mode.v1', 'zoom');
    mockAggregate.mockReturnValue({
      data: {
        nodes: [
          aggNode({ id: 'r1', name: 'Rayon Pusat', type: 'district' }),
          aggNode({ id: 'r2', name: 'Rayon Timur', type: 'district' }),
          aggNode({ id: 'a1', name: 'Taman A', type: 'location', district_id: 'r1' }),
          aggNode({ id: 'a2', name: 'Taman B', type: 'location', district_id: 'r1' }),
          aggNode({ id: 'a3', name: 'Taman C', type: 'location', district_id: 'r2' }),
        ],
      },
      isLoading: false,
      refetch: jest.fn(),
    });

    render(<MonitoringPage />, { wrapper: createWrapper() });
    fireEvent.click(screen.getByRole('button', { name: /daftar area dan petugas/i }));

    // The two rayon are listed; their lokasi are not — those appear after you
    // drill into a rayon.
    expect(await screen.findByText('Rayon Pusat')).toBeInTheDocument();
    expect(screen.getByText('Rayon Timur')).toBeInTheDocument();
    expect(screen.queryByText('Taman A')).toBeNull();
    expect(screen.queryByText('Taman C')).toBeNull();
  });

  it('lists a rayon\'s kawasan AND its kawasan-less lokasi as one level', async () => {
    // Both are children of the rayon, so both belong to this level — the map has
    // always drawn them together here. The list used to return kawasan alone
    // whenever there was at least one, so a rayon with both kinds listed half of
    // what the map showed.
    //
    // This also covers the backend fix that makes it possible: a kawasan carries
    // `district_id` now, so the client can tell which rayon it hangs off. Without
    // it no kawasan could ever be matched to a rayon.
    window.localStorage.setItem('monitoring.mode.v1', 'zoom');
    mockAggregate.mockReturnValue({
      data: {
        nodes: [
          aggNode({ id: 'r1', name: 'Rayon Pusat', type: 'district' }),
          aggNode({ id: 'k1', name: 'Kawasan Darmo', type: 'region', district_id: 'r1' }),
          aggNode({ id: 'k2', name: 'Kawasan Lain', type: 'region', district_id: 'r2' }),
          // Hangs directly off the rayon — no kawasan.
          aggNode({ id: 'a1', name: 'Taman Bebas', type: 'location', district_id: 'r1' }),
          // Inside Kawasan Darmo — appears one level deeper, not here.
          aggNode({
            id: 'a2',
            name: 'Taman Dalam',
            type: 'location',
            district_id: 'r1',
            region_id: 'k1',
          }),
        ],
      },
      isLoading: false,
      isFetching: false,
      refetch: jest.fn(),
    });

    render(<MonitoringPage />, { wrapper: createWrapper() });
    fireEvent.click(screen.getByRole('button', { name: /daftar area dan petugas/i }));
    fireEvent.click(await screen.findByText('Rayon Pusat'));

    expect(await screen.findByText('Kawasan Darmo')).toBeInTheDocument();
    expect(screen.getByText('Taman Bebas')).toBeInTheDocument();
    // Another rayon's kawasan, and this kawasan's own lokasi, are not this level.
    expect(screen.queryByText('Kawasan Lain')).toBeNull();
    expect(screen.queryByText('Taman Dalam')).toBeNull();
  });

  it('drills from a Wilayah row in zoom mode, and stays in zoom mode', async () => {
    // Drilling is what the list is for. The mode is a rendering choice and must
    // survive navigation — dropping back to drill on a tap would silently undo
    // the operator's setting.
    window.localStorage.setItem('monitoring.mode.v1', 'zoom');
    mockAggregate.mockReturnValue({
      data: {
        nodes: [
          aggNode({ id: 'r1', name: 'Rayon Pusat', type: 'district' }),
          aggNode({ id: 'a1', name: 'Taman A', type: 'location', district_id: 'r1' }),
        ],
      },
      isLoading: false,
      refetch: jest.fn(),
    });

    render(<MonitoringPage />, { wrapper: createWrapper() });
    fireEvent.click(screen.getByRole('button', { name: /daftar area dan petugas/i }));
    fireEvent.click(await screen.findByText('Rayon Pusat'));

    // Now inside the rayon: its lokasi are the level, and the breadcrumb says so.
    expect(await screen.findByText('Taman A')).toBeInTheDocument();
    expect(window.localStorage.getItem('monitoring.mode.v1')).toBe('zoom');
  });

  it('lets the operator resize the list panel, and remembers it', () => {
    // A fixed 384px is right for "Rayon Pusat" and cramped for "Kawasan Manukan
    // Balongsari S.D Manukan" — which of those an operator lives in is not
    // something a stylesheet can know, so the width is theirs.
    window.localStorage.setItem('monitoring.panelWidth.v1', '560');
    render(<MonitoringPage />, { wrapper: createWrapper() });
    fireEvent.click(screen.getByRole('button', { name: /daftar area dan petugas/i }));

    const handle = screen.getByRole('separator', { name: /ubah lebar panel/i });
    expect(handle).toBeInTheDocument();
    // The stored width drives the panel through a CSS variable, so it can be
    // scoped to `sm:` — below that the panel is full-bleed and has no width.
    const panel = handle.parentElement!;
    expect(panel.getAttribute('style')).toContain('560px');
  });

  it('clamps a stored width that would collapse the panel', () => {
    // localStorage is hand-editable and survives downgrades; a bad value must
    // not leave the operator with a panel they cannot see or grab.
    window.localStorage.setItem('monitoring.panelWidth.v1', '5');
    render(<MonitoringPage />, { wrapper: createWrapper() });
    fireEvent.click(screen.getByRole('button', { name: /daftar area dan petugas/i }));

    const panel = screen.getByRole('separator', { name: /ubah lebar panel/i }).parentElement!;
    expect(panel.getAttribute('style')).toContain('300px');
  });

  it('opens the filter panel from the top bar', () => {
    render(<MonitoringPage />, { wrapper: createWrapper() });
    fireEvent.click(screen.getByRole('button', { name: /^filter$/i }));
    expect(screen.getByRole('heading', { name: /filter petugas/i })).toBeInTheDocument();
  });
});
