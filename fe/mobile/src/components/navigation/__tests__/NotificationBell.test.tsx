/**
 * NotificationBell tests — Phase 4 M3d (NOTIF-1).
 */
import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { NotificationBell } from '../NotificationBell';
import notificationsReducer, {
  addNotification,
} from '../../../store/slices/notificationsSlice';
import type { Notification } from '../../../types/models.types';

const mockNavigate = jest.fn();
const mockGetState = jest.fn(() => ({ index: 1, routes: [{ name: 'Home' }, { name: 'Menu' }] }));
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: mockNavigate, getState: mockGetState }),
}));

function makeStore() {
  return configureStore({ reducer: { notifications: notificationsReducer } });
}

function makeNotification(overrides: Partial<Notification> = {}): Notification {
  return {
    id: overrides.id ?? `n-${Math.random()}`,
    user_id: 'u-1',
    title: 't',
    body: 'b',
    type: 'task',
    read: false,
    created_at: new Date().toISOString(),
    ...overrides,
  } as Notification;
}

describe('NotificationBell', () => {
  beforeEach(() => mockNavigate.mockReset());

  it('renders without badge when unread count is zero', () => {
    const store = makeStore();
    const { queryByTestId, getByTestId } = render(
      <Provider store={store}>
        <NotificationBell />
      </Provider>,
    );
    expect(getByTestId('notification-bell')).toBeTruthy();
    expect(queryByTestId('notification-bell-badge')).toBeNull();
  });

  it('shows numeric badge when unread > 0', () => {
    const store = makeStore();
    store.dispatch(addNotification(makeNotification()));
    store.dispatch(addNotification(makeNotification()));
    const { getByTestId, getByText } = render(
      <Provider store={store}>
        <NotificationBell />
      </Provider>,
    );
    expect(getByTestId('notification-bell-badge')).toBeTruthy();
    expect(getByText('2')).toBeTruthy();
  });

  it('caps badge at 99+', () => {
    const store = makeStore();
    for (let i = 0; i < 150; i += 1) {
      store.dispatch(addNotification(makeNotification({ id: `n-${i}` })));
    }
    const { getByText } = render(
      <Provider store={store}>
        <NotificationBell />
      </Provider>,
    );
    expect(getByText('99+')).toBeTruthy();
  });

  it('navigates to Notifications on press, tagging the originating tab', () => {
    const store = makeStore();
    const { getByTestId } = render(
      <Provider store={store}>
        <NotificationBell />
      </Provider>,
    );
    fireEvent.press(getByTestId('notification-bell'));
    // index 1 of the mocked tab state → 'Menu' is the origin
    expect(mockNavigate).toHaveBeenCalledWith('Notifications', { origin: 'Menu' });
  });
});
