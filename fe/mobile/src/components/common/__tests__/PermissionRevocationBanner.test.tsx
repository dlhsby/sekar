/**
 * PermissionRevocationBanner tests — Phase 4 M3a+b runtime permission re-check.
 */
import React from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { PermissionRevocationBanner } from '../PermissionRevocationBanner';
import { PermissionType } from '../../../services/permissions/PermissionManager';

const mockCheckAll = jest.fn();
const mockOpenSettings = jest.fn().mockResolvedValue(undefined);
jest.mock('../../../services/permissions/PermissionManager', () => {
  const actual = jest.requireActual('../../../services/permissions/PermissionManager');
  return {
    ...actual,
    permissionManager: {
      checkAllPermissions: (...args: unknown[]) => mockCheckAll(...args),
      openSettings: (...args: unknown[]) => mockOpenSettings(...args),
    },
  };
});

const granted = { granted: true } as const;
const denied = { granted: false } as const;

describe('PermissionRevocationBanner', () => {
  beforeEach(() => {
    mockCheckAll.mockReset();
    mockOpenSettings.mockClear();
  });

  it('renders nothing when disabled', async () => {
    const { queryByTestId } = render(<PermissionRevocationBanner enabled={false} />);
    expect(queryByTestId('permission-revocation-banner')).toBeNull();
    expect(mockCheckAll).not.toHaveBeenCalled();
  });

  it('renders nothing when all required permissions granted', async () => {
    mockCheckAll.mockResolvedValue({
      location: granted,
      camera: granted,
      notifications: granted,
      backgroundLocation: granted,
      gallery: granted,
    });
    const { queryByTestId } = render(<PermissionRevocationBanner enabled={true} />);
    await waitFor(() => expect(mockCheckAll).toHaveBeenCalled());
    expect(queryByTestId('permission-revocation-banner')).toBeNull();
  });

  it('renders banner listing missing permissions and opens Settings on tap', async () => {
    mockCheckAll.mockResolvedValue({
      location: denied,
      camera: granted,
      notifications: denied,
      backgroundLocation: granted,
      gallery: granted,
    });
    const { findByTestId, getByText } = render(
      <PermissionRevocationBanner enabled={true} />,
    );
    const banner = await findByTestId('permission-revocation-banner');
    expect(getByText(/Lokasi, Notifikasi/i)).toBeTruthy();

    fireEvent.press(banner);
    await waitFor(() => expect(mockOpenSettings).toHaveBeenCalledTimes(1));
  });

  it('hides the banner once the missing permission is regranted', async () => {
    mockCheckAll.mockResolvedValueOnce({
      location: denied,
      camera: granted,
      notifications: granted,
      backgroundLocation: granted,
      gallery: granted,
    });
    const { findByTestId, queryByTestId, rerender } = render(
      <PermissionRevocationBanner enabled={true} />,
    );
    await findByTestId('permission-revocation-banner');

    // Simulate foreground re-check returning all granted by toggling enabled
    mockCheckAll.mockResolvedValueOnce({
      location: granted,
      camera: granted,
      notifications: granted,
      backgroundLocation: granted,
      gallery: granted,
    });
    rerender(<PermissionRevocationBanner enabled={false} />);
    rerender(<PermissionRevocationBanner enabled={true} />);
    await waitFor(() => expect(queryByTestId('permission-revocation-banner')).toBeNull());

    // Sanity: still uses the right enum key
    expect(PermissionType.LOCATION).toBe('location');
  });
});
