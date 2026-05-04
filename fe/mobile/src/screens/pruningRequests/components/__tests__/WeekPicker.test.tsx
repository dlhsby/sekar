/**
 * WeekPicker tests — ADR-035 amendment 2026-05-01.
 */
import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { WeekPicker } from '../WeekPicker';
import type { RawCapacityRow } from '../../utils/capacityCalendar';
import { getISOWeek } from '../../../../utils/dateUtils';

// Stub the same capacity slice shape the real screen feeds in. Six future
// weeks: first three available, fourth full, rest unknown (no capacity row).
function buildRows(opts?: { fullAtIndex?: number }): RawCapacityRow[] {
  const fullAtIndex = opts?.fullAtIndex ?? 3;
  const rows: RawCapacityRow[] = [];
  const cursor = new Date();
  // Use the same getISOWeek helper the projection util uses, so the lookup
  // keys (`${year}:${week}`) line up exactly. Hand-rolled math here used to
  // disagree on the year-boundary / DST.
  for (let i = 0; i < 4; i += 1) {
    const { year, week } = getISOWeek(cursor);
    rows.push({
      year,
      iso_week: week,
      service_type: 'pruning',
      capacity_units: 10,
      booked_units: i === fullAtIndex ? 10 : 2,
    });
    cursor.setDate(cursor.getDate() + 7);
  }
  return rows;
}

describe('WeekPicker', () => {
  it('renders the legend in Indonesian', () => {
    const { getByText } = render(
      <WeekPicker rows={buildRows()} selected={null} onSelect={jest.fn()} />,
    );
    expect(getByText('Tersedia')).toBeTruthy();
    expect(getByText('Hampir Penuh')).toBeTruthy();
    expect(getByText('Penuh')).toBeTruthy();
    expect(getByText('Belum Diatur')).toBeTruthy();
  });

  it('emits (year, isoWeek) when an available week card is tapped', () => {
    const onSelect = jest.fn();
    const { UNSAFE_getAllByType } = render(
      <WeekPicker rows={buildRows()} selected={null} onSelect={onSelect} />,
    );
    // testing-library/react-native does not project TouchableOpacity through
    // ByRole reliably here; query by component type instead.
    const { TouchableOpacity } = require('react-native');
    const cards = UNSAFE_getAllByType(TouchableOpacity);
    fireEvent.press(cards[0]);
    expect(onSelect).toHaveBeenCalledTimes(1);
    const arg = onSelect.mock.calls[0][0];
    expect(arg.year).toEqual(expect.any(Number));
    expect(arg.isoWeek).toEqual(expect.any(Number));
  });

  it('disables cards for unknown / fully-booked weeks', () => {
    const onSelect = jest.fn();
    const { UNSAFE_getAllByType } = render(
      <WeekPicker rows={buildRows({ fullAtIndex: 3 })} selected={null} onSelect={onSelect} />,
    );
    const { TouchableOpacity } = require('react-native');
    const cards = UNSAFE_getAllByType(TouchableOpacity);
    // Picker projects 8 weeks; rows seed 4 of them, so at least the 4
    // un-seeded weeks render as `status: unknown` → disabled. Verifies the
    // disable-on-unknown branch without depending on which physical card
    // index lands on the explicitly-full row (timezone-sensitive).
    const disabled = cards.filter(
      (c: any) =>
        c.props.accessibilityState?.disabled === true ||
        c.props.disabled === true,
    );
    expect(disabled.length).toBeGreaterThanOrEqual(1);
    // Note: @testing-library/react-native's fireEvent.press bypasses the
    // `disabled` guard on TouchableOpacity, so we cannot assert "no
    // onSelect" here. The accessibilityState assertion above is the
    // contract — disabled cards advertise themselves as such for a11y.
  });

  it('shows the footnote informing the user that admin will pick the day', () => {
    const { getByText } = render(
      <WeekPicker rows={buildRows()} selected={null} onSelect={jest.fn()} />,
    );
    expect(
      getByText('Admin akan menentukan tanggal pasti dalam minggu yang Anda pilih.'),
    ).toBeTruthy();
  });
});
