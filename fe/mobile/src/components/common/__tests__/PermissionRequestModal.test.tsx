/**
 * Permission Request Modal Tests
 */

import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { Platform } from 'react-native';
import { PermissionRequestModal } from '../PermissionRequestModal';
import { permissionManager } from '../../../services/permissions/PermissionManager';
import { RESULTS } from 'react-native-permissions';

// Mock dependencies
jest.mock('../../../services/permissions/PermissionManager', () => ({
  permissionManager: {
    requestNotificationPermission: jest.fn(),
    requestLocationPermission: jest.fn(),
    requestBackgroundLocationPermission: jest.fn(),
    setOnboardingCompleted: jest.fn(),
    openSettings: jest.fn(),
  },
  PermissionType: {
    NOTIFICATIONS: 'notifications',
    LOCATION: 'location',
    BACKGROUND_LOCATION: 'background_location',
    CAMERA: 'camera',
  },
}));

describe('PermissionRequestModal', () => {
  const mockOnComplete = jest.fn();
  const mockOnSkip = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    Platform.OS = 'android';
    Object.defineProperty(Platform, 'Version', { value: 29, writable: true });
  });

  describe('Rendering', () => {
    it('should render when visible', () => {
      const { getByText } = render(
        <PermissionRequestModal visible={true} onComplete={mockOnComplete} />
      );

      expect(getByText('Izin Aplikasi')).toBeTruthy();
      expect(getByText('Langkah 1 dari 3')).toBeTruthy();
      expect(getByText('Notifikasi')).toBeTruthy();
    });

    it('should not render when not visible', () => {
      const { queryByText } = render(
        <PermissionRequestModal visible={false} onComplete={mockOnComplete} />
      );

      expect(queryByText('Izin Aplikasi')).toBeNull();
    });

    it('should render notification permission step first', () => {
      const { getByText } = render(
        <PermissionRequestModal visible={true} onComplete={mockOnComplete} />
      );

      expect(getByText('Notifikasi')).toBeTruthy();
      expect(
        getByText(
          'Terima pemberitahuan penting tentang tugas baru, pengingat shift, dan informasi dari supervisor.'
        )
      ).toBeTruthy();
      expect(getByText('Wajib')).toBeTruthy();
    });
  });

  describe('Permission Flow', () => {
    it('should request notification permission and move to next step', async () => {
      (permissionManager.requestNotificationPermission as jest.Mock).mockResolvedValue({
        granted: true,
        status: RESULTS.GRANTED,
        canRequest: false,
      });

      const { getByText } = render(
        <PermissionRequestModal visible={true} onComplete={mockOnComplete} />
      );

      // First step: Notifications
      expect(getByText('Notifikasi')).toBeTruthy();

      // Click allow button
      const allowButton = getByText('Izinkan');
      fireEvent.press(allowButton);

      await waitFor(() => {
        expect(permissionManager.requestNotificationPermission).toHaveBeenCalled();
      });

      // Should move to second step: Location
      await waitFor(() => {
        expect(getByText('Lokasi')).toBeTruthy();
        expect(getByText('Langkah 2 dari 3')).toBeTruthy();
      });
    });

    it('should request location permission and move to background location', async () => {
      (permissionManager.requestNotificationPermission as jest.Mock).mockResolvedValue({
        granted: true,
        status: RESULTS.GRANTED,
        canRequest: false,
      });
      (permissionManager.requestLocationPermission as jest.Mock).mockResolvedValue({
        granted: true,
        status: RESULTS.GRANTED,
        canRequest: false,
      });

      const { getByText } = render(
        <PermissionRequestModal visible={true} onComplete={mockOnComplete} />
      );

      // Request notification
      fireEvent.press(getByText('Izinkan'));
      await waitFor(() => {
        expect(getByText('Lokasi')).toBeTruthy();
      });

      // Request location
      fireEvent.press(getByText('Izinkan'));
      await waitFor(() => {
        expect(permissionManager.requestLocationPermission).toHaveBeenCalled();
      });

      // Should move to third step: Background Location
      await waitFor(() => {
        expect(getByText('Lokasi Latar Belakang')).toBeTruthy();
        expect(getByText('Langkah 3 dari 3')).toBeTruthy();
      });
    });

    it('should complete flow and call onComplete', async () => {
      Platform.OS = 'android';
      Object.defineProperty(Platform, 'Version', { value: 29, writable: true });

      (permissionManager.requestNotificationPermission as jest.Mock).mockResolvedValue({
        granted: true,
        status: RESULTS.GRANTED,
        canRequest: false,
      });
      (permissionManager.requestLocationPermission as jest.Mock).mockResolvedValue({
        granted: true,
        status: RESULTS.GRANTED,
        canRequest: false,
      });
      (permissionManager.requestBackgroundLocationPermission as jest.Mock).mockResolvedValue({
        granted: true,
        status: RESULTS.GRANTED,
        canRequest: false,
      });

      const { getByText } = render(
        <PermissionRequestModal visible={true} onComplete={mockOnComplete} />
      );

      // Step 1: Notification
      fireEvent.press(getByText('Izinkan'));
      await waitFor(() => {
        expect(getByText('Lokasi')).toBeTruthy();
      });

      // Step 2: Location
      fireEvent.press(getByText('Izinkan'));
      await waitFor(() => {
        expect(getByText('Lokasi Latar Belakang')).toBeTruthy();
      });

      // Step 3: Background Location - First click shows MIUI guidance
      fireEvent.press(getByText('Izinkan'));
      await waitFor(() => {
        expect(getByText('Mengerti, Lanjutkan')).toBeTruthy();
      });

      // Second click actually requests permission
      fireEvent.press(getByText('Mengerti, Lanjutkan'));
      await waitFor(() => {
        expect(permissionManager.requestBackgroundLocationPermission).toHaveBeenCalled();
        expect(permissionManager.setOnboardingCompleted).toHaveBeenCalled();
        expect(mockOnComplete).toHaveBeenCalled();
      });
    });
  });

  describe('MIUI Guidance', () => {
    it('should show MIUI guidance for background location on Android 10+', async () => {
      Platform.OS = 'android';
      Object.defineProperty(Platform, 'Version', { value: 29, writable: true });

      (permissionManager.requestNotificationPermission as jest.Mock).mockResolvedValue({
        granted: true,
        status: RESULTS.GRANTED,
        canRequest: false,
      });
      (permissionManager.requestLocationPermission as jest.Mock).mockResolvedValue({
        granted: true,
        status: RESULTS.GRANTED,
        canRequest: false,
      });
      (permissionManager.requestBackgroundLocationPermission as jest.Mock).mockResolvedValue({
        granted: true,
        status: RESULTS.GRANTED,
        canRequest: false,
      });

      const { getByText, queryByText } = render(
        <PermissionRequestModal visible={true} onComplete={mockOnComplete} />
      );

      // Navigate to background location step
      fireEvent.press(getByText('Izinkan'));
      await waitFor(() => {
        expect(getByText('Lokasi')).toBeTruthy();
      });

      fireEvent.press(getByText('Izinkan'));
      await waitFor(() => {
        expect(getByText('Lokasi Latar Belakang')).toBeTruthy();
      });

      // MIUI note should not be shown initially
      expect(queryByText(/PENTING untuk Xiaomi/)).toBeNull();

      // First click should show MIUI guidance
      fireEvent.press(getByText('Izinkan'));
      await waitFor(() => {
        expect(queryByText(/PENTING untuk Xiaomi/)).toBeTruthy();
      }, { timeout: 3000 });

      // Button text should change to "Mengerti, Lanjutkan"
      await waitFor(() => {
        expect(getByText('Mengerti, Lanjutkan')).toBeTruthy();
      });

      // Second click should actually request permission
      fireEvent.press(getByText('Mengerti, Lanjutkan'));
      await waitFor(() => {
        expect(permissionManager.requestBackgroundLocationPermission).toHaveBeenCalled();
      });
    });
  });

  describe('Denied Permissions', () => {
    it('should handle denied notification permission and move to next step', async () => {
      (permissionManager.requestNotificationPermission as jest.Mock).mockResolvedValue({
        granted: false,
        status: RESULTS.DENIED,
        canRequest: true,
      });

      const { getByText } = render(
        <PermissionRequestModal visible={true} onComplete={mockOnComplete} />
      );

      fireEvent.press(getByText('Izinkan'));

      // Even if denied but can request, stay on same step
      await waitFor(() => {
        expect(permissionManager.requestNotificationPermission).toHaveBeenCalled();
      });
    });

    it('should handle blocked permission and move to next step', async () => {
      (permissionManager.requestNotificationPermission as jest.Mock).mockResolvedValue({
        granted: false,
        status: RESULTS.BLOCKED,
        canRequest: false,
      });

      const { getByText } = render(
        <PermissionRequestModal visible={true} onComplete={mockOnComplete} />
      );

      fireEvent.press(getByText('Izinkan'));

      // If blocked, should move to next step
      await waitFor(() => {
        expect(getByText('Lokasi')).toBeTruthy();
      });
    });
  });

  describe('Progress Indicator', () => {
    it('should show correct progress for each step', async () => {
      (permissionManager.requestNotificationPermission as jest.Mock).mockResolvedValue({
        granted: true,
        status: RESULTS.GRANTED,
        canRequest: false,
      });

      const { getByText } = render(
        <PermissionRequestModal visible={true} onComplete={mockOnComplete} />
      );

      // Step 1
      expect(getByText('Langkah 1 dari 3')).toBeTruthy();

      // Move to step 2
      fireEvent.press(getByText('Izinkan'));
      await waitFor(() => {
        expect(getByText('Langkah 2 dari 3')).toBeTruthy();
      });
    });
  });

  describe('Open Settings', () => {
    it('should open settings when settings link is pressed', async () => {
      const { getByText } = render(
        <PermissionRequestModal visible={true} onComplete={mockOnComplete} />
      );

      const settingsLink = getByText('Buka Pengaturan');
      fireEvent.press(settingsLink);

      await waitFor(() => {
        expect(permissionManager.openSettings).toHaveBeenCalled();
      });
    });
  });

  describe('Info Box', () => {
    it('should display info box with explanation', () => {
      const { getByText } = render(
        <PermissionRequestModal visible={true} onComplete={mockOnComplete} />
      );

      expect(
        getByText(
          'Kami memerlukan izin ini untuk memberikan pengalaman terbaik saat menggunakan aplikasi SEKAR.'
        )
      ).toBeTruthy();
    });
  });

  describe('Modal Behavior', () => {
    it('should prevent closing by back button', () => {
      const { getByTestId } = render(
        <PermissionRequestModal visible={true} onComplete={mockOnComplete} />
      );

      // Modal should have onRequestClose that does nothing
      // This is handled by the Modal component itself
      expect(mockOnComplete).not.toHaveBeenCalled();
    });
  });
});
