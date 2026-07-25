import React from 'react';
import { Text } from 'react-native';
import { render, fireEvent } from '@testing-library/react-native';
import { AttendanceInfoRows } from '../AttendanceInfoRows';

const baseProps = {
  statusBadge: <Text>TERLAMBAT</Text>,
  areaStatus: { tone: 'bad' as const, label: 'Di luar area' },
};

describe('AttendanceInfoRows', () => {
  it('renders the two pill rows (status + area status)', () => {
    const { getByText } = render(<AttendanceInfoRows {...baseProps} />);
    expect(getByText('Status Kehadiran')).toBeTruthy();
    expect(getByText('TERLAMBAT')).toBeTruthy();
    expect(getByText('Status Area')).toBeTruthy();
    expect(getByText('Di luar area')).toBeTruthy();
  });

  it('taps the status badge → why explanation', () => {
    const onPressStatus = jest.fn();
    const { getByTestId } = render(
      <AttendanceInfoRows {...baseProps} onPressStatus={onPressStatus} />,
    );
    fireEvent.press(getByTestId('attendance-status-badge'));
    expect(onPressStatus).toHaveBeenCalled();
  });

  it('taps the area-status pill → open the map', () => {
    const onPress = jest.fn();
    const { getByTestId } = render(
      <AttendanceInfoRows {...baseProps} areaStatus={{ ...baseProps.areaStatus, onPress }} />,
    );
    fireEvent.press(getByTestId('attendance-area-status'));
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
