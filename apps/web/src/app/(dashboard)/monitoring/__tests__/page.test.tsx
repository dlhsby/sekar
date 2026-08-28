/**
 * Unit Tests: Monitoring Page (Phase 4-R)
 * Full-bleed map with floating overlays: top search, dismissible filter panel,
 * dismissible worker/area sheet. Auth/role gating + client-side filtering.
 */
import { render, screen, fireEvent, within } from '@testing-library/react';
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
//
// Node markers are surfaced as buttons so a test can DRILL from the map. That
// path differs from drilling in the sidebar — it is the only way to reach a
// kawasan from city scope in zoom mode — and it had its own parent-id bug.
jest.mock('@/components/monitoring/SimpleMonitoringMapLazy', () => ({
  SimpleMonitoringMap: ({
    workers,
    nodeMarkers,
    onDrillNode,
  }: {
    workers: { user_id: string }[];
    nodeMarkers?: { id: string; name: string }[];
    onDrillNode?: (n: unknown) => void;
  }) => (
    <div data-testid="map" data-count={workers.length}>
      {(nodeMarkers ?? []).map((n) => (
        <button key={n.id} data-testid="map-node" onClick={() => onDrillNode?.(n)}>
          {`pin:${n.name}`}
        </button>
      ))}
    </div>
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

  it('carries the parent rayon when a kawasan is drilled from the MAP', async () => {
    // Zoom mode draws every tier, so a kawasan pin is tappable at city scope —
    // where `view.id` is undefined. The drill handler fell back to it for the
    // parent district, so the kawasan was entered with no rayon: the breadcrumb
    // lost its middle crumb, and `boundaryDistrictId` fell back to the KAWASAN's
    // own id, asking the API for a rayon that does not exist and drawing nothing.
    window.localStorage.setItem('monitoring.mode.v1', 'zoom');
    mockAggregate.mockReturnValue({
      data: {
        nodes: [
          aggNode({ id: 'r1', name: 'Rayon Pusat', type: 'district' }),
          aggNode({ id: 'k1', name: 'Kawasan Darmo', type: 'region', district_id: 'r1' }),
        ],
      },
      isLoading: false,
      isFetching: false,
      refetch: jest.fn(),
    });

    render(<MonitoringPage />, { wrapper: createWrapper() });
    fireEvent.click(await screen.findByText('pin:Kawasan Darmo'));

    // The rayon is back in the trail, which is only possible if the drill kept it.
    const nav = screen.getAllByRole('navigation', { name: /navigasi lokasi/i })[0];
    expect(within(nav).getByText('Rayon Pusat')).toBeInTheDocument();
    expect(within(nav).getAllByText('Kawasan Darmo').length).toBeGreaterThan(0);
  });

  it('carries both parents when a lokasi is drilled from the map', async () => {
    window.localStorage.setItem('monitoring.mode.v1', 'zoom');
    mockAggregate.mockReturnValue({
      data: {
        nodes: [
          aggNode({ id: 'r1', name: 'Rayon Pusat', type: 'district' }),
          aggNode({ id: 'k1', name: 'Kawasan Darmo', type: 'region', district_id: 'r1' }),
          aggNode({
            id: 'a1',
            name: 'Taman Bungkul',
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
    fireEvent.click(await screen.findByText('pin:Taman Bungkul'));

    const nav = screen.getAllByRole('navigation', { name: /navigasi lokasi/i })[0];
    // Both ancestors survive, so going back steps rayon → kawasan → lokasi.
    expect(within(nav).getByText('Rayon Pusat')).toBeInTheDocument();
    expect(within(nav).getByText('Kawasan Darmo')).toBeInTheDocument();
  });

  it('counts presence for the KAWASAN in zoom mode, not zero', async () => {
    // `regionTotals` summed `regionAreasAgg`, a query gated on `!isZoom`. In zoom
    // and viewport mode that data is never fetched, so the sum was over an empty
    // array — and because it still returned an OBJECT, the `?? activeAgg` fallback
    // never fired and every presence pill read 0 at kawasan scope.
    window.localStorage.setItem('monitoring.mode.v1', 'zoom');
    mockAggregate.mockReturnValue({
      data: {
        nodes: [
          aggNode({ id: 'r1', name: 'Rayon Pusat', type: 'district' }),
          aggNode({ id: 'k1', name: 'Kawasan Darmo', type: 'region', district_id: 'r1' }),
          aggNode({
            id: 'a1',
            name: 'Taman Bungkul',
            type: 'location',
            district_id: 'r1',
            region_id: 'k1',
            presence: { aktif: { dalam: 3, luar: 1 }, tidak_aktif: { dalam: 2, luar: 0 } },
            roster: { scheduled: 6, clocked_in: 4, belum_hadir: 1, tidak_hadir: 1 },
          }),
          // A lokasi in ANOTHER kawasan must not be counted into this one.
          aggNode({
            id: 'a2',
            name: 'Taman Lain',
            type: 'location',
            district_id: 'r1',
            region_id: 'k9',
            presence: { aktif: { dalam: 99, luar: 0 }, tidak_aktif: { dalam: 0, luar: 0 } },
            roster: { scheduled: 99, clocked_in: 99, belum_hadir: 0, tidak_hadir: 0 },
          }),
        ],
        presence_totals: { aktif: { dalam: 102, luar: 1 }, tidak_aktif: { dalam: 2, luar: 0 } },
        roster_totals: { scheduled: 105, clocked_in: 103, belum_hadir: 1, tidak_hadir: 1 },
      },
      isLoading: false,
      isFetching: false,
      refetch: jest.fn(),
    });

    render(<MonitoringPage />, { wrapper: createWrapper() });
    fireEvent.click(await screen.findByText('pin:Kawasan Darmo'));

    // In zoom mode the pills read the WORKER list (showWorkers is true at every
    // level there), so they must narrow with the drill. Both seeded workers sit
    // in Rayon Pusat with no kawasan, so inside Kawasan Darmo the count is 0 —
    // and, crucially, not the city-wide 2 the raw snapshot would give.
    const pills = screen.getByRole('status', { name: /ringkasan kehadiran/i });
    expect(within(pills).queryByText('2')).toBeNull();
  });

  it('narrows the presence pills as the operator drills, in zoom mode', async () => {
    // The reported symptom: the header read "Tidak Aktif 50" while the Petugas
    // tab beside it read 3. In zoom mode the snapshot is always fetched
    // city-wide and `showWorkers` is true at every level, so the pills counted
    // the whole city however far you had drilled.
    window.localStorage.setItem('monitoring.mode.v1', 'zoom');
    mockSnapshot.mockReturnValue({
      ...snapshotData,
      data: {
        data: {
          ...snapshotData.data.data,
          workers: [
            worker({ user_id: 'w1', full_name: 'Andi', status: 'active', district_id: 'r1' }),
            worker({ user_id: 'w2', full_name: 'Budi', status: 'active', district_id: 'r1' }),
            // Elsewhere — must not be counted once we are inside Rayon Pusat.
            worker({ user_id: 'w3', full_name: 'Cici', status: 'active', district_id: 'r2' }),
          ],
        },
      },
    });
    mockAggregate.mockReturnValue({
      data: {
        nodes: [
          aggNode({ id: 'r1', name: 'Rayon Pusat', type: 'district' }),
          aggNode({ id: 'r2', name: 'Rayon Lain', type: 'district' }),
        ],
      },
      isLoading: false,
      isFetching: false,
      refetch: jest.fn(),
    });

    render(<MonitoringPage />, { wrapper: createWrapper() });
    const pills = screen.getByRole('status', { name: /ringkasan kehadiran/i });
    // City scope: all three.
    expect(within(pills).getByText('3')).toBeInTheDocument();

    fireEvent.click(await screen.findByText('pin:Rayon Pusat'));
    // Inside the rayon: its two, not the city's three.
    expect(within(pills).getByText('2')).toBeInTheDocument();
    expect(within(pills).queryByText('3')).toBeNull();
  });

  it('opens the filter panel from the top bar', () => {
    render(<MonitoringPage />, { wrapper: createWrapper() });
    fireEvent.click(screen.getByRole('button', { name: /^filter$/i }));
    expect(screen.getByRole('heading', { name: /filter petugas/i })).toBeInTheDocument();
  });
});
