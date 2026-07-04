/**
 * SettingsScreen (PRF-2) tests — hi-fi sections, NB toggles, offline-sync card,
 * Bantuan alert, and absence of the duplicate page title.
 */
import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import authReducer from '../../../store/slices/authSlice';
import preferencesReducer from '../../../store/slices/preferencesSlice';
import { SettingsScreen } from '../SettingsScreen';

const mockNavigate = jest.fn();
jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({ navigate: mockNavigate }),
}));

jest.mock('react-native-device-info', () => ({
  getVersion: jest.fn(() => '3.2.1'),
  getBuildNumber: jest.fn(() => '8421'),
}));

jest.mock('../../../services/sync/offlineQueue', () => ({
  getPendingCount: jest.fn().mockResolvedValue(0),
  getFailedCount: jest.fn().mockResolvedValue(0),
  getPendingCountsByType: jest.fn().mockResolvedValue({ 'clock-in': 0, 'clock-out': 0, activity: 0, location: 0 }),
  retryFailedItems: jest.fn(),
  clearFailedItems: jest.fn(),
}));
jest.mock('../../../services/sync/syncManager', () => ({
  syncManager: { processQueue: jest.fn().mockResolvedValue(undefined) },
}));

import * as offlineQueue from '../../../services/sync/offlineQueue';

const makeStore = () =>
  configureStore({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- test fixture
    reducer: { auth: authReducer as any, preferences: preferencesReducer as any },
    preloadedState: {
      auth: {
        user: { id: 'u1', username: 'u', full_name: 'U', role: 'satgas' },
        token: 't',
        isAuthenticated: true,
        loading: false,
        error: null,
        assignedArea: null,
      } as any,
      preferences: {
        language: 'id',
        soundEnabled: false,
        locationEnabled: false,
      } as any,
    },
  });

const renderScreen = () =>
  render(
    <Provider store={makeStore()}>
      <SettingsScreen {...({} as any)} />
    </Provider>,
  );

describe('SettingsScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (offlineQueue.getPendingCount as jest.Mock).mockResolvedValue(0);
    (offlineQueue.getFailedCount as jest.Mock).mockResolvedValue(0);
    (offlineQueue.getPendingCountsByType as jest.Mock).mockResolvedValue({
      'clock-in': 0, 'clock-out': 0, activity: 0, location: 0,
    });
  });

  it('renders the four hi-fi section titles', async () => {
    const { getByText } = renderScreen();
    await waitFor(() => expect(getByText('Notifikasi')).toBeTruthy());
    expect(getByText('Lokasi & data')).toBeTruthy();
    expect(getByText('Offline sync')).toBeTruthy();
    expect(getByText('Tentang')).toBeTruthy();
  });

  it('does not render a duplicate "Pengaturan" page title', () => {
    const { queryByText } = renderScreen();
    expect(queryByText('Pengaturan')).toBeNull();
  });

  it('shows the app version + build', async () => {
    const { getByText } = renderScreen();
    await waitFor(() => expect(getByText('v3.2.1 (build 8421)')).toBeTruthy());
  });

  it('toggles a switch when pressed', () => {
    const { getByTestId } = renderScreen();
    const toggle = getByTestId('toggle-sound');
    expect(toggle.props.accessibilityState.checked).toBe(false); // default off
    fireEvent.press(toggle);
    expect(toggle.props.accessibilityState.checked).toBe(true);
  });

  it('navigates to the notification preferences screen', () => {
    const { getByTestId } = renderScreen();
    fireEvent.press(getByTestId('nav-notification-preferences'));
    expect(mockNavigate).toHaveBeenCalledWith('NotificationPreferences');
  });

  it('shows the "tersinkron" state when there is nothing pending', async () => {
    const { getByText, queryByTestId } = renderScreen();
    await waitFor(() => expect(getByText('tersinkron')).toBeTruthy());
    expect(queryByTestId('sync-now-button')).toBeNull();
  });

  it('shows the pending count + sync button when items are queued', async () => {
    (offlineQueue.getPendingCount as jest.Mock).mockResolvedValue(2);
    (offlineQueue.getFailedCount as jest.Mock).mockResolvedValue(1);
    const { getByText, getByTestId } = renderScreen();
    await waitFor(() => expect(getByText('3 pending')).toBeTruthy());
    expect(getByTestId('sync-now-button')).toBeTruthy();
    expect(getByText('2 tertunda · 1 gagal')).toBeTruthy();
  });

  it('runs the sync manager when "Sync sekarang" is pressed', async () => {
    (offlineQueue.getPendingCount as jest.Mock).mockResolvedValue(2);
    const { syncManager } = require('../../../services/sync/syncManager');
    const { getByTestId } = renderScreen();
    await waitFor(() => expect(getByTestId('sync-now-button')).toBeTruthy());
    fireEvent.press(getByTestId('sync-now-button'));
    await waitFor(() => expect(syncManager.processQueue).toHaveBeenCalled());
  });

  it('opens a Bantuan alert from the help row', async () => {
    const spy = jest.spyOn(Alert, 'alert');
    const { getByTestId } = renderScreen();
    await waitFor(() => expect(getByTestId('help-row')).toBeTruthy());
    fireEvent.press(getByTestId('help-row'));
    expect(spy).toHaveBeenCalledWith('Bantuan & FAQ', expect.any(String));
  });
});
