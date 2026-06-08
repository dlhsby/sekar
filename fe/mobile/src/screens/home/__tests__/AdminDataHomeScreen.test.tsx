/**
 * AdminDataHomeScreen (HOME-3) tests — perantingan-queue hero, disposition
 * breakdown tiles, and the "berjalan" list, from the admin pruning list.
 */
import React from 'react';
import { render, waitFor } from '@testing-library/react-native';
import { Provider } from 'react-redux';
import { NavigationContainer } from '@react-navigation/native';
import { configureStore } from '@reduxjs/toolkit';
import authReducer from '../../../store/slices/authSlice';
import pruningRequestsReducer from '../../../store/slices/pruningRequestsSlice';
import shiftReducer from '../../../store/slices/shiftSlice';
import activitiesReducer from '../../../store/slices/activitiesSlice';
import tasksReducer from '../../../store/slices/tasksSlice';
import * as pruningApi from '../../../services/api/pruningRequestsApi';
import { AdminDataHomeScreen } from '../AdminDataHomeScreen';

jest.mock('../../../services/api/pruningRequestsApi');
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

const req = (over: Record<string, unknown>) => ({
  id: 'r',
  referenceCode: 'PR-001',
  submittedBy: 'k1',
  kecamatanName: 'Kec. Wonokromo',
  address: 'Jl. X',
  gpsLat: null,
  gpsLng: null,
  expectedDate: null,
  expectedYear: null,
  expectedIsoWeek: null,
  scheduledDate: null,
  estimatedPlantCount: null,
  photoUrls: [],
  notes: null,
  status: 'submitted',
  reviewedBy: null,
  reviewedAt: null,
  assignedTaskId: null,
  createdAt: new Date().toISOString(),
  ...over,
});

const renderScreen = () => {
  const store = configureStore({
    reducer: { auth: authReducer, pruningRequests: pruningRequestsReducer, shift: shiftReducer, activities: activitiesReducer, tasks: tasksReducer },
    preloadedState: {
      auth: {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- partial User fixture
        user: { id: 'a1', username: 'admin1', full_name: 'Pak Hadi', role: 'admin_data' } as any,
        assignedArea: null,
        isAuthenticated: true,
        isLoading: false,
        isRestoring: false,
        error: null,
        onboardingCompleted: true,
      },
    },
  });
  return render(
    <Provider store={store}>
      <NavigationContainer>
        <AdminDataHomeScreen />
      </NavigationContainer>
    </Provider>
  );
};

describe('AdminDataHomeScreen (HOME-3)', () => {
  beforeEach(() => {
    (pruningApi.getAdminPruningRequests as jest.Mock).mockResolvedValue({
      data: {
        items: [
          req({ id: 'r1', status: 'submitted' }),
          req({ id: 'r2', status: 'under_review' }),
          req({ id: 'r3', status: 'approved' }),
          req({ id: 'r4', status: 'assigned', kecamatanName: 'Kec. Gubeng', referenceCode: 'PR-004' }),
          req({ id: 'r5', status: 'in_progress', kecamatanName: 'Kec. Tegalsari', referenceCode: 'PR-005' }),
        ],
        total: 5,
        page: 1,
        limit: 20,
      },
    });
  });

  afterEach(() => jest.clearAllMocks());

  it('renders the perantingan-queue hero with the incoming count', async () => {
    const { getByTestId, getByText } = renderScreen();
    await waitFor(() => {
      expect(getByTestId('perantingan-hero')).toBeTruthy();
      expect(getByText('Perantingan masuk')).toBeTruthy();
      // incoming = submitted + under_review = 2
      expect(getByText('2')).toBeTruthy();
      expect(getByText('1 baru')).toBeTruthy();
      expect(getByTestId('open-queue')).toBeTruthy();
    });
  });

  it('renders the disposition breakdown tiles', async () => {
    const { getByTestId } = renderScreen();
    await waitFor(() => {
      expect(getByTestId('disp-submitted')).toBeTruthy();
      expect(getByTestId('disp-review')).toBeTruthy();
      expect(getByTestId('disp-approved')).toBeTruthy();
      expect(getByTestId('disp-rejected')).toBeTruthy();
    });
  });

  it('lists assigned + in-progress requests under "berjalan"', async () => {
    const { getByText, getByTestId } = renderScreen();
    await waitFor(() => {
      expect(getByText('Perantingan berjalan')).toBeTruthy();
      expect(getByTestId('inflight-r4')).toBeTruthy();
      expect(getByTestId('inflight-r5')).toBeTruthy();
      expect(getByText('Kec. Gubeng')).toBeTruthy();
    });
  });

  it('hides the "berjalan" section when nothing is assigned/in-progress', async () => {
    (pruningApi.getAdminPruningRequests as jest.Mock).mockResolvedValue({
      data: { items: [req({ id: 'r1', status: 'submitted' })], total: 1, page: 1, limit: 20 },
    });
    const { queryByText } = renderScreen();
    await waitFor(() => {
      expect(queryByText('Perantingan berjalan')).toBeNull();
    });
  });
});
