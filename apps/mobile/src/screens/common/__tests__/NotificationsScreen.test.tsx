/**
 * NotificationsScreen tests — Phase 4 M3d (NOTIF-1).
 */
import React from 'react';
import { BackHandler } from 'react-native';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { NotificationsScreen } from '../NotificationsScreen';
import notificationsReducer from '../../../store/slices/notificationsSlice';
import type { Notification } from '../../../types/models.types';

const mockNavigate = jest.fn();
let mockRouteParams: { origin?: string } = {};
// Run the focus effect immediately so the hardware-back handler registers.
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: mockNavigate }),
  useRoute: () => ({ params: mockRouteParams }),
  useFocusEffect: (cb: () => void | (() => void)) => {
    cb();
  },
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
    mockRouteParams = {};
  });

  // Finding #1: Android hardware back (and the iOS gesture, disabled at the
  // navigator) must route through the same destination as the header chevron —
  // the origin tab, else Home — so a notification→detail→back round-trip can't
  // loop inbox⇄detail.
  it('routes hardware back to the originating tab', async () => {
    mockRouteParams = { origin: 'Monitoring' };
    mockGetNotifications.mockResolvedValue({ data: [] });
    let captured: (() => boolean) | undefined;
    const spy = jest
      .spyOn(BackHandler, 'addEventListener')
      .mockImplementation((_evt, handler) => {
        captured = handler as () => boolean;
        return { remove: jest.fn() } as ReturnType<typeof BackHandler.addEventListener>;
      });
    render(
      <Provider store={makeStore()}>
        <NotificationsScreen />
      </Provider>,
    );
    expect(captured).toBeDefined();
    expect(captured?.()).toBe(true); // event handled — default pop suppressed
    expect(mockNavigate).toHaveBeenCalledWith('Tabs', { screen: 'Monitoring' });
    spy.mockRestore();
  });

  it('routes hardware back to Home when there is no origin', async () => {
    mockGetNotifications.mockResolvedValue({ data: [] });
    let captured: (() => boolean) | undefined;
    const spy = jest
      .spyOn(BackHandler, 'addEventListener')
      .mockImplementation((_evt, handler) => {
        captured = handler as () => boolean;
        return { remove: jest.fn() } as ReturnType<typeof BackHandler.addEventListener>;
      });
    render(
      <Provider store={makeStore()}>
        <NotificationsScreen />
      </Provider>,
    );
    captured?.();
    expect(mockNavigate).toHaveBeenCalledWith('Tabs', { screen: 'Home' });
    spy.mockRestore();
  });

  it('fetches and renders notifications list', async () => {
    mockGetNotifications.mockResolvedValue({
      data: [
          makeNotification({ id: 'a', title: 'Tugas A' }),
          makeNotification({ id: 'b', title: 'Tugas B', read: true }),
        ],
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
    mockGetNotifications.mockResolvedValue({ data: [] });
    const { findByTestId } = render(
      <Provider store={makeStore()}>
        <NotificationsScreen />
      </Provider>,
    );
    await findByTestId('notifications-empty');
  });

  it('marks as read and deep-links to TaskDetail on row press', async () => {
    mockGetNotifications.mockResolvedValue({
      data: [
          makeNotification({ id: 'x', data: { task_id: 'task-42' } }),
        ],
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
      data: [
          makeNotification({ id: 'p', data: { pruning_request_id: 'pr-7' } }),
        ],
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
      data: [makeNotification({ id: 'u-a' }), makeNotification({ id: 'u-b' })],
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

  it('filters the list by category chip', async () => {
    mockGetNotifications.mockResolvedValue({
      data: [
          makeNotification({ id: 't1', type: 'task_assigned' }),
          makeNotification({ id: 'a1', type: 'activity_approved' }),
          makeNotification({ id: 'o1', type: 'overtime_approved' }),
          makeNotification({ id: 's1', type: 'shift_reminder' }),
        ],
    });
    const { findByTestId, queryByTestId } = render(
      <Provider store={makeStore()}>
        <NotificationsScreen />
      </Provider>,
    );
    // Default "Semua" shows every category
    await findByTestId('notification-row-t1');
    expect(queryByTestId('notification-row-a1')).toBeTruthy();
    expect(queryByTestId('notification-row-s1')).toBeTruthy();

    // Tugas → only task rows
    fireEvent.press(await findByTestId('notifications-filter-task'));
    await waitFor(() => expect(queryByTestId('notification-row-a1')).toBeNull());
    expect(queryByTestId('notification-row-t1')).toBeTruthy();
    expect(queryByTestId('notification-row-o1')).toBeNull();

    // Sistem → only the shift reminder (non task/activity/overtime)
    fireEvent.press(await findByTestId('notifications-filter-system'));
    await waitFor(() => expect(queryByTestId('notification-row-s1')).toBeTruthy());
    expect(queryByTestId('notification-row-t1')).toBeNull();
  });

  it('shows the empty state when the active category has no notifications', async () => {
    mockGetNotifications.mockResolvedValue({
      data: [makeNotification({ id: 't1', type: 'task_assigned' })],
    });
    const { findByTestId, queryByTestId, getByText } = render(
      <Provider store={makeStore()}>
        <NotificationsScreen />
      </Provider>,
    );
    await findByTestId('notification-row-t1');
    fireEvent.press(await findByTestId('notifications-filter-overtime'));
    await waitFor(() => expect(queryByTestId('notification-row-t1')).toBeNull());
    expect(getByText('Belum ada notifikasi')).toBeTruthy();
  });
});
