/**
 * SupervisorNavigator Tests
 * Unit tests for supervisor bottom tab navigation
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import SupervisorNavigator from '../SupervisorNavigator';

// Mock Alert before each test to prevent cross-test pollution
beforeEach(() => {
  Alert.alert = jest.fn();
});

// Mock all screens
jest.mock('../../screens/supervisor/MapDashboardScreen', () => {
  const { Text } = require('react-native');
  return {
    MapDashboardScreen: function MockMapDashboard() {
      return <Text testID="map-dashboard-screen">Map Dashboard</Text>;
    },
  };
});

jest.mock('../../screens/supervisor/ReportsListScreen', () => {
  const { Text } = require('react-native');
  return function MockReportsList() {
    return <Text testID="reports-list-screen">Reports List</Text>;
  };
});

jest.mock('../../screens/supervisor/ReportDetailScreen', () => {
  const { Text } = require('react-native');
  return function MockReportDetail() {
    return <Text testID="report-detail-screen">Report Detail</Text>;
  };
});

jest.mock('../../screens/supervisor/AttendanceScreen', () => {
  const { Text } = require('react-native');
  return {
    AttendanceScreen: function MockAttendance() {
      return <Text testID="attendance-screen">Attendance</Text>;
    },
  };
});

jest.mock('../../screens/supervisor/ProfileScreen', () => {
  const { Text } = require('react-native');
  return {
    ProfileScreen: function MockProfile() {
      return <Text testID="profile-screen">Profile</Text>;
    },
  };
});

// Mock the index export
jest.mock('../../screens/supervisor', () => ({
  MapDashboardScreen: function MockMapDashboard() {
    const { Text } = require('react-native');
    return <Text testID="map-dashboard-screen">Map Dashboard</Text>;
  },
  AttendanceScreen: function MockAttendance() {
    const { Text } = require('react-native');
    return <Text testID="attendance-screen">Attendance</Text>;
  },
  ProfileScreen: function MockProfile() {
    const { Text } = require('react-native');
    return <Text testID="profile-screen">Profile</Text>;
  },
}));

describe('SupervisorNavigator', () => {
  const renderNavigator = () => {
    return render(
      <NavigationContainer>
        <SupervisorNavigator />
      </NavigationContainer>
    );
  };

  describe('tab structure', () => {
    it('should render MapDashboard as initial screen', () => {
      renderNavigator();

      expect(screen.getByTestId('map-dashboard-screen')).toBeTruthy();
    });

    it('should have all required tabs', () => {
      renderNavigator();

      // Use getAllByText since tab labels can appear multiple times
      expect(screen.getAllByText('Peta').length).toBeGreaterThan(0);
      expect(screen.getAllByText('Laporan').length).toBeGreaterThan(0);
      expect(screen.getAllByText('Kehadiran').length).toBeGreaterThan(0);
      expect(screen.getAllByText('Profil').length).toBeGreaterThan(0);
    });
  });

  describe('tab navigation', () => {
    it('should navigate to Attendance when Kehadiran tab is pressed', async () => {
      renderNavigator();

      const attendanceTab = screen.getAllByText('Kehadiran')[0];
      fireEvent.press(attendanceTab);

      await waitFor(() => {
        expect(screen.getByTestId('attendance-screen')).toBeTruthy();
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

    it('should navigate to Reports when Laporan tab is pressed', async () => {
      renderNavigator();

      const reportsTab = screen.getAllByText('Laporan')[0];
      fireEvent.press(reportsTab);

      await waitFor(() => {
        expect(screen.getByTestId('reports-list-screen')).toBeTruthy();
      });
    });
  });
});
