import React from 'react';
import { StyleSheet } from 'react-native';
import { render } from '@testing-library/react-native';
import { AttendanceSummaryRow } from '../AttendanceSummaryRow';
import { nbColors } from '../../../constants/nbTokens';

// Two clearly different local times so formatTime renders distinct values.
const IN = '2026-06-22T01:00:00Z';
const OUT = '2026-06-22T10:00:00Z';

function colorOf(node: { props: { style?: unknown } }): string | undefined {
  return (StyleSheet.flatten(node.props.style) as { color?: string }).color;
}

describe('AttendanceSummaryRow', () => {
  it('no longer renders a "Terlambat" pill', () => {
    const { queryByText } = render(
      <AttendanceSummaryRow firstClockIn={IN} lastClockOut={OUT} isLate isEarlyLeave />,
    );
    expect(queryByText('Terlambat')).toBeNull();
  });

  it('colours a late clock-in danger and an early clock-out danger', () => {
    const { getAllByText } = render(
      <AttendanceSummaryRow firstClockIn={IN} lastClockOut={OUT} isLate isEarlyLeave />,
    );
    const times = getAllByText(/^\d{2}:\d{2}$/); // [Masuk, Keluar]
    times.forEach((t) => expect(colorOf(t)).toBe(nbColors.dangerDark));
  });

  it('colours an on-time clock-in success', () => {
    const { getAllByText } = render(
      <AttendanceSummaryRow firstClockIn={IN} lastClockOut={OUT} isLate={false} isEarlyLeave={false} />,
    );
    const times = getAllByText(/^\d{2}:\d{2}$/);
    // Both Masuk (on-time) and Keluar (not early) should read success-dark.
    times.forEach((t) => expect(colorOf(t)).toBe(nbColors.successDark));
  });

  it('shows an em-dash and a muted colour when there is no clock-out', () => {
    const { getByText } = render(
      <AttendanceSummaryRow firstClockIn={IN} lastClockOut={undefined} isLate={false} />,
    );
    const keluar = getByText('—');
    expect(colorOf(keluar)).toBe(nbColors.gray600);
  });
});
