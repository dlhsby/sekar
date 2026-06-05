/**
 * StatusSummaryBar tests — Phase 4 M3 (CP2).
 *
 * The bar merged the old peek chips + "Ringkasan" tile grid into one surface:
 * four tone-tinted cards (dot + count + presencePill label) in a horizontal
 * scroller. Tapping a card toggles the map status filter. Covers: label/count
 * rendering, offline excluded, toggle behaviour, accessibility, testIDs.
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { StatusSummaryBar } from '../StatusSummaryBar';
import type { TrackingStatus } from '../../../types/models.types';

const defaultStatusCounts = {
  active: 5,
  inactive: 3,
  outside_area: 2,
  missing: 1,
  offline: 4,
};

describe('StatusSummaryBar', () => {
  const onFilterChange = jest.fn();

  beforeEach(() => jest.clearAllMocks());

  describe('rendering', () => {
    it('renders the four presence labels (active/inactive/outside/missing)', () => {
      const { getByText } = render(
        <StatusSummaryBar
          statusCounts={defaultStatusCounts}
          activeFilter={null}
          onFilterChange={onFilterChange}
        />,
      );
      expect(getByText('Aktif')).toBeTruthy();
      expect(getByText('Tidak aktif')).toBeTruthy();
      expect(getByText('Luar area')).toBeTruthy();
      expect(getByText('Tidak terdeteksi')).toBeTruthy();
    });

    it('does not render an offline chip', () => {
      const { queryByText, queryByTestId } = render(
        <StatusSummaryBar
          statusCounts={defaultStatusCounts}
          activeFilter={null}
          onFilterChange={onFilterChange}
        />,
      );
      expect(queryByText('Offline')).toBeNull();
      expect(queryByTestId('status-chip-offline')).toBeNull();
    });

    it('renders the count for each displayed status', () => {
      const counts = { active: 7, inactive: 4, outside_area: 2, missing: 1, offline: 9 };
      const { getByText, queryByText } = render(
        <StatusSummaryBar
          statusCounts={counts}
          activeFilter={null}
          onFilterChange={onFilterChange}
        />,
      );
      expect(getByText('7')).toBeTruthy();
      expect(getByText('4')).toBeTruthy();
      expect(getByText('2')).toBeTruthy();
      expect(getByText('1')).toBeTruthy();
      // offline count (9) must not surface
      expect(queryByText('9')).toBeNull();
    });

    it('renders a 0 for every status when counts are all zero', () => {
      const zero = { active: 0, inactive: 0, outside_area: 0, missing: 0, offline: 0 };
      const { getAllByText } = render(
        <StatusSummaryBar
          statusCounts={zero}
          activeFilter={null}
          onFilterChange={onFilterChange}
        />,
      );
      expect(getAllByText('0')).toHaveLength(4);
    });

    it('exposes a stable testID per chip', () => {
      const { getByTestId } = render(
        <StatusSummaryBar
          statusCounts={defaultStatusCounts}
          activeFilter={null}
          onFilterChange={onFilterChange}
        />,
      );
      expect(getByTestId('status-chip-active')).toBeTruthy();
      expect(getByTestId('status-chip-inactive')).toBeTruthy();
      expect(getByTestId('status-chip-outside_area')).toBeTruthy();
      expect(getByTestId('status-chip-missing')).toBeTruthy();
    });
  });

  describe('interaction', () => {
    it('calls onFilterChange with the tapped status when no filter is active', () => {
      const { getByTestId } = render(
        <StatusSummaryBar
          statusCounts={defaultStatusCounts}
          activeFilter={null}
          onFilterChange={onFilterChange}
        />,
      );
      fireEvent.press(getByTestId('status-chip-active'));
      expect(onFilterChange).toHaveBeenCalledTimes(1);
      expect(onFilterChange).toHaveBeenCalledWith('active');
    });

    it('toggles the filter off when the active chip is tapped again', () => {
      const { getByTestId } = render(
        <StatusSummaryBar
          statusCounts={defaultStatusCounts}
          activeFilter={'active' as TrackingStatus}
          onFilterChange={onFilterChange}
        />,
      );
      fireEvent.press(getByTestId('status-chip-active'));
      expect(onFilterChange).toHaveBeenCalledWith(null);
    });

    it('switches the filter when a different chip is tapped', () => {
      const { getByTestId } = render(
        <StatusSummaryBar
          statusCounts={defaultStatusCounts}
          activeFilter={'inactive' as TrackingStatus}
          onFilterChange={onFilterChange}
        />,
      );
      fireEvent.press(getByTestId('status-chip-missing'));
      expect(onFilterChange).toHaveBeenCalledWith('missing');
    });
  });

  describe('accessibility', () => {
    it('labels each chip "Filter <label>: <count>"', () => {
      const { getByLabelText } = render(
        <StatusSummaryBar
          statusCounts={defaultStatusCounts}
          activeFilter={null}
          onFilterChange={onFilterChange}
        />,
      );
      expect(getByLabelText('Filter Aktif: 5')).toBeTruthy();
      expect(getByLabelText('Filter Tidak aktif: 3')).toBeTruthy();
      expect(getByLabelText('Filter Luar area: 2')).toBeTruthy();
      expect(getByLabelText('Filter Tidak terdeteksi: 1')).toBeTruthy();
    });

    it('marks the active chip as selected', () => {
      const { getByTestId } = render(
        <StatusSummaryBar
          statusCounts={defaultStatusCounts}
          activeFilter={'active' as TrackingStatus}
          onFilterChange={onFilterChange}
        />,
      );
      expect(getByTestId('status-chip-active').props.accessibilityState).toEqual(
        expect.objectContaining({ selected: true }),
      );
      expect(getByTestId('status-chip-inactive').props.accessibilityState).toEqual(
        expect.objectContaining({ selected: false }),
      );
    });

    it('sets accessibilityRole button on each chip', () => {
      const { getByTestId } = render(
        <StatusSummaryBar
          statusCounts={defaultStatusCounts}
          activeFilter={null}
          onFilterChange={onFilterChange}
        />,
      );
      expect(getByTestId('status-chip-active').props.accessibilityRole).toBe('button');
    });
  });

  describe('edge cases', () => {
    it('renders large counts without crashing', () => {
      const large = { active: 9999, inactive: 8888, outside_area: 7777, missing: 6666, offline: 5555 };
      const { getByText } = render(
        <StatusSummaryBar
          statusCounts={large}
          activeFilter={null}
          onFilterChange={onFilterChange}
        />,
      );
      expect(getByText('9999')).toBeTruthy();
    });
  });
});
