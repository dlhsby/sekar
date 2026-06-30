/**
 * useClockInOut Hook Tests
 * Focus: the scheduled-shift / lateness reference precedence.
 *
 * Regression: once a worker is clocked in, lateness must be judged against the
 * shift they ACTUALLY clocked into (currentShift.shift_definition), not the
 * roster hint from /schedules/my — otherwise the clock-out screen disagrees with
 * the home hero + attendance history (which read the shift record's definition).
 */

import React from 'react';
import { renderHook, waitFor } from '@testing-library/react-native';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import authReducer from '../../store/slices/authSlice';
import shiftReducer from '../../store/slices/shiftSlice';
import offlineReducer from '../../store/slices/offlineSlice';
import { useClockInOut } from '../useClockInOut';
import { getMySchedule, getMyRoster } from '../../services/api/schedulesApi';

jest.mock('react-native-geolocation-service', () => ({
  getCurrentPosition: jest.fn(),
  watchPosition: jest.fn(() => 1),
  clearWatch: jest.fn(),
}));
jest.mock('../../services/api/shiftsApi', () => ({
  clockIn: jest.fn(),
  clockOut: jest.fn(),
  getCurrentShift: jest.fn(),
}));
jest.mock('../../services/api/schedulesApi', () => ({ getMySchedule: jest.fn(), getMyRoster: jest.fn() }));
jest.mock('../../services/permissions', () => ({
  requestClockInPermissions: jest.fn().mockResolvedValue({ success: false }),
  requestCameraPermission: jest.fn(),
}));
jest.mock('../../services/location/locationTracker', () => ({
  locationTracker: { initialize: jest.fn(), forceUpload: jest.fn(), stop: jest.fn() },
}));
jest.mock('../../services/media', () => ({
  mediaService: { capturePhoto: jest.fn(), convertToBase64: jest.fn() },
}));

const mockGetMySchedule = getMySchedule as jest.MockedFunction<typeof getMySchedule>;
const mockGetMyRoster = getMyRoster as jest.MockedFunction<typeof getMyRoster>;

// Shift the worker actually clocked into (daytime, non-crossing).
const CLOCKED_SHIFT_DEF = {
  id: 'sd-1',
  name: 'Shift 1',
  start_time: '06:00:00',
  end_time: '15:00:00',
  crosses_midnight: false,
};
// Roster hint that DISAGREES (overnight, crosses midnight).
const ROSTER_SHIFT_DEF = {
  id: 'sd-3',
  name: 'Shift 3',
  start_time: '21:00:00',
  end_time: '05:00:00',
  crosses_midnight: true,
};

// 13:11 local time — late for Shift 1 (06:00), but NOT late for Shift 3
// (between noon and 21:00 under the crosses-midnight rule).
const CLOCK_IN_LOCAL_1311 = new Date(2026, 5, 23, 13, 11, 0).toISOString();

const makeStore = (currentShift: unknown) =>
  configureStore({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- test fixture type inference mismatch
    reducer: {
      auth: authReducer as any,
      shift: shiftReducer as any,
      offline: offlineReducer as any,
    },
    preloadedState: {
      auth: {
        user: null,
        token: null,
        isAuthenticated: true,
        loading: false,
        error: null,
        assignedArea: null,
      } as any,
      shift: { currentShift, shifts: [], loading: false, error: null } as any,
      offline: { isOnline: true, isSyncing: false, lastSyncTime: null, pendingCount: 0 },
    },
  });

const wrapperFor = (currentShift: unknown) =>
  function Wrapper({ children }: { children: React.ReactNode }) {
    return <Provider store={makeStore(currentShift)}>{children}</Provider>;
  };

describe('useClockInOut — scheduled-shift precedence', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetMySchedule.mockResolvedValue({ data: { shift_definition: ROSTER_SHIFT_DEF } } as never);
    mockGetMyRoster.mockResolvedValue({ data: null } as never);
  });

  it('judges lateness against the clocked-in shift, not the roster hint', async () => {
    const currentShift = {
      id: 'shift-1',
      clock_in_time: CLOCK_IN_LOCAL_1311,
      is_overtime: false,
      shift_definition: CLOCKED_SHIFT_DEF,
    };
    const { result } = renderHook(() => useClockInOut(), { wrapper: wrapperFor(currentShift) });

    // Roster fetch resolves on mount; wait for it so the (rejected) precedence
    // would surface if assignedShiftDef were preferred.
    await waitFor(() => expect(mockGetMySchedule).toHaveBeenCalled());

    expect(result.current.scheduledShift).toEqual(CLOCKED_SHIFT_DEF);
    expect(result.current.isLate).toBe(true); // 13:11 > 06:00 → late for Shift 1
  });

  it('falls back to the roster hint before clock-in (no active shift)', async () => {
    const { result } = renderHook(() => useClockInOut(), { wrapper: wrapperFor(null) });
    await waitFor(() => expect(result.current.scheduledShift).toEqual(ROSTER_SHIFT_DEF));
  });

  it('never marks an overtime shift late', async () => {
    const currentShift = {
      id: 'shift-ot',
      clock_in_time: CLOCK_IN_LOCAL_1311,
      is_overtime: true,
      shift_definition: CLOCKED_SHIFT_DEF,
    };
    const { result } = renderHook(() => useClockInOut(), { wrapper: wrapperFor(currentShift) });
    await waitFor(() => expect(mockGetMySchedule).toHaveBeenCalled());
    expect(result.current.isLate).toBe(false);
  });
});
