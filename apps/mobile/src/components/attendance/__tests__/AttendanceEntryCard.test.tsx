/**
 * AttendanceEntryCard — the "belum clock in" banner gate.
 *
 * The banner accuses the worker of missing a clock-in. That is only fair when
 * there IS a shift to miss: an unscheduled worker owes nothing, so the card must
 * stay quiet rather than warn about a shift that does not exist.
 */
import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';

import { AttendanceEntryCard } from '../AttendanceEntryCard';

const baseProps = {
  date: '2026-07-31',
  shiftLabel: 'Tidak Ada Shift',
  jamMasuk: null,
  jamKeluar: null,
  onClockIn: jest.fn(),
  onClockOut: jest.fn(),
};

const BANNER = /belum clock ?in/i;

describe('AttendanceEntryCard — belum-clock-in banner', () => {
  it('warns when the worker is rostered but has not clocked in', () => {
    const { queryByText } = render(
      <AttendanceEntryCard {...baseProps} hasRecordToday={false} hasScheduleToday />,
    );
    expect(queryByText(BANNER)).toBeTruthy();
  });

  it('stays quiet when there is no schedule today — nothing was missed', () => {
    const { queryByText } = render(
      <AttendanceEntryCard {...baseProps} hasRecordToday={false} hasScheduleToday={false} />,
    );
    expect(queryByText(BANNER)).toBeNull();
  });

  it('stays quiet once a punch is recorded, scheduled or not', () => {
    const scheduled = render(
      <AttendanceEntryCard {...baseProps} hasRecordToday hasScheduleToday />,
    );
    expect(scheduled.queryByText(BANNER)).toBeNull();

    const unscheduled = render(
      <AttendanceEntryCard {...baseProps} hasRecordToday hasScheduleToday={false} />,
    );
    expect(unscheduled.queryByText(BANNER)).toBeNull();
  });

  it('defaults to warning when the caller says nothing about the roster', () => {
    // Back-compat: an older call site that omits the prop keeps its behaviour.
    const { queryByText } = render(<AttendanceEntryCard {...baseProps} hasRecordToday={false} />);
    expect(queryByText(BANNER)).toBeTruthy();
  });

  it('lists the other shifts today, so a multi-shift worker sees all of them', () => {
    const { queryByText } = render(
      <AttendanceEntryCard
        {...baseProps}
        shiftLabel="Shift 2 · 15:00–23:00"
        hasRecordToday={false}
        hasScheduleToday
        otherShiftLabels={['Shift 3 · 21:00–05:00']}
        onChangeShift={jest.fn()}
      />,
    );
    expect(queryByText('Shift 2 · 15:00–23:00')).toBeTruthy();
    expect(queryByText('Anda memiliki shift lain yang tersedia:')).toBeTruthy();
    expect(queryByText('Shift 3 · 21:00–05:00')).toBeTruthy();
  });

  it('offers Ubah Shift only when there is something to switch to', () => {
    const withChoice = render(
      <AttendanceEntryCard
        {...baseProps}
        hasRecordToday={false}
        otherShiftLabels={['Shift 3 · 21:00–05:00']}
        onChangeShift={jest.fn()}
      />,
    );
    expect(withChoice.queryByTestId('entry-change-shift')).toBeTruthy();

    const single = render(<AttendanceEntryCard {...baseProps} hasRecordToday={false} />);
    expect(single.queryByTestId('entry-change-shift')).toBeNull();
    expect(single.queryByText(/shift lain yang tersedia/)).toBeNull();
  });

  it('invokes the picker when Ubah Shift is pressed', () => {
    const onChangeShift = jest.fn();
    const { getByTestId } = render(
      <AttendanceEntryCard
        {...baseProps}
        hasRecordToday={false}
        otherShiftLabels={['Shift 3 · 21:00–05:00']}
        onChangeShift={onChangeShift}
      />,
    );
    fireEvent.press(getByTestId('entry-change-shift'));
    expect(onChangeShift).toHaveBeenCalled();
  });

  it('always shows the shift label and both punch buttons', () => {
    const { queryByText, getByTestId } = render(
      <AttendanceEntryCard {...baseProps} hasRecordToday={false} hasScheduleToday={false} />,
    );
    expect(queryByText('Tidak Ada Shift')).toBeTruthy();
    expect(getByTestId('entry-clock-in')).toBeTruthy();
    expect(getByTestId('entry-clock-out')).toBeTruthy();
  });
});
