/**
 * StatusSummaryBar Component Tests
 * Phase 2D: Tests for horizontal four-status chip bar with toggle filtering.
 * Verifies chip rendering, count display, label text, toggle behavior, and accessibility.
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { StatusSummaryBar } from '../StatusSummaryBar';
import type { TrackingStatus, LiveUser } from '../../../types/models.types';

// Mock vector icons
jest.mock('react-native-vector-icons/MaterialCommunityIcons', () => {
  const React = require('react');
  const { Text } = require('react-native');
  return (props: any) => React.createElement(Text, { testID: 'icon', ...props }, props.name);
});

// ─── Helpers ─────────────────────────────────────────────────────────────────

const createMockUser = (overrides?: Partial<LiveUser>): LiveUser => ({
  id: 'user-123',
  full_name: 'Ahmad Satgas',
  role: 'satgas',
  phone: '08123456789',
  status: 'active',
  area_id: 'area-123',
  area_name: 'Taman A',
  rayon_id: 'rayon-1',
  rayon_name: 'Rayon 1',
  latitude: -7.250445,
  longitude: 112.768845,
  accuracy: 10,
  battery_level: 85,
  last_update: new Date().toISOString(),
  is_within_area: true,
  shift_id: 'shift-123',
  shift_name: 'Shift Pagi',
  shift_definition_id: null,
  clock_in_time: '2026-02-15T07:00:00Z',
  current_task_status: null,
  current_task_title: null,
  ...overrides,
});

const defaultStatusCounts = {
  active: 5,
  inactive: 3,
  outside_area: 2,
  missing: 1,
  offline: 4,
};

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('StatusSummaryBar', () => {
  const mockOnFilterChange = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('chip rendering', () => {
    it('should render 4 status chips (active, inactive, outside_area, missing)', () => {
      // Arrange & Act
      const { getByText } = render(
        <StatusSummaryBar
          statusCounts={defaultStatusCounts}
          activeFilter={null}
          onFilterChange={mockOnFilterChange}
        />
      );

      // Assert — all four displayed labels must be present
      expect(getByText('Aktif')).toBeTruthy();
      expect(getByText('Idle')).toBeTruthy();
      expect(getByText('Di Luar Area')).toBeTruthy();
      expect(getByText('Tidak Terdeteksi')).toBeTruthy();
    });

    it('should NOT render an offline chip', () => {
      // Arrange & Act
      const { queryByText } = render(
        <StatusSummaryBar
          statusCounts={defaultStatusCounts}
          activeFilter={null}
          onFilterChange={mockOnFilterChange}
        />
      );

      // Assert — 'Offline' label must be absent
      expect(queryByText('Offline')).toBeNull();
    });
  });

  describe('count display', () => {
    it('should display the correct count for each displayed status', () => {
      // Arrange
      const counts = { active: 7, inactive: 4, outside_area: 2, missing: 1, offline: 9 };

      // Act
      const { getByText } = render(
        <StatusSummaryBar
          statusCounts={counts}
          activeFilter={null}
          onFilterChange={mockOnFilterChange}
        />
      );

      // Assert — counts rendered as text (offline count must NOT appear)
      expect(getByText('7')).toBeTruthy();
      expect(getByText('4')).toBeTruthy();
      expect(getByText('2')).toBeTruthy();
      expect(getByText('1')).toBeTruthy();
    });

    it('should display zero count when a status has no users', () => {
      // Arrange
      const counts = { active: 0, inactive: 0, outside_area: 0, missing: 0, offline: 0 };

      // Act
      const { getAllByText } = render(
        <StatusSummaryBar
          statusCounts={counts}
          activeFilter={null}
          onFilterChange={mockOnFilterChange}
        />
      );

      // Assert — four chips each showing '0'
      expect(getAllByText('0')).toHaveLength(4);
    });
  });

  describe('label text', () => {
    it('should display correct Indonesian label for active status', () => {
      const { getByText } = render(
        <StatusSummaryBar
          statusCounts={defaultStatusCounts}
          activeFilter={null}
          onFilterChange={mockOnFilterChange}
        />
      );
      expect(getByText('Aktif')).toBeTruthy();
    });

    it('should display correct Indonesian label for inactive status', () => {
      const { getByText } = render(
        <StatusSummaryBar
          statusCounts={defaultStatusCounts}
          activeFilter={null}
          onFilterChange={mockOnFilterChange}
        />
      );
      expect(getByText('Idle')).toBeTruthy();
    });

    it('should display correct Indonesian label for outside_area status', () => {
      const { getByText } = render(
        <StatusSummaryBar
          statusCounts={defaultStatusCounts}
          activeFilter={null}
          onFilterChange={mockOnFilterChange}
        />
      );
      expect(getByText('Di Luar Area')).toBeTruthy();
    });

    it('should display correct Indonesian label for missing status', () => {
      const { getByText } = render(
        <StatusSummaryBar
          statusCounts={defaultStatusCounts}
          activeFilter={null}
          onFilterChange={mockOnFilterChange}
        />
      );
      expect(getByText('Tidak Terdeteksi')).toBeTruthy();
    });
  });

  describe('interaction', () => {
    it('should call onFilterChange with the tapped status when no filter is active', () => {
      // Arrange
      const { getByText } = render(
        <StatusSummaryBar
          statusCounts={defaultStatusCounts}
          activeFilter={null}
          onFilterChange={mockOnFilterChange}
        />
      );

      // Act
      fireEvent.press(getByText('Aktif'));

      // Assert
      expect(mockOnFilterChange).toHaveBeenCalledTimes(1);
      expect(mockOnFilterChange).toHaveBeenCalledWith('active');
    });

    it('should call onFilterChange with null when the already-active chip is tapped (toggle off)', () => {
      // Arrange — active filter is already 'active'
      const { getByText } = render(
        <StatusSummaryBar
          statusCounts={defaultStatusCounts}
          activeFilter={'active' as TrackingStatus}
          onFilterChange={mockOnFilterChange}
        />
      );

      // Act — tap the same chip again
      fireEvent.press(getByText('Aktif'));

      // Assert — filter toggled off
      expect(mockOnFilterChange).toHaveBeenCalledTimes(1);
      expect(mockOnFilterChange).toHaveBeenCalledWith(null);
    });

    it('should call onFilterChange with new status when switching from one filter to another', () => {
      // Arrange — active filter is 'inactive', user taps 'missing'
      const { getByText } = render(
        <StatusSummaryBar
          statusCounts={defaultStatusCounts}
          activeFilter={'inactive' as TrackingStatus}
          onFilterChange={mockOnFilterChange}
        />
      );

      // Act
      fireEvent.press(getByText('Tidak Terdeteksi'));

      // Assert
      expect(mockOnFilterChange).toHaveBeenCalledWith('missing');
    });
  });

  describe('active chip styling', () => {
    it('should apply a backgroundColor to the active chip matching the status color', () => {
      // Arrange — 'active' status color is '#15803D'
      const { getByLabelText } = render(
        <StatusSummaryBar
          statusCounts={defaultStatusCounts}
          activeFilter={'active' as TrackingStatus}
          onFilterChange={mockOnFilterChange}
        />
      );

      // Act
      const activeChip = getByLabelText(`Filter Aktif: ${defaultStatusCounts.active}`);

      // Assert — chip has backgroundColor equal to the status color
      const flatStyle = activeChip.props.style;
      const styles = Array.isArray(flatStyle) ? flatStyle : [flatStyle];
      const merged = Object.assign({}, ...styles.filter(Boolean));
      expect(merged.backgroundColor).toBe('#15803D');
    });

    it('should NOT apply a backgroundColor override to an inactive chip', () => {
      // Arrange — no filter active, so 'active' chip should use default gray background
      const { getByLabelText } = render(
        <StatusSummaryBar
          statusCounts={defaultStatusCounts}
          activeFilter={null}
          onFilterChange={mockOnFilterChange}
        />
      );

      // Act
      const chip = getByLabelText(`Filter Aktif: ${defaultStatusCounts.active}`);

      // Assert — the override style object (second in the array) should be falsy/empty
      const flatStyle = chip.props.style;
      const styles = Array.isArray(flatStyle) ? flatStyle : [flatStyle];
      // The override at index 1 is applied only when isActive is true;
      // when not active it is falsy (undefined/false), so no override backgroundColor
      const override = styles[1];
      expect(override).toBeFalsy();
    });
  });

  describe('accessibility', () => {
    it('should have an accessibilityLabel containing the status label and count for each chip', () => {
      // Arrange
      const counts = { active: 5, inactive: 3, outside_area: 2, missing: 1, offline: 4 };

      // Act
      const { getByLabelText } = render(
        <StatusSummaryBar
          statusCounts={counts}
          activeFilter={null}
          onFilterChange={mockOnFilterChange}
        />
      );

      // Assert — format: "Filter <label>: <count>"
      expect(getByLabelText('Filter Aktif: 5')).toBeTruthy();
      expect(getByLabelText('Filter Idle: 3')).toBeTruthy();
      expect(getByLabelText('Filter Di Luar Area: 2')).toBeTruthy();
      expect(getByLabelText('Filter Tidak Terdeteksi: 1')).toBeTruthy();
    });

    it('should set accessibilityRole to "button" on each chip', () => {
      // Arrange
      const { getByLabelText } = render(
        <StatusSummaryBar
          statusCounts={defaultStatusCounts}
          activeFilter={null}
          onFilterChange={mockOnFilterChange}
        />
      );

      // Act & Assert
      const chip = getByLabelText('Filter Aktif: 5');
      expect(chip.props.accessibilityRole).toBe('button');
    });
  });

  describe('edge cases', () => {
    it('should handle very large counts without crashing', () => {
      // Arrange
      const largeCounts = { active: 9999, inactive: 8888, outside_area: 7777, missing: 6666, offline: 5555 };

      // Act & Assert — should not throw
      const { getByText } = render(
        <StatusSummaryBar
          statusCounts={largeCounts}
          activeFilter={null}
          onFilterChange={mockOnFilterChange}
        />
      );
      expect(getByText('9999')).toBeTruthy();
    });

    it('should render correctly when all counts are zero and no filter is active', () => {
      // Arrange
      const zeroCounts = { active: 0, inactive: 0, outside_area: 0, missing: 0, offline: 0 };

      // Act & Assert
      const { getByText } = render(
        <StatusSummaryBar
          statusCounts={zeroCounts}
          activeFilter={null}
          onFilterChange={mockOnFilterChange}
        />
      );
      expect(getByText('Aktif')).toBeTruthy();
    });
  });
});
