/**
 * NotificationsScreen tests — Phase 4 M3d (NOTIF-1).
 */
import React from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { NotificationsScreen } from '../NotificationsScreen';
import notificationsReducer from '../../../store/slices/notificationsSlice';
import type { Notification } from '../../../types/models.types';

const mockNavigate = jest.fn();
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: mockNavigate }),
}));

const mockGetNotifications = jest.fn();
const mockMarkAsRead = jest.fn().mockResolvedValue({ data: {} });
const mockMarkAllAsRead = jest.fn().mockResolvedValue({ data: { updated_count: 0 } });
jest.mock('../../../services/api/notificationsApi', () => ({
  getNotifications: (...a: unknown[]) => mockGetNotifications(...a),
  markAsRead: (...a: unknown[]) => mockMarkAsRead(...a),
  markAllAsRead: (...a: unknown[]) => mockMarkAllAsRead(...a),
}));

function makeStore() {
  return configureStore({ reducer: { notifications: notificationsReducer } });
}

function makeNotification(overrides: Partial<Notification> = {}): Notification {
  return {
    id: overrides.id ?? `n-${Math.random()}`,
    user_id: 'u-1',
    title: 'Tugas baru',
    body: 'Anda memiliki tugas baru.',
    type: 'task',
    read: false,
    created_at: new Date().toISOString(),
    ...overrides,
  } as Notification;
}

describe('NotificationsScreen', () => {
  beforeEach(() => {
    mockNavigate.mockReset();
    mockGetNotifications.mockReset();
    mockMarkAsRead.mockClear();
    mockMarkAllAsRead.mockClear();
  });

  it('fetches and renders notifications list', async () => {
    mockGetNotifications.mockResolvedValue({
      data: {
        data: [
          makeNotification({ id: 'a', title: 'Tugas A' }),
          makeNotification({ id: 'b', title: 'Tugas B', read: true }),
        ],
      },
    });
    const { findByTestId, getByText } = render(
      <Provider store={makeStore()}>
        <NotificationsScreen />
      </Provider>,
    );
    await findByTestId('notification-row-a');
    expect(getByText('Tugas A')).toBeTruthy();
    expect(getByText('Tugas B')).toBeTruthy();
  });

  it('shows empty state when there are no notifications', async () => {
    mockGetNotifications.mockResolvedValue({ data: { data: [] } });
    const { findByTestId } = render(
      <Provider store={makeStore()}>
        <NotificationsScreen />
      </Provider>,
    );
    await findByTestId('notifications-empty');
  });

  it('marks as read and deep-links to TaskDetail on row press', async () => {
    mockGetNotifications.mockResolvedValue({
      data: {
        data: [
          makeNotification({ id: 'x', data: { task_id: 'task-42' } }),
        ],
      },
    });
    const { findByTestId } = render(
      <Provider store={makeStore()}>
        <NotificationsScreen />
      </Provider>,
    );
    const row = await findByTestId('notification-row-x');
    fireEvent.press(row);
    await waitFor(() => expect(mockMarkAsRead).toHaveBeenCalledWith('x'));
    expect(mockNavigate).toHaveBeenCalledWith('Tabs', {
      screen: 'TaskDetail',
      params: { taskId: 'task-42', from: 'Notifications' },
    });
  });

  it('deep-links to PruningDetail when pruning_request_id is present', async () => {
    mockGetNotifications.mockResolvedValue({
      data: {
        data: [
          makeNotification({ id: 'p', data: { pruning_request_id: 'pr-7' } }),
        ],
      },
    });
    const { findByTestId } = render(
      <Provider store={makeStore()}>
        <NotificationsScreen />
      </Provider>,
    );
    fireEvent.press(await findByTestId('notification-row-p'));
    await waitFor(() =>
      expect(mockNavigate).toHaveBeenCalledWith('Tabs', {
        screen: 'PruningDetail',
        params: { requestId: 'pr-7', from: 'Notifications' },
      }),
    );
  });

  it('shows mark-all-read action when there are unread items and triggers it', async () => {
    mockGetNotifications.mockResolvedValue({
      data: {
        data: [makeNotification({ id: 'u-a' }), makeNotification({ id: 'u-b' })],
      },
    });
    const { findByTestId } = render(
      <Provider store={makeStore()}>
        <NotificationsScreen />
      </Provider>,
    );
    const btn = await findByTestId('notifications-mark-all-read');
    fireEvent.press(btn);
    await waitFor(() => expect(mockMarkAllAsRead).toHaveBeenCalled());
  });
});
