/**
 * FieldHomeHeader Component Tests
 */

import React from 'react';
import { render } from '@testing-library/react-native';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { FieldHomeHeader } from '../FieldHomeHeader';
import type { UserRole } from '../../../types/models.types';
import authReducer from '../../../store/slices/authSlice';
import offlineReducer from '../../../store/slices/offlineSlice';

// Mock NBBadge component
jest.mock('../../nb', () => ({
  NBBadge: ({ text, testID }: any) => {
    const { Text } = require('react-native');
    return <Text testID={testID}>{text}</Text>;
  },
}));

describe('FieldHomeHeader', () => {
  const createMockStore = (
    role: UserRole = 'satgas',
    fullName: string = 'Ahmad Satgas',
    isOnline: boolean = true,
    isSyncing: boolean = false,
    pendingCount: number = 0
  ) => {
    return configureStore({
      reducer: {
        auth: authReducer,
        offline: offlineReducer,
      },
      preloadedState: {
        auth: {
          user: {
            id: 'user1',
            username: 'ahmad',
            full_name: fullName,
            email: 'ahmad@test.com',
            role,
            created_at: new Date('2026-01-01T00:00:00Z'),
            updated_at: new Date('2026-01-01T00:00:00Z'),
          },
          assignedArea: null,
          token: 'mock-token',
          isAuthenticated: true,
          loading: false,
          error: null,
        },
        offline: {
          isOnline,
          isSyncing,
          queue: [],
          pendingShiftsCount: pendingCount,
          pendingReportsCount: 0,
          pendingMediaCount: 0,
          pendingLocationsCount: 0,
          lastSyncTime: null,
          syncError: null,
        },
      },
    });
  };

  describe('Rendering', () => {
    it('should render header component', () => {
      const store = createMockStore();
      const { getByText } = render(
        <Provider store={store}>
          <FieldHomeHeader />
        </Provider>
      );

      expect(getByText('Halo, Ahmad Satgas!')).toBeTruthy();
    });

    it('should display user full name in greeting', () => {
      const store = createMockStore('satgas', 'Budi Pekerja');
      const { getByText } = render(
        <Provider store={store}>
          <FieldHomeHeader />
        </Provider>
      );

      expect(getByText('Halo, Budi Pekerja!')).toBeTruthy();
    });

    it('should render leaf icon', () => {
      const store = createMockStore();
      const { UNSAFE_getByType } = render(
        <Provider store={store}>
          <FieldHomeHeader />
        </Provider>
      );

      const MaterialCommunityIcons = require('react-native-vector-icons/MaterialCommunityIcons').default;
      const icons = UNSAFE_getByType(MaterialCommunityIcons);
      expect(icons).toBeTruthy();
    });
  });

  describe('Role Badge Display', () => {
    it('should display Satgas role badge', () => {
      const store = createMockStore('satgas');
      const { getByText } = render(
        <Provider store={store}>
          <FieldHomeHeader />
        </Provider>
      );

      expect(getByText('Satgas')).toBeTruthy();
    });

    it('should display Linmas role badge', () => {
      const store = createMockStore('linmas', 'Siti Linmas');
      const { getByText } = render(
        <Provider store={store}>
          <FieldHomeHeader />
        </Provider>
      );

      expect(getByText('Linmas')).toBeTruthy();
    });

    it('should display Korlap role badge', () => {
      const store = createMockStore('korlap', 'Joko Korlap');
      const { getByText } = render(
        <Provider store={store}>
          <FieldHomeHeader />
        </Provider>
      );

      expect(getByText('Korlap')).toBeTruthy();
    });

    it('should display Admin Data role badge', () => {
      const store = createMockStore('admin_data', 'Rina Admin');
      const { getByText } = render(
        <Provider store={store}>
          <FieldHomeHeader />
        </Provider>
      );

      expect(getByText('Admin Data')).toBeTruthy();
    });

    it('should display Kepala Rayon role badge', () => {
      const store = createMockStore('kepala_rayon', 'Pak Rayon');
      const { getByText } = render(
        <Provider store={store}>
          <FieldHomeHeader />
        </Provider>
      );

      expect(getByText('Kepala Rayon')).toBeTruthy();
    });

    it('should display Top Management role badge', () => {
      const store = createMockStore('top_management', 'Bu Kepala');
      const { getByText } = render(
        <Provider store={store}>
          <FieldHomeHeader />
        </Provider>
      );

      expect(getByText('Top Management')).toBeTruthy();
    });

    it('should display Admin Sistem role badge', () => {
      const store = createMockStore('admin_system', 'Admin Sys');
      const { getByText } = render(
        <Provider store={store}>
          <FieldHomeHeader />
        </Provider>
      );

      expect(getByText('Admin Sistem')).toBeTruthy();
    });

    it('should display Superadmin role badge', () => {
      const store = createMockStore('superadmin', 'Super User');
      const { getByText } = render(
        <Provider store={store}>
          <FieldHomeHeader />
        </Provider>
      );

      expect(getByText('Superadmin')).toBeTruthy();
    });

    it('should display default User label when role is undefined', () => {
      const store = configureStore({
        reducer: {
          auth: authReducer,
          offline: offlineReducer,
        },
        preloadedState: {
          auth: {
            user: {
              id: 'user1',
              username: 'noRole',
              full_name: 'No Role User',
              email: 'norole@test.com',
              role: undefined,
              created_at: new Date('2026-01-01T00:00:00Z'),
              updated_at: new Date('2026-01-01T00:00:00Z'),
            },
            assignedArea: null,
            token: 'mock-token',
            isAuthenticated: true,
            loading: false,
            error: null,
          },
          offline: {
            isOnline: true,
            isSyncing: false,
            pendingQueue: [],
            lastSyncTime: null,
          },
        },
      });

      const { getByText } = render(
        <Provider store={store}>
          <FieldHomeHeader />
        </Provider>
      );

      expect(getByText('User')).toBeTruthy();
    });
  });

  describe('Online Status Badge', () => {
    it('should show Online badge when online', () => {
      const store = createMockStore('satgas', 'Ahmad', true, false, 0);
      const { getByText } = render(
        <Provider store={store}>
          <FieldHomeHeader />
        </Provider>
      );

      expect(getByText('Online')).toBeTruthy();
    });

    it('should show Offline badge when offline', () => {
      const store = createMockStore('satgas', 'Ahmad', false, false, 0);
      const { getByText } = render(
        <Provider store={store}>
          <FieldHomeHeader />
        </Provider>
      );

      expect(getByText('Offline')).toBeTruthy();
    });
  });

  describe('Syncing Status Badge', () => {
    it('should show Syncing badge when syncing', () => {
      const store = createMockStore('satgas', 'Ahmad', true, true, 0);
      const { getByText } = render(
        <Provider store={store}>
          <FieldHomeHeader />
        </Provider>
      );

      expect(getByText('Syncing')).toBeTruthy();
    });

    it('should prioritize syncing over online status', () => {
      const store = createMockStore('satgas', 'Ahmad', true, true, 0);
      const { getByText, queryByText } = render(
        <Provider store={store}>
          <FieldHomeHeader />
        </Provider>
      );

      expect(getByText('Syncing')).toBeTruthy();
      expect(queryByText('Online')).toBeNull();
    });
  });

  describe('Pending Queue Badge', () => {
    it('should show pending count when items in queue', () => {
      const store = createMockStore('satgas', 'Ahmad', true, false, 3);
      const { getByText } = render(
        <Provider store={store}>
          <FieldHomeHeader />
        </Provider>
      );

      expect(getByText('3')).toBeTruthy();
    });

    it('should show pending count when not syncing', () => {
      const store = createMockStore('satgas', 'Ahmad', true, false, 5);
      const { getByText, queryByText } = render(
        <Provider store={store}>
          <FieldHomeHeader />
        </Provider>
      );

      expect(getByText('5')).toBeTruthy();
      expect(queryByText('Online')).toBeNull();
    });

    it('should prioritize pending over online status', () => {
      const store = createMockStore('satgas', 'Ahmad', true, false, 2);
      const { getByText, queryByText } = render(
        <Provider store={store}>
          <FieldHomeHeader />
        </Provider>
      );

      expect(getByText('2')).toBeTruthy();
      expect(queryByText('Online')).toBeNull();
    });
  });

  describe('Status Priority Order', () => {
    it('should show syncing over pending and online', () => {
      const store = createMockStore('satgas', 'Ahmad', true, true, 10);
      const { getByText, queryByText } = render(
        <Provider store={store}>
          <FieldHomeHeader />
        </Provider>
      );

      expect(getByText('Syncing')).toBeTruthy();
      expect(queryByText('10')).toBeNull();
      expect(queryByText('Online')).toBeNull();
    });

    it('should show syncing over online when no pending', () => {
      const store = createMockStore('satgas', 'Ahmad', true, true, 0);
      const { getByText, queryByText } = render(
        <Provider store={store}>
          <FieldHomeHeader />
        </Provider>
      );

      expect(getByText('Syncing')).toBeTruthy();
      expect(queryByText('Online')).toBeNull();
    });

    it('should show online when not syncing and no pending', () => {
      const store = createMockStore('satgas', 'Ahmad', true, false, 0);
      const { getByText } = render(
        <Provider store={store}>
          <FieldHomeHeader />
        </Provider>
      );

      expect(getByText('Online')).toBeTruthy();
    });
  });

  describe('Edge Cases', () => {
    it('should handle null user gracefully', () => {
      const store = configureStore({
        reducer: {
          auth: authReducer,
          offline: offlineReducer,
        },
        preloadedState: {
          auth: {
            user: null,
            assignedArea: null,
            token: null,
            isAuthenticated: false,
            loading: false,
            error: null,
          },
          offline: {
            isOnline: true,
            isSyncing: false,
            pendingQueue: [],
            lastSyncTime: null,
          },
        },
      });

      const { queryByText } = render(
        <Provider store={store}>
          <FieldHomeHeader />
        </Provider>
      );

      expect(queryByText(/Halo,/)).toBeTruthy();
    });

    it('should handle very long names with ellipsis', () => {
      const store = createMockStore('satgas', 'Ahmad Budi Santoso Wijaya Kusuma Permana');
      const { getByText } = render(
        <Provider store={store}>
          <FieldHomeHeader />
        </Provider>
      );

      const greetingElement = getByText(/Halo,/);
      expect(greetingElement.props.numberOfLines).toBe(1);
      expect(greetingElement.props.ellipsizeMode).toBe('tail');
    });

    it('should handle zero pending count', () => {
      const store = createMockStore('satgas', 'Ahmad', true, false, 0);
      const { queryByText, getByText } = render(
        <Provider store={store}>
          <FieldHomeHeader />
        </Provider>
      );

      expect(getByText('Online')).toBeTruthy();
      expect(queryByText('0')).toBeNull();
    });

    it('should handle large pending count', () => {
      const store = createMockStore('satgas', 'Ahmad', true, false, 100);
      const { getByText } = render(
        <Provider store={store}>
          <FieldHomeHeader />
        </Provider>
      );

      expect(getByText('100')).toBeTruthy();
    });
  });

  describe('Layout and Styling', () => {
    it('should render icon container with leaf icon', () => {
      const store = createMockStore();
      const { UNSAFE_getByType } = render(
        <Provider store={store}>
          <FieldHomeHeader />
        </Provider>
      );

      const MaterialCommunityIcons = require('react-native-vector-icons/MaterialCommunityIcons').default;
      const icon = UNSAFE_getByType(MaterialCommunityIcons);
      expect(icon.props.name).toBe('leaf');
      expect(icon.props.size).toBe(24);
    });
  });

  describe('Accessibility', () => {
    it('should truncate long names for screen readers', () => {
      const store = createMockStore('satgas', 'Very Long Name That Should Be Truncated');
      const { getByText } = render(
        <Provider store={store}>
          <FieldHomeHeader />
        </Provider>
      );

      const greeting = getByText(/Halo,/);
      expect(greeting.props.ellipsizeMode).toBe('tail');
      expect(greeting.props.numberOfLines).toBe(1);
    });
  });
});
