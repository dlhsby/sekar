/**
 * FieldHomeHeader Component Tests
 *
 * Phase 4 M3 (Home revamp): the leaf icon became a role-colored avatar (initials)
 * and the "Halo, {name}!" greeting became a mono ROLE LABEL above the display name.
 * The online/sync/pending status chip is retained.
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { FieldHomeHeader } from '../FieldHomeHeader';
import type { Location, User, UserRole } from '../../../types/models.types';
import authReducer from '../../../store/slices/authSlice';
import offlineReducer from '../../../store/slices/offlineSlice';

// `FieldHomeHeader` embeds `NotificationBell`, which calls `useNavigation()` and
// reads the `notifications` slice. The tests render the header bare (no
// NavigationContainer, no notifications reducer); stub the bell to a noop so the
// assertions stay focused on header content.
jest.mock('../NotificationBell', () => ({
  NotificationBell: () => null,
}));

// `FieldHomeHeader` now calls `useNavigation()` directly for avatar tap-to-profile.
// Stub it so tests can render without a NavigationContainer.
jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({ navigate: jest.fn() }),
}));

describe('FieldHomeHeader', () => {
  const createMockStore = (
    role: UserRole = 'satgas',
    fullName: string = 'Ahmad Satgas',
    isOnline: boolean = true,
    isSyncing: boolean = false,
    pendingCount: number = 0,
    assignedArea: Location | null = null
  ) => {
    return configureStore({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- test fixture type inference mismatch
      reducer: {
        auth: authReducer as any,
        offline: offlineReducer as any,
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
          assignedArea,
          token: 'mock-token',
          isAuthenticated: true,
          loading: false,
          error: null,
        } as any,
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
    it('should render the display name (no "Halo," prefix)', () => {
      const store = createMockStore();
      const { getByText, queryByText } = render(
        <Provider store={store}>
          <FieldHomeHeader />
        </Provider>
      );

      expect(getByText('Ahmad Satgas')).toBeTruthy();
      expect(queryByText(/Halo,/)).toBeNull();
    });

    it('should display user full name', () => {
      const store = createMockStore('satgas', 'Budi Pekerja');
      const { getByText } = render(
        <Provider store={store}>
          <FieldHomeHeader />
        </Provider>
      );

      expect(getByText('Budi Pekerja')).toBeTruthy();
    });

    it('should render the role avatar with initials', () => {
      const store = createMockStore('satgas', 'Budi Santoso');
      const { getByText } = render(
        <Provider store={store}>
          <FieldHomeHeader />
        </Provider>
      );

      expect(getByText('BS', { includeHiddenElements: true })).toBeTruthy();
    });

    it('should render the profile photo (not initials) when profile_picture_url is set', () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- test fixture type inference mismatch
      const store = configureStore({
        reducer: { auth: authReducer as any, offline: offlineReducer as any },
        preloadedState: {
          auth: {
            user: {
              id: 'user1',
              username: 'budi',
              full_name: 'Budi Santoso',
              email: 'budi@test.com',
              role: 'satgas',
              profile_picture_url: 'https://cdn.example.com/budi.jpg',
              created_at: new Date('2026-01-01T00:00:00Z'),
              updated_at: new Date('2026-01-01T00:00:00Z'),
            },
            assignedArea: null,
            token: 'mock-token',
            isAuthenticated: true,
            loading: false,
            error: null,
          } as any,
          offline: {
            isOnline: true,
            isSyncing: false,
            queue: [],
            pendingShiftsCount: 0,
            pendingReportsCount: 0,
            pendingMediaCount: 0,
            pendingLocationsCount: 0,
            lastSyncTime: null,
            syncError: null,
          },
        } as any,
      } as any);
      const { UNSAFE_getAllByType, queryByText } = render(
        <Provider store={store}>
          <FieldHomeHeader />
        </Provider>
      );

      const { Image } = require('react-native');
      const images = UNSAFE_getAllByType(Image);
      expect(images.some((img: any) => img.props.source?.uri === 'https://cdn.example.com/budi.jpg')).toBe(true);
      // Initials are not rendered when a photo is present.
      expect(queryByText('BS', { includeHiddenElements: true })).toBeNull();
    });
  });

  describe('Role Label Display', () => {
    it('should display Satgas role label', () => {
      const store = createMockStore('satgas');
      const { getByText } = render(
        <Provider store={store}>
          <FieldHomeHeader />
        </Provider>
      );

      expect(getByText('Satgas')).toBeTruthy();
    });

    it('should display Linmas role label', () => {
      const store = createMockStore('linmas', 'Siti Linmas');
      const { getByText } = render(
        <Provider store={store}>
          <FieldHomeHeader />
        </Provider>
      );

      expect(getByText('Linmas')).toBeTruthy();
    });

    it('should display Korlap role label', () => {
      const store = createMockStore('korlap', 'Joko Korlap');
      const { getByText } = render(
        <Provider store={store}>
          <FieldHomeHeader />
        </Provider>
      );

      expect(getByText('Korlap')).toBeTruthy();
    });

    it('should display Admin Data role label', () => {
      const store = createMockStore('admin_data', 'Rina Admin');
      const { getByText } = render(
        <Provider store={store}>
          <FieldHomeHeader />
        </Provider>
      );

      expect(getByText('Admin Data')).toBeTruthy();
    });

    it('should display Kepala Rayon role label', () => {
      const store = createMockStore('kepala_rayon', 'Pak Rayon');
      const { getByText } = render(
        <Provider store={store}>
          <FieldHomeHeader />
        </Provider>
      );

      expect(getByText('Kepala Rayon')).toBeTruthy();
    });

    it('should display Top Management role label', () => {
      const store = createMockStore('top_management', 'Bu Kepala');
      const { getByText } = render(
        <Provider store={store}>
          <FieldHomeHeader />
        </Provider>
      );

      expect(getByText('Top Management')).toBeTruthy();
    });

    it('should display Admin Sistem role label', () => {
      const store = createMockStore('admin_system', 'Admin Sys');
      const { getByText } = render(
        <Provider store={store}>
          <FieldHomeHeader />
        </Provider>
      );

      expect(getByText('Admin Sistem')).toBeTruthy();
    });

    it('should display Superadmin role label', () => {
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
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- test fixture type inference mismatch
        reducer: {
          auth: authReducer as any,
          offline: offlineReducer as any,
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
          } as any,
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

      expect(getByText('Pengguna')).toBeTruthy();
    });

    it('should append the assigned area to the role label when present', () => {
      const area = {
        id: '1',
        name: 'Taman Bungkul',
        location_type_id: 'type1',
        gps_lat: -7.25,
        gps_lng: 112.75,
        radius_meters: 100,
        created_at: '2026-01-01T00:00:00Z',
        updated_at: '2026-01-01T00:00:00Z',
      } as Location;
      const store = createMockStore('korlap', 'Ibu Marni', true, false, 0, area);

      const { getByText } = render(
        <Provider store={store}>
          <FieldHomeHeader />
        </Provider>
      );

      expect(getByText('Korlap · Taman Bungkul')).toBeTruthy();
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
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- test fixture type inference mismatch
        reducer: {
          auth: authReducer as any,
          offline: offlineReducer as any,
        },
        preloadedState: {
          auth: {
            user: null,
            assignedArea: null,
            token: null,
            isAuthenticated: false,
            loading: false,
            error: null,
          } as any,
          offline: {
            isOnline: true,
            isSyncing: false,
            pendingQueue: [],
            lastSyncTime: null,
          },
        },
      });

      const { getByText, queryAllByText } = render(
        <Provider store={store}>
          <FieldHomeHeader />
        </Provider>
      );

      // Falls back to "Pengguna" name + "Pengguna" role label, avatar "?"
      const pengguna = queryAllByText('Pengguna');
      expect(pengguna.length).toBeGreaterThan(0);
    });

    it('should handle very long names with ellipsis', () => {
      const longName = 'Ahmad Budi Santoso Wijaya Kusuma Permana';
      const store = createMockStore('satgas', longName);
      const { getByText } = render(
        <Provider store={store}>
          <FieldHomeHeader />
        </Provider>
      );

      const nameEl = getByText(longName);
      expect(nameEl.props.numberOfLines).toBe(1);
      expect(nameEl.props.ellipsizeMode).toBe('tail');
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
    it('should render the avatar with initials (no leaf icon)', () => {
      const store = createMockStore('satgas', 'Ahmad Satgas');
      const { getByText, UNSAFE_queryAllByType } = render(
        <Provider store={store}>
          <FieldHomeHeader />
        </Provider>
      );

      expect(getByText('AS', { includeHiddenElements: true })).toBeTruthy();
      // No MaterialCommunityIcons on main-screen header (avatar is text; bell stubbed)
      const MaterialCommunityIcons = require('react-native-vector-icons/MaterialCommunityIcons').default;
      expect(UNSAFE_queryAllByType(MaterialCommunityIcons).length).toBe(0);
    });
  });

  describe('Accessibility', () => {
    it('should truncate long names for screen readers', () => {
      const longName = 'Very Long Name That Should Be Truncated';
      const store = createMockStore('satgas', longName);
      const { getByText } = render(
        <Provider store={store}>
          <FieldHomeHeader />
        </Provider>
      );

      const nameEl = getByText(longName);
      expect(nameEl.props.ellipsizeMode).toBe('tail');
      expect(nameEl.props.numberOfLines).toBe(1);
    });
  });

  describe('Sub-screen mode (title prop)', () => {
    it('should show page title instead of name when title is provided', () => {
      const store = createMockStore();
      const { getByText, queryByText } = render(
        <Provider store={store}>
          <FieldHomeHeader title="Detail Tugas" />
        </Provider>
      );

      expect(getByText('Detail Tugas')).toBeTruthy();
      expect(queryByText('Ahmad Satgas')).toBeNull();
    });

    it('should NOT show role label when title is provided', () => {
      const store = createMockStore('satgas');
      const { queryByText } = render(
        <Provider store={store}>
          <FieldHomeHeader title="Clock In" />
        </Provider>
      );

      expect(queryByText('Satgas')).toBeNull();
    });

    it('should still show online status in sub-screen mode', () => {
      const store = createMockStore('satgas', 'Ahmad', true);
      const { getByText } = render(
        <Provider store={store}>
          <FieldHomeHeader title="Riwayat Shift" />
        </Provider>
      );

      expect(getByText('Online')).toBeTruthy();
    });

    it('should truncate long page titles with ellipsis', () => {
      const store = createMockStore();
      const { getByText } = render(
        <Provider store={store}>
          <FieldHomeHeader title="Judul Halaman Yang Sangat Panjang Sekali" />
        </Provider>
      );

      const titleEl = getByText('Judul Halaman Yang Sangat Panjang Sekali');
      expect(titleEl.props.numberOfLines).toBe(1);
      expect(titleEl.props.ellipsizeMode).toBe('tail');
    });
  });

  describe('Back button (onBack prop)', () => {
    it('should show back button when onBack is provided', () => {
      const store = createMockStore();
      const { getByLabelText } = render(
        <Provider store={store}>
          <FieldHomeHeader title="Detail Aktivitas" onBack={() => {}} />
        </Provider>
      );

      expect(getByLabelText('Kembali')).toBeTruthy();
    });

    it('should call onBack when back button is pressed', () => {
      const store = createMockStore();
      const onBack = jest.fn();
      const { getByLabelText } = render(
        <Provider store={store}>
          <FieldHomeHeader title="Clock In" onBack={onBack} />
        </Provider>
      );

      fireEvent.press(getByLabelText('Kembali'));
      expect(onBack).toHaveBeenCalledTimes(1);
    });

    it('should show role avatar (not back button) when used as main screen header', () => {
      const store = createMockStore('satgas', 'Ahmad Satgas');
      const { queryByLabelText, getByText, UNSAFE_queryAllByType } = render(
        <Provider store={store}>
          <FieldHomeHeader />
        </Provider>
      );

      expect(queryByLabelText('Kembali')).toBeNull();
      expect(getByText('AS', { includeHiddenElements: true })).toBeTruthy();
      const MaterialCommunityIcons = require('react-native-vector-icons/MaterialCommunityIcons').default;
      expect(UNSAFE_queryAllByType(MaterialCommunityIcons).length).toBe(0);
    });

    it('should show role avatar (not back button) when title is provided without onBack', () => {
      const store = createMockStore('satgas', 'Ahmad Satgas');
      const { queryByLabelText, getByText, UNSAFE_queryAllByType } = render(
        <Provider store={store}>
          <FieldHomeHeader title="Detail Tugas" />
        </Provider>
      );

      expect(queryByLabelText('Kembali')).toBeNull();
      expect(getByText('AS', { includeHiddenElements: true })).toBeTruthy();
      const MaterialCommunityIcons = require('react-native-vector-icons/MaterialCommunityIcons').default;
      expect(UNSAFE_queryAllByType(MaterialCommunityIcons).length).toBe(0);
    });

    it('should show arrow-left icon when onBack is provided', () => {
      const store = createMockStore();
      const { UNSAFE_getAllByType } = render(
        <Provider store={store}>
          <FieldHomeHeader title="Detail" onBack={() => {}} />
        </Provider>
      );

      const MaterialCommunityIcons = require('react-native-vector-icons/MaterialCommunityIcons').default;
      const icons = UNSAFE_getAllByType(MaterialCommunityIcons);
      const backIcon = icons.find((el: any) => el.props.name === 'arrow-left');
      expect(backIcon).toBeTruthy();
    });
  });

  describe('Avatar tap-to-profile', () => {
    it('should navigate to Profile when avatar is tapped on main screen header', () => {
      const mockNavigate = jest.fn();
      // Override the module-level mock to capture navigate calls.
      jest.spyOn(require('@react-navigation/native'), 'useNavigation')
        .mockReturnValue({ navigate: mockNavigate });

      const store = createMockStore('satgas', 'Ahmad Satgas');
      const { getByLabelText } = render(
        <Provider store={store}>
          <FieldHomeHeader />
        </Provider>
      );

      fireEvent.press(getByLabelText('Buka Profil'));
      expect(mockNavigate).toHaveBeenCalledWith('Profile');
    });

    it('should not show the profile tap target when onBack is provided', () => {
      const store = createMockStore('satgas', 'Ahmad Satgas');
      const { queryByLabelText } = render(
        <Provider store={store}>
          <FieldHomeHeader title="Detail Tugas" onBack={() => {}} />
        </Provider>
      );

      expect(queryByLabelText('Buka Profil')).toBeNull();
      expect(queryByLabelText('Kembali')).toBeTruthy();
    });
  });
});
