/**
 * RootNavigator Tests
 * Unit tests for root navigation based on auth state
 * Phase 2C: Unified MainNavigator replaces WorkerNavigator/SupervisorNavigator
 */

import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import RootNavigator from '../RootNavigator';
import authReducer from '../../store/slices/authSlice';
import shiftReducer from '../../store/slices/shiftSlice';
import activitiesReducer from '../../store/slices/activitiesSlice';
import offlineReducer from '../../store/slices/offlineSlice';
import tasksReducer from '../../store/slices/tasksSlice';
import notificationsReducer from '../../store/slices/notificationsSlice';
import overtimeReducer from '../../store/slices/overtimeSlice';

// Alert mocked globally in jest.setup.js

// Mock all screens
jest.mock('../../screens/auth/LoginScreen', () => {
  const { Text } = require('react-native');
  return {
    __esModule: true,
    default: function MockLoginScreen() {
      return <Text testID="login-screen">Login Screen</Text>;
    },
  };
});

// Splash is the initial route of the logged-out stack (shown before the carousel).
jest.mock('../../screens/auth/SplashScreen', () => {
  const { Text } = require('react-native');
  return {
    __esModule: true,
    default: function MockSplashScreen() {
      return <Text testID="splash-screen">Splash</Text>;
    },
  };
});

jest.mock('../../screens/auth/WelcomeCarouselScreen', () => {
  const { Text } = require('react-native');
  return {
    __esModule: true,
    default: function MockWelcomeCarousel() {
      return <Text testID="welcome-carousel-screen">Welcome Carousel</Text>;
    },
  };
});

jest.mock('../MainNavigator', () => {
  const { Text } = require('react-native');
  return function MockMainNavigator() {
    return <Text testID="main-navigator">Main Navigator</Text>;
  };
});

jest.mock('../../screens/auth/ChangePasswordScreen', () => {
  const { Text } = require('react-native');
  return {
    __esModule: true,
    default: function MockChangePassword() {
      return <Text testID="change-password-screen">Change Password</Text>;
    },
  };
});

jest.mock('../OnboardingNavigator', () => {
  const { Text } = require('react-native');
  return function MockOnboarding() {
    return <Text testID="onboarding-navigator">Onboarding</Text>;
  };
});

jest.mock('../../services/permissions/PermissionManager', () => ({
  permissionManager: {
    checkAllPermissions: jest.fn(() =>
      Promise.resolve({
        notifications: { granted: true },
        location: { granted: true },
        backgroundLocation: { granted: true },
        camera: { granted: true },
        gallery: { granted: true },
      })
    ),
  },
}));

jest.mock('../../services/storage/asyncStorageKeys', () => ({
  hasCompletedOnboarding: jest.fn(() => Promise.resolve(true)),
  markOnboardingCompleted: jest.fn(() => Promise.resolve()),
  hasSeenCarousel: jest.fn(() => Promise.resolve(true)),
  markCarouselSeen: jest.fn(() => Promise.resolve()),
}));

// Helper to create store with preloaded state
function createTestStore(preloadedState?: any) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- test fixture type inference mismatch
  return configureStore({
    reducer: {
      auth: authReducer as any,
      shift: shiftReducer as any,
      activities: activitiesReducer as any,
      offline: offlineReducer as any,
      tasks: tasksReducer as any,
      notifications: notificationsReducer as any,
      overtime: overtimeReducer as any,
    },
    preloadedState: preloadedState as any,
  } as any);
}

describe('RootNavigator', () => {
  describe('unauthenticated state', () => {
    it('should render the Splash (entry) when not authenticated', () => {
      const store = createTestStore({
        auth: {
          user: null,
          assignedArea: null,
          isAuthenticated: false,
          isLoading: false,
          error: null,
        },
      });

      render(
        <Provider store={store}>
          <RootNavigator />
        </Provider>
      );

      // Splash is the initial route of the logged-out stack; it leads to the
      // carousel, then Login.
      expect(screen.getByTestId('splash-screen')).toBeTruthy();
    });

    it('should render the Splash when user is null', () => {
      const store = createTestStore({
        auth: {
          user: null,
          assignedArea: null,
          isAuthenticated: true, // Even if authenticated, no user means logged-out
          isLoading: false,
          error: null,
        },
      });

      render(
        <Provider store={store}>
          <RootNavigator />
        </Provider>
      );

      expect(screen.getByTestId('splash-screen')).toBeTruthy();
    });
  });

  describe('authenticated state - unified MainNavigator', () => {
    it('should render MainNavigator for satgas role', () => {
      const store = createTestStore({
        auth: {
          user: {
            id: '1',
            username: 'satgas1',
            full_name: 'Test Satgas',
            role: 'satgas',
          },
          assignedArea: null,
          isAuthenticated: true,
          isLoading: false,
          error: null,
        },
      });

      render(
        <Provider store={store}>
          <RootNavigator />
        </Provider>
      );

      expect(screen.getByTestId('main-navigator')).toBeTruthy();
    });

    it('should render MainNavigator for linmas role', () => {
      const store = createTestStore({
        auth: {
          user: {
            id: '4',
            username: 'linmas1',
            full_name: 'Test Linmas',
            role: 'linmas',
          },
          assignedArea: null,
          isAuthenticated: true,
          isLoading: false,
          error: null,
        },
      });

      render(
        <Provider store={store}>
          <RootNavigator />
        </Provider>
      );

      expect(screen.getByTestId('main-navigator')).toBeTruthy();
    });

    it('should render MainNavigator for korlap role', () => {
      const store = createTestStore({
        auth: {
          user: {
            id: '2',
            username: 'korlap1',
            full_name: 'Test Korlap',
            role: 'korlap',
          },
          assignedArea: null,
          isAuthenticated: true,
          isLoading: false,
          error: null,
        },
      });

      render(
        <Provider store={store}>
          <RootNavigator />
        </Provider>
      );

      expect(screen.getByTestId('main-navigator')).toBeTruthy();
    });

    it('should render MainNavigator for admin_data role', () => {
      const store = createTestStore({
        auth: {
          user: {
            id: '8',
            username: 'admin_data1',
            full_name: 'Test Admin Data',
            role: 'admin_data',
          },
          assignedArea: null,
          isAuthenticated: true,
          isLoading: false,
          error: null,
        },
      });

      render(
        <Provider store={store}>
          <RootNavigator />
        </Provider>
      );

      expect(screen.getByTestId('main-navigator')).toBeTruthy();
    });

    it('should render MainNavigator for kepala_rayon role', () => {
      const store = createTestStore({
        auth: {
          user: {
            id: '5',
            username: 'kepala_rayon1',
            full_name: 'Test Kepala Rayon',
            role: 'kepala_rayon',
          },
          assignedArea: null,
          isAuthenticated: true,
          isLoading: false,
          error: null,
        },
      });

      render(
        <Provider store={store}>
          <RootNavigator />
        </Provider>
      );

      expect(screen.getByTestId('main-navigator')).toBeTruthy();
    });

    it('should render MainNavigator for top_management role', () => {
      const store = createTestStore({
        auth: {
          user: {
            id: '7',
            username: 'topmanager1',
            full_name: 'Test Top Management',
            role: 'top_management',
          },
          assignedArea: null,
          isAuthenticated: true,
          isLoading: false,
          error: null,
        },
      });

      render(
        <Provider store={store}>
          <RootNavigator />
        </Provider>
      );

      expect(screen.getByTestId('main-navigator')).toBeTruthy();
    });

    it('should render MainNavigator for admin_system role', () => {
      const store = createTestStore({
        auth: {
          user: {
            id: '9',
            username: 'admin_system1',
            full_name: 'Test Admin System',
            role: 'admin_system',
          },
          assignedArea: null,
          isAuthenticated: true,
          isLoading: false,
          error: null,
        },
      });

      render(
        <Provider store={store}>
          <RootNavigator />
        </Provider>
      );

      expect(screen.getByTestId('main-navigator')).toBeTruthy();
    });

    it('should render MainNavigator for superadmin role', () => {
      const store = createTestStore({
        auth: {
          user: {
            id: '10',
            username: 'superadmin',
            full_name: 'Test Superadmin',
            role: 'superadmin',
          },
          assignedArea: null,
          isAuthenticated: true,
          isLoading: false,
          error: null,
        },
      });

      render(
        <Provider store={store}>
          <RootNavigator />
        </Provider>
      );

      expect(screen.getByTestId('main-navigator')).toBeTruthy();
    });
  });

  describe('forced password change precedence', () => {
    it('renders ChangePassword before onboarding when password_must_change is set', () => {
      const store = createTestStore({
        auth: {
          user: {
            id: 'reset-1',
            username: 'resettest',
            full_name: 'Reset Test',
            role: 'satgas',
            password_must_change: true,
          },
          assignedArea: null,
          isAuthenticated: true,
          isLoading: false,
          error: null,
        },
      });

      render(
        <Provider store={store}>
          <RootNavigator />
        </Provider>
      );

      // Forced change wins over the onboarding gate.
      expect(screen.getByTestId('change-password-screen')).toBeTruthy();
      expect(screen.queryByTestId('onboarding-navigator')).toBeNull();
      expect(screen.queryByTestId('main-navigator')).toBeNull();
    });
  });
});
