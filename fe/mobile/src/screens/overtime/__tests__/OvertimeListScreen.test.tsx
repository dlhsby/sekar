/**
 * OvertimeListScreen Tests
 * Phase 2C: Single list with filter bar, sort modal, and role-based FAB
 */

import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { Provider } from 'react-redux';
import { NavigationContainer } from '@react-navigation/native';
import { configureStore } from '@reduxjs/toolkit';
import authReducer from '../../../store/slices/authSlice';
import shiftReducer from '../../../store/slices/shiftSlice';
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

jest.mock('../../../components/modals', () => ({
  SortModal: ({ visible, onSelect, options }: any) => {
    const React = require('react');
    const { View, Text, TouchableOpacity } = require('react-native');
    if (!visible) { return null; }
    return React.createElement(View, { testID: 'sort-modal' },
      React.createElement(Text, null, 'Urutkan Lembur'),
      ...options.map((o: any) =>
        React.createElement(TouchableOpacity, { key: o.key, onPress: () => onSelect(o.key) },
          React.createElement(Text, null, o.label),
        ),
      ),
    );
  },
  OvertimeFilterModal: ({ visible, onApplyFilters, onResetFilters }: any) => {
    const React = require('react');
    const { View, Text, TouchableOpacity } = require('react-native');
    if (!visible) { return null; }
    return React.createElement(View, { testID: 'filter-modal' },
      React.createElement(Text, null, 'Filter Lembur'),
      React.createElement(TouchableOpacity, { onPress: () => onApplyFilters({ status: 'pending' }) },
        React.createElement(Text, null, 'Apply'),
      ),
      React.createElement(TouchableOpacity, { onPress: onResetFilters },
        React.createElement(Text, null, 'Reset'),
      ),
    );
  },
}));

const mockNavigate = jest.fn();
jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({
    navigate: mockNavigate,
    goBack: jest.fn(),
  }),
  useFocusEffect: (cb: any) => {
    const React = require('react');
    React.useEffect(() => { cb(); }, []);
  },
  NavigationContainer: ({ children }: any) => children,
}));

jest.mock('react-native-geolocation-service', () => ({
  default: {
    getCurrentPosition: jest.fn((success) =>
      success({ coords: { latitude: -7.25, longitude: 112.75, accuracy: 10 } }),
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
  getMyOvertimes: jest.fn(() => Promise.resolve({ data: { data: [], meta: { total: 0, page: 1, limit: 10, totalPages: 0 } } })),
  getOvertimes: jest.fn(() => Promise.resolve({ data: { data: [], meta: { total: 0, page: 1, limit: 10, totalPages: 0 } } })),
}));

const mockOvertimes: Overtime[] = [
  {
    id: 'ot-1',
    user_id: 'user-1',
    start_datetime: '2026-02-14T17:00:00+07:00',
    end_datetime: '2026-02-14T19:00:00+07:00',
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
      code: 'SIRAM',
      description: 'Penyiraman tanaman',
      applicable_roles: ['satgas'],
      is_active: true,
      created_at: '2026-01-01T00:00:00Z',
    },
  },
  {
    id: 'ot-2',
    user_id: 'user-1',
    start_datetime: '2026-02-13T18:00:00+07:00',
    end_datetime: '2026-02-13T20:00:00+07:00',
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
      code: 'POTONG',
      description: 'Pemotongan rumput liar',
      applicable_roles: ['satgas'],
      is_active: true,
      created_at: '2026-01-01T00:00:00Z',
    },
  },
];

const createTestStore = () =>
  configureStore({
    reducer: { auth: authReducer, shift: shiftReducer },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- legacy test preloadedState
    preloadedState: {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- legacy test preloadedState
      auth: {
        user: {
          id: '1',
          username: 'satgas1',
          full_name: 'Test Satgas',
          role: 'satgas',
        },
        token: 'test-token',
        isAuthenticated: true,
        isLoading: false,
        isRestoring: false,
        error: null,
        assignedArea: null,
        onboardingCompleted: false,
      } as any,
      shift: {
        currentShift: null,
        shiftHistory: [],
        isClockingIn: false,
        isClockingOut: false,
        error: null,
      },
    },
  });

const mockNavigation: any = {
  navigate: mockNavigate,
  goBack: jest.fn(),
  setOptions: jest.fn(),
  addListener: jest.fn(),
};

const mockRoute: any = {
  params: {},
  key: 'test-key',
  name: 'Absensi',
};

const renderScreen = (store = createTestStore()) => {
  return render(
    <Provider store={store}>
      <NavigationContainer>
        <OvertimeListScreen navigation={mockNavigation} route={mockRoute} />
      </NavigationContainer>
    </Provider>,
  );
};

describe('OvertimeListScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    if (jest.isMockFunction(setTimeout)) {
      jest.useRealTimers();
    }
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
    (overtimeApi.getMyOvertimes as jest.Mock).mockResolvedValue({
      data: { data: [], meta: { total: 0, page: 1, limit: 10, totalPages: 0 } },
    });
    (overtimeApi.getOvertimes as jest.Mock).mockResolvedValue({
      data: { data: [], meta: { total: 0, page: 1, limit: 10, totalPages: 0 } },
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
    if (jest.isMockFunction(setTimeout)) {
      jest.useRealTimers();
    }
  });

  it('renders filter bar with "Semua Lembur" placeholder', async () => {
    const { getByText } = renderScreen();
    await waitFor(() => {
      expect(getByText('Semua Lembur')).toBeTruthy();
    });
  });

  it('fetches overtime data on mount using getMyOvertimes for submitters', async () => {
    renderScreen();
    await waitFor(() => {
      expect(overtimeApi.getMyOvertimes).toHaveBeenCalled();
    });
  });

  it('fetches overtime data using getOvertimes for approvers', async () => {
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
      role: 'kepala_rayon',
    });

    renderScreen();
    await waitFor(() => {
      expect(overtimeApi.getOvertimes).toHaveBeenCalled();
    });
  });

  it('shows empty state when no overtimes', async () => {
    const { getByText } = renderScreen();
    await waitFor(() => {
      expect(getByText('Tidak ada data lembur')).toBeTruthy();
      expect(getByText('Belum ada pengajuan lembur')).toBeTruthy();
    });
  });

  it('shows overtime cards with description and creator+role', async () => {
    (overtimeApi.getMyOvertimes as jest.Mock).mockResolvedValue({
      data: { data: mockOvertimes, meta: { total: 2, page: 1, limit: 10, totalPages: 1 } },
    });

    const { getByText, getAllByText } = renderScreen();
    await waitFor(() => {
      expect(getByText('Penyiraman tambahan')).toBeTruthy();
      expect(getAllByText(/satgas · Satgas 1/).length).toBeGreaterThan(0);
    });
  });

  it('shows FAB for satgas (canSubmitOvertime=true)', async () => {
    const { getByText } = renderScreen();
    await waitFor(() => {
      expect(getByText('+ Ajukan Lembur')).toBeTruthy();
    });
  });

  it('hides FAB for kepala_rayon (canSubmitOvertime=false)', async () => {
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
      role: 'kepala_rayon',
    });

    const { queryByText } = renderScreen();
    await waitFor(() => {
      expect(queryByText('+ Ajukan Lembur')).toBeNull();
    });
  });

  it('navigates to OvertimeDetail on card press', async () => {
    (overtimeApi.getMyOvertimes as jest.Mock).mockResolvedValue({
      data: { data: mockOvertimes, meta: { total: 2, page: 1, limit: 10, totalPages: 1 } },
    });

    const { findByText } = renderScreen();
    const descText = await findByText('Penyiraman tambahan');
    fireEvent.press(descText);

    expect(mockNavigate).toHaveBeenCalledWith('OvertimeDetail', { overtimeId: 'ot-1' });
  });

  it('navigates to OvertimeSubmit when FAB pressed', async () => {
    const { getByText } = renderScreen();
    await waitFor(() => {
      expect(getByText('+ Ajukan Lembur')).toBeTruthy();
    });
    fireEvent.press(getByText('+ Ajukan Lembur'));
    expect(mockNavigate).toHaveBeenCalledWith('OvertimeSubmit');
  });

  it('handles API error gracefully', async () => {
    (overtimeApi.getMyOvertimes as jest.Mock).mockResolvedValue({
      error: 'Server error',
      data: null,
    });

    const { getByText } = renderScreen();
    await waitFor(() => {
      // Should still render without crashing
      expect(getByText('Semua Lembur')).toBeTruthy();
    });
  });
});
