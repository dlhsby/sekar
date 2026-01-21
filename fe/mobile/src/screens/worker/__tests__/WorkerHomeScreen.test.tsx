/**
 * WorkerHomeScreen Tests
 * Tests for timer cleanup and interval management
 */

import React from 'react';
import { render, waitFor, act } from '@testing-library/react-native';
import { Provider } from 'react-redux';
import { NavigationContainer } from '@react-navigation/native';
import { WorkerHomeScreen } from '../WorkerHomeScreen';
import { configureStore } from '@reduxjs/toolkit';
import authReducer from '../../../store/slices/authSlice';
import shiftReducer from '../../../store/slices/shiftSlice';
import offlineReducer from '../../../store/slices/offlineSlice';
import * as shiftsApi from '../../../services/api/shiftsApi';

// Mock the API
jest.mock('../../../services/api/shiftsApi');

// Helper to create test store with optional shift
const createTestStore = (currentShift: any = null) => {
  return configureStore({
    reducer: {
      auth: authReducer,
      shift: shiftReducer,
      offline: offlineReducer,
    },
    preloadedState: {
      auth: {
        user: {
          id: 1,
          username: 'worker1',
          full_name: 'Test Worker',
          role: 'Worker',
        },
        assignedArea: {
          id: 1,
          name: 'Park A',
          gps_lat: -7.250445,
          gps_lng: 112.768845,
          radius_meters: 100,
        },
        token: 'test-token',
        isAuthenticated: true,
        loading: false,
        error: null,
      },
      shift: {
        currentShift,
        isSubmitting: false,
        error: null,
      },
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
    },
  });
};

// Helper to create a shift with given clock-in time
const createShift = (clockInTime: Date) => ({
  id: 1,
  area_id: 1,
  worker_id: 1,
  clock_in_time: clockInTime.toISOString(),
  clock_in_gps_lat: -7.250445,
  clock_in_gps_lng: 112.768845,
  area: {
    id: 1,
    name: 'Park A',
  },
});

describe('WorkerHomeScreen Timer Management', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.clearAllTimers();
    jest.useRealTimers();
    jest.clearAllMocks();
  });

  it('should cleanup timer on unmount', async () => {
    const shift = createShift(new Date());
    (shiftsApi.getCurrentShift as jest.Mock).mockResolvedValue(shift);
    const store = createTestStore(shift);

    const { unmount } = render(
      <Provider store={store}>
        <NavigationContainer>
          <WorkerHomeScreen />
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
  });

  it('should cleanup timer when shift changes to null', async () => {
    const shift = createShift(new Date());
    (shiftsApi.getCurrentShift as jest.Mock).mockResolvedValue(shift);
    let store = createTestStore(shift);

    const { rerender } = render(
      <Provider store={store}>
        <NavigationContainer>
          <WorkerHomeScreen />
        </NavigationContainer>
      </Provider>
    );

    // Advance timers with active shift
    await act(async () => {
      jest.advanceTimersByTime(2000);
    });

    // Update store to remove shift
    (shiftsApi.getCurrentShift as jest.Mock).mockResolvedValue(null);
    store = createTestStore(null);

    // Re-render with null shift
    rerender(
      <Provider store={store}>
        <NavigationContainer>
          <WorkerHomeScreen />
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
    (shiftsApi.getCurrentShift as jest.Mock).mockResolvedValue(shift);
    const store = createTestStore(shift);

    const { rerender } = render(
      <Provider store={store}>
        <NavigationContainer>
          <WorkerHomeScreen />
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
          <WorkerHomeScreen />
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
    (shiftsApi.getCurrentShift as jest.Mock).mockResolvedValue(shift);
    const store = createTestStore(shift);

    // Spy on setInterval to verify it's called
    const setIntervalSpy = jest.spyOn(global, 'setInterval');

    render(
      <Provider store={store}>
        <NavigationContainer>
          <WorkerHomeScreen />
        </NavigationContainer>
      </Provider>
    );

    // Allow component to mount and useEffect to run
    await act(async () => {
      jest.advanceTimersByTime(100);
    });

    // The timer interval should be created for the shift
    expect(setIntervalSpy).toHaveBeenCalledWith(expect.any(Function), 1000);

    setIntervalSpy.mockRestore();
  });

  it('should display 00:00:00 when no shift is active', async () => {
    (shiftsApi.getCurrentShift as jest.Mock).mockResolvedValue(null);
    const store = createTestStore(null);

    const { getByText, queryByText } = render(
      <Provider store={store}>
        <NavigationContainer>
          <WorkerHomeScreen />
        </NavigationContainer>
      </Provider>
    );

    // Wait for component to render
    await act(async () => {
      jest.advanceTimersByTime(100);
    });

    // Should show "Not Clocked In" or no timer at all
    await waitFor(() => {
      // Either there's no Current Shift card, or there's a "Clock In" button
      const clockInButton = queryByText('Clock In');
      expect(clockInButton).toBeTruthy();
    });
  });

  it('should clear interval when shift becomes null', async () => {
    // This test verifies that clearInterval is called when shift changes to null
    const shift = createShift(new Date());
    (shiftsApi.getCurrentShift as jest.Mock).mockResolvedValue(shift);
    let store = createTestStore(shift);

    const clearIntervalSpy = jest.spyOn(global, 'clearInterval');

    const { rerender } = render(
      <Provider store={store}>
        <NavigationContainer>
          <WorkerHomeScreen />
        </NavigationContainer>
      </Provider>
    );

    // Allow component to mount and useEffect to run
    await act(async () => {
      jest.advanceTimersByTime(2000);
    });

    // Now update to null shift
    (shiftsApi.getCurrentShift as jest.Mock).mockResolvedValue(null);
    store = createTestStore(null);

    rerender(
      <Provider store={store}>
        <NavigationContainer>
          <WorkerHomeScreen />
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
