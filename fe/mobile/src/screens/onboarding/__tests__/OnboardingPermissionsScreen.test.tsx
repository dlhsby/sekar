import React from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { OnboardingPermissionsScreen } from '../OnboardingPermissionsScreen';

const mockNavigate = jest.fn();
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: mockNavigate }),
}));

const mockReq = {
  notifications: jest.fn(),
  location: jest.fn(),
  background_location: jest.fn(),
  camera: jest.fn(),
  gallery: jest.fn(),
};
const notGranted = { granted: false };
jest.mock('../../../services/permissions', () => ({
  permissionManager: {
    requestNotificationPermission: () => mockReq.notifications(),
    requestLocationPermission: () => mockReq.location(),
    requestBackgroundLocationPermission: () => mockReq.background_location(),
    requestCameraPermission: () => mockReq.camera(),
    requestGalleryPermission: () => mockReq.gallery(),
    checkAllPermissions: async () => ({
      notifications: notGranted,
      location: notGranted,
      backgroundLocation: notGranted,
      camera: notGranted,
      gallery: notGranted,
    }),
  },
}));

const KEYS = ['notifications', 'location', 'background_location', 'camera', 'gallery'] as const;
const REQUIRED = ['notifications', 'location', 'camera', 'gallery'] as const;

describe('OnboardingPermissionsScreen', () => {
  beforeEach(() => {
    mockNavigate.mockReset();
    KEYS.forEach((k) => mockReq[k].mockReset().mockResolvedValue({ granted: true }));
  });

  it('renders all five permission rows with Izinkan buttons', () => {
    const { getByTestId } = render(<OnboardingPermissionsScreen />);
    KEYS.forEach((k) => {
      expect(getByTestId(`perm-row-${k}`)).toBeTruthy();
      expect(getByTestId(`perm-grant-${k}`)).toBeTruthy();
    });
  });

  it('tapping Izinkan requests the permission → DIBERIKAN', async () => {
    const { getByTestId } = render(<OnboardingPermissionsScreen />);
    fireEvent.press(getByTestId('perm-grant-location'));
    await waitFor(() => {
      expect(getByTestId('perm-status-location').props.children).toBe('DIBERIKAN');
    });
    expect(mockReq.location).toHaveBeenCalled();
  });

  it('background location requests foreground first, then background', async () => {
    const { getByTestId } = render(<OnboardingPermissionsScreen />);
    fireEvent.press(getByTestId('perm-grant-background_location'));
    await waitFor(() => {
      expect(getByTestId('perm-status-background_location').props.children).toBe('DIBERIKAN');
    });
    expect(mockReq.location).toHaveBeenCalled();
    expect(mockReq.background_location).toHaveBeenCalled();
  });

  it('Lanjut is gated on the required permissions; background location is optional', async () => {
    const { getByTestId } = render(<OnboardingPermissionsScreen />);

    // Disabled at first — pressing does nothing.
    fireEvent.press(getByTestId('onboarding-permissions-continue'));
    expect(mockNavigate).not.toHaveBeenCalled();

    // Address only the required permissions (NOT background location).
    for (const k of REQUIRED) {
      fireEvent.press(getByTestId(`perm-grant-${k}`));
      await waitFor(() => expect(getByTestId(`perm-status-${k}`)).toBeTruthy());
    }
    fireEvent.press(getByTestId('onboarding-permissions-continue'));
    expect(mockNavigate).toHaveBeenCalledWith('OnboardingAreaPreview');
  });
});
