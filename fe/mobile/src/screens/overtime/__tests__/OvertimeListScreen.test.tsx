/**
 * OvertimeListScreen Tests
 * Tests for overtime list with tabs, filters, and role-based access
 */

import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { Provider } from 'react-redux';
import { NavigationContainer } from '@react-navigation/native';
import { configureStore } from '@reduxjs/toolkit';
import authReducer from '../../../store/slices/authSlice';
import overtimeReducer from '../../../store/slices/overtimeSlice';
import { OvertimeListScreen } from '../OvertimeListScreen';
import * as overtimeApi from '../../../services/api/overtimeApi';
import type { Overtime } from '../../../types/models.types';

// Standard mocks
jest.mock('../../../components/nb/NBBackgroundPattern', () => ({
  NBBackgroundPattern: ({ children, style }: any) => {
    const React = require('react');
    const { View } = require('react-native');
    return React.createElement(View, { style }, children);
  },
}));

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({
    navigate: jest.fn(),
    goBack: jest.fn(),
  }),
  NavigationContainer: ({ children }: any) => children,
}));

jest.mock('react-native-geolocation-service', () => ({
  default: {
    getCurrentPosition: jest.fn((success) =>
      success({
        coords: { latitude: -7.25, longitude: 112.75, accuracy: 10 },
      }),
    ),
  },
}));

jest.mock('../../../hooks/useRoleAccess', () => ({
  useRoleAccess: jest.fn(() => ({
    canSubmitOvertime: true,
    canApproveOvertime: false,
    canClock: true,
    canSubmitActivity: true,
    canCreateTask: false,
    canReceiveTask: true,
    canMonitor: false,
    monitoringScope: null,
    role: 'satgas',
  })),
}));

jest.mock('../../../services/api/overtimeApi', () => ({
  getMyOvertimes: jest.fn(() => Promise.resolve({ data: [] })),
  getPendingApprovals: jest.fn(() => Promise.resolve({ data: [] })),
}));

const mockOvertimes: Overtime[] = [
  {
    id: 'ot-1',
    user_id: 'user-1',
    date: '2026-02-14',
    start_time: '17:00',
    end_time: '19:00',
    activity_type_id: 'type-1',
    description: 'Penyiraman tambahan',
    photo_urls: ['https://example.com/photo1.jpg'],
    gps_lat: -7.25,
    gps_lng: 112.75,
    status: 'pending',
    created_at: '2026-02-14T10:00:00Z',
    updated_at: '2026-02-14T10:00:00Z',
    user: {
      id: 'user-1',
      username: 'satgas1',
      full_name: 'Satgas 1',
      role: 'satgas',
      created_at: '2026-01-01T00:00:00Z',
      updated_at: '2026-01-01T00:00:00Z',
    },
    activityType: {
      id: 'type-1',
      name: 'Penyiraman',
      description: 'Penyiraman tanaman',
      applicable_roles: ['satgas'],
      created_at: '2026-01-01T00:00:00Z',
      updated_at: '2026-01-01T00:00:00Z',
    },
  },
  {
    id: 'ot-2',
    user_id: 'user-1',
    date: '2026-02-13',
    start_time: '18:00',
    end_time: '20:00',
    activity_type_id: 'type-2',
    description: 'Pemotongan rumput',
    photo_urls: ['https://example.com/photo2.jpg'],
    gps_lat: -7.26,
    gps_lng: 112.76,
    status: 'approved',
    created_at: '2026-02-13T10:00:00Z',
    updated_at: '2026-02-13T12:00:00Z',
    user: {
      id: 'user-1',
      username: 'satgas1',
      full_name: 'Satgas 1',
      role: 'satgas',
      created_at: '2026-01-01T00:00:00Z',
      updated_at: '2026-01-01T00:00:00Z',
    },
    activityType: {
      id: 'type-2',
      name: 'Pemotongan Rumput',
      description: 'Pemotongan rumput liar',
      applicable_roles: ['satgas'],
      created_at: '2026-01-01T00:00:00Z',
      updated_at: '2026-01-01T00:00:00Z',
    },
  },
];

const createTestStore = (overrides = {}) =>
  configureStore({
    reducer: { auth: authReducer, overtime: overtimeReducer },
    preloadedState: {
      auth: {
        user: {
          id: '1',
          username: 'satgas1',
          full_name: 'Test Satgas',
          role: 'satgas',
        },
        token: 'test-token',
        isAuthenticated: true,
        loading: false,
        error: null,
        assignedArea: null,
      },
      overtime: {
        myOvertimes: [],
        pendingApprovals: [],
        selectedOvertime: null,
        isLoading: false,
        isSubmitting: false,
        error: null,
      },
      ...overrides,
    },
  });

const renderWithProviders = (component: React.ReactElement, store = createTestStore()) => {
  return render(
    <Provider store={store}>
      <NavigationContainer>{component}</NavigationContainer>
    </Provider>,
  );
};

describe('OvertimeListScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Ensure real timers (in case previous suite used fake timers)
    if (jest.isMockFunction(setTimeout)) {
      jest.useRealTimers();
    }
    // Reset useRoleAccess to default (satgas with canSubmitOvertime=true)
    const { useRoleAccess } = require('../../../hooks/useRoleAccess');
    useRoleAccess.mockReturnValue({
      canSubmitOvertime: true,
      canApproveOvertime: false,
      canClock: true,
      canSubmitActivity: true,
      canCreateTask: false,
      canReceiveTask: true,
      canMonitor: false,
      monitoringScope: null,
      role: 'satgas',
    });
    // Reset API mocks to defaults
    (overtimeApi.getMyOvertimes as jest.Mock).mockResolvedValue({ data: [] });
    (overtimeApi.getPendingApprovals as jest.Mock).mockResolvedValue({ data: [] });
  });

  afterEach(() => {
    jest.clearAllMocks();
    // Ensure real timers after each test
    if (jest.isMockFunction(setTimeout)) {
      jest.useRealTimers();
    }
  });

  it('renders with "Lembur" header', async () => {
    const { getByText } = renderWithProviders(<OvertimeListScreen />);
    await waitFor(() => {
      expect(getByText('Lembur')).toBeTruthy();
    });
  });

  it('shows "Pengajuan Saya" tab', async () => {
    const { getByText } = renderWithProviders(<OvertimeListScreen />);
    await waitFor(() => {
      expect(getByText('Pengajuan Saya')).toBeTruthy();
    });
  });

  it('dispatches overtime data to store from API', async () => {
    (overtimeApi.getMyOvertimes as jest.Mock).mockResolvedValue({
      data: mockOvertimes,
    });

    const store = createTestStore();
    renderWithProviders(<OvertimeListScreen />, store);

    await waitFor(() => {
      expect(overtimeApi.getMyOvertimes).toHaveBeenCalled();
    });

    // Verify data was dispatched to store
    await waitFor(() => {
      const state = store.getState();
      expect(state.overtime.myOvertimes).toHaveLength(2);
      expect(state.overtime.myOvertimes[0].status).toBe('pending');
    });
  });

  it('shows empty state when no overtimes', async () => {
    (overtimeApi.getMyOvertimes as jest.Mock).mockResolvedValue({ data: [] });

    const { getByText } = renderWithProviders(<OvertimeListScreen />);

    await waitFor(() => {
      expect(getByText('Tidak ada data')).toBeTruthy();
      expect(getByText('Belum ada pengajuan lembur')).toBeTruthy();
    });
  });

  it('shows FAB for satgas/linmas (canSubmitOvertime=true)', async () => {
    const { getByText } = renderWithProviders(<OvertimeListScreen />);

    await waitFor(() => {
      expect(getByText('+ Ajukan Lembur')).toBeTruthy();
    });
  });

  it('hides FAB for korlap (canSubmitOvertime=false)', async () => {
    const { useRoleAccess } = require('../../../hooks/useRoleAccess');
    useRoleAccess.mockReturnValue({
      canSubmitOvertime: false,
      canApproveOvertime: true,
      canClock: false,
      canSubmitActivity: false,
      canCreateTask: true,
      canReceiveTask: false,
      canMonitor: true,
      monitoringScope: 'rayon',
      role: 'korlap',
    });

    const { queryByText } = renderWithProviders(<OvertimeListScreen />);

    await waitFor(() => {
      expect(queryByText('+ Ajukan Lembur')).toBeNull();
    });
  });

  it('shows "Menunggu Persetujuan" tab for korlap (canApproveOvertime=true)', async () => {
    const { useRoleAccess } = require('../../../hooks/useRoleAccess');
    useRoleAccess.mockReturnValue({
      canSubmitOvertime: false,
      canApproveOvertime: true,
      canClock: false,
      canSubmitActivity: false,
      canCreateTask: true,
      canReceiveTask: false,
      canMonitor: true,
      monitoringScope: 'rayon',
      role: 'korlap',
    });

    const pendingApprovals = [mockOvertimes[0]];
    const store = createTestStore({
      overtime: {
        myOvertimes: [],
        pendingApprovals,
        selectedOvertime: null,
        isLoading: false,
        isSubmitting: false,
        error: null,
      },
    });

    (overtimeApi.getPendingApprovals as jest.Mock).mockResolvedValue({
      data: pendingApprovals,
    });

    const { getByText } = renderWithProviders(<OvertimeListScreen />, store);

    await waitFor(() => {
      expect(getByText('Menunggu Persetujuan')).toBeTruthy();
    });
  });

  it('navigates to OvertimeDetail on card press', async () => {
    const mockNavigate = jest.fn();
    const navigation = require('@react-navigation/native');
    jest.spyOn(navigation, 'useNavigation').mockReturnValue({
      navigate: mockNavigate,
      goBack: jest.fn(),
    });

    (overtimeApi.getMyOvertimes as jest.Mock).mockResolvedValue({
      data: mockOvertimes,
    });

    const { findByText } = renderWithProviders(<OvertimeListScreen />);

    const dateText = await findByText('14 Februari 2026');
    fireEvent.press(dateText);

    expect(mockNavigate).toHaveBeenCalledWith('OvertimeDetail', {
      overtimeId: 'ot-1',
    });
  });

  it('renders FAB with correct text', async () => {
    const { getByText } = renderWithProviders(<OvertimeListScreen />);

    await waitFor(() => {
      expect(getByText('+ Ajukan Lembur')).toBeTruthy();
    });

    // FAB is pressable
    fireEvent.press(getByText('+ Ajukan Lembur'));
  });

  it('fetches overtime data on mount', async () => {
    renderWithProviders(<OvertimeListScreen />);

    await waitFor(() => {
      expect(overtimeApi.getMyOvertimes).toHaveBeenCalled();
    });
  });
});
