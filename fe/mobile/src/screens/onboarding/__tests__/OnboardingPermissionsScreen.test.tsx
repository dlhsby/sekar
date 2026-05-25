import React from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { OnboardingPermissionsScreen } from '../OnboardingPermissionsScreen';

const mockNavigate = jest.fn();
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: mockNavigate }),
}));

const mockRequestLocation = jest.fn();
const mockRequestCamera = jest.fn();
const mockRequestNotification = jest.fn();
jest.mock('../../../services/permissions', () => {
  const PermissionType = {
    NOTIFICATIONS: 'notifications',
    LOCATION: 'location',
    BACKGROUND_LOCATION: 'background_location',
    CAMERA: 'camera',
    GALLERY: 'gallery',
  };
  return {
    PermissionType,
    permissionManager: {
      requestLocationPermission: () => mockRequestLocation(),
      requestCameraPermission: () => mockRequestCamera(),
      requestNotificationPermission: () => mockRequestNotification(),
    },
  };
});

describe('OnboardingPermissionsScreen', () => {
  beforeEach(() => {
    mockNavigate.mockReset();
    mockRequestLocation.mockReset().mockResolvedValue({ granted: true });
    mockRequestCamera.mockReset().mockResolvedValue({ granted: true });
    mockRequestNotification.mockReset().mockResolvedValue({ granted: false });
  });

  it('renders the 3 permission cards', () => {
    const { getByTestId } = render(<OnboardingPermissionsScreen />);
    expect(getByTestId('perm-row-location')).toBeTruthy();
    expect(getByTestId('perm-row-camera')).toBeTruthy();
    expect(getByTestId('perm-row-notifications')).toBeTruthy();
  });

  it('granting location marks status GRANTED', async () => {
    const { getByTestId } = render(<OnboardingPermissionsScreen />);
    fireEvent.press(getByTestId('perm-grant-location'));
    await waitFor(() => {
      expect(getByTestId('perm-status-location').props.children).toBe('GRANTED');
    });
    expect(mockRequestLocation).toHaveBeenCalled();
  });

  it('skipping location marks status SKIPPED without calling request', async () => {
    const { getByTestId } = render(<OnboardingPermissionsScreen />);
    fireEvent.press(getByTestId('perm-skip-location'));
    await waitFor(() => {
      expect(getByTestId('perm-status-location').props.children).toBe('SKIPPED');
    });
    expect(mockRequestLocation).not.toHaveBeenCalled();
  });

  it('denied permission marks status DENIED', async () => {
    mockRequestLocation.mockResolvedValue({ granted: false });
    const { getByTestId } = render(<OnboardingPermissionsScreen />);
    fireEvent.press(getByTestId('perm-grant-location'));
    await waitFor(() => {
      expect(getByTestId('perm-status-location').props.children).toBe('DENIED');
    });
  });

  it('Lanjut navigates to OnboardingAreaPreview', () => {
    const { getByTestId } = render(<OnboardingPermissionsScreen />);
    fireEvent.press(getByTestId('onboarding-permissions-continue'));
    expect(mockNavigate).toHaveBeenCalledWith('OnboardingAreaPreview');
  });
});
