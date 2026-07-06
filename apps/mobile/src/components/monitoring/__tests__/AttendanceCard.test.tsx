/**
 * AttendanceCard tests — Phase 4 M3 (CP3).
 *
 * AttendanceCard is now a thin adapter over the standardized ListItemCard.
 * Covers: presence pill (clocked-in vs not), worker name title, area meta,
 * right-text (clock-in time vs "Belum clock in"), and press passthrough.
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import AttendanceCard from '../AttendanceCard';

jest.mock('react-native-vector-icons/MaterialCommunityIcons', () => {
  const React = require('react');
  const { Text } = require('react-native');
  return (props: any) => React.createElement(Text, { testID: `icon-${props.name}` }, props.name);
});

describe('AttendanceCard', () => {
  it('renders the worker name and area', () => {
    const { getByText } = render(
      <AttendanceCard workerName="Jane Smith" status="not_clocked_in" areaName="Taman Harmoni" />,
    );
    expect(getByText('Jane Smith')).toBeTruthy();
    expect(getByText('Taman Harmoni')).toBeTruthy();
  });

  it('shows the "Tidak aktif" pill and "Belum clock in" for not-clocked-in', () => {
    const { getByText } = render(
      <AttendanceCard workerName="Jane Smith" status="not_clocked_in" areaName="Taman Harmoni" />,
    );
    expect(getByText('Tidak aktif')).toBeTruthy();
    expect(getByText('Belum clock in')).toBeTruthy();
  });

  it('shows the "Aktif" pill and the clock-in time for clocked-in', () => {
    const { getByText } = render(
      <AttendanceCard
        workerName="John Doe"
        status="clocked_in"
        clockInTime="2026-01-19T08:30:00Z"
        areaName="Taman Bungkul"
      />,
    );
    expect(getByText('Aktif')).toBeTruthy();
    // 08:30 UTC → rendered in local tz as HH:MM; just assert a time-like string.
    expect(getByText(/^\d{2}:\d{2}$/)).toBeTruthy();
  });

  it('falls back to an em dash when no area is given', () => {
    const { getByText } = render(
      <AttendanceCard workerName="No Area" status="not_clocked_in" />,
    );
    expect(getByText('—')).toBeTruthy();
  });

  it('calls onPress when tapped', () => {
    const onPress = jest.fn();
    const { getByTestId } = render(
      <AttendanceCard
        workerName="Jane Smith"
        status="not_clocked_in"
        areaName="Taman Harmoni"
        onPress={onPress}
        testID="att-row"
      />,
    );
    fireEvent.press(getByTestId('att-row'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });
});
