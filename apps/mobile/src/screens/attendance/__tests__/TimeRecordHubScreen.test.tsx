import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { TimeRecordHubScreen } from '../TimeRecordHubScreen';
import * as shiftsApi from '../../../services/api/shiftsApi';

const mockNavigate = jest.fn();
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: mockNavigate }),
  useFocusEffect: (cb: () => void) => {
    const React = require('react');
    React.useEffect(() => cb(), []);
  },
}));
jest.mock('../../../hooks/useTodayRoster', () => ({
  useTodayRoster: () => ({
    rosterShift: null,
    hasScheduleToday: false,
    roster: null,
    allToday: [],
    loading: false,
    refetch: jest.fn().mockResolvedValue(undefined),
  }),
}));
jest.mock('../../../hooks/useCurrentShiftState', () => ({
  useCurrentShiftState: () => ({
    options: [],
    openSession: null,
    hasOpenSession: false,
    loading: false,
    refetch: jest.fn().mockResolvedValue(undefined),
    // No attribution option + null roster → the shared helper yields "no shift".
    displayShift: () => null,
  }),
}));

describe('TimeRecordHubScreen', () => {
  beforeEach(() => mockNavigate.mockClear());

  it('renders the hub and routes Clock In / Clock Out / Jadwal / Log Kehadiran', async () => {
    jest
      .spyOn(shiftsApi, 'getPunchLog')
      .mockResolvedValue({ data: { date: '2026-07-25', sessions: [] }, error: null } as any);

    const { getByTestId } = render(<TimeRecordHubScreen />);
    await waitFor(() => expect(getByTestId('entry-clock-in')).toBeTruthy());

    fireEvent.press(getByTestId('entry-clock-in'));
    expect(mockNavigate).toHaveBeenCalledWith('Absensi', { action: 'clock_in' });

    fireEvent.press(getByTestId('entry-clock-out'));
    expect(mockNavigate).toHaveBeenCalledWith('Absensi', { action: 'clock_out' });

    fireEvent.press(getByTestId('entry-view-schedule'));
    expect(mockNavigate).toHaveBeenCalledWith('MySchedule');

    fireEvent.press(getByTestId('entry-view-log'));
    expect(mockNavigate).toHaveBeenCalledWith('Attendance');
  });
});
