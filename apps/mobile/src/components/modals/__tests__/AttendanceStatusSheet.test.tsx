import React from 'react';
import { render } from '@testing-library/react-native';
import { AttendanceStatusSheet } from '../AttendanceStatusSheet';

describe('AttendanceStatusSheet', () => {
  it('explains a late status and shows the two times', () => {
    const { getByText } = render(
      <AttendanceStatusSheet
        visible
        onClose={jest.fn()}
        status="late"
        clockInTime={new Date('2026-07-24T21:39:00+07:00')}
        shiftStart="21:00:00"
      />,
    );
    expect(getByText(/tercatat terlambat/i)).toBeTruthy();
    expect(getByText('Clock in')).toBeTruthy();
    expect(getByText('Jadwal mulai')).toBeTruthy();
    expect(getByText('21:00')).toBeTruthy();
  });

  it('explains a no-schedule status without the time rows', () => {
    const { getByText, queryByText } = render(
      <AttendanceStatusSheet visible onClose={jest.fn()} status="noSchedule" />,
    );
    expect(getByText(/tidak memiliki jadwal/i)).toBeTruthy();
    expect(queryByText('Jadwal mulai')).toBeNull();
  });
});
