import React from 'react';
import { render, waitFor, fireEvent } from '@testing-library/react-native';
import { AttendanceDetailScreen } from '../AttendanceDetailScreen';
import * as shiftsApi from '../../../services/api/shiftsApi';

jest.mock('../../../components/nb/NBBackgroundPattern', () => ({
  NBBackgroundPattern: ({ children }: any) => children,
}));

const mockNavigate = jest.fn();
jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useRoute: () => ({ params: { date: '2026-06-22' } }),
  useNavigation: () => ({ navigate: mockNavigate }),
  useFocusEffect: (cb: any) => {
    const React = require('react');
    React.useEffect(() => cb(), []);
  },
}));

// Light modal stubs so we only assert open/closed state, not gorhom internals.
jest.mock('../../../components/modals', () => {
  const React = require('react');
  const { Text } = require('react-native');
  return {
    TodayWorkHoursModal: ({ visible }: any) =>
      visible ? React.createElement(Text, null, 'workhours-modal-open') : null,
    ShiftDetailModal: ({ visible }: any) =>
      visible ? React.createElement(Text, null, 'shift-detail-open') : null,
  };
});

const shift: any = {
  id: 's1',
  clock_in_time: '2026-06-22T01:00:00Z',
  clock_out_time: '2026-06-22T09:00:00Z',
  shift_definition: null,
};

describe('AttendanceDetailScreen', () => {
  beforeEach(() => jest.clearAllMocks());

  it('renders the day summary rows from the API', async () => {
    jest.spyOn(shiftsApi, 'getAttendanceForDate').mockResolvedValue({
      data: { date: '2026-06-22', shifts: [shift] },
    } as any);

    const { getByText } = render(<AttendanceDetailScreen />);

    await waitFor(() => expect(getByText('Tanggal')).toBeTruthy());
    expect(getByText('Masuk')).toBeTruthy();
    expect(getByText('Keluar')).toBeTruthy();
    expect(getByText('Status Kehadiran')).toBeTruthy();
    expect(getByText('TEPAT WAKTU')).toBeTruthy(); // NBBadge uppercases; no schedule → on-time
    expect(getByText('1 shift')).toBeTruthy();
    expect(shiftsApi.getAttendanceForDate).toHaveBeenCalledWith('2026-06-22');
  });

  it('opens the day-shifts modal when the button is pressed', async () => {
    jest.spyOn(shiftsApi, 'getAttendanceForDate').mockResolvedValue({
      data: { date: '2026-06-22', shifts: [shift] },
    } as any);

    const { getByText, queryByText } = render(<AttendanceDetailScreen />);
    await waitFor(() => getByText('Lihat Rincian Shift'));

    expect(queryByText('workhours-modal-open')).toBeNull();
    fireEvent.press(getByText('Lihat Rincian Shift'));
    expect(getByText('workhours-modal-open')).toBeTruthy();
  });

  it('shows an empty state when the day has no shifts', async () => {
    jest.spyOn(shiftsApi, 'getAttendanceForDate').mockResolvedValue({
      data: { date: '2026-06-22', shifts: [] },
    } as any);

    const { getByText } = render(<AttendanceDetailScreen />);
    await waitFor(() => expect(getByText('Tidak ada kehadiran pada hari ini')).toBeTruthy());
  });
});
