import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { AttendanceDayCard } from '../AttendanceDayCard';
import type { AttendanceDaySummary } from '../../../../types/api.types';

const base: AttendanceDaySummary = {
  date: '2026-06-22',
  first_clock_in: '2026-06-22T01:00:00Z',
  last_clock_out: '2026-06-22T09:00:00Z',
  shift_count: 2,
  total_worked_minutes: 125,
  scheduled_start_time: null,
  crosses_midnight: false,
  has_active: false,
};

describe('AttendanceDayCard', () => {
  it('shows an on-time pill when there is no schedule to be late against', () => {
    const { getByText } = render(<AttendanceDayCard summary={base} onPress={jest.fn()} />);
    expect(getByText('Tepat Waktu')).toBeTruthy();
  });

  it('shows a late pill when the first clock-in is after the scheduled start', () => {
    // scheduled 00:00 → any clock-in time is "late" regardless of the test timezone.
    const late = { ...base, scheduled_start_time: '00:00:00' };
    const { getByText } = render(<AttendanceDayCard summary={late} onPress={jest.fn()} />);
    expect(getByText('Terlambat')).toBeTruthy();
  });

  it('renders Masuk/Keluar/duration/shift-count meta', () => {
    const { getByText } = render(<AttendanceDayCard summary={base} onPress={jest.fn()} />);
    expect(getByText(/^Masuk \d{2}:\d{2}$/)).toBeTruthy();
    expect(getByText(/^Keluar \d{2}:\d{2}$/)).toBeTruthy();
    expect(getByText('2j 5m')).toBeTruthy(); // 125 minutes
    expect(getByText('2 shift')).toBeTruthy();
  });

  it('renders an em-dash for Keluar while a shift is still active', () => {
    const active = { ...base, last_clock_out: null, has_active: true };
    const { getByText } = render(<AttendanceDayCard summary={active} onPress={jest.fn()} />);
    expect(getByText('Keluar —')).toBeTruthy();
  });

  it('fires onPress when tapped', () => {
    const onPress = jest.fn();
    const { getByTestId } = render(<AttendanceDayCard summary={base} onPress={onPress} />);
    fireEvent.press(getByTestId('attendance-day-2026-06-22'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });
});
