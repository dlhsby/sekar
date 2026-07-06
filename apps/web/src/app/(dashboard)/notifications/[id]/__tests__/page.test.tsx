import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import NotificationDetailPage from '../page';
import type { AppNotification } from '@/lib/api/notifications';

const mockPush = jest.fn();
let mockId = 'a';
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
  useParams: () => ({ id: mockId }),
}));

const mockMarkRead = jest.fn();
let mockData: AppNotification[] = [];
let mockLoading = false;

jest.mock('@/lib/api/notifications', () => ({
  useNotifications: () => ({ data: mockData, isLoading: mockLoading }),
  useMarkNotificationRead: () => ({ mutate: mockMarkRead }),
}));

const n = (over: Partial<AppNotification>): AppNotification => ({
  id: 'a',
  user_id: 'u1',
  title: 'Pembersihan Taman Bungkul',
  body: 'Bersihkan Taman Bungkul',
  type: 'task_assigned',
  data: { task_id: 't9' },
  is_read: false,
  read_at: null,
  created_at: new Date().toISOString(),
  ...over,
});

describe('NotificationDetailPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockId = 'a';
    mockData = [];
    mockLoading = false;
  });

  it('renders the full notification and marks it read on open', () => {
    mockData = [n({})];
    render(<NotificationDetailPage />);
    expect(screen.getByText('Pembersihan Taman Bungkul')).toBeInTheDocument();
    expect(screen.getByText('Bersihkan Taman Bungkul')).toBeInTheDocument();
    expect(mockMarkRead).toHaveBeenCalledWith('a');
  });

  it('does not re-mark an already-read notification', () => {
    mockData = [n({ is_read: true })];
    render(<NotificationDetailPage />);
    expect(mockMarkRead).not.toHaveBeenCalled();
  });

  it('routes to the related entity via the CTA', async () => {
    const user = userEvent.setup();
    mockData = [n({ data: { task_id: 't9' } })];
    render(<NotificationDetailPage />);

    await user.click(screen.getByRole('button', { name: /buka tugas terkait/i }));
    expect(mockPush).toHaveBeenCalledWith('/tasks/t9');
  });

  it('shows a no-data note when there is nothing to open', () => {
    mockData = [n({ type: 'system', data: null })];
    render(<NotificationDetailPage />);
    expect(screen.getByText(/tidak memiliki data terkait/i)).toBeInTheDocument();
  });

  it('shows a not-found state when the id is unknown', () => {
    mockId = 'missing';
    mockData = [n({ id: 'a' })];
    render(<NotificationDetailPage />);
    expect(screen.getByText(/tidak ditemukan/i)).toBeInTheDocument();
  });
});
