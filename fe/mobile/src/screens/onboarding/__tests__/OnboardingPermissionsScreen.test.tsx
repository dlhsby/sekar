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
jest.mock('../../../services/permissions', () => ({
  permissionManager: {
    requestLocationPermission: () => mockRequestLocation(),
    requestCameraPermission: () => mockRequestCamera(),
    requestNotificationPermission: () => mockRequestNotification(),
  },
}));

describe('OnboardingPermissionsScreen', () => {
  beforeEach(() => {
    mockNavigate.mockReset();
    mockRequestLocation.mockReset().mockResolvedValue({ granted: true });
    mockRequestCamera.mockReset().mockResolvedValue({ granted: true });
    mockRequestNotification.mockReset().mockResolvedValue({ granted: false });
  });

  it('renders the 3 permission rows', () => {
    const { getByTestId } = render(<OnboardingPermissionsScreen />);
    expect(getByTestId('perm-row-location')).toBeTruthy();
    expect(getByTestId('perm-row-camera')).toBeTruthy();
    expect(getByTestId('perm-row-notifications')).toBeTruthy();
  });

  it('tapping a pending row requests the permission → DIBERIKAN', async () => {
    const { getByTestId } = render(<OnboardingPermissionsScreen />);
    fireEvent.press(getByTestId('perm-row-location'));
    await waitFor(() => {
      expect(getByTestId('perm-status-location').props.children).toBe('DIBERIKAN');
    });
    expect(mockRequestLocation).toHaveBeenCalled();
  });

  it('a declined permission shows DITOLAK', async () => {
    mockRequestLocation.mockResolvedValue({ granted: false });
    const { getByTestId } = render(<OnboardingPermissionsScreen />);
    fireEvent.press(getByTestId('perm-row-location'));
    await waitFor(() => {
      expect(getByTestId('perm-status-location').props.children).toBe('DITOLAK');
    });
  });

  it('Lanjut navigates to OnboardingAreaPreview (everything is skippable)', () => {
    const { getByTestId } = render(<OnboardingPermissionsScreen />);
    fireEvent.press(getByTestId('onboarding-permissions-continue'));
    expect(mockNavigate).toHaveBeenCalledWith('OnboardingAreaPreview');
  });
});
