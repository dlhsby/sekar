import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import NotificationsPage from '../page';
import type { AppNotification } from '@/lib/api/notifications';

const mockPush = jest.fn();
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
}));

const mockMarkRead = jest.fn();
const mockMarkAll = jest.fn();
let mockData: AppNotification[] = [];
let mockLoading = false;

jest.mock('@/lib/api/notifications', () => ({
  useNotifications: () => ({ data: mockData, isLoading: mockLoading }),
  useMarkNotificationRead: () => ({ mutate: mockMarkRead }),
  useMarkAllNotificationsRead: () => ({ mutate: mockMarkAll, isPending: false }),
}));

const n = (over: Partial<AppNotification>): AppNotification => ({
  id: 'n1',
  user_id: 'u1',
  title: 'Tugas baru',
  body: 'detail',
  type: 'task_assigned',
  data: { task_id: 't1' },
  is_read: false,
  read_at: null,
  created_at: new Date().toISOString(),
  ...over,
});

describe('NotificationsPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockData = [];
    mockLoading = false;
  });

  it('shows the empty state when there are no notifications', () => {
    render(<NotificationsPage />);
    expect(screen.getByText(/belum ada notifikasi/i)).toBeInTheDocument();
  });

  it('filters notifications by category tab', async () => {
    const user = userEvent.setup();
    mockData = [
      n({ id: 'a', title: 'Tugas X', type: 'task_assigned' }),
      n({ id: 'b', title: 'Lembur Y', type: 'overtime_approved', data: { overtime_id: 'o1' } }),
    ];
    render(<NotificationsPage />);

    expect(screen.getByText('Tugas X')).toBeInTheDocument();
    expect(screen.getByText('Lembur Y')).toBeInTheDocument();

    await user.click(screen.getByRole('tab', { name: 'Lembur' }));
    expect(screen.queryByText('Tugas X')).not.toBeInTheDocument();
    expect(screen.getByText('Lembur Y')).toBeInTheDocument();
  });

  it('marks read + deep-links on row click', async () => {
    const user = userEvent.setup();
    mockData = [n({ id: 'a', title: 'Tugas X', data: { task_id: 't9' } })];
    render(<NotificationsPage />);

    await user.click(screen.getByText('Tugas X'));
    expect(mockMarkRead).toHaveBeenCalledWith('a');
    expect(mockPush).toHaveBeenCalledWith('/tasks/t9');
  });

  it('shows "mark all" only when there are unread items and fires it', async () => {
    const user = userEvent.setup();
    mockData = [n({ id: 'a', is_read: false })];
    render(<NotificationsPage />);

    const btn = screen.getByRole('button', { name: /tandai semua dibaca/i });
    await user.click(btn);
    expect(mockMarkAll).toHaveBeenCalled();
  });

  it('hides "mark all" when everything is read', () => {
    mockData = [n({ id: 'a', is_read: true })];
    render(<NotificationsPage />);
    expect(screen.queryByRole('button', { name: /tandai semua dibaca/i })).not.toBeInTheDocument();
  });

  it('reveals the next page on "Muat lebih banyak" and hides it when exhausted', async () => {
    const user = userEvent.setup();
    mockData = Array.from({ length: 25 }, (_, i) => n({ id: `n${i}`, title: `Notif ${i}` }));
    render(<NotificationsPage />);

    // First page (20) shown, 21st hidden.
    expect(screen.getByText('Notif 19')).toBeInTheDocument();
    expect(screen.queryByText('Notif 20')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /muat lebih banyak/i }));

    expect(screen.getByText('Notif 24')).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /muat lebih banyak/i })
    ).not.toBeInTheDocument();
  });
});
