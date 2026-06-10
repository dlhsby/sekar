import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import DashboardPage from '../page';

const mockPush = jest.fn();
jest.mock('next/navigation', () => ({ useRouter: () => ({ push: mockPush }) }));

jest.mock('@/lib/auth/hooks', () => ({
  useUser: () => ({ id: 'u1', full_name: 'Pak Hadi', role: 'superadmin' }),
}));

const snapshot = {
  data: {
    data: {
      workers: [],
      area_summaries: [
        { area_id: 'a1', area_name: 'Bungkul', rayon_id: 'r1', rayon_name: 'Pusat', active_count: 8, required_count: 10, is_understaffed: true },
      ],
      total_active: 8,
      total_inactive: 2,
      total_outside_area: 1,
      total_missing: 0,
      total_offline: 1,
      generated_at: new Date().toISOString(),
    },
  },
  isLoading: false,
};

jest.mock('@/lib/api/monitoring-v2', () => ({
  useMonitoringSnapshot: () => snapshot,
}));
jest.mock('@/lib/api/tasks', () => ({ useTasks: () => ({ data: { meta: { total: 128 } } }) }));
jest.mock('@/lib/api/pruning-requests', () => ({
  usePruningRequests: () => ({ data: { meta: { total: 14 } } }),
}));
jest.mock('@/lib/api/overtime', () => ({
  useOvertimes: () => ({ data: { meta: { total: 5 } } }),
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
    // Aktif folds outside-area into the activity axis (active 8 + outside 1 = 9);
    // presence excludes offline (9 + idle 2 + missing 0 = 11).
    expect(screen.getByText('9 / 11')).toBeInTheDocument(); // petugas aktif / hadir
    expect(screen.getByText('128')).toBeInTheDocument(); // tugas
    expect(screen.getByText('14')).toBeInTheDocument(); // perantingan
    expect(screen.getByText('5')).toBeInTheDocument(); // lembur
  });

  it('renders the per-rayon breakdown from area summaries', () => {
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
