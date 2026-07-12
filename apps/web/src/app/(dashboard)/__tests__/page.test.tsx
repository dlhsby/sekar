import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import DashboardPage from '../page';

const mockPush = jest.fn();
jest.mock('next/navigation', () => ({ useRouter: () => ({ push: mockPush }) }));

jest.mock('@/lib/auth/hooks', () => ({
  useUser: () => ({ id: 'u1', full_name: 'Pak Hadi', role: 'superadmin' }),
}));

// Current-shift aggregate: 10 scheduled, 8 hadir (7 aktif + 1 tidak-aktif),
// 2 tidak hadir — for one rayon (Pusat).
const aggregate = {
  data: {
    scope: 'city',
    scope_id: null,
    nodes: [
      {
        id: 'r1',
        name: 'Pusat',
        type: 'rayon',
        center_lat: -7.3,
        center_lng: 112.7,
        counts_by_status: { active: 6, inactive: 1, outside_area: 1, missing: 0, offline: 0 },
        counts_by_role: {},
        worker_count: 8,
        online_count: 8,
        required: 10,
        is_understaffed: true,
        roster: { scheduled: 10, clocked_in: 8, not_clocked_in: 2 },
        presence: { aktif: { dalam: 6, luar: 1 }, tidak_aktif: { dalam: 1, luar: 0 } },
        area_count: 1,
      },
    ],
    totals: { active: 6, inactive: 1, outside_area: 1, missing: 0, offline: 0 },
    roster_totals: { scheduled: 10, clocked_in: 8, not_clocked_in: 2 },
    presence_totals: { aktif: { dalam: 6, luar: 1 }, tidak_aktif: { dalam: 1, luar: 0 } },
    generated_at: new Date().toISOString(),
  },
  isLoading: false,
};

jest.mock('@/lib/api/monitoring-v2', () => ({
  useMonitoringAggregate: () => aggregate,
}));
jest.mock('@/lib/api/tasks', () => ({ useTasks: () => ({ data: { meta: { total: 128 } } }) }));
jest.mock('@/lib/api/pruning-requests', () => ({
  usePruningRequests: () => ({ data: { meta: { total: 14 } } }),
}));
jest.mock('@/lib/api/overtime', () => ({
  useOvertimes: () => ({ data: { meta: { total: 5 } } }),
}));
jest.mock('@/lib/api/plants', () => ({
  usePlantStatusSummary: () => ({
    data: {
      generated_at: new Date().toISOString(),
      rayons: [
        {
          rayon_id: 'r1',
          rayon_name: 'Rayon Selatan',
          ok: 4,
          due_soon: 1,
          overdue: 3,
          unknown: 0,
          overdue_areas: [{ location_id: 'a1', area_name: 'Taman Bungkul', overdue: 3 }],
        },
      ],
    },
  }),
}));
jest.mock('@/lib/api/notifications', () => ({
  useNotifications: () => ({
    data: [
      {
        id: 'n1',
        user_id: 'u1',
        title: 'Tugas ditugaskan',
        body: 'Pembersihan',
        type: 'task_assigned',
        data: { task_id: 't1' },
        is_read: false,
        read_at: null,
        created_at: new Date().toISOString(),
      },
    ],
  }),
}));

describe('DashboardPage', () => {
  beforeEach(() => jest.clearAllMocks());

  it('greets the user by first name', () => {
    render(<DashboardPage />);
    expect(screen.getByText(/halo, pak/i)).toBeInTheDocument();
  });

  it('renders real KPI values from the data hooks', () => {
    render(<DashboardPage />);
    expect(screen.getByText('8 / 10')).toBeInTheDocument(); // Hadir / scheduled (current shift)
    expect(screen.getByText('128')).toBeInTheDocument(); // tugas
    expect(screen.getByText('14')).toBeInTheDocument(); // perantingan
    expect(screen.getByText('5')).toBeInTheDocument(); // lembur
  });

  it('renders the per-rayon hadir/scheduled breakdown from aggregate nodes', () => {
    render(<DashboardPage />);
    expect(screen.getByText('Pusat')).toBeInTheDocument();
    expect(screen.getByText('8/10')).toBeInTheDocument();
  });

  it('opens the notification detail page on click', async () => {
    const user = userEvent.setup();
    render(<DashboardPage />);
    await user.click(screen.getByText('Tugas ditugaskan'));
    expect(mockPush).toHaveBeenCalledWith('/notifications/n1');
  });
});
