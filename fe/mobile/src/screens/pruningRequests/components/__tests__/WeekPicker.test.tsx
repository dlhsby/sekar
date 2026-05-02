/**
 * WeekPicker tests — ADR-035 amendment 2026-05-01.
 */
import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { WeekPicker } from '../WeekPicker';
import type { RawCapacityRow } from '../../utils/capacityCalendar';

// Stub the same capacity slice shape the real screen feeds in. Six future
// weeks: first three available, fourth full, rest unknown (no capacity row).
function buildRows(): RawCapacityRow[] {
  const today = new Date();
  const rows: RawCapacityRow[] = [];
  const cursor = new Date(today);
  for (let i = 0; i < 4; i += 1) {
    // Compute (year, isoWeek) the same way the projection util does.
    const thu = new Date(cursor);
    thu.setDate(thu.getDate() + (4 - (cursor.getDay() || 7)));
    const year = thu.getFullYear();
    const jan4 = new Date(year, 0, 4);
    const thu1 = new Date(jan4);
    thu1.setDate(thu1.getDate() + (4 - (jan4.getDay() || 7)));
    const isoWeek = Math.round((thu.getTime() - thu1.getTime()) / (7 * 24 * 60 * 60 * 1000)) + 1;

    rows.push({
      year,
      iso_week: isoWeek,
      service_type: 'pruning',
      capacity_units: 10,
      booked_units: i === 3 ? 10 : 2,
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
    const { getAllByRole } = render(
      <WeekPicker rows={buildRows()} selected={null} onSelect={onSelect} />,
    );
    // Find the first non-disabled week card. Available status is the first
    // three rows so card index 0 should be tappable.
    const cards = getAllByRole('button');
    fireEvent.press(cards[0]);
    expect(onSelect).toHaveBeenCalledTimes(1);
    const arg = onSelect.mock.calls[0][0];
    expect(arg.year).toEqual(expect.any(Number));
    expect(arg.isoWeek).toEqual(expect.any(Number));
  });

  it('disables a card whose week is fully booked', () => {
    const onSelect = jest.fn();
    const { getAllByRole } = render(
      <WeekPicker rows={buildRows()} selected={null} onSelect={onSelect} />,
    );
    const cards = getAllByRole('button');
    // The 4th card (index 3) was seeded full.
    fireEvent.press(cards[3]);
    // disabled cards still receive the press event but the touchable's
    // accessibilityState.disabled should be true.
    expect(cards[3].props.accessibilityState?.disabled).toBe(true);
    // No onSelect when disabled (TouchableOpacity disables press internally).
    expect(onSelect).not.toHaveBeenCalled();
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
