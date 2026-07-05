import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { NotificationPanel } from '../notification-bell';
import type { AppNotification } from '@/lib/api/notifications';

const notif = (id: string, title: string): AppNotification => ({
  id,
  user_id: 'u1',
  title,
  body: 'detail',
  type: 'task_assigned',
  data: { task_id: id },
  is_read: false,
  read_at: null,
  created_at: new Date().toISOString(),
});

describe('NotificationPanel', () => {
  it('shows the empty message when there are no notifications', () => {
    render(
      <NotificationPanel
        notifications={[]}
        isLoading={false}
        onSelect={jest.fn()}
        onViewAll={jest.fn()}
      />
    );
    expect(screen.getByText(/tidak ada notifikasi baru/i)).toBeInTheDocument();
  });

  it('renders at most 5 notifications and the unread count', () => {
    const list = Array.from({ length: 7 }, (_, i) => notif(`n${i}`, `Judul ${i}`));
    render(
      <NotificationPanel
        notifications={list}
        isLoading={false}
        onSelect={jest.fn()}
        onViewAll={jest.fn()}
      />
    );
    expect(screen.getByText('Judul 0')).toBeInTheDocument();
    expect(screen.getByText('Judul 4')).toBeInTheDocument();
    expect(screen.queryByText('Judul 5')).not.toBeInTheDocument();
    expect(screen.getByText(/7 belum dibaca/i)).toBeInTheDocument();
  });

  it('fires onSelect when a row is clicked and onViewAll on the footer', async () => {
    const onSelect = jest.fn();
    const onViewAll = jest.fn();
    const user = userEvent.setup();
    render(
      <NotificationPanel
        notifications={[notif('n1', 'Judul 1')]}
        isLoading={false}
        onSelect={onSelect}
        onViewAll={onViewAll}
      />
    );

    await user.click(screen.getByText('Judul 1'));
    expect(onSelect).toHaveBeenCalledWith(expect.objectContaining({ id: 'n1' }));

    await user.click(screen.getByText(/lihat semua/i));
    expect(onViewAll).toHaveBeenCalledTimes(1);
  });
});
