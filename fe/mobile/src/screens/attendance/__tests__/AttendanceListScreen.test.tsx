import React from 'react';
import { render, waitFor, fireEvent } from '@testing-library/react-native';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import authReducer from '../../../store/slices/authSlice';
import shiftReducer from '../../../store/slices/shiftSlice';
import { AttendanceListScreen } from '../AttendanceListScreen';
import * as shiftsApi from '../../../services/api/shiftsApi';
import type { AttendanceDaySummary } from '../../../types/api.types';

jest.mock('../../../components/nb/NBBackgroundPattern', () => ({
  NBBackgroundPattern: ({ children }: any) => children,
}));

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useFocusEffect: (cb: any) => {
    const React = require('react');
    React.useEffect(() => cb(), []);
  },
}));

jest.mock('../../../hooks/useRoleAccess', () => ({
  useRoleAccess: jest.fn(() => ({ canClock: true })),
}));

const day: AttendanceDaySummary = {
  date: '2026-06-22',
  first_clock_in: '2026-06-22T01:00:00Z',
  last_clock_out: '2026-06-22T09:00:00Z',
  shift_count: 1,
  total_worked_minutes: 480,
  scheduled_start_time: null,
  crosses_midnight: false,
  has_active: false,
};

function makeStore(currentShift: any = null) {
  return configureStore({
    reducer: { auth: authReducer as any, shift: shiftReducer as any },
    preloadedState: {
      auth: { user: { id: 'u1', role: 'satgas' }, isAuthenticated: true } as any,
      shift: { currentShift, shiftHistory: [], isClockingIn: false, isClockingOut: false, error: null },
    },
  });
}

function renderScreen(navigate = jest.fn(), currentShift: any = null) {
  const nav = { navigate } as any;
  const utils = render(
    <Provider store={makeStore(currentShift)}>
      <AttendanceListScreen navigation={nav} />
    </Provider>,
  );
  return { ...utils, navigate };
}

describe('AttendanceListScreen', () => {
  beforeEach(() => jest.clearAllMocks());

  it('renders day rows from the API', async () => {
    jest.spyOn(shiftsApi, 'getAttendanceDays').mockResolvedValue({
      data: { data: [day], meta: { total: 1, page: 1, limit: 20, totalPages: 1 } },
    } as any);

    const { getByTestId } = renderScreen();
    await waitFor(() => expect(getByTestId('attendance-day-2026-06-22')).toBeTruthy());
  });

  it('shows the empty state when there is no attendance', async () => {
    jest.spyOn(shiftsApi, 'getAttendanceDays').mockResolvedValue({
      data: { data: [], meta: { total: 0, page: 1, limit: 20, totalPages: 0 } },
    } as any);

    const { getByText } = renderScreen();
    await waitFor(() => expect(getByText('Belum ada kehadiran')).toBeTruthy());
  });

  it('navigates to the detail when a day is tapped', async () => {
    jest.spyOn(shiftsApi, 'getAttendanceDays').mockResolvedValue({
      data: { data: [day], meta: { total: 1, page: 1, limit: 20, totalPages: 1 } },
    } as any);

    const { getByTestId, navigate } = renderScreen();
    await waitFor(() => getByTestId('attendance-day-2026-06-22'));
    fireEvent.press(getByTestId('attendance-day-2026-06-22'));
    expect(navigate).toHaveBeenCalledWith('AttendanceDetail', { date: '2026-06-22' });
  });

  it('FAB reads "Clock In" with no active shift and opens the clock screen', async () => {
    jest.spyOn(shiftsApi, 'getAttendanceDays').mockResolvedValue({
      data: { data: [], meta: { total: 0, page: 1, limit: 20, totalPages: 0 } },
    } as any);

    const { getByText, navigate } = renderScreen();
    await waitFor(() => getByText('Belum ada kehadiran'));
    fireEvent.press(getByText('Clock In'));
    expect(navigate).toHaveBeenCalledWith('Absensi');
  });

  it('FAB reads "Clock Out" when a regular shift is active', async () => {
    jest.spyOn(shiftsApi, 'getAttendanceDays').mockResolvedValue({
      data: { data: [], meta: { total: 0, page: 1, limit: 20, totalPages: 0 } },
    } as any);

    const { getByText } = renderScreen(jest.fn(), { id: 's1', is_overtime: false });
    await waitFor(() => getByText('Belum ada kehadiran'));
    expect(getByText('Clock Out')).toBeTruthy();
  });
});
