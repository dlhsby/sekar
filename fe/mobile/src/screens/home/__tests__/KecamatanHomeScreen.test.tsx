/**
 * KecamatanHomeScreen tests — "my requests" hero, status breakdown tiles, and
 * the recent-requests list (from pruningRequests.mine).
 */
import React from 'react';
import { render, waitFor } from '@testing-library/react-native';
import { Provider } from 'react-redux';
import { NavigationContainer } from '@react-navigation/native';
import { configureStore } from '@reduxjs/toolkit';
import authReducer from '../../../store/slices/authSlice';
import pruningRequestsReducer from '../../../store/slices/pruningRequestsSlice';
import * as pruningApi from '../../../services/api/pruningRequestsApi';
import { KecamatanHomeScreen } from '../KecamatanHomeScreen';

jest.mock('../../../services/api/pruningRequestsApi');

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

const renderScreen = (items: ReturnType<typeof req>[]) => {
  (pruningApi.getMyPruningRequests as jest.Mock).mockResolvedValue({ data: items });
  const store = configureStore({
    reducer: { auth: authReducer, pruningRequests: pruningRequestsReducer },
    preloadedState: {
      auth: {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- partial User fixture
        user: { id: 'k1', username: 'kec', full_name: 'Pak Lurah', role: 'staff_kecamatan' } as any,
        assignedArea: null,
        assignedAreas: [],
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
        <KecamatanHomeScreen />
      </NavigationContainer>
    </Provider>
  );
};

describe('KecamatanHomeScreen', () => {
  afterEach(() => jest.clearAllMocks());

  it('renders the my-requests hero with totals + submit CTA', async () => {
    const { getByTestId, getByText } = renderScreen([
      req({ id: 'r1', status: 'submitted' }),
      req({ id: 'r2', status: 'approved' }),
      req({ id: 'r3', status: 'done' }),
    ]);
    await waitFor(() => {
      expect(getByTestId('kecamatan-hero')).toBeTruthy();
      expect(getByText('Permohonan saya')).toBeTruthy();
      expect(getByText('3')).toBeTruthy(); // total
      expect(getByTestId('kecamatan-submit')).toBeTruthy();
    });
  });

  it('renders the status breakdown tiles', async () => {
    const { getByTestId } = renderScreen([req({ id: 'r1', status: 'submitted' })]);
    await waitFor(() => {
      expect(getByTestId('kec-waiting')).toBeTruthy();
      expect(getByTestId('kec-approved')).toBeTruthy();
      expect(getByTestId('kec-scheduled')).toBeTruthy();
      expect(getByTestId('kec-done')).toBeTruthy();
    });
  });

  it('lists recent requests', async () => {
    const { getByText, getByTestId } = renderScreen([
      req({ id: 'r1', status: 'approved', kecamatanName: 'Kec. Gubeng', referenceCode: 'PR-009' }),
    ]);
    await waitFor(() => {
      expect(getByText('Permohonan terbaru')).toBeTruthy();
      expect(getByTestId('kec-req-r1')).toBeTruthy();
      expect(getByText('Kec. Gubeng')).toBeTruthy();
    });
  });

  it('shows an empty hint when there are no requests', async () => {
    const { getByText } = renderScreen([]);
    await waitFor(() => {
      expect(getByText(/Belum ada permohonan/)).toBeTruthy();
    });
  });
});
