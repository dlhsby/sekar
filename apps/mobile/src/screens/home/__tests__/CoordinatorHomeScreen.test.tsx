/**
 * CoordinatorHomeScreen (HOME-2) tests — team-status hero, KPI grid, and the
 * alerts derived from the role-scoped monitoring slice.
 */
import React from 'react';
import { render, waitFor } from '@testing-library/react-native';
import { Provider } from 'react-redux';
import { NavigationContainer } from '@react-navigation/native';
import { configureStore } from '@reduxjs/toolkit';
import authReducer from '../../../store/slices/authSlice';
import monitoringReducer from '../../../store/slices/monitoringSlice';
import shiftReducer from '../../../store/slices/shiftSlice';
import activitiesReducer from '../../../store/slices/activitiesSlice';
import tasksReducer from '../../../store/slices/tasksSlice';
import * as monitoringApi from '../../../services/api/monitoringApi';
import { CoordinatorHomeScreen } from '../CoordinatorHomeScreen';

jest.mock('../../../services/api/monitoringApi');
jest.mock('../../../services/api/shiftsApi', () => ({
  getCurrentShift: jest.fn().mockResolvedValue({ data: null, error: null }),
  clockIn: jest.fn(),
  clockOut: jest.fn(),
  getMyShifts: jest.fn().mockResolvedValue({ data: [] }),
}));
jest.mock('../../../services/api/activitiesApi', () => ({
  getMyActivities: jest.fn().mockResolvedValue({ data: { data: [] } }),
}));
jest.mock('../../../services/api/tasksApi', () => ({
  getMyTasks: jest.fn().mockResolvedValue({ data: { data: [] } }),
}));

jest.mock('../../../components/nb/NBBackgroundPattern', () => ({
  NBBackgroundPattern: ({ children }: { children: React.ReactNode }) => children,
}));

const liveUser = (over: Record<string, unknown>) => ({
  id: 'u',
  full_name: 'X',
  role: 'satgas',
  phone: null,
  status: 'active',
  area_id: 'a1',
  location_name: 'Zona A',
  rayon_id: 'r1',
  rayon_name: 'Pusat',
  latitude: -7.25,
  longitude: 112.75,
  accuracy: 10,
  battery_level: 80,
  last_update: new Date().toISOString(),
  is_within_area: true,
  outside_boundary: false,
  shift_id: 's1',
  shift_name: 'Pagi',
  shift_definition_id: null,
  clock_in_time: new Date().toISOString(),
  ...over,
});

const renderScreen = () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- legacy test preloadedState
  const store = configureStore({
    reducer: { auth: authReducer, monitoring: monitoringReducer, shift: shiftReducer, activities: activitiesReducer, tasks: tasksReducer },
    preloadedState: {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- legacy test preloadedState
      auth: {
        user: { id: 'k1', username: 'korlap1', full_name: 'Ibu Marni', role: 'korlap' },
        assignedArea: null,
        isAuthenticated: true,
        isLoading: false,
        isRestoring: false,
        error: null,
        onboardingCompleted: false,
        token: null,
      } as any,
      monitoring: {
        liveUsers: [],
        cityStats: null,
        rayonStats: {},
        areaStats: {},
        filters: { statuses: [] },
        selectedUser: null,
        userDaySummary: null,
        locationHistory: null,
        staffingSummary: [],
        boundaries: null,
        isLoadingBoundaries: false,
        currentDayType: null,
        currentDayTypeLabel: null,
        statusCounts: { active: 0, inactive: 0, outside_area: 0, missing: 0, offline: 0 },
        isLoading: false,
        isLoadingDaySummary: false,
        isLoadingLocationHistory: false,
        isLoadingStaffing: false,
        error: null,
      },
      shift: {
        currentShift: null,
        shiftHistory: [],
        isClockingIn: false,
        isClockingOut: false,
        error: null,
      },
      activities: {
        activitiesList: [],
        isLoading: false,
        isSubmitting: false,
        error: null,
      },
      tasks: {
        tasksList: [],
        isLoading: false,
        error: null,
      },
    } as any,
  } as any);
  return render(
    <Provider store={store}>
      <NavigationContainer>
        <CoordinatorHomeScreen />
      </NavigationContainer>
    </Provider>
  );
};

describe('CoordinatorHomeScreen (HOME-2)', () => {
  beforeEach(() => {
    (monitoringApi.getLiveUsers as jest.Mock).mockResolvedValue({
      data: {
        total_active: 1,
        total_offline: 0,
        total_absent: 1,
        total_outside_area: 1,
        total_online: 1,
        generated_at: new Date().toISOString(),
        users: [
          liveUser({ id: 'u1', full_name: 'Andi Aktif', status: 'active' }),
          liveUser({ id: 'u2', full_name: 'Budi Keluar', status: 'absent', outside_boundary: true, location_name: 'Zona B' }),
          liveUser({ id: 'u3', full_name: 'Citra Hilang', status: 'absent', location_name: 'Zona C' }),
        ],
      },
    });
  });

  afterEach(() => jest.clearAllMocks());

  it('renders the team-status hero with the active/total pill', async () => {
    const { getByTestId, getByText } = renderScreen();
    await waitFor(() => {
      expect(getByTestId('team-hero')).toBeTruthy();
      expect(getByText('Tim hari ini')).toBeTruthy();
      expect(getByText('1/3 aktif')).toBeTruthy();
      expect(getByTestId('team-see-all')).toBeTruthy();
    });
  });

  it('renders the 4-status KPI tiles', async () => {
    const { getByTestId } = renderScreen();
    await waitFor(() => {
      expect(getByTestId('kpi-active')).toBeTruthy();
      expect(getByTestId('kpi-outside')).toBeTruthy();
      expect(getByTestId('kpi-absent')).toBeTruthy();
      expect(getByTestId('kpi-offline')).toBeTruthy();
    });
  });

  it('derives alerts from out-of-area + absent personnel', async () => {
    const { getByText, getByTestId } = renderScreen();
    await waitFor(() => {
      expect(getByText('Budi Keluar keluar area')).toBeTruthy();
      expect(getByText('Citra Hilang tidak hadir')).toBeTruthy();
      expect(getByTestId('alert-out-u2')).toBeTruthy();
      expect(getByTestId('alert-abs-u3')).toBeTruthy();
    });
  });

  it('shows no alerts section when everyone is in-area and present', async () => {
    (monitoringApi.getLiveUsers as jest.Mock).mockResolvedValue({
      data: {
        total_active: 2,
        total_offline: 0,
        total_absent: 0,
        total_outside_area: 0,
        total_online: 2,
        generated_at: new Date().toISOString(),
        users: [
          liveUser({ id: 'u1', full_name: 'Andi Aktif', status: 'active' }),
          liveUser({ id: 'u2', full_name: 'Budi Aktif', status: 'active' }),
        ],
      },
    });
    const { queryByText } = renderScreen();
    await waitFor(() => {
      expect(queryByText(/Peringatan/)).toBeNull();
    });
  });
});
