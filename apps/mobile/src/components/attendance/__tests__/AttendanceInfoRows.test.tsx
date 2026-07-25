import React from 'react';
import { Text } from 'react-native';
import { render, fireEvent } from '@testing-library/react-native';
import { AttendanceInfoRows } from '../AttendanceInfoRows';

const baseProps = {
  statusBadge: <Text>TERLAMBAT</Text>,
  currentTime: new Date('2026-07-25T07:09:00+07:00'),
  areaName: 'Rayon Barat 1',
  areaStatus: { tone: 'bad' as const, label: 'Di luar area' },
  location: { latitude: -7.244722, longitude: 112.618531, accuracy: 6, loading: false },
};

describe('AttendanceInfoRows', () => {
  it('renders the shared rows in order (shift, status, area, area status, location)', () => {
    const { getByText } = render(
      <AttendanceInfoRows {...baseProps} shiftText="Shift 3 · 21:00–05:00" durationText="10:06" />,
    );

    expect(getByText('Jadwal Shift')).toBeTruthy();
    expect(getByText('Shift 3 · 21:00–05:00')).toBeTruthy();
    expect(getByText('Status Kehadiran')).toBeTruthy();
    expect(getByText('TERLAMBAT')).toBeTruthy();
    expect(getByText('Durasi shift berjalan')).toBeTruthy();
    expect(getByText('10:06')).toBeTruthy();
    expect(getByText('Waktu Sekarang')).toBeTruthy();
    expect(getByText('Area Ditugaskan')).toBeTruthy();
    expect(getByText('Rayon Barat 1')).toBeTruthy();
    expect(getByText('Status Area')).toBeTruthy();
    expect(getByText('Di luar area')).toBeTruthy();
    expect(getByText('Lokasi sekarang')).toBeTruthy();
    expect(getByText('-7.24472, 112.61853')).toBeTruthy();
    expect(getByText('±6m')).toBeTruthy();
  });

  it('omits the shift, clock-in, duration rows when not provided', () => {
    const { queryByText } = render(<AttendanceInfoRows {...baseProps} shiftText={null} />);
    expect(queryByText('Jadwal Shift')).toBeNull();
    expect(queryByText('Mulai clock in')).toBeNull();
    expect(queryByText('Durasi shift berjalan')).toBeNull();
  });

  it('taps the area-status pill to open the map', () => {
    const onPress = jest.fn();
    const { getByText } = render(
      <AttendanceInfoRows
        {...baseProps}
        areaStatus={{ ...baseProps.areaStatus, onPress, a11yLabel: 'peta' }}
      />,
    );
    fireEvent.press(getByText('Di luar area'));
    expect(onPress).toHaveBeenCalled();
  });

  it('shows the refresh control only when onRefreshLocation is given', () => {
    const { queryByTestId, rerender } = render(<AttendanceInfoRows {...baseProps} />);
    expect(queryByTestId('attendance-refresh-location')).toBeNull();

    rerender(<AttendanceInfoRows {...baseProps} onRefreshLocation={jest.fn()} />);
    expect(queryByTestId('attendance-refresh-location')).toBeTruthy();
  });

  it('shows the Detail Shift link only when onDetailShift is given', () => {
    const onDetailShift = jest.fn();
    const { getByTestId } = render(
      <AttendanceInfoRows {...baseProps} onDetailShift={onDetailShift} />,
    );
    fireEvent.press(getByTestId('shift-detail-link'));
    expect(onDetailShift).toHaveBeenCalled();
  });
});
