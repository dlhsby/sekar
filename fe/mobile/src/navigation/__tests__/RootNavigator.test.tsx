/**
 * RootNavigator Tests
 * Unit tests for root navigation based on auth state
 */

import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import RootNavigator from '../RootNavigator';
import authReducer from '../../store/slices/authSlice';
import shiftReducer from '../../store/slices/shiftSlice';
import reportReducer from '../../store/slices/reportSlice';
import offlineReducer from '../../store/slices/offlineSlice';

// Mock all screens
jest.mock('../../screens/auth/LoginScreen', () => {
  const { Text } = require('react-native');
  return function MockLoginScreen() {
    return <Text testID="login-screen">Login Screen</Text>;
  };
});

jest.mock('../WorkerNavigator', () => {
  const { Text } = require('react-native');
  return function MockWorkerNavigator() {
    return <Text testID="worker-navigator">Worker Navigator</Text>;
  };
});

jest.mock('../SupervisorNavigator', () => {
  const { Text } = require('react-native');
  return function MockSupervisorNavigator() {
    return <Text testID="supervisor-navigator">Supervisor Navigator</Text>;
  };
});

// Helper to create store with preloaded state
function createTestStore(preloadedState?: any) {
  return configureStore({
    reducer: {
      auth: authReducer,
      shift: shiftReducer,
      report: reportReducer,
      offline: offlineReducer,
    },
    preloadedState,
  });
}

describe('RootNavigator', () => {
  describe('unauthenticated state', () => {
    it('should render Login screen when not authenticated', () => {
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

      expect(screen.getByTestId('login-screen')).toBeTruthy();
    });

    it('should render Login screen when user is null', () => {
      const store = createTestStore({
        auth: {
          user: null,
          assignedArea: null,
          isAuthenticated: true, // Even if authenticated, no user means login
          isLoading: false,
          error: null,
        },
      });

      render(
        <Provider store={store}>
          <RootNavigator />
        </Provider>
      );

      expect(screen.getByTestId('login-screen')).toBeTruthy();
    });
  });

  describe('worker authentication', () => {
    it('should render WorkerNavigator for worker role', () => {
      const store = createTestStore({
        auth: {
          user: {
            id: 1,
            username: 'worker1',
            full_name: 'Test Worker',
            role: 'worker',
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

      expect(screen.getByTestId('worker-navigator')).toBeTruthy();
    });
  });

  describe('supervisor authentication', () => {
    it('should render SupervisorNavigator for supervisor role', () => {
      const store = createTestStore({
        auth: {
          user: {
            id: 2,
            username: 'supervisor1',
            full_name: 'Test Supervisor',
            role: 'supervisor',
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

      expect(screen.getByTestId('supervisor-navigator')).toBeTruthy();
    });

    it('should render SupervisorNavigator for admin role', () => {
      const store = createTestStore({
        auth: {
          user: {
            id: 3,
            username: 'admin',
            full_name: 'Test Admin',
            role: 'admin',
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

      // Admin should also go to supervisor navigator (not worker)
      expect(screen.getByTestId('supervisor-navigator')).toBeTruthy();
    });
  });
});
