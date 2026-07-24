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
import { getMyRoster } from '../../services/api/schedulesApi';
import Geolocation from 'react-native-geolocation-service';
import { requestClockInPermissions } from '../../services/permissions';

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
jest.mock('../../services/api/schedulesApi', () => ({
  getMyRoster: jest.fn(),
  // `useTodayRoster` also fetches the full day (ADR-053: several rows per shift).
  getMyDay: jest.fn().mockResolvedValue({ data: [] }),
}));
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

describe('useClockInOut — roster-gated lateness', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // The roster row carries the day's shift_definition — the ONLY source of
    // scheduled truth. Lateness is judged against this, never the clocked-in
    // shift or a time-of-day match.
    mockGetMyRoster.mockResolvedValue({ data: { shift_definition: ROSTER_SHIFT_DEF } } as never);
  });

  it('judges lateness against the roster shift, not the clocked-in shift', async () => {
    const currentShift = {
      id: 'shift-1',
      clock_in_time: CLOCK_IN_LOCAL_1311,
      is_overtime: false,
      shift_definition: CLOCKED_SHIFT_DEF,
    };
    const { result } = renderHook(() => useClockInOut(), { wrapper: wrapperFor(currentShift) });

    // The displayed schedule is the roster shift; wait for the fetch to resolve.
    await waitFor(() => expect(result.current.scheduledShift).toEqual(ROSTER_SHIFT_DEF));

    // 13:11 is NOT late for Shift 3 (crosses midnight, 21:00 start) — even though
    // it WOULD be late for the clocked-in Shift 1 (06:00). Roster wins.
    expect(result.current.isLate).toBe(false);
    expect(result.current.hasScheduleToday).toBe(true);
  });

  it('uses the roster shift before clock-in (no active shift)', async () => {
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
    await waitFor(() => expect(mockGetMyRoster).toHaveBeenCalled());
    expect(result.current.isLate).toBe(false);
  });

  // A ~2°×2° square around (0,0), GeoJSON [lng,lat] order.
  const SQUARE_POLYGON = {
    type: 'Polygon' as const,
    coordinates: [[[-1, -1], [-1, 1], [1, 1], [1, -1], [-1, -1]]],
  };
  const withGpsFix = (lat: number, lng: number) => {
    (requestClockInPermissions as jest.Mock).mockResolvedValue({ success: true });
    // Both getCurrentPosition and watchPosition drive isWithinBoundary; fire the
    // success callback synchronously with a fixed coordinate.
    (Geolocation.getCurrentPosition as jest.Mock).mockImplementation((success) =>
      success({ coords: { latitude: lat, longitude: lng, accuracy: 5 } }),
    );
    (Geolocation.watchPosition as jest.Mock).mockImplementation((success) => {
      success({ coords: { latitude: lat, longitude: lng, accuracy: 5 } });
      return 1;
    });
  };

  it('geofences a rayon-scope assignment against the RAYON boundary (inside → within)', async () => {
    withGpsFix(0, 0); // inside the square
    mockGetMyRoster.mockResolvedValue({
      data: {
        shift_definition: ROSTER_SHIFT_DEF,
        district_id: 'd-1',
        district: { id: 'd-1', name: 'Rayon Barat 1', boundary_polygon: SQUARE_POLYGON },
      },
    } as never);

    const { result } = renderHook(() => useClockInOut(), { wrapper: wrapperFor(null) });

    await waitFor(() => expect(result.current.areaState).toBe('within'));
    expect(result.current.scheduleScope.scope).toBe('district');
  });

  it('reads outside the rayon boundary as LUAR AREA (outside)', async () => {
    withGpsFix(5, 5); // outside the square
    mockGetMyRoster.mockResolvedValue({
      data: {
        shift_definition: ROSTER_SHIFT_DEF,
        district_id: 'd-1',
        district: { id: 'd-1', name: 'Rayon Barat 1', boundary_polygon: SQUARE_POLYGON },
      },
    } as never);

    const { result } = renderHook(() => useClockInOut(), { wrapper: wrapperFor(null) });

    await waitFor(() => expect(result.current.areaState).toBe('outside'));
  });

  it("falls back to neutral 'scope' when the rayon has no boundary polygon", async () => {
    withGpsFix(0, 0);
    mockGetMyRoster.mockResolvedValue({
      data: {
        shift_definition: ROSTER_SHIFT_DEF,
        district_id: 'd-1',
        district: { id: 'd-1', name: 'Rayon Barat 1' }, // no boundary_polygon
      },
    } as never);

    const { result } = renderHook(() => useClockInOut(), { wrapper: wrapperFor(null) });

    await waitFor(() => expect(result.current.scheduleScope.scope).toBe('district'));
    expect(result.current.areaState).toBe('scope');
  });

  it('is never late and reports no schedule when unscheduled (patrol/ad-hoc)', async () => {
    // No roster row today → an early-morning clock-in for a time-of-day night
    // shift must NOT read as late.
    mockGetMyRoster.mockResolvedValue({ data: null } as never);
    const currentShift = {
      id: 'shift-patrol',
      clock_in_time: new Date(2026, 5, 23, 1, 12, 0).toISOString(),
      is_overtime: false,
      shift_definition: ROSTER_SHIFT_DEF, // baked from a time-of-day match
    };
    const { result } = renderHook(() => useClockInOut(), { wrapper: wrapperFor(currentShift) });
    await waitFor(() => expect(mockGetMyRoster).toHaveBeenCalled());
    expect(result.current.hasScheduleToday).toBe(false);
    expect(result.current.scheduledShift).toBeNull();
    expect(result.current.isLate).toBe(false);
  });
});
