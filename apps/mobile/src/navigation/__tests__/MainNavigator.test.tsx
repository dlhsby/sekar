/**
 * MainNavigator Tests
 * Uniform bottom bar (Home · Menu · Profile) for all roles; features live in the
 * role-aware Menu launcher (MENU_CONFIGS).
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

jest.mock('../../screens/home/HomeScreen', () => ({
  HomeScreen: () => MockScreen({ name: 'Home' }),
}));
jest.mock('../../screens/menu/MenuScreen', () => ({
  MenuScreen: () => MockScreen({ name: 'Menu' }),
}));
jest.mock('../../screens/field/ClockInOutScreen', () => ({
  ClockInOutScreen: () => MockScreen({ name: 'Absensi' }),
}));
jest.mock('../../screens/attendance/AttendanceListScreen', () => ({
  AttendanceListScreen: () => MockScreen({ name: 'Attendance' }),
}));
jest.mock('../../screens/attendance/AttendanceDetailScreen', () => ({
  AttendanceDetailScreen: () => MockScreen({ name: 'AttendanceDetail' }),
}));
jest.mock('../../screens/overtime/OvertimeListScreen', () => ({
  OvertimeListScreen: () => MockScreen({ name: 'Lembur' }),
}));
jest.mock('../../screens/field/ActivitySubmissionScreen', () => ({
  ActivitySubmissionScreen: () => MockScreen({ name: 'ActivitySubmission' }),
}));
jest.mock('../../screens/taskActivity', () => ({
  TasksScreen: () => MockScreen({ name: 'Tasks' }),
  ActivitiesScreen: () => MockScreen({ name: 'Activities' }),
  TaskCreateScreen: () => MockScreen({ name: 'TaskCreate' }),
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
jest.mock('../../screens/common/ProfileScreen', () => ({
  ProfileScreen: () => MockScreen({ name: 'Profile' }),
}));
jest.mock('../../screens/overtime/OvertimeSubmitScreen', () => ({
  OvertimeSubmitScreen: () => MockScreen({ name: 'OvertimeSubmit' }),
}));
jest.mock('../../screens/overtime/OvertimeDetailScreen', () => ({
  OvertimeDetailScreen: () => MockScreen({ name: 'OvertimeDetail' }),
}));
jest.mock('../../screens/common/SettingsScreen', () => ({
  SettingsScreen: () => MockScreen({ name: 'Settings' }),
}));
jest.mock('../../screens/common/EditProfileScreen', () => ({
  EditProfileScreen: () => MockScreen({ name: 'EditProfile' }),
}));
jest.mock('../../screens/common/NotificationsScreen', () => ({
  NotificationsScreen: () => MockScreen({ name: 'Notifications' }),
}));
jest.mock('../../screens/pruningRequests/ReviewQueueScreen', () => ({
  ReviewQueueScreen: () => MockScreen({ name: 'ReviewQueue' }),
}));
jest.mock('../../screens/pruningRequests/RequestDetailScreen', () => ({
  RequestDetailScreen: () => MockScreen({ name: 'RequestDetail' }),
}));
jest.mock('../../screens/pruningRequests/PerantinganListScreen', () => ({
  PerantinganListScreen: () => MockScreen({ name: 'PerantinganList' }),
}));
jest.mock('../../screens/pruningRequests/SubmitScreen', () => ({
  SubmitScreen: () => MockScreen({ name: 'PerantinganSubmit' }),
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
import MainNavigator, { UNIFORM_TAB_CONFIG, NB_HEADER_STYLE } from '../MainNavigator';
import { MENU_CONFIGS } from '../../constants/menuConfigs';

const ALL_ROLES = [
  'satgas',
  'linmas',
  'korlap',
  'admin_rayon',
  'kepala_rayon',
  'management',
  'admin_system',
  'superadmin',
  'staff_kecamatan',
] as const;

// Routes registered as tab screens (Menu items must point at one of these).
const REGISTERED_ROUTES = new Set([
  'Home', 'Menu', 'Profile',
  'Attendance', 'AttendanceDetail', 'Absensi', 'Lembur', 'Tasks', 'Activities',
  'Monitoring', 'Reports', 'Assets',
  'WorkerAnalytics', 'TeamAnalytics', 'PlantSeeds', 'PruningReviewQueue', 'Perantingan',
]);

// Create test store with configurable role
const createTestStore = (role: string = 'satgas') => {
  return configureStore({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- test fixture type inference mismatch
    reducer: {
      auth: authReducer as any,
      shift: shiftReducer as any,
      activities: activitiesReducer as any,
      offline: offlineReducer as any,
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
      } as any,
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
  describe('UNIFORM_TAB_CONFIG', () => {
    it('is exactly Home · Menu · Profile', () => {
      expect(UNIFORM_TAB_CONFIG).toHaveLength(3);
      expect(UNIFORM_TAB_CONFIG.map((t) => t.name)).toEqual(['Home', 'Menu', 'Profile']);
    });

    it('every tab has name/labelKey/icon strings', () => {
      UNIFORM_TAB_CONFIG.forEach((tab) => {
        expect(typeof tab.name).toBe('string');
        expect(typeof tab.labelKey).toBe('string');
        expect(typeof tab.icon).toBe('string');
      });
    });
  });

  describe('MENU_CONFIGS', () => {
    it('defines a non-empty menu for all 9 roles', () => {
      ALL_ROLES.forEach((role) => {
        expect(MENU_CONFIGS[role]).toBeDefined();
        expect(MENU_CONFIGS[role].length).toBeGreaterThan(0);
      });
    });

    it('every section has a title and items with valid route/label/icon', () => {
      Object.values(MENU_CONFIGS).forEach((sections) => {
        sections.forEach((section) => {
          expect(typeof section.title).toBe('string');
          expect(section.items.length).toBeGreaterThan(0);
          section.items.forEach((item) => {
            expect(typeof item.label).toBe('string');
            expect(typeof item.icon).toBe('string');
            expect(REGISTERED_ROUTES.has(item.route)).toBe(true);
          });
        });
      });
    });

    it('field roles surface Attendance (Kehadiran), Tasks and Activities', () => {
      (['satgas', 'linmas', 'korlap'] as const).forEach((role) => {
        const routes = MENU_CONFIGS[role].flatMap((s) => s.items.map((i) => i.route));
        expect(routes).toContain('Attendance');
        expect(routes).toContain('Tasks');
        expect(routes).toContain('Activities');
      });
    });

    it('monitoring roles surface Monitoring', () => {
      (['korlap', 'kepala_rayon', 'management', 'admin_system', 'superadmin'] as const).forEach(
        (role) => {
          const routes = MENU_CONFIGS[role].flatMap((s) => s.items.map((i) => i.route));
          expect(routes).toContain('Monitoring');
        },
      );
    });

    it('staff_kecamatan menu is Perantingan only (non-clockable → no Kehadiran)', () => {
      const routes = MENU_CONFIGS.staff_kecamatan.flatMap((s) => s.items.map((i) => i.route));
      expect(routes).toContain('Perantingan');
      expect(routes).not.toContain('Attendance');
    });
  });

  describe('Rendering MainNavigator', () => {
    it('renders the uniform Home/Menu/Profile bar for a field role', () => {
      const { getByText } = renderNavigator('satgas');
      expect(getByText('Beranda')).toBeTruthy();
      expect(getByText('Menu')).toBeTruthy();
      expect(getByText('Profil')).toBeTruthy();
    });

    it('renders the same 3 tabs for a management role', () => {
      const { getByText } = renderNavigator('management');
      expect(getByText('Beranda')).toBeTruthy();
      expect(getByText('Menu')).toBeTruthy();
      expect(getByText('Profil')).toBeTruthy();
    });

    it('renders the same 3 tabs for staff_kecamatan', () => {
      const { getByText } = renderNavigator('staff_kecamatan');
      expect(getByText('Beranda')).toBeTruthy();
      expect(getByText('Menu')).toBeTruthy();
      expect(getByText('Profil')).toBeTruthy();
    });

    it('falls back gracefully for an unknown role', () => {
      const { getByText } = renderNavigator('unknown_role');
      expect(getByText('Beranda')).toBeTruthy();
      expect(getByText('Menu')).toBeTruthy();
    });

    it('renders when user is null', () => {
      const store = configureStore({
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- test fixture type inference mismatch
        reducer: {
          auth: authReducer as any,
          shift: shiftReducer as any,
          activities: activitiesReducer as any,
          offline: offlineReducer as any,
        },
        preloadedState: {
          auth: {
            user: null,
            token: null,
            isAuthenticated: false,
            loading: false,
            error: null,
            assignedArea: null,
          } as any,
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
      const { getByText } = render(
        <Provider store={store}>
          <NavigationContainer>
            <MainNavigator />
          </NavigationContainer>
        </Provider>
      );
      expect(getByText('Beranda')).toBeTruthy();
    });
  });

  describe('NB_HEADER_STYLE shared constant', () => {
    it('should export a header style with height 76', () => {
      expect(NB_HEADER_STYLE.height).toBe(76);
    });

    it('should have elevation 0 (NB hard-edge border, not material shadow)', () => {
      expect(NB_HEADER_STYLE.elevation).toBe(0);
    });

    it('should have a borderBottomWidth (NB black border line)', () => {
      expect(NB_HEADER_STYLE.borderBottomWidth).toBeGreaterThan(0);
      expect(NB_HEADER_STYLE.borderBottomColor).toBe('#1C1917');
    });
  });
});
