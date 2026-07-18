/**
 * ExecHomeScreen tests — city-overview hero, personnel KPI grid, per-rayon
 * roll-up (from the role-scoped monitoring slice).
 */
import React from 'react';
import { render, waitFor } from '@testing-library/react-native';
import { Provider } from 'react-redux';
import { NavigationContainer } from '@react-navigation/native';
import { configureStore } from '@reduxjs/toolkit';
import authReducer from '../../../store/slices/authSlice';
import monitoringReducer from '../../../store/slices/monitoringSlice';
import * as monitoringApi from '../../../services/api/monitoringApi';
import { ExecHomeScreen } from '../ExecHomeScreen';

jest.mock('../../../services/api/monitoringApi');

jest.mock('../../../components/nb/NBBackgroundPattern', () => ({
  NBBackgroundPattern: ({ children }: { children: React.ReactNode }) => children,
}));

const liveUser = (over: Record<string, unknown>) => ({
  id: 'u',
  full_name: 'X',
  role: 'satgas',
  phone: null,
  status: 'active',
  location_id: 'a1',
  location_name: 'Zona A',
  rayon_id: 'r1',
  rayon_name: 'Rayon Pusat',
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
    reducer: { auth: authReducer, monitoring: monitoringReducer },
    preloadedState: {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- legacy test preloadedState
      auth: {
        user: { id: 't1', username: 'mgmt', full_name: 'Bu Kepala', role: 'management' },
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
    } as any,
  } as any);
  return render(
    <Provider store={store}>
      <NavigationContainer>
        <ExecHomeScreen />
      </NavigationContainer>
    </Provider>
  );
};

describe('ExecHomeScreen', () => {
  beforeEach(() => {
    (monitoringApi.getLiveUsers as jest.Mock).mockResolvedValue({
      data: {
        total_active: 2,
        total_offline: 0,
        total_absent: 0,
        total_outside_area: 1,
        total_online: 2,
        generated_at: new Date().toISOString(),
        users: [
          liveUser({ id: 'u1', status: 'active', rayon_id: 'r1', rayon_name: 'Rayon Pusat' }),
          liveUser({ id: 'u2', status: 'active', rayon_id: 'r1', rayon_name: 'Rayon Pusat' }),
          liveUser({ id: 'u3', status: 'absent', rayon_id: 'r2', rayon_name: 'Rayon Timur', outside_boundary: true }),
        ],
      },
    });
  });

  afterEach(() => jest.clearAllMocks());

  it('renders the city-overview hero with the active/total pill', async () => {
    const { getByTestId, getByText } = renderScreen();
    await waitFor(() => {
      expect(getByTestId('city-hero')).toBeTruthy();
      expect(getByText('Pantauan kota')).toBeTruthy();
      expect(getByText('2/3 aktif')).toBeTruthy();
      expect(getByTestId('city-see-map')).toBeTruthy();
    });
  });

  it('renders the personnel KPI tiles', async () => {
    const { getByTestId } = renderScreen();
    await waitFor(() => {
      expect(getByTestId('city-active')).toBeTruthy();
      expect(getByTestId('city-outside')).toBeTruthy();
      expect(getByTestId('city-absent')).toBeTruthy();
      expect(getByTestId('city-offline')).toBeTruthy();
    });
  });

  it('rolls up live users per rayon', async () => {
    const { getByText, getByTestId } = renderScreen();
    await waitFor(() => {
      expect(getByText('Per rayon')).toBeTruthy();
      expect(getByTestId('rayon-r1')).toBeTruthy();
      expect(getByTestId('rayon-r2')).toBeTruthy();
      expect(getByText('Rayon Pusat')).toBeTruthy();
    });
  });
});
