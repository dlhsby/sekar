/**
 * usePermissionMonitor tests — Phase 4 M3a+b runtime permission re-check.
 */
import React from 'react';
import { Text, View, AppState } from 'react-native';
import { act, render, waitFor } from '@testing-library/react-native';
import { PermissionType } from '../PermissionManager';
import { usePermissionMonitor } from '../usePermissionMonitor';

const mockCheckAll = jest.fn();
jest.mock('../PermissionManager', () => {
  const actual = jest.requireActual('../PermissionManager');
  return {
    ...actual,
    permissionManager: {
      checkAllPermissions: (...args: unknown[]) => mockCheckAll(...args),
    },
  };
});

function Probe({ enabled }: { enabled: boolean }): React.JSX.Element {
  const { missing, initializing } = usePermissionMonitor(enabled);
  return (
    <View>
      <Text testID="init">{initializing ? 'init' : 'ready'}</Text>
      <Text testID="missing">{missing.join(',')}</Text>
    </View>
  );
}

const granted = { granted: true } as const;
const denied = { granted: false } as const;

describe('usePermissionMonitor', () => {
  beforeEach(() => {
    mockCheckAll.mockReset();
  });

  it('reports no missing permissions when all granted', async () => {
    mockCheckAll.mockResolvedValue({
      location: granted,
      camera: granted,
      notifications: granted,
      backgroundLocation: granted,
      gallery: granted,
    });
    const { getByTestId } = render(<Probe enabled={true} />);
    await waitFor(() => expect(getByTestId('init').props.children).toBe('ready'));
    expect(getByTestId('missing').props.children).toBe('');
  });

  it('lists missing critical permissions', async () => {
    mockCheckAll.mockResolvedValue({
      location: denied,
      camera: granted,
      notifications: denied,
      backgroundLocation: granted,
      gallery: granted,
    });
    const { getByTestId } = render(<Probe enabled={true} />);
    await waitFor(() => expect(getByTestId('init').props.children).toBe('ready'));
    expect(getByTestId('missing').props.children).toBe(
      `${PermissionType.LOCATION},${PermissionType.NOTIFICATIONS}`,
    );
  });

  it('does nothing when disabled', async () => {
    const { getByTestId } = render(<Probe enabled={false} />);
    await waitFor(() => expect(getByTestId('init').props.children).toBe('ready'));
    expect(mockCheckAll).not.toHaveBeenCalled();
    expect(getByTestId('missing').props.children).toBe('');
  });

  it('re-checks on background → active transition', async () => {
    mockCheckAll.mockResolvedValueOnce({
      location: granted,
      camera: granted,
      notifications: granted,
      backgroundLocation: granted,
      gallery: granted,
    });
    const listeners: Array<(s: string) => void> = [];
    jest.spyOn(AppState, 'addEventListener').mockImplementation((_evt, cb) => {
      listeners.push(cb as (s: string) => void);
      return { remove: jest.fn() } as never;
    });

    const { getByTestId } = render(<Probe enabled={true} />);
    await waitFor(() => expect(getByTestId('init').props.children).toBe('ready'));
    expect(getByTestId('missing').props.children).toBe('');

    // Permission revoked while backgrounded
    mockCheckAll.mockResolvedValueOnce({
      location: denied,
      camera: granted,
      notifications: granted,
      backgroundLocation: granted,
      gallery: granted,
    });
    await act(async () => {
      listeners.forEach((cb) => cb('active'));
    });
    await waitFor(() =>
      expect(getByTestId('missing').props.children).toBe(PermissionType.LOCATION),
    );
  });

  it('fails closed on checkAllPermissions error', async () => {
    mockCheckAll.mockRejectedValue(new Error('boom'));
    const { getByTestId } = render(<Probe enabled={true} />);
    await waitFor(() => expect(getByTestId('init').props.children).toBe('ready'));
    expect(getByTestId('missing').props.children).toBe('');
  });
});
