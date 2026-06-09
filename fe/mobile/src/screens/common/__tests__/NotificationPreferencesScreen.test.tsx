/**
 * NotificationPreferencesScreen (Phase 4-3 §E3) tests — loads per-type prefs,
 * persists a toggle optimistically, and reverts on failure.
 */
import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { NotificationPreferencesScreen } from '../NotificationPreferencesScreen';
import * as notificationsApi from '../../../services/api/notificationsApi';

jest.mock('../../../store/hooks', () => ({
  useAppSelector: (sel: any) => sel({ auth: { user: { id: 'user-1' } } }),
}));

jest.spyOn(notificationsApi, 'getNotificationPreferences');
jest.spyOn(notificationsApi, 'updateNotificationPreferences');

const getPrefs = notificationsApi.getNotificationPreferences as jest.Mock;
const updatePrefs = notificationsApi.updateNotificationPreferences as jest.Mock;

describe('NotificationPreferencesScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    getPrefs.mockResolvedValue({
      data: [
        { type: 'task_assigned', enabled: false },
        { type: 'shift_reminder', enabled: true },
      ],
    });
    updatePrefs.mockResolvedValue({ data: [] });
  });

  it('loads preferences on mount and reflects server state', async () => {
    const { getByTestId } = render(<NotificationPreferencesScreen />);

    await waitFor(() => expect(getByTestId('pref-toggle-task_assigned')).toBeTruthy());
    expect(getPrefs).toHaveBeenCalledWith('user-1');
    // Server said task_assigned is disabled.
    expect(getByTestId('pref-toggle-task_assigned').props.accessibilityState.checked).toBe(false);
    // Absent rows default to enabled.
    expect(getByTestId('pref-toggle-task_completed').props.accessibilityState.checked).toBe(true);
  });

  it('persists a toggle via updateNotificationPreferences', async () => {
    const { getByTestId } = render(<NotificationPreferencesScreen />);
    await waitFor(() => expect(getByTestId('pref-toggle-shift_reminder')).toBeTruthy());

    fireEvent.press(getByTestId('pref-toggle-shift_reminder')); // on -> off

    await waitFor(() =>
      expect(updatePrefs).toHaveBeenCalledWith('user-1', [
        { type: 'shift_reminder', enabled: false },
      ]),
    );
  });

  it('reverts the toggle when the update fails', async () => {
    updatePrefs.mockResolvedValue({ error: 'network' });
    const { getByTestId } = render(<NotificationPreferencesScreen />);
    await waitFor(() => expect(getByTestId('pref-toggle-shift_reminder')).toBeTruthy());

    const toggle = getByTestId('pref-toggle-shift_reminder');
    expect(toggle.props.accessibilityState.checked).toBe(true);
    fireEvent.press(toggle); // optimistic off, then revert to on

    await waitFor(() =>
      expect(getByTestId('pref-toggle-shift_reminder').props.accessibilityState.checked).toBe(true),
    );
  });
});
