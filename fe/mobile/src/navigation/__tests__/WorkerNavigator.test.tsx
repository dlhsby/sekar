/**
 * WorkerNavigator Tests
 * Unit tests for worker bottom tab navigation
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import { NavigationContainer } from '@react-navigation/native';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import WorkerNavigator from '../WorkerNavigator';
import authReducer from '../../store/slices/authSlice';
import shiftReducer from '../../store/slices/shiftSlice';
import reportReducer from '../../store/slices/reportSlice';
import offlineReducer from '../../store/slices/offlineSlice';

// Mock all screens
jest.mock('../../screens/worker/WorkerHomeScreen', () => ({
  WorkerHomeScreen: function MockWorkerHome() {
    const { Text } = require('react-native');
    return <Text testID="worker-home-screen">Worker Home</Text>;
  },
}));

jest.mock('../../screens/worker/ClockInOutScreen', () => ({
  ClockInOutScreen: function MockClockInOut() {
    const { Text } = require('react-native');
    return <Text testID="clock-in-out-screen">Clock In/Out</Text>;
  },
}));

jest.mock('../../screens/worker/ReportSubmissionScreen', () => ({
  ReportSubmissionScreen: function MockReportSubmission() {
    const { Text } = require('react-native');
    return <Text testID="report-submission-screen">Report Submission</Text>;
  },
}));

jest.mock('../../screens/worker/ReportsListScreen', () => ({
  ReportsListScreen: function MockReportsList() {
    const { Text } = require('react-native');
    return <Text testID="reports-list-screen">Reports List</Text>;
  },
}));

jest.mock('../../screens/worker/ProfileScreen', () => ({
  ProfileScreen: function MockProfile() {
    const { Text } = require('react-native');
    return <Text testID="profile-screen">Profile</Text>;
  },
}));

// Helper to create store
function createTestStore() {
  return configureStore({
    reducer: {
      auth: authReducer,
      shift: shiftReducer,
      report: reportReducer,
      offline: offlineReducer,
    },
    preloadedState: {
      auth: {
        user: {
          id: 1,
          username: 'worker1',
          full_name: 'Test Worker',
          role: 'worker',
        },
        assignedArea: {
          id: 1,
          name: 'Taman Bungkul',
          gps_lat: -7.25,
          gps_lng: 112.75,
          radius_meters: 100,
        },
        isAuthenticated: true,
        isLoading: false,
        error: null,
      },
      shift: {
        currentShift: null,
        isClockingIn: false,
        isClockingOut: false,
        error: null,
      },
      report: {
        reports: [],
        isLoading: false,
        isSubmitting: false,
        error: null,
      },
      offline: {
        isOnline: true,
        pendingReports: [],
        pendingLocations: [],
        syncInProgress: false,
        lastSyncTime: null,
      },
    },
  });
}

describe('WorkerNavigator', () => {
  const renderNavigator = () => {
    const store = createTestStore();
    return render(
      <Provider store={store}>
        <NavigationContainer>
          <WorkerNavigator />
        </NavigationContainer>
      </Provider>
    );
  };

  describe('tab structure', () => {
    it('should render WorkerHome as initial screen', () => {
      renderNavigator();

      expect(screen.getByTestId('worker-home-screen')).toBeTruthy();
    });

    it('should have all required tabs', () => {
      renderNavigator();

      expect(screen.getAllByText('Home').length).toBeGreaterThan(0);
      expect(screen.getAllByText('Absensi').length).toBeGreaterThan(0);
      expect(screen.getAllByText('Buat Laporan').length).toBeGreaterThan(0);
      expect(screen.getAllByText('Laporan Saya').length).toBeGreaterThan(0);
      expect(screen.getAllByText('Profil').length).toBeGreaterThan(0);
    });
  });

  describe('tab navigation', () => {
    it('should navigate to ClockInOut when Absensi tab is pressed', async () => {
      renderNavigator();

      const absensiTab = screen.getAllByText('Absensi')[0];
      fireEvent.press(absensiTab);

      await waitFor(() => {
        expect(screen.getByTestId('clock-in-out-screen')).toBeTruthy();
      });
    });

    it('should navigate to ReportSubmission when Buat Laporan tab is pressed', async () => {
      renderNavigator();

      const reportTab = screen.getAllByText('Buat Laporan')[0];
      fireEvent.press(reportTab);

      await waitFor(() => {
        expect(screen.getByTestId('report-submission-screen')).toBeTruthy();
      });
    });

    it('should navigate to ReportsList when Laporan Saya tab is pressed', async () => {
      renderNavigator();

      const reportsTab = screen.getAllByText('Laporan Saya')[0];
      fireEvent.press(reportsTab);

      await waitFor(() => {
        expect(screen.getByTestId('reports-list-screen')).toBeTruthy();
      });
    });

    it('should navigate to Profile when Profil tab is pressed', async () => {
      renderNavigator();

      const profileTab = screen.getAllByText('Profil')[0];
      fireEvent.press(profileTab);

      await waitFor(() => {
        expect(screen.getByTestId('profile-screen')).toBeTruthy();
      });
    });
  });
});
