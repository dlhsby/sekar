/**
 * MainNavigator Tests
 * Tests for Phase 2C unified 8-role navigation configuration
 */

// Mock react-native-maps to prevent import errors
jest.mock('react-native-maps', () => ({
  __esModule: true,
  default: () => null,
  Circle: () => null,
  PROVIDER_GOOGLE: 'google',
}));

// Mock all screen components to keep tests lightweight
const MockScreen = ({ name }: { name: string }) => {
  const React = require('react');
  const { View, Text } = require('react-native');
  return React.createElement(View, { testID: `screen-${name}` },
    React.createElement(Text, null, name)
  );
};

jest.mock('../../screens/field/HomeScreen', () => ({
  HomeScreen: () => MockScreen({ name: 'Home' }),
}));
jest.mock('../../screens/field/ClockInOutScreen', () => ({
  ClockInOutScreen: () => MockScreen({ name: 'ClockInOut' }),
}));
jest.mock('../../screens/field/ActivitySubmissionScreen', () => ({
  ActivitySubmissionScreen: () => MockScreen({ name: 'ActivitySubmission' }),
}));
jest.mock('../../screens/field/TasksActivityScreen', () => ({
  TasksActivityScreen: () => MockScreen({ name: 'TasksActivity' }),
}));
jest.mock('../../screens/field/TaskDetailScreen', () => ({
  TaskDetailScreen: () => MockScreen({ name: 'TaskDetail' }),
}));
jest.mock('../../screens/field/TaskCompleteScreen', () => ({
  TaskCompleteScreen: () => MockScreen({ name: 'TaskComplete' }),
}));
jest.mock('../../screens/field/ShiftHistoryScreen', () => ({
  ShiftHistoryScreen: () => MockScreen({ name: 'ShiftHistory' }),
}));
jest.mock('../../screens/field/ActivityDetailScreen', () => ({
  ActivityDetailScreen: () => MockScreen({ name: 'ActivityDetail' }),
}));
jest.mock('../../screens/monitoring/MapDashboardScreen', () => ({
  MapDashboardScreen: () => MockScreen({ name: 'MapDashboard' }),
}));
jest.mock('../../screens/monitoring/AttendanceScreen', () => ({
  __esModule: true,
  default: () => MockScreen({ name: 'Attendance' }),
}));
jest.mock('../../screens/common/ProfileScreen', () => ({
  ProfileScreen: () => MockScreen({ name: 'Profile' }),
}));
jest.mock('../../screens/overtime/OvertimeListScreen', () => ({
  OvertimeListScreen: () => MockScreen({ name: 'OvertimeList' }),
}));
jest.mock('../../screens/overtime/OvertimeSubmitScreen', () => ({
  OvertimeSubmitScreen: () => MockScreen({ name: 'OvertimeSubmit' }),
}));
jest.mock('../../screens/overtime/OvertimeDetailScreen', () => ({
  OvertimeDetailScreen: () => MockScreen({ name: 'OvertimeDetail' }),
}));
jest.mock('../../screens/overtime/OvertimeApprovalScreen', () => ({
  OvertimeApprovalScreen: () => MockScreen({ name: 'OvertimeApproval' }),
}));
jest.mock('../../screens/tasks/TaskCreateScreen', () => ({
  TaskCreateScreen: () => MockScreen({ name: 'TaskCreate' }),
}));
jest.mock('../../screens/common/SettingsScreen', () => ({
  SettingsScreen: () => MockScreen({ name: 'Settings' }),
}));
jest.mock('../../components/navigation/FieldHomeHeader', () => ({
  FieldHomeHeader: () => null,
}));

import React from 'react';
import { render } from '@testing-library/react-native';
import { NavigationContainer } from '@react-navigation/native';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import authReducer from '../../store/slices/authSlice';
import shiftReducer from '../../store/slices/shiftSlice';
import activitiesReducer from '../../store/slices/activitiesSlice';
import offlineReducer from '../../store/slices/offlineSlice';
import MainNavigator, { TAB_CONFIGS } from '../MainNavigator';

// Create test store with configurable role
const createTestStore = (role: string = 'satgas') => {
  return configureStore({
    reducer: {
      auth: authReducer,
      shift: shiftReducer,
      activities: activitiesReducer,
      offline: offlineReducer,
    },
    preloadedState: {
      auth: {
        user: {
          id: 'user-1',
          username: 'testuser',
          full_name: 'Test User',
          role,
        },
        token: 'test-token',
        isAuthenticated: true,
        loading: false,
        error: null,
        assignedArea: null,
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
      offline: {
        isOnline: true,
        isSyncing: false,
        queue: [],
        pendingShiftsCount: 0,
        pendingActivitiesCount: 0,
        pendingMediaCount: 0,
        pendingLocationsCount: 0,
        lastSyncTime: null,
        syncError: null,
      },
    },
  });
};

const renderNavigator = (role: string = 'satgas') => {
  const store = createTestStore(role);
  return render(
    <Provider store={store}>
      <NavigationContainer>
        <MainNavigator />
      </NavigationContainer>
    </Provider>
  );
};

describe('MainNavigator', () => {
  describe('TAB_CONFIGS', () => {
    it('defines configuration for all 8 roles', () => {
      expect(TAB_CONFIGS).toHaveProperty('satgas');
      expect(TAB_CONFIGS).toHaveProperty('linmas');
      expect(TAB_CONFIGS).toHaveProperty('korlap');
      expect(TAB_CONFIGS).toHaveProperty('admin_data');
      expect(TAB_CONFIGS).toHaveProperty('kepala_rayon');
      expect(TAB_CONFIGS).toHaveProperty('top_management');
      expect(TAB_CONFIGS).toHaveProperty('admin_system');
      expect(TAB_CONFIGS).toHaveProperty('superadmin');
    });

    it('satgas has 5 tabs', () => {
      expect(TAB_CONFIGS.satgas).toHaveLength(5);
      expect(TAB_CONFIGS.satgas.some((tab) => tab.name === 'Home')).toBe(true);
      expect(TAB_CONFIGS.satgas.some((tab) => tab.name === 'Profile')).toBe(true);
    });

    it('linmas has 5 tabs', () => {
      expect(TAB_CONFIGS.linmas).toHaveLength(5);
      expect(TAB_CONFIGS.linmas.some((tab) => tab.name === 'Home')).toBe(true);
      expect(TAB_CONFIGS.linmas.some((tab) => tab.name === 'Profile')).toBe(true);
    });

    it('korlap has 5 tabs with Monitoring (Profile via stack)', () => {
      expect(TAB_CONFIGS.korlap).toHaveLength(5);
      expect(TAB_CONFIGS.korlap.some((tab) => tab.name === 'Monitoring')).toBe(true);
      expect(TAB_CONFIGS.korlap.some((tab) => tab.name === 'Profile')).toBe(false);
    });

    it('admin_data has 5 tabs with Monitoring and Overtime', () => {
      expect(TAB_CONFIGS.admin_data).toHaveLength(5);
      expect(TAB_CONFIGS.admin_data.some((tab) => tab.name === 'Home')).toBe(true);
      expect(TAB_CONFIGS.admin_data.some((tab) => tab.name === 'Activities')).toBe(true);
      expect(TAB_CONFIGS.admin_data.some((tab) => tab.name === 'Monitoring')).toBe(true);
      expect(TAB_CONFIGS.admin_data.some((tab) => tab.name === 'Overtime')).toBe(true);
      expect(TAB_CONFIGS.admin_data.some((tab) => tab.name === 'Profile')).toBe(true);
    });

    it('kepala_rayon has 4 tabs', () => {
      expect(TAB_CONFIGS.kepala_rayon).toHaveLength(4);
      expect(TAB_CONFIGS.kepala_rayon.some((tab) => tab.name === 'Monitoring')).toBe(true);
      expect(TAB_CONFIGS.kepala_rayon.some((tab) => tab.name === 'Profile')).toBe(true);
    });

    it('top_management has 3 tabs', () => {
      expect(TAB_CONFIGS.top_management).toHaveLength(3);
      expect(TAB_CONFIGS.top_management.some((tab) => tab.name === 'Monitoring')).toBe(true);
      expect(TAB_CONFIGS.top_management.some((tab) => tab.name === 'Profile')).toBe(true);
    });

    it('admin_system has 3 tabs', () => {
      expect(TAB_CONFIGS.admin_system).toHaveLength(3);
      expect(TAB_CONFIGS.admin_system.some((tab) => tab.name === 'Monitoring')).toBe(true);
    });

    it('superadmin has 3 tabs', () => {
      expect(TAB_CONFIGS.superadmin).toHaveLength(3);
      expect(TAB_CONFIGS.superadmin.some((tab) => tab.name === 'Monitoring')).toBe(true);
    });

    it('all tab configs have valid structure', () => {
      Object.values(TAB_CONFIGS).forEach((tabs) => {
        tabs.forEach((tab) => {
          expect(tab).toHaveProperty('name');
          expect(tab).toHaveProperty('label');
          expect(tab).toHaveProperty('icon');
          expect(typeof tab.name).toBe('string');
          expect(typeof tab.label).toBe('string');
          expect(typeof tab.icon).toBe('string');
        });
      });
    });

    it('all monitoring roles have Monitoring tab', () => {
      const monitoringRoles = ['korlap', 'kepala_rayon', 'top_management', 'admin_system', 'superadmin'];
      monitoringRoles.forEach((role) => {
        const hasMonitoring = TAB_CONFIGS[role].some((tab) => tab.name === 'Monitoring');
        expect(hasMonitoring).toBe(true);
      });
    });

    it('all roles except korlap have Profile tab (korlap uses stack)', () => {
      Object.keys(TAB_CONFIGS).forEach((role) => {
        const hasProfile = TAB_CONFIGS[role].some((tab) => tab.name === 'Profile');
        if (role === 'korlap') {
          expect(hasProfile).toBe(false);
        } else {
          expect(hasProfile).toBe(true);
        }
      });
    });

    it('field roles have Home tab', () => {
      const fieldRoles = ['satgas', 'linmas', 'korlap', 'admin_data', 'kepala_rayon'];
      fieldRoles.forEach((role) => {
        const hasHome = TAB_CONFIGS[role].some((tab) => tab.name === 'Home');
        expect(hasHome).toBe(true);
      });
    });

    it('clockable roles have Activities tab', () => {
      const clockableRoles = ['satgas', 'linmas', 'korlap', 'admin_data'];
      clockableRoles.forEach((role) => {
        const hasActivities = TAB_CONFIGS[role].some((tab) => tab.name === 'Activities');
        expect(hasActivities).toBe(true);
      });
    });

    it('clockable roles have Overtime tab', () => {
      const clockableRoles = ['satgas', 'linmas', 'korlap'];
      clockableRoles.forEach((role) => {
        const hasOvertime = TAB_CONFIGS[role].some((tab) => tab.name === 'Overtime');
        expect(hasOvertime).toBe(true);
      });
    });
  });

  describe('Rendering MainNavigator', () => {
    it('should render for satgas role with Home tab visible', () => {
      const { getAllByText } = renderNavigator('satgas');
      // satgas default tab is Home — may appear as tab label + screen content
      expect(getAllByText('Home').length).toBeGreaterThanOrEqual(1);
    });

    it('should render tab labels for satgas role', () => {
      const { getByText } = renderNavigator('satgas');
      expect(getByText('Aktivitas')).toBeTruthy();
      expect(getByText('Tugas')).toBeTruthy();
      expect(getByText('Lembur')).toBeTruthy();
      expect(getByText('Profil')).toBeTruthy();
    });

    it('should render for korlap role with Monitoring tab', () => {
      const { getByText } = renderNavigator('korlap');
      expect(getByText('Monitoring')).toBeTruthy();
    });

    it('should render for top_management role', () => {
      const { getByText } = renderNavigator('top_management');
      expect(getByText('Monitoring')).toBeTruthy();
      expect(getByText('Tugas')).toBeTruthy();
      expect(getByText('Profil')).toBeTruthy();
    });

    it('should render for admin_data role with 5 tabs', () => {
      const { getAllByText, getByText } = renderNavigator('admin_data');
      expect(getAllByText('Home').length).toBeGreaterThanOrEqual(1);
      expect(getAllByText('Aktivitas').length).toBeGreaterThanOrEqual(1);
      expect(getByText('Monitoring')).toBeTruthy();
      expect(getByText('Lembur')).toBeTruthy();
      expect(getAllByText('Profil').length).toBeGreaterThanOrEqual(1);
    });

    it('should render for kepala_rayon role', () => {
      const { getAllByText, getByText } = renderNavigator('kepala_rayon');
      expect(getAllByText('Home').length).toBeGreaterThanOrEqual(1);
      expect(getByText('Tugas')).toBeTruthy();
      expect(getByText('Monitoring')).toBeTruthy();
      expect(getByText('Profil')).toBeTruthy();
    });

    it('should render for superadmin role', () => {
      const { getByText } = renderNavigator('superadmin');
      expect(getByText('Monitoring')).toBeTruthy();
      expect(getByText('Tugas')).toBeTruthy();
      expect(getByText('Profil')).toBeTruthy();
    });

    it('should fallback to satgas tabs for unknown role', () => {
      const { getAllByText } = renderNavigator('unknown_role');
      expect(getAllByText('Home').length).toBeGreaterThanOrEqual(1);
      expect(getAllByText('Profil').length).toBeGreaterThanOrEqual(1);
    });

    it('should fallback to satgas tabs when user is null', () => {
      const store = configureStore({
        reducer: {
          auth: authReducer,
          shift: shiftReducer,
          activities: activitiesReducer,
          offline: offlineReducer,
        },
        preloadedState: {
          auth: {
            user: null,
            token: null,
            isAuthenticated: false,
            loading: false,
            error: null,
            assignedArea: null,
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
          offline: {
            isOnline: true,
            isSyncing: false,
            queue: [],
            pendingShiftsCount: 0,
            pendingActivitiesCount: 0,
            pendingMediaCount: 0,
            pendingLocationsCount: 0,
            lastSyncTime: null,
            syncError: null,
          },
        },
      });
      const { getAllByText } = render(
        <Provider store={store}>
          <NavigationContainer>
            <MainNavigator />
          </NavigationContainer>
        </Provider>
      );
      // Falls back to satgas (default)
      expect(getAllByText('Home').length).toBeGreaterThanOrEqual(1);
    });
  });
});
