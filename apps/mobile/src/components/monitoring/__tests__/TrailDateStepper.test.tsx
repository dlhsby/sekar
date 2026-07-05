/**
 * TrailDateStepper tests — Phase 4 M3 (CP4).
 *
 * Compact date control in the trail viewer's NBModal header. Covers prev/next
 * stepping, the today cap (no forward stepping into the future), and opening the
 * picker. NBDatePicker is stubbed to expose its `onChange`/`visible` so we can
 * assert the picker path without rendering the real calendar.
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { TrailDateStepper } from '../TrailDateStepper';

jest.mock('react-native-vector-icons/MaterialCommunityIcons', () => {
  const React = require('react');
  const { Text } = require('react-native');
  return (props: any) => React.createElement(Text, { testID: `icon-${props.name}` }, props.name);
});

// Stub NBDatePicker: render nothing but expose props for assertions via a spy.
const datePickerProps: any = {};
jest.mock('../../nb/NBDatePicker', () => ({
  NBDatePicker: (props: any) => {
    Object.assign(datePickerProps, props);
    return null;
  },
}));

describe('TrailDateStepper', () => {
  beforeEach(() => {
    for (const k of Object.keys(datePickerProps)) { delete datePickerProps[k]; }
  });

  it('steps back one day on prev', () => {
    const onDateChange = jest.fn();
    const { getByTestId } = render(
      <TrailDateStepper date="2026-03-05" onDateChange={onDateChange} />,
    );
    fireEvent.press(getByTestId('trail-date-prev'));
    expect(onDateChange).toHaveBeenCalledWith('2026-03-04');
  });

  it('steps forward one day on next when the date is in the past', () => {
    const onDateChange = jest.fn();
    const { getByTestId } = render(
      <TrailDateStepper date="2020-01-01" onDateChange={onDateChange} />,
    );
    fireEvent.press(getByTestId('trail-date-next'));
    expect(onDateChange).toHaveBeenCalledWith('2020-01-02');
  });

  it('caps forward stepping at today (next is disabled, no callback)', () => {
    const onDateChange = jest.fn();
    // A far-future date is clamped to "today" semantics → next disabled.
    const { getByTestId } = render(
      <TrailDateStepper date="2999-12-31" onDateChange={onDateChange} />,
    );
    fireEvent.press(getByTestId('trail-date-next'));
    expect(onDateChange).not.toHaveBeenCalled();
  });

  it('opens the picker and forwards the picked date as ISO', () => {
    const onDateChange = jest.fn();
    const { getByTestId } = render(
      <TrailDateStepper date="2026-03-05" onDateChange={onDateChange} />,
    );
    fireEvent.press(getByTestId('trail-date-label'));
    // Picker is wired with onChange → emits an ISO date string.
    datePickerProps.onChange(new Date(2026, 2, 1)); // 1 Mar 2026 (month is 0-based)
    expect(onDateChange).toHaveBeenCalledWith('2026-03-01');
  });
});
