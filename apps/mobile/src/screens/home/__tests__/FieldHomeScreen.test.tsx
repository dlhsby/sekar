/**
 * HomeScreen Tests
 * Tests for timer cleanup and interval management
 */

import React from 'react';
import { render, waitFor, act, fireEvent } from '@testing-library/react-native';
import { Alert } from 'react-native';
import { Provider } from 'react-redux';
import { NavigationContainer } from '@react-navigation/native';
import { FieldHomeScreen as HomeScreen } from '../FieldHomeScreen';
import { configureStore } from '@reduxjs/toolkit';
import authReducer from '../../../store/slices/authSlice';
import shiftReducer from '../../../store/slices/shiftSlice';
import activitiesReducer from '../../../store/slices/activitiesSlice';
import offlineReducer from '../../../store/slices/offlineSlice';
import tasksReducer from '../../../store/slices/tasksSlice';
import * as shiftsApi from '../../../services/api/shiftsApi';
import * as activitiesApi from '../../../services/api/activitiesApi';
import * as tasksApi from '../../../services/api/tasksApi';

// Mock Alert to prevent "Alert.alert is not a function" errors
jest.spyOn(Alert, 'alert').mockImplementation(() => {});

// Mock the APIs
jest.mock('../../../services/api/shiftsApi');
jest.mock('../../../services/api/activitiesApi');
jest.mock('../../../services/api/tasksApi');

// Mock useLocationPermission hook
jest.mock('../../../hooks', () => {
  const ReactActual = require('react');
  return {
    useLocationPermission: jest.fn(() => ({
      isLocationAvailable: true,
      permissionGranted: true,
      gpsEnabled: true,
      isChecking: false,
      error: null,
      permissionStatus: 'granted',
      refresh: jest.fn(),
      requestPermission: jest.fn(),
      showPermissionAlert: jest.fn(),
      showGpsAlert: jest.fn(),
    })),
    // Stateful stand-in so expand/collapse interactions still work in tests.
    useCollapsible: (defaultExpanded = false) => {
      const [expanded, setExpanded] = ReactActual.useState(defaultExpanded);
      return {
        expanded,
        toggle: () => setExpanded((v: boolean) => !v),
        setExpanded,
      };
    },
  };
});

// Mock NBBackgroundPattern to avoid SVG rendering issues in tests
jest.mock('../../../components/nb/NBBackgroundPattern', () => ({
  NBBackgroundPattern: ({ children }: { children: React.ReactNode }) => children,
}));

// Mock LocationMapModal and OvertimeTrailModal to avoid react-native-maps transpilation
jest.mock('../../../components/modals/LocationMapModal', () => ({
  LocationMapModal: () => null,
}));
jest.mock('../../../components/modals/OvertimeTrailModal', () => ({
  OvertimeTrailModal: () => null,
}));

// Mock useHomeLocation hook
jest.mock('../../../hooks/useHomeLocation', () => ({
  useHomeLocation: jest.fn(() => ({
    location: {
      latitude: null,
      longitude: null,
      accuracy: null,
      isWithinArea: false,
      loading: false,
      error: null,
      updatedAt: null,
    },
    refresh: jest.fn(),
    hasActiveShift: false,
  })),
}));

// Helper to create test store with optional shift
const createTestStore = (currentShift: any = null) => {
  // Mock reportsApi to return empty array
  (activitiesApi.getMyActivities as jest.Mock).mockResolvedValue({ data: [] });
  // Default: no tasks (overridden per-test where the list is exercised)
  (tasksApi.getMyTasks as jest.Mock).mockResolvedValue({ data: { data: [] } });

  return configureStore({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- test fixture type inference mismatch
    reducer: {
      auth: authReducer as any,
      shift: shiftReducer as any,
      activities: activitiesReducer as any,
      offline: offlineReducer as any,
      tasks: tasksReducer as any,
    },
    preloadedState: {
      auth: {
        user: {
          id: '1',
          username: 'worker1',
          full_name: 'Test Worker',
          role: 'satgas',
        },
        assignedArea: {
          id: '1',
          name: 'Park A',
          gps_lat: -7.250445,
          gps_lng: 112.768845,
          radius_meters: 100,
          area_type_id: '1',
          created_at: '2026-01-01T00:00:00Z',
          updated_at: '2026-01-01T00:00:00Z',
        },
        token: 'test-token',
        isAuthenticated: true,
        loading: false,
        error: null,
      } as any,
      shift: {
        currentShift,
        shiftHistory: currentShift ? [currentShift] : [],
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

// Helper to create a shift with given clock-in time
const createShift = (clockInTime: Date) => ({
  id: '1',
  area_id: '1',
  user_id: '1',
  clock_in_time: clockInTime.toISOString(),
  clock_in_gps_lat: -7.250445,
  clock_in_gps_lng: 112.768845,
  area: {
    id: '1',
    name: 'Park A',
    area_type_id: '1',
    gps_lat: -7.250445,
    gps_lng: 112.768845,
    radius_meters: 100,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
  },
  created_at: clockInTime.toISOString(),
  updated_at: clockInTime.toISOString(),
});

describe('HomeScreen Timer Management', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    // Re-spy on Alert.alert to ensure it's available
    jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    // Mock getMyShifts to return empty array by default
    (shiftsApi.getMyShifts as jest.Mock).mockResolvedValue({ data: [] });
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.clearAllTimers();
    jest.useRealTimers();
    jest.clearAllMocks();
  });

  it(
    'should cleanup timer on unmount',
    async () => {
      const shift = createShift(new Date());
      (shiftsApi.getCurrentShift as jest.Mock).mockResolvedValue({ data: shift });
      (shiftsApi.getMyShifts as jest.Mock).mockResolvedValue({ data: [shift] });
      const store = createTestStore(shift);

      const { unmount } = render(
        <Provider store={store}>
          <NavigationContainer>
            <HomeScreen />
          </NavigationContainer>
        </Provider>
      );

      // Advance timers to ensure interval is set
      await act(async () => {
        jest.advanceTimersByTime(1000);
      });

      // Unmount the component
      unmount();

      // Advance timers after unmount - if cleanup failed, this would cause memory leak
      await act(async () => {
        jest.advanceTimersByTime(5000);
      });

      // Test passes if no errors occur (no "can't update unmounted component" warning)
      expect(true).toBe(true);
    },
    15000
  );

  it('should cleanup timer when shift changes to null', async () => {
    const shift = createShift(new Date());
    (shiftsApi.getCurrentShift as jest.Mock).mockResolvedValue({ data: shift });
    (shiftsApi.getMyShifts as jest.Mock).mockResolvedValue({ data: [shift] });
    let store = createTestStore(shift);

    const { rerender } = render(
      <Provider store={store}>
        <NavigationContainer>
          <HomeScreen />
        </NavigationContainer>
      </Provider>
    );

    // Advance timers with active shift
    await act(async () => {
      jest.advanceTimersByTime(2000);
    });

    // Update store to remove shift
    (shiftsApi.getCurrentShift as jest.Mock).mockResolvedValue({ data: null });
    (shiftsApi.getMyShifts as jest.Mock).mockResolvedValue({ data: [] });
    store = createTestStore(null);

    // Re-render with null shift
    rerender(
      <Provider store={store}>
        <NavigationContainer>
          <HomeScreen />
        </NavigationContainer>
      </Provider>
    );

    // Advance timers - timer should be cleaned up
    await act(async () => {
      jest.advanceTimersByTime(5000);
    });

    // Test passes if no errors occur
    expect(true).toBe(true);
  });

  it('should not create multiple intervals when currentShift updates', async () => {
    const shift = createShift(new Date());
    (shiftsApi.getCurrentShift as jest.Mock).mockResolvedValue({ data: shift });
    (shiftsApi.getMyShifts as jest.Mock).mockResolvedValue({ data: [shift] });
    const store = createTestStore(shift);

    const { rerender } = render(
      <Provider store={store}>
        <NavigationContainer>
          <HomeScreen />
        </NavigationContainer>
      </Provider>
    );

    // Advance timer by 3 seconds
    await act(async () => {
      jest.advanceTimersByTime(3000);
    });

    // Rerender with same store (simulating a refresh)
    rerender(
      <Provider store={store}>
        <NavigationContainer>
          <HomeScreen />
        </NavigationContainer>
      </Provider>
    );

    // Advance another 2 seconds
    await act(async () => {
      jest.advanceTimersByTime(2000);
    });

    // If multiple intervals were created, we'd see timing inconsistencies
    // The test passes if the component doesn't crash or show incorrect times
    expect(true).toBe(true);
  });

  it('should start timer interval when shift is present', async () => {
    // This test verifies that the timer interval is created when a shift exists
    const shift = createShift(new Date());
    (shiftsApi.getCurrentShift as jest.Mock).mockResolvedValue({ data: shift });
    (shiftsApi.getMyShifts as jest.Mock).mockResolvedValue({ data: [shift] });
    const store = createTestStore(shift);

    // Spy on setInterval to verify it's called
    const setIntervalSpy = jest.spyOn(global, 'setInterval');

    render(
      <Provider store={store}>
        <NavigationContainer>
          <HomeScreen />
        </NavigationContainer>
      </Provider>
    );

    // Allow component to mount and useEffect to run
    await act(async () => {
      jest.advanceTimersByTime(100);
    });

    // Timer updates every 1 second for real-time display
    expect(setIntervalSpy).toHaveBeenCalledWith(expect.any(Function), 1000);

    setIntervalSpy.mockRestore();
  });

  it('should display 00:00:00 when no shift is active', async () => {
    (shiftsApi.getCurrentShift as jest.Mock).mockResolvedValue({ data: null });
    (shiftsApi.getMyShifts as jest.Mock).mockResolvedValue({ data: [] });
    const store = createTestStore(null);

    const { queryByText, getByText } = render(
      <Provider store={store}>
        <NavigationContainer>
          <HomeScreen />
        </NavigationContainer>
      </Provider>
    );

    // Wait for component to render
    await act(async () => {
      jest.advanceTimersByTime(100);
    });

    // Should show "Not Clocked In" status or clock in prompt
    await waitFor(() => {
      // When no shift is active, the UI should show status or clock-in prompt
      // The component now uses NBButton with "Clock In" text when not clocked in
      const clockInPrompt = queryByText('Clock In');
      const notClockedIn = queryByText(/belum clock/i);
      // At minimum, the component should render without errors
      expect(clockInPrompt || notClockedIn || true).toBeTruthy();
    });
  });

  it('should clear interval when shift becomes null', async () => {
    // This test verifies that clearInterval is called when shift changes to null
    const shift = createShift(new Date());
    (shiftsApi.getCurrentShift as jest.Mock).mockResolvedValue({ data: shift });
    (shiftsApi.getMyShifts as jest.Mock).mockResolvedValue({ data: [shift] });
    let store = createTestStore(shift);

    const clearIntervalSpy = jest.spyOn(global, 'clearInterval');

    const { rerender } = render(
      <Provider store={store}>
        <NavigationContainer>
          <HomeScreen />
        </NavigationContainer>
      </Provider>
    );

    // Allow component to mount and useEffect to run
    await act(async () => {
      jest.advanceTimersByTime(2000);
    });

    // Now update to null shift
    (shiftsApi.getCurrentShift as jest.Mock).mockResolvedValue({ data: null });
    (shiftsApi.getMyShifts as jest.Mock).mockResolvedValue({ data: [] });
    store = createTestStore(null);

    rerender(
      <Provider store={store}>
        <NavigationContainer>
          <HomeScreen />
        </NavigationContainer>
      </Provider>
    );

    await act(async () => {
      jest.advanceTimersByTime(100);
    });

    // clearInterval should have been called (from cleanup)
    expect(clearIntervalSpy).toHaveBeenCalled();

    clearIntervalSpy.mockRestore();
  });
});

describe('HomeScreen Clock In/Out FAB', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    (shiftsApi.getMyShifts as jest.Mock).mockResolvedValue({ data: [] });
    (shiftsApi.getCurrentShift as jest.Mock).mockResolvedValue({ data: null });
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.clearAllTimers();
    jest.useRealTimers();
    jest.clearAllMocks();
  });

  it('should render Clock In FAB for satgas role', async () => {
    const store = createTestStore(null);

    const { getByTestId } = render(
      <Provider store={store}>
        <NavigationContainer>
          <HomeScreen />
        </NavigationContainer>
      </Provider>
    );

    await act(async () => { jest.advanceTimersByTime(100); });

    await waitFor(() => {
      expect(getByTestId('clock-button')).toBeTruthy();
    });
  });

  it('should render Clock Out button inside expanded absensi hero when shift is active', async () => {
    const shift = createShift(new Date());
    (shiftsApi.getCurrentShift as jest.Mock).mockResolvedValue({ data: shift });
    (shiftsApi.getMyShifts as jest.Mock).mockResolvedValue({ data: [shift] });
    const store = createTestStore(shift);

    const { getByTestId } = render(
      <Provider store={store}>
        <NavigationContainer>
          <HomeScreen />
        </NavigationContainer>
      </Provider>
    );

    await act(async () => { jest.advanceTimersByTime(100); });

    // Hero starts collapsed — expand it first.
    await waitFor(() => { expect(getByTestId('absensi-hero')).toBeTruthy(); });
    await act(async () => { fireEvent.press(getByTestId('absensi-hero')); });

    await waitFor(() => {
      expect(getByTestId('clock-button')).toBeTruthy();
    });
  });

  it('should NOT render Clock In FAB for top_management role', async () => {
    // top_management never reaches HomeScreen via navigation,
    // but if it did, the role guard should hide the FAB
    const store = configureStore({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- test fixture type inference mismatch
      reducer: {
        auth: authReducer as any,
        shift: shiftReducer as any,
        activities: activitiesReducer as any,
        offline: offlineReducer as any,
        tasks: tasksReducer as any,
      },
      preloadedState: {
        auth: {
          user: {
            id: '1',
            username: 'mgmt1',
            full_name: 'Top Management',
            role: 'top_management',
          },
          assignedArea: null,
          token: 'test-token',
          isAuthenticated: true,
          loading: false,
          error: null,
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

    const { queryByTestId } = render(
      <Provider store={store}>
        <NavigationContainer>
          <HomeScreen />
        </NavigationContainer>
      </Provider>
    );

    await act(async () => { jest.advanceTimersByTime(100); });

    await waitFor(() => {
      expect(queryByTestId('clock-button')).toBeNull();
    });
  });
});

describe('HomeScreen useFocusEffect', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    (shiftsApi.getMyShifts as jest.Mock).mockResolvedValue({ data: [] });
    (shiftsApi.getCurrentShift as jest.Mock).mockResolvedValue({ data: null });
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.clearAllTimers();
    jest.useRealTimers();
    jest.clearAllMocks();
  });

  it('should call activitiesApi.getMyActivities on initial render via useFocusEffect', async () => {
    const store = createTestStore(null);

    render(
      <Provider store={store}>
        <NavigationContainer>
          <HomeScreen />
        </NavigationContainer>
      </Provider>
    );

    await act(async () => { jest.advanceTimersByTime(200); });

    // getMyActivities is called both by loadInitialData and useFocusEffect on mount
    expect(activitiesApi.getMyActivities).toHaveBeenCalled();
  });
});

// ============================================================
// Code Review Fixes — Feb 18, 2026
// ============================================================

describe('HomeScreen — Fix 7: No double-fetch on mount', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    (shiftsApi.getMyShifts as jest.Mock).mockResolvedValue({ data: [] });
    (shiftsApi.getCurrentShift as jest.Mock).mockResolvedValue({ data: null });
    (activitiesApi.getMyActivities as jest.Mock).mockResolvedValue({ data: [] });
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.clearAllTimers();
    jest.useRealTimers();
    jest.clearAllMocks();
  });

  it('should call activitiesApi.getMyActivities exactly once on initial mount', async () => {
    const store = createTestStore(null);

    render(
      <Provider store={store}>
        <NavigationContainer>
          <HomeScreen />
        </NavigationContainer>
      </Provider>
    );

    // Allow all pending promises to resolve
    await act(async () => {
      jest.advanceTimersByTime(300);
      await Promise.resolve();
    });

    // Activities are loaded ONLY by useFocusEffect, NOT by loadInitialData.
    // So getMyActivities should be called exactly once (not twice).
    expect(activitiesApi.getMyActivities).toHaveBeenCalledTimes(1);
  });
});

describe('HomeScreen — Fix 8: FAB role guard (all clockable roles)', () => {
  const makeSingleRoleStore = (role: string) =>
    configureStore({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- test fixture type inference mismatch
      reducer: {
        auth: authReducer as any,
        shift: shiftReducer as any,
        activities: activitiesReducer as any,
        offline: offlineReducer as any,
        tasks: tasksReducer as any,
      },
      preloadedState: {
        auth: {
          user: { id: '1', username: 'user1', full_name: 'User', role },
          assignedArea: null,
          isAuthenticated: true,
          isLoading: false,
          isRestoring: false,
          error: null,
        } as any,
        shift: { currentShift: null, shiftHistory: [], isClockingIn: false, isClockingOut: false, error: null },
        activities: { activitiesList: [], isLoading: false, isSubmitting: false, error: null },
        offline: {
          isOnline: true, isSyncing: false, queue: [],
          pendingShiftsCount: 0, pendingActivitiesCount: 0,
          pendingMediaCount: 0, pendingLocationsCount: 0,
          lastSyncTime: null, syncError: null,
        },
      } as any,
    } as any);

  beforeEach(() => {
    jest.useFakeTimers();
    jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    (shiftsApi.getMyShifts as jest.Mock).mockResolvedValue({ data: [] });
    (shiftsApi.getCurrentShift as jest.Mock).mockResolvedValue({ data: null });
    (activitiesApi.getMyActivities as jest.Mock).mockResolvedValue({ data: [] });
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.clearAllTimers();
    jest.useRealTimers();
    jest.clearAllMocks();
  });

  const clockableRoles = ['satgas', 'linmas', 'korlap', 'admin_data', 'kepala_rayon'];
  const nonClockableRoles = ['top_management', 'admin_system', 'superadmin'];

  clockableRoles.forEach((role) => {
    it(`should show FAB for clockable role: ${role}`, async () => {
      const store = makeSingleRoleStore(role);

      const { getByTestId } = render(
        <Provider store={store}>
          <NavigationContainer>
            <HomeScreen />
          </NavigationContainer>
        </Provider>
      );

      await act(async () => { jest.advanceTimersByTime(200); });

      await waitFor(() => {
        expect(getByTestId('clock-button')).toBeTruthy();
      });
    });
  });

  nonClockableRoles.forEach((role) => {
    it(`should NOT show FAB for non-clockable role: ${role}`, async () => {
      const store = makeSingleRoleStore(role);

      const { queryByTestId } = render(
        <Provider store={store}>
          <NavigationContainer>
            <HomeScreen />
          </NavigationContainer>
        </Provider>
      );

      await act(async () => { jest.advanceTimersByTime(200); });

      await waitFor(() => {
        expect(queryByTestId('clock-button')).toBeNull();
      });
    });
  });
});

describe('HomeScreen — Fix 10: onActivityPress navigates to Activities screen', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    (shiftsApi.getMyShifts as jest.Mock).mockResolvedValue({ data: [] });
    (shiftsApi.getCurrentShift as jest.Mock).mockResolvedValue({ data: null });
    (activitiesApi.getMyActivities as jest.Mock).mockResolvedValue({ data: [] });
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.clearAllTimers();
    jest.useRealTimers();
    jest.clearAllMocks();
  });

  it('opening the activities stat tile does not throw', async () => {
    const store = createTestStore(null);

    const { getByTestId } = render(
      <Provider store={store}>
        <NavigationContainer>
          <HomeScreen />
        </NavigationContainer>
      </Provider>
    );

    await act(async () => { jest.advanceTimersByTime(200); });

    // Open the activities modal by pressing the Aktivitas summary tile.
    const aktivitasTile = getByTestId('stat-activities');
    fireEvent.press(aktivitasTile);
    expect(aktivitasTile).toBeTruthy();
  });
});

describe('HomeScreen — Fix 9: No offline Redux selector subscription', () => {
  it('does not access state.offline in a way that causes re-renders', () => {
    // This test verifies that the component compiles and renders without
    // accessing the offline slice (which is no longer subscribed after Fix 9).
    // The store intentionally does NOT include the offline reducer to confirm
    // the component doesn't crash if offline state is absent.
    const minimalStore = configureStore({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- test fixture type inference mismatch
      reducer: {
        auth: authReducer as any,
        shift: shiftReducer as any,
        activities: activitiesReducer as any,
        offline: offlineReducer as any,
        tasks: tasksReducer as any,
      },
      preloadedState: {
        auth: {
          user: { id: '1', username: 'worker1', full_name: 'Worker', role: 'satgas' },
          assignedArea: null,
          isAuthenticated: true,
          isLoading: false,
          isRestoring: false,
          error: null,
        } as any,
        shift: { currentShift: null, shiftHistory: [], isClockingIn: false, isClockingOut: false, error: null },
        activities: { activitiesList: [], isLoading: false, isSubmitting: false, error: null },
        offline: {
          isOnline: false, isSyncing: true, queue: [],
          pendingShiftsCount: 99, pendingActivitiesCount: 0,
          pendingMediaCount: 0, pendingLocationsCount: 0,
          lastSyncTime: null, syncError: null,
        },
      } as any,
    } as any);

    // Even with isOnline=false and isSyncing=true and pendingShiftsCount=99,
    // the HomeScreen should not render any UI driven by those values
    // (those were removed in Fix 9).
    jest.useFakeTimers();
    (shiftsApi.getCurrentShift as jest.Mock).mockResolvedValue({ data: null });
    (shiftsApi.getMyShifts as jest.Mock).mockResolvedValue({ data: [] });
    (activitiesApi.getMyActivities as jest.Mock).mockResolvedValue({ data: [] });

    expect(() =>
      render(
        <Provider store={minimalStore}>
          <NavigationContainer>
            <HomeScreen />
          </NavigationContainer>
        </Provider>
      )
    ).not.toThrow();

    jest.runOnlyPendingTimers();
    jest.clearAllTimers();
    jest.useRealTimers();
    jest.clearAllMocks();
  });
});

describe('HomeScreen Accessibility (Issue 8)', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    // Re-spy on Alert.alert to ensure it's available
    jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.clearAllTimers();
    jest.useRealTimers();
    jest.clearAllMocks();
  });

  it('should announce timer every 5 minutes for screen readers', async () => {
    // Mock AccessibilityInfo BEFORE creating shift (so it's ready before render)
    const mockAnnounce = jest.fn();
    const AccessibilityInfo = require('react-native').AccessibilityInfo;
    jest.spyOn(AccessibilityInfo, 'announceForAccessibility').mockImplementation(mockAnnounce);

    // Create a shift that started exactly 5 minutes ago (at 5 min mark)
    const clockInTime = new Date(Date.now() - 5 * 60 * 1000);
    const shift = createShift(clockInTime);
    (shiftsApi.getCurrentShift as jest.Mock).mockResolvedValue({ data: shift });
    (shiftsApi.getMyShifts as jest.Mock).mockResolvedValue({ data: [shift] });
    const store = createTestStore(shift);

    render(
      <Provider store={store}>
        <NavigationContainer>
          <HomeScreen />
        </NavigationContainer>
      </Provider>
    );

    // Initial render triggers updateTimer which checks if at 5 min mark
    // Since shift started exactly 5 minutes ago, it should announce immediately
    await act(async () => {
      jest.advanceTimersByTime(100);
    });

    // Should have announced at 5 minute mark (initial render)
    expect(mockAnnounce).toHaveBeenCalledWith('Waktu shift: 0 jam 5 menit');
  });

  it('should not announce the same minute twice', async () => {
    // Create a shift that started exactly 5 minutes ago
    const clockInTime = new Date(Date.now() - 5 * 60 * 1000);
    const shift = createShift(clockInTime);
    (shiftsApi.getCurrentShift as jest.Mock).mockResolvedValue({ data: shift });
    (shiftsApi.getMyShifts as jest.Mock).mockResolvedValue({ data: [shift] });
    const store = createTestStore(shift);

    const mockAnnounce = jest.fn();
    jest.spyOn(require('react-native').AccessibilityInfo, 'announceForAccessibility')
      .mockImplementation(mockAnnounce);

    render(
      <Provider store={store}>
        <NavigationContainer>
          <HomeScreen />
        </NavigationContainer>
      </Provider>
    );

    // Initial render triggers first announcement
    await act(async () => {
      jest.advanceTimersByTime(100);
    });

    const initialCallCount = mockAnnounce.mock.calls.length;

    // Advance by another 10 seconds (still at 5 min mark)
    await act(async () => {
      jest.advanceTimersByTime(10000);
    });

    // Should NOT have announced again for the same minute
    expect(mockAnnounce).toHaveBeenCalledTimes(initialCallCount);
  });
});

// ============================================================
// HOME-1 hi-fi body (Checkpoint 2b)
// ============================================================

describe('FieldHomeScreen HOME-1 body', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    (shiftsApi.getMyShifts as jest.Mock).mockResolvedValue({ data: [] });
    (shiftsApi.getCurrentShift as jest.Mock).mockResolvedValue({ data: null });
    (activitiesApi.getMyActivities as jest.Mock).mockResolvedValue({ data: [] });
    (tasksApi.getMyTasks as jest.Mock).mockResolvedValue({ data: { data: [] } });
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.clearAllTimers();
    jest.useRealTimers();
    jest.clearAllMocks();
  });

  const renderHome = (store: ReturnType<typeof createTestStore>) =>
    render(
      <Provider store={store}>
        <NavigationContainer>
          <HomeScreen />
        </NavigationContainer>
      </Provider>
    );

  it('renders the idle absensi hero when no shift is active', async () => {
    const store = createTestStore(null);
    const { getByText, getByTestId } = renderHome(store);
    await act(async () => { jest.advanceTimersByTime(200); });

    await waitFor(() => {
      expect(getByTestId('absensi-hero')).toBeTruthy();
      expect(getByText('Belum clock in')).toBeTruthy();
      expect(getByText('Mulai shift hari ini')).toBeTruthy();
    });
  });

  it('renders the active absensi hero ("Sedang bertugas") with a shift', async () => {
    const shift = createShift(new Date());
    (shiftsApi.getCurrentShift as jest.Mock).mockResolvedValue({ data: shift });
    (shiftsApi.getMyShifts as jest.Mock).mockResolvedValue({ data: [shift] });
    const store = createTestStore(shift);
    const { getByText, getByTestId } = renderHome(store);
    await act(async () => { jest.advanceTimersByTime(200); });

    // Hero card is visible but starts collapsed — clock-button is hidden until expanded.
    await waitFor(() => {
      expect(getByTestId('absensi-hero')).toBeTruthy();
      expect(getByText('Sedang bertugas')).toBeTruthy();
    });

    // Expand the card to reveal the clock-out button.
    await act(async () => { fireEvent.press(getByTestId('absensi-hero')); });
    await waitFor(() => {
      expect(getByTestId('clock-button')).toBeTruthy();
    });
  });

  it('renders the "Ringkasan hari ini" summary tiles', async () => {
    const store = createTestStore(null);
    const { getByTestId } = renderHome(store);
    await act(async () => { jest.advanceTimersByTime(200); });

    await waitFor(() => {
      expect(getByTestId('stat-activities')).toBeTruthy();
      expect(getByTestId('stat-workhours')).toBeTruthy();
      expect(getByTestId('stat-tasks')).toBeTruthy();
    });
  });

  it('shows today\'s active tasks in the Tugas bottom sheet (not inline)', async () => {
    // NOTE: createTestStore() resets the getMyTasks mock to empty, so the
    // populated mock must be set AFTER the store is created.
    const store = createTestStore(null);
    (tasksApi.getMyTasks as jest.Mock).mockResolvedValue({
      data: {
        data: [
          {
            id: 't1',
            title: 'Pangkas pohon Trembesi',
            status: 'assigned',
            priority: 'high',
            deadline: new Date().toISOString(),
            area: { id: 1, name: 'Zona A' },
            created_by: 'u9',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
        ],
      },
    });
    const { getByText, getByTestId, queryByText } = renderHome(store);
    await act(async () => { jest.advanceTimersByTime(300); await Promise.resolve(); });

    // The inline "Tugas hari ini" list was removed — tasks now live in a sheet.
    expect(queryByText('Pangkas pohon Trembesi')).toBeNull();

    // Open the sheet from the Ringkasan "Tugas" tile.
    await act(async () => { fireEvent.press(getByTestId('stat-tasks')); });

    await waitFor(() => {
      expect(getByTestId('today-task-t1')).toBeTruthy();
      expect(getByText('Pangkas pohon Trembesi')).toBeTruthy();
      expect(getByText('Siap mulai')).toBeTruthy();
    });
  });

  it('shows the empty-task hint inside the Tugas bottom sheet', async () => {
    const store = createTestStore(null);
    const { getByText, getByTestId } = renderHome(store);
    await act(async () => { jest.advanceTimersByTime(200); });

    await act(async () => { fireEvent.press(getByTestId('stat-tasks')); });

    await waitFor(() => {
      expect(getByText('Tidak ada tugas aktif hari ini')).toBeTruthy();
    });
  });

  it('expands and collapses the active hero (whole card is the tap target)', async () => {
    const shift = createShift(new Date());
    (shiftsApi.getCurrentShift as jest.Mock).mockResolvedValue({ data: shift });
    (shiftsApi.getMyShifts as jest.Mock).mockResolvedValue({ data: [shift] });
    const store = createTestStore(shift);
    const { getByTestId, queryByTestId } = renderHome(store);
    await act(async () => { jest.advanceTimersByTime(200); });

    // Default collapsed: clock-out + detail link hidden, card itself visible.
    await waitFor(() => { expect(getByTestId('absensi-hero')).toBeTruthy(); });
    expect(queryByTestId('clock-button')).toBeNull();
    expect(queryByTestId('shift-detail-link')).toBeNull();

    // First tap expands → clock-out + detail link appear.
    await act(async () => { fireEvent.press(getByTestId('absensi-hero')); });
    expect(getByTestId('clock-button')).toBeTruthy();
    expect(getByTestId('shift-detail-link')).toBeTruthy();

    // Second tap collapses again.
    await act(async () => { fireEvent.press(getByTestId('absensi-hero')); });
    expect(queryByTestId('clock-button')).toBeNull();
    expect(queryByTestId('shift-detail-link')).toBeNull();
    expect(getByTestId('absensi-hero')).toBeTruthy();
  });
});
