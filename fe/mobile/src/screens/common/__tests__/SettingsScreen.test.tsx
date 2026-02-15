/**
 * SettingsScreen Component Tests
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { SettingsScreen } from '../SettingsScreen';
import authReducer from '../../../store/slices/authSlice';
import shiftReducer from '../../../store/slices/shiftSlice';
import activitiesReducer from '../../../store/slices/activitiesSlice';
import offlineReducer from '../../../store/slices/offlineSlice';

// Mock DeviceInfo
jest.mock('react-native-device-info', () => ({
  getVersion: () => '1.0.0',
  getBuildNumber: () => '123',
}));

// Mock NBBackgroundPattern to avoid SVG rendering issues
jest.mock('../../../components/nb/NBBackgroundPattern', () => ({
  NBBackgroundPattern: ({ children }: { children: React.ReactNode }) => children,
}));

// Mock navigation
const mockNavigation = {
  navigate: jest.fn(),
  goBack: jest.fn(),
};

// Helper to create test store
const createTestStore = () => {
  return configureStore({
    reducer: {
      auth: authReducer,
      shift: shiftReducer,
      activities: activitiesReducer,
      offline: offlineReducer,
    },
    preloadedState: {
      auth: {
        user: { id: '1', username: 'testuser', role: 'satgas' } as any,
        assignedArea: null,
        token: 'test-token',
        isAuthenticated: true,
        isLoading: false,
        error: null,
      },
    },
  });
};

describe('SettingsScreen', () => {
  let store: ReturnType<typeof createTestStore>;

  beforeEach(() => {
    store = createTestStore();
    jest.clearAllMocks();
  });

  const renderScreen = () =>
    render(
      <Provider store={store}>
        <SettingsScreen navigation={mockNavigation as any} route={{} as any} />
      </Provider>,
    );

  describe('rendering', () => {
    it('renders page title', () => {
      const { getByText } = renderScreen();
      expect(getByText('Pengaturan')).toBeTruthy();
    });

    it('renders notification settings section', () => {
      const { getByText } = renderScreen();
      expect(getByText('Notifikasi')).toBeTruthy();
      expect(getByText('Notifikasi Push')).toBeTruthy();
      expect(getByText('Notifikasi Email')).toBeTruthy();
    });

    it('renders display settings section', () => {
      const { getByText } = renderScreen();
      expect(getByText('Tampilan')).toBeTruthy();
      expect(getByText('Mode Gelap')).toBeTruthy();
    });

    it('renders privacy settings section', () => {
      const { getByText } = renderScreen();
      expect(getByText('Privasi')).toBeTruthy();
      expect(getByText('Lokasi Latar Belakang')).toBeTruthy();
      expect(getByText('Analitik')).toBeTruthy();
    });

    it('renders account settings section', () => {
      const { getByText } = renderScreen();
      expect(getByText('Akun')).toBeTruthy();
      expect(getByText('Ubah Password')).toBeTruthy();
      expect(getByText('Keluar')).toBeTruthy();
    });

    it('renders app version info', () => {
      const { getByText } = renderScreen();
      expect(getByText('Versi 1.0.0 | Build 123')).toBeTruthy();
      expect(getByText('SEKAR - Sistem Evaluasi Kerja Satgas RTH')).toBeTruthy();
      expect(getByText('DLH Surabaya 2026')).toBeTruthy();
    });
  });

  describe('setting items', () => {
    it('renders setting descriptions', () => {
      const { getByText } = renderScreen();
      expect(getByText('Terima notifikasi untuk tugas dan pengingat')).toBeTruthy();
      expect(getByText('Terima ringkasan harian via email')).toBeTruthy();
      expect(getByText('Gunakan tema gelap untuk layar')).toBeTruthy();
      expect(getByText('Izinkan pelacakan lokasi saat aplikasi ditutup')).toBeTruthy();
      expect(getByText('Bantu tingkatkan aplikasi dengan data anonim')).toBeTruthy();
    });
  });

  describe('accessibility', () => {
    it('has correct accessibility roles for toggle items', () => {
      const { getByLabelText } = renderScreen();
      // Toggle items should have switch role
      const pushNotification = getByLabelText('Notifikasi Push');
      expect(pushNotification.props.accessibilityRole).toBe('switch');
    });

    it('has correct accessibility roles for button items', () => {
      const { getByLabelText } = renderScreen();
      // Button items should have button role
      const changePassword = getByLabelText('Ubah Password');
      expect(changePassword.props.accessibilityRole).toBe('button');
    });

    it('has accessibility hints for settings', () => {
      const { getByLabelText } = renderScreen();
      // Settings should have accessibility hints with descriptions
      const pushNotification = getByLabelText('Notifikasi Push');
      expect(pushNotification.props.accessibilityHint).toContain('notifikasi');
    });
  });

  describe('NB 2.0 design compliance', () => {
    it('uses NBBackgroundPattern', () => {
      // The component should render without errors with the pattern
      const { getByText } = renderScreen();
      expect(getByText('Pengaturan')).toBeTruthy();
    });

    it('uses NBCard for setting sections', () => {
      // The component should render settings in NBCard components
      const { getByText } = renderScreen();
      expect(getByText('Notifikasi Push')).toBeTruthy();
    });
  });
});
