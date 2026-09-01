/**
 * Rekam Kehadiran refetches on focus.
 *
 * The screen lives in a tab, so React Navigation keeps it mounted after the
 * first visit and the hooks' mount-time fetch never runs again. A schedule
 * added from the web while the app was open therefore stayed invisible here —
 * "Tidak Ada Shift" — while the home card and the Kehadiran hub, which both
 * already refetch on focus, showed it correctly.
 *
 * The screen is mocked down to the hook boundary: this is about WHEN the data
 * is re-read, not how it renders.
 */

import React from 'react';
import { render, waitFor } from '@testing-library/react-native';
import { ClockInOutScreen } from '../ClockInOutScreen';

const mockRefresh = jest.fn().mockResolvedValue(undefined);

// useFocusEffect is `useCallback`-shaped; run the effect once on mount, which
// is exactly what focusing the screen does.
jest.mock('@react-navigation/native', () => ({
  // Spread the real module: a hand-written stub omitted NavigationContext,
  // which other hooks in this tree read, and the screen crashed on render.
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({ navigate: jest.fn(), goBack: jest.fn(), setOptions: jest.fn() }),
  useFocusEffect: (cb: () => void) => {
    const ReactActual = require('react');
    ReactActual.useEffect(cb, [cb]);
  },
}));

jest.mock('../../../hooks', () => ({
  useClockInOut: () => ({
    location: { latitude: null, longitude: null, accuracy: null, loading: false, error: null, mocked: null },
    selfie: null,
    isSubmitting: false,
    isWithinBoundary: false,
    areaState: 'none',
    timer: '00:00:00',
    isClockIn: true,
    isOnline: true,
    currentShift: null,
    scheduledShift: null,
    isLate: false,
    attendanceState: 'not_scheduled',
    scheduleScope: { scope: 'none', name: null },
    mapArea: null,
    hasScheduleToday: false,
    shiftOptions: [],
    selectedShift: null,
    setSelectedShift: jest.fn(),
    refresh: mockRefresh,
    refreshing: false,
    getCurrentLocation: jest.fn(),
    handleCaptureSelfie: jest.fn(),
    handleClockIn: jest.fn(),
    handleClockOut: jest.fn(),
  }),
}));

jest.mock('../../../store/hooks', () => ({
  useAppSelector: (fn: (s: unknown) => unknown) =>
    fn({ auth: { user: { role: 'satgas' } } }),
}));

describe('ClockInOutScreen refresh', () => {
  beforeEach(() => {
    mockRefresh.mockClear();
  });

  it('re-reads the roster and live session when the screen is focused', async () => {
    render(<ClockInOutScreen />);

    await waitFor(() => {
      expect(mockRefresh).toHaveBeenCalled();
    });
  });
});
