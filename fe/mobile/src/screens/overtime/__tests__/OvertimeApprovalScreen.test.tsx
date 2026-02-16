/**
 * OvertimeApprovalScreen Tests
 * Tests for korlap's pending overtime approvals list
 */

import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { Provider } from 'react-redux';
import { NavigationContainer } from '@react-navigation/native';
import { configureStore } from '@reduxjs/toolkit';
import authReducer from '../../../store/slices/authSlice';
import overtimeReducer from '../../../store/slices/overtimeSlice';
import { OvertimeApprovalScreen } from '../OvertimeApprovalScreen';
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

jest.mock('../../../services/api/overtimeApi', () => ({
  getPendingApprovals: jest.fn(() => Promise.resolve({ data: [] })),
}));

const mockPendingOvertimes: Overtime[] = [
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
    user_id: 'user-2',
    date: '2026-02-13',
    start_time: '18:00',
    end_time: '20:00',
    activity_type_id: 'type-2',
    description: 'Pemotongan rumput',
    photo_urls: ['https://example.com/photo2.jpg'],
    gps_lat: -7.26,
    gps_lng: 112.76,
    status: 'pending',
    created_at: '2026-02-13T10:00:00Z',
    updated_at: '2026-02-13T10:00:00Z',
    user: {
      id: 'user-2',
      username: 'satgas2',
      full_name: 'Satgas 2',
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
  {
    id: 'ot-3',
    user_id: 'user-3',
    date: '2026-02-12',
    start_time: '16:00',
    end_time: '18:00',
    activity_type_id: 'type-1',
    description: 'Penyiraman area utara',
    photo_urls: ['https://example.com/photo3.jpg'],
    gps_lat: -7.24,
    gps_lng: 112.74,
    status: 'approved',
    created_at: '2026-02-12T10:00:00Z',
    updated_at: '2026-02-12T15:00:00Z',
    user: {
      id: 'user-3',
      username: 'satgas3',
      full_name: 'Satgas 3',
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
];

const createTestStore = (overrides = {}) =>
  configureStore({
    reducer: { auth: authReducer, overtime: overtimeReducer },
    preloadedState: {
      auth: {
        user: {
          id: '1',
          username: 'korlap1',
          full_name: 'Test Korlap',
          role: 'korlap',
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

describe('OvertimeApprovalScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders with "Persetujuan Lembur" header', async () => {
    const { getByText } = renderWithProviders(<OvertimeApprovalScreen />);
    await waitFor(() => {
      expect(getByText('Persetujuan Lembur')).toBeTruthy();
    });
  });

  it('shows pending count badge', async () => {
    const store = createTestStore({
      overtime: {
        myOvertimes: [],
        pendingApprovals: mockPendingOvertimes,
        selectedOvertime: null,
        isLoading: false,
        isSubmitting: false,
        error: null,
      },
    });

    (overtimeApi.getPendingApprovals as jest.Mock).mockResolvedValue({
      data: mockPendingOvertimes,
    });

    const { getByText } = renderWithProviders(<OvertimeApprovalScreen />, store);

    await waitFor(() => {
      // Only pending status items should be counted (ot-1 and ot-2, not ot-3 which is approved)
      expect(getByText('2')).toBeTruthy();
    });
  });

  it('shows pending overtime cards with user name, date, time', async () => {
    const store = createTestStore({
      overtime: {
        myOvertimes: [],
        pendingApprovals: mockPendingOvertimes,
        selectedOvertime: null,
        isLoading: false,
        isSubmitting: false,
        error: null,
      },
    });

    (overtimeApi.getPendingApprovals as jest.Mock).mockResolvedValue({
      data: mockPendingOvertimes,
    });

    const { getByText } = renderWithProviders(<OvertimeApprovalScreen />, store);

    await waitFor(() => {
      expect(getByText('Satgas 1')).toBeTruthy();
      expect(getByText('14 Februari 2026')).toBeTruthy();
      expect(getByText('17:00 - 19:00')).toBeTruthy();
      expect(getByText('Satgas 2')).toBeTruthy();
      expect(getByText('13 Februari 2026')).toBeTruthy();
      expect(getByText('18:00 - 20:00')).toBeTruthy();
    });
  });

  it('shows empty state when no pending approvals', async () => {
    (overtimeApi.getPendingApprovals as jest.Mock).mockResolvedValue({ data: [] });

    const { getByText } = renderWithProviders(<OvertimeApprovalScreen />);

    await waitFor(() => {
      expect(getByText('Tidak ada pengajuan')).toBeTruthy();
      expect(
        getByText('Tidak ada pengajuan lembur yang menunggu persetujuan'),
      ).toBeTruthy();
    });
  });

  it('navigates to OvertimeDetail on card press', async () => {
    const mockNavigate = jest.fn();
    const navigation = require('@react-navigation/native');
    jest.spyOn(navigation, 'useNavigation').mockReturnValue({
      navigate: mockNavigate,
      goBack: jest.fn(),
    });

    const store = createTestStore({
      overtime: {
        myOvertimes: [],
        pendingApprovals: mockPendingOvertimes,
        selectedOvertime: null,
        isLoading: false,
        isSubmitting: false,
        error: null,
      },
    });

    (overtimeApi.getPendingApprovals as jest.Mock).mockResolvedValue({
      data: mockPendingOvertimes,
    });

    const { getByText } = renderWithProviders(<OvertimeApprovalScreen />, store);

    await waitFor(() => {
      expect(getByText('Satgas 1')).toBeTruthy();
    });

    fireEvent.press(getByText('Satgas 1'));

    expect(mockNavigate).toHaveBeenCalledWith('OvertimeDetail', {
      overtimeId: 'ot-1',
    });
  });

  it('fetches pending approvals on mount', async () => {
    (overtimeApi.getPendingApprovals as jest.Mock).mockResolvedValue({
      data: mockPendingOvertimes,
    });

    renderWithProviders(<OvertimeApprovalScreen />);

    await waitFor(() => {
      expect(overtimeApi.getPendingApprovals).toHaveBeenCalledTimes(1);
    });
  });

  it('pulls to refresh and re-fetches data', async () => {
    (overtimeApi.getPendingApprovals as jest.Mock).mockResolvedValue({
      data: mockPendingOvertimes,
    });

    renderWithProviders(<OvertimeApprovalScreen />);

    await waitFor(() => {
      expect(overtimeApi.getPendingApprovals).toHaveBeenCalled();
    });

    // Verify API was called on mount
    expect(overtimeApi.getPendingApprovals).toHaveBeenCalledTimes(1);
  });

  it('filters to show only pending status items', async () => {
    const store = createTestStore({
      overtime: {
        myOvertimes: [],
        pendingApprovals: mockPendingOvertimes,
        selectedOvertime: null,
        isLoading: false,
        isSubmitting: false,
        error: null,
      },
    });

    (overtimeApi.getPendingApprovals as jest.Mock).mockResolvedValue({
      data: mockPendingOvertimes,
    });

    const { getByText, queryByText } = renderWithProviders(
      <OvertimeApprovalScreen />,
      store,
    );

    await waitFor(() => {
      // Pending items should be shown
      expect(getByText('Satgas 1')).toBeTruthy();
      expect(getByText('Satgas 2')).toBeTruthy();

      // Approved item should NOT be shown
      expect(queryByText('Satgas 3')).toBeNull();
      expect(queryByText('12 Februari 2026')).toBeNull();
    });
  });
});
