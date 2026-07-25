import React from 'react';
import { Text } from 'react-native';
import { render, fireEvent } from '@testing-library/react-native';
import { AttendanceInfoRows } from '../AttendanceInfoRows';

const baseProps = {
  statusBadge: <Text>TERLAMBAT</Text>,
  areaName: 'Rayon Barat 1',
  areaStatus: { tone: 'bad' as const, label: 'Di luar area' },
};

describe('AttendanceInfoRows', () => {
  it('renders the shared core rows (shift, status, area, area status)', () => {
    const { getByText } = render(
      <AttendanceInfoRows {...baseProps} shiftText="Shift 3 · 21:00–05:00" />,
    );

    expect(getByText('Jadwal Shift')).toBeTruthy();
    expect(getByText('Shift 3 · 21:00–05:00')).toBeTruthy();
    expect(getByText('Status Kehadiran')).toBeTruthy();
    expect(getByText('TERLAMBAT')).toBeTruthy();
    expect(getByText('Area Ditugaskan')).toBeTruthy();
    expect(getByText('Rayon Barat 1')).toBeTruthy();
    expect(getByText('Status Area')).toBeTruthy();
    expect(getByText('Di luar area')).toBeTruthy();
  });

  it('omits the Jadwal Shift row when shiftText is null', () => {
    const { queryByText } = render(<AttendanceInfoRows {...baseProps} shiftText={null} />);
    expect(queryByText('Jadwal Shift')).toBeNull();
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
});
