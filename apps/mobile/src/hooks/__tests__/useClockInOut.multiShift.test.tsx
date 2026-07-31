/**
 * Multi-shift day (Satgas Patroli scenario, ADR-055).
 *
 * A worker rostered to BOTH Shift 2 (15:00–23:00) and Shift 3 (21:00–05:00) at
 * 19:00 must read as Shift 2: Shift 2 is covering, Shift 3's 60-minute early
 * window has not opened yet. The record page showed Shift 3 / TEPAT WAKTU,
 * which would tell a late worker they are on time.
 */
import React from 'react';
import { renderHook, waitFor, act } from '@testing-library/react-native';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';

import authReducer from '../../store/slices/authSlice';
import shiftReducer from '../../store/slices/shiftSlice';
import offlineReducer from '../../store/slices/offlineSlice';
import { useClockInOut } from '../useClockInOut';
import { getMyRoster, getMyDay } from '../../services/api/schedulesApi';
import { getCurrentState } from '../../services/api/shiftsApi';
import { pickDisplayShift, formatShiftLabel } from '../../utils/shiftDisplay';

jest.mock('react-native-geolocation-service', () => ({
  getCurrentPosition: jest.fn(),
  watchPosition: jest.fn(() => 1),
  clearWatch: jest.fn(),
}));
jest.mock('../../services/api/shiftsApi', () => ({
  clockIn: jest.fn(),
  clockOut: jest.fn(),
  getCurrentShift: jest.fn(),
  getCurrentState: jest.fn(),
}));
jest.mock('../../services/api/schedulesApi', () => ({
  getMyRoster: jest.fn(),
  getMyDay: jest.fn(),
}));
jest.mock('../../services/api/districtsApi', () => ({
  getDistricts: jest.fn().mockResolvedValue({ data: [] }),
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

const SHIFT_2 = {
  id: 'sd-2',
  name: 'Shift 2',
  start_time: '15:00:00',
  end_time: '23:00:00',
  crosses_midnight: false,
};
const SHIFT_3 = {
  id: 'sd-3',
  name: 'Shift 3',
  start_time: '21:00:00',
  end_time: '05:00:00',
  crosses_midnight: true,
};

/** What the live API actually returns for this worker at 19:00 (verified). */
const OPTION_SHIFT_2 = {
  shift_definition_id: 'sd-2',
  shift_name: 'Shift 2',
  start_time: '15:00:00',
  end_time: '23:00:00',
  crosses_midnight: false,
  service_day: '2026-07-31',
  phase: 'covering',
  minutes_to_start: -240,
  is_default: true,
};

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <Provider
    store={configureStore({
      reducer: { auth: authReducer as never, shift: shiftReducer as never, offline: offlineReducer as never },
      preloadedState: {
        auth: {
          user: null, token: null, isAuthenticated: true, loading: false, error: null, assignedArea: null,
        } as never,
        shift: { currentShift: null, shifts: [], loading: false, error: null } as never,
        offline: { isOnline: true, isSyncing: false, lastSyncTime: null, pendingCount: 0 },
      },
    })}
  >
    {children}
  </Provider>
);

describe('multi-shift day — which shift is shown at 19:00', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // 19:00 WIB, matching the reported scenario.
    jest.useFakeTimers().setSystemTime(new Date(2026, 6, 31, 19, 0, 0));
    (getMyDay as jest.Mock).mockResolvedValue({
      data: [
        { id: 'r1', schedule_date: '2026-07-31', shift_definition: SHIFT_2 },
        { id: 'r2', schedule_date: '2026-07-31', shift_definition: SHIFT_3 },
      ],
    });
    (getCurrentState as jest.Mock).mockResolvedValue({
      data: { open_session: null, options: [OPTION_SHIFT_2] },
    });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('shows Shift 2 when the API returns it as the only candidate', async () => {
    (getMyRoster as jest.Mock).mockResolvedValue({ data: { shift_definition: SHIFT_2 } });
    const { result } = renderHook(() => useClockInOut(), { wrapper });

    await waitFor(() => expect(result.current.shiftOptions.length).toBe(1));
    const label = formatShiftLabel(
      pickDisplayShift(result.current.shiftOptions, result.current.scheduledShift),
      'Tidak Ada Shift',
    );
    expect(label).toBe('Shift 2 · 15:00–23:00');
    expect(result.current.isLate).toBe(true);
  });

  it('still shows Shift 2 when /schedules/my picks the WRONG row (Shift 3)', async () => {
    // The regression: attribution says Shift 2, the single-row roster endpoint
    // says Shift 3. Attribution must win — otherwise a worker two hours late for
    // Shift 2 is told they are on time for Shift 3.
    (getMyRoster as jest.Mock).mockResolvedValue({ data: { shift_definition: SHIFT_3 } });
    const { result } = renderHook(() => useClockInOut(), { wrapper });

    await waitFor(() => expect(result.current.shiftOptions.length).toBe(1));
    const label = formatShiftLabel(
      pickDisplayShift(result.current.shiftOptions, result.current.scheduledShift),
      'Tidak Ada Shift',
    );
    expect(label).toBe('Shift 2 · 15:00–23:00');
    // Lateness must be judged against the shift being SHOWN, not the stray row.
    expect(result.current.isLate).toBe(true);
  });

  it('turns late while the screen stays open across the shift start', async () => {
    // The status is projected against NOW, so a memo that never ages would keep
    // reading "on time" until the worker punched — and the punch dialog, which
    // IS evaluated fresh, would then contradict the screen.
    jest.setSystemTime(new Date(2026, 6, 31, 14, 59, 0)); // before Shift 2 starts
    (getMyRoster as jest.Mock).mockResolvedValue({ data: { shift_definition: SHIFT_2 } });
    (getCurrentState as jest.Mock).mockResolvedValue({
      data: { open_session: null, options: [{ ...OPTION_SHIFT_2, phase: 'early', minutes_to_start: 1 }] },
    });
    const { result } = renderHook(() => useClockInOut(), { wrapper });

    await waitFor(() => expect(result.current.scheduledShift?.name).toBe('Shift 2'));
    expect(result.current.isLate).toBe(false);

    await act(async () => {
      jest.setSystemTime(new Date(2026, 6, 31, 15, 30, 0)); // 30 min past the start
      jest.advanceTimersByTime(31_000); // let the minute ticker fire
    });

    expect(result.current.isLate).toBe(true);
  });

  it('grades against the PICKED shift, not the server default', async () => {
    // 20:37: Shift 2 (covering, default) is 5h late; Shift 3 (early, starts
    // 21:00) is not late at all. Choosing Shift 3 must flip the status — the
    // record page named Shift 3 while still judging against Shift 2.
    jest.setSystemTime(new Date(2026, 6, 31, 20, 37, 0));
    const OPTION_SHIFT_3 = {
      shift_definition_id: 'sd-3',
      shift_name: 'Shift 3',
      start_time: '21:00:00',
      end_time: '05:00:00',
      crosses_midnight: true,
      service_day: '2026-07-31',
      phase: 'early',
      minutes_to_start: 23,
      is_default: false,
    };
    (getMyRoster as jest.Mock).mockResolvedValue({ data: { shift_definition: SHIFT_2 } });
    (getCurrentState as jest.Mock).mockResolvedValue({
      data: { open_session: null, options: [OPTION_SHIFT_2, OPTION_SHIFT_3] },
    });
    const { result } = renderHook(() => useClockInOut(), { wrapper });

    // Default (Shift 2) → late.
    await waitFor(() => expect(result.current.selectedShift?.shift_definition_id).toBe('sd-2'));
    expect(result.current.isLate).toBe(true);

    // Pick Shift 3 → its window has not started, so nothing is late.
    await act(async () => {
      result.current.setSelectedShift(OPTION_SHIFT_3 as never);
    });

    expect(result.current.scheduledShift?.name).toBe('Shift 3');
    expect(result.current.isLate).toBe(false);
  });

  it('honours a shift preselected by the caller (picked on the hub)', async () => {
    jest.setSystemTime(new Date(2026, 6, 31, 20, 37, 0));
    const OPTION_SHIFT_3 = {
      shift_definition_id: 'sd-3',
      shift_name: 'Shift 3',
      start_time: '21:00:00',
      end_time: '05:00:00',
      crosses_midnight: true,
      service_day: '2026-07-31',
      phase: 'early',
      minutes_to_start: 23,
      is_default: false,
    };
    (getMyRoster as jest.Mock).mockResolvedValue({ data: { shift_definition: SHIFT_2 } });
    (getCurrentState as jest.Mock).mockResolvedValue({
      data: { open_session: null, options: [OPTION_SHIFT_2, OPTION_SHIFT_3] },
    });
    const { result } = renderHook(
      () => useClockInOut({ shiftDefinitionId: 'sd-3', serviceDay: '2026-07-31' }),
      { wrapper },
    );

    await waitFor(() => expect(result.current.selectedShift?.shift_definition_id).toBe('sd-3'));
    expect(result.current.isLate).toBe(false);
  });

  it('falls back to the shift covering NOW when attribution is unavailable', async () => {
    // Offline / failed fetch: with no options, the roster fallback must still
    // pick the operative shift out of the day's rows, not an arbitrary one.
    (getCurrentState as jest.Mock).mockRejectedValue(new Error('offline'));
    (getMyRoster as jest.Mock).mockResolvedValue({ data: { shift_definition: SHIFT_3 } });
    const { result } = renderHook(() => useClockInOut(), { wrapper });

    await waitFor(() => expect(result.current.scheduledShift?.name).toBe('Shift 2'));
    expect(result.current.isLate).toBe(true);
  });
});
