/**
 * UserMarker Component Tests
 * Phase 2D: Tests for custom map marker with LiveUser data, role icons, five-status colors,
 * labelMode-based labels, dimmed mode, and cluster marker rendering.
 */

import React from 'react';
import { render, act } from '@testing-library/react-native';
import { UserMarker } from '../UserMarker';
import type { LiveUser } from '../../../types/models.types';

// Mock react-native-maps components
jest.mock('react-native-maps', () => {
  const React = require('react');
  const { View } = require('react-native');

  return {
    Marker: ({ children, testID, onPress, ...props }: any) =>
      React.createElement(View, { testID: testID || 'marker', onPress, ...props }, children),
  };
});

// Mock vector icons
jest.mock('react-native-vector-icons/MaterialCommunityIcons', () => {
  const React = require('react');
  const { Text } = require('react-native');
  return (props: any) => React.createElement(Text, { testID: 'icon', ...props }, props.name);
});

// ─── Helpers ─────────────────────────────────────────────────────────────────

const createMockUser = (overrides?: Partial<LiveUser>): LiveUser => ({
  id: 'user-123',
  full_name: 'Ahmad Wijaya',
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
  last_update: '2026-02-15T08:00:00Z',
  is_within_area: true,
  outside_boundary: false,
  shift_id: 'shift-123',
  shift_name: 'Shift Pagi',
  shift_definition_id: null,
  clock_in_time: '2026-02-15T07:00:00Z',
  current_task_status: null,
  current_task_title: null,
  ...overrides,
});

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('UserMarker', () => {
  const mockOnPress = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('rendering', () => {
    it('should render marker with coordinates from LiveUser', () => {
      const user = createMockUser();
      const { getByTestId } = render(
        <UserMarker user={user} onPress={mockOnPress} labelMode="none" />
      );
      const marker = getByTestId('marker');
      expect(marker).toBeTruthy();
      expect(marker.props.coordinate).toEqual({
        latitude: -7.250445,
        longitude: 112.768845,
      });
    });

    it('should render individual marker (no cluster) for single user', () => {
      const user = createMockUser();
      const { getByTestId, queryByText } = render(
        <UserMarker user={user} onPress={mockOnPress} labelMode="none" />
      );
      expect(getByTestId('marker')).toBeTruthy();
      // No cluster count text rendered for individual marker
      expect(queryByText(/^\d+$/)).toBeNull();
    });
  });

  describe('role-specific rendering', () => {
    it('should render satgas role icon', () => {
      const user = createMockUser({ role: 'satgas' });
      const { getAllByTestId } = render(
        <UserMarker user={user} onPress={mockOnPress} labelMode="none" />
      );
      const icons = getAllByTestId('icon');
      expect(icons.length).toBeGreaterThan(0);
      expect(icons[0].props.children).toBe('account-hard-hat');
    });

    it('should render linmas role icon', () => {
      const user = createMockUser({ role: 'linmas' });
      const { getAllByTestId } = render(
        <UserMarker user={user} onPress={mockOnPress} labelMode="none" />
      );
      const icons = getAllByTestId('icon');
      expect(icons.length).toBeGreaterThan(0);
      expect(icons[0].props.children).toBe('shield-account');
    });

    it('should render korlap role icon', () => {
      const user = createMockUser({ role: 'korlap' });
      const { getAllByTestId } = render(
        <UserMarker user={user} onPress={mockOnPress} labelMode="none" />
      );
      const icons = getAllByTestId('icon');
      expect(icons.length).toBeGreaterThan(0);
      expect(icons[0].props.children).toBe('clipboard-account');
    });

    it('should render admin_rayon role icon', () => {
      const user = createMockUser({ role: 'admin_rayon' });
      const { getAllByTestId } = render(
        <UserMarker user={user} onPress={mockOnPress} labelMode="none" />
      );
      const icons = getAllByTestId('icon');
      expect(icons.length).toBeGreaterThan(0);
      expect(icons[0].props.children).toBe('file-document-edit');
    });

    it('should render kepala_rayon role icon', () => {
      const user = createMockUser({ role: 'kepala_rayon' });
      const { getAllByTestId } = render(
        <UserMarker user={user} onPress={mockOnPress} labelMode="none" />
      );
      const icons = getAllByTestId('icon');
      expect(icons.length).toBeGreaterThan(0);
      expect(icons[0].props.children).toBe('account-star');
    });

    it('should default to satgas icon for unknown role', () => {
      const user = createMockUser({ role: 'unknown_role' });
      const { getAllByTestId } = render(
        <UserMarker user={user} onPress={mockOnPress} labelMode="none" />
      );
      const icons = getAllByTestId('icon');
      expect(icons.length).toBeGreaterThan(0);
      expect(icons[0].props.children).toBe('account-hard-hat');
    });
  });

  describe('cluster rendering', () => {
    it('should render cluster marker when clusterCount > 1', () => {
      const user = createMockUser();
      const { getByText } = render(
        <UserMarker user={user} onPress={mockOnPress} labelMode="none" clusterCount={5} />
      );
      expect(getByText('5')).toBeTruthy();
    });

    it('should render normal marker when clusterCount is 1', () => {
      const user = createMockUser();
      const { queryByText, getAllByTestId } = render(
        <UserMarker user={user} onPress={mockOnPress} labelMode="none" clusterCount={1} />
      );
      expect(queryByText('1')).toBeNull();
      expect(getAllByTestId('icon').length).toBeGreaterThan(0);
    });

    it('should render normal marker when clusterCount is undefined', () => {
      const user = createMockUser();
      const { getByTestId } = render(
        <UserMarker user={user} onPress={mockOnPress} labelMode="none" />
      );
      expect(getByTestId('marker')).toBeTruthy();
    });

    it('should suppress label in cluster mode regardless of labelMode', () => {
      const user = createMockUser({ role: 'satgas', full_name: 'Ahmad Wijaya' });
      const { queryByText } = render(
        <UserMarker user={user} onPress={mockOnPress} labelMode="full" clusterCount={3} />
      );
      // Cluster count should show, but no name label
      expect(queryByText('3')).toBeTruthy();
      expect(queryByText(/STG|Satgas/)).toBeNull();
    });
  });

  describe('interaction', () => {
    it('should call onPress when marker is pressed', () => {
      const user = createMockUser();
      const { getByTestId } = render(
        <UserMarker user={user} onPress={mockOnPress} labelMode="none" />
      );
      const marker = getByTestId('marker');
      marker.props.onPress();
      expect(mockOnPress).toHaveBeenCalledTimes(1);
    });

    it('should settle tracksViewChanges to false after the initial render burst', async () => {
      const user = createMockUser();
      jest.useFakeTimers();
      try {
        const { getByTestId } = render(
          <UserMarker user={user} onPress={mockOnPress} labelMode="none" />
        );
        // Implementation flips tracksViewChanges true → false after ~250ms so
        // the first paint captures the bitmap, then stays static for perf.
        await act(async () => {
          jest.advanceTimersByTime(300);
        });
        const marker = getByTestId('marker');
        expect(marker.props.tracksViewChanges).toBe(false);
      } finally {
        jest.useRealTimers();
      }
    });
  });

  describe('status colors', () => {
    it('should render for active status', () => {
      const user = createMockUser({ status: 'active' });
      const { getByTestId } = render(
        <UserMarker user={user} onPress={mockOnPress} labelMode="none" />
      );
      expect(getByTestId('marker')).toBeTruthy();
    });

    it('should render for inactive status', () => {
      const user = createMockUser({ status: 'inactive' });
      const { getByTestId } = render(
        <UserMarker user={user} onPress={mockOnPress} labelMode="none" />
      );
      expect(getByTestId('marker')).toBeTruthy();
    });

    it('should render for outside_area status', () => {
      const user = createMockUser({ status: 'outside_area' });
      const { getByTestId } = render(
        <UserMarker user={user} onPress={mockOnPress} labelMode="none" />
      );
      expect(getByTestId('marker')).toBeTruthy();
    });

    it('should render for missing status', () => {
      const user = createMockUser({ status: 'missing' });
      const { getByTestId } = render(
        <UserMarker user={user} onPress={mockOnPress} labelMode="none" />
      );
      expect(getByTestId('marker')).toBeTruthy();
    });

    it('should render for offline status', () => {
      const user = createMockUser({ status: 'offline' });
      const { getByTestId } = render(
        <UserMarker user={user} onPress={mockOnPress} labelMode="none" />
      );
      expect(getByTestId('marker')).toBeTruthy();
    });
  });

  describe('labelMode-based label visibility', () => {
    it('should show no label when labelMode is "none"', () => {
      const user = createMockUser({ role: 'satgas', full_name: 'Ahmad Wijaya' });
      const { queryByText } = render(
        <UserMarker user={user} onPress={mockOnPress} labelMode="none" />
      );
      expect(queryByText('STG - Ahmad')).toBeNull();
      expect(queryByText('Satgas - Ahmad Wijaya')).toBeNull();
    });

    it('should show abbreviated label when labelMode is "abbrev"', () => {
      const user = createMockUser({ role: 'satgas', full_name: 'Ahmad Wijaya' });
      const { getByText } = render(
        <UserMarker user={user} onPress={mockOnPress} labelMode="abbrev" />
      );
      expect(getByText('STG - Ahmad')).toBeTruthy();
    });

    it('should use LMS abbreviation for linmas role in "abbrev" mode', () => {
      const user = createMockUser({ role: 'linmas', full_name: 'Sari Dewi' });
      const { getByText } = render(
        <UserMarker user={user} onPress={mockOnPress} labelMode="abbrev" />
      );
      expect(getByText('LMS - Sari')).toBeTruthy();
    });

    it('should use KLP abbreviation for korlap role in "abbrev" mode', () => {
      const user = createMockUser({ role: 'korlap', full_name: 'Budi Santoso' });
      const { getByText } = render(
        <UserMarker user={user} onPress={mockOnPress} labelMode="abbrev" />
      );
      expect(getByText('KLP - Budi')).toBeTruthy();
    });

    it('should show full label when labelMode is "full"', () => {
      const user = createMockUser({ role: 'satgas', full_name: 'Ahmad Wijaya' });
      const { getByText } = render(
        <UserMarker user={user} onPress={mockOnPress} labelMode="full" />
      );
      expect(getByText('Satgas - Ahmad Wijaya')).toBeTruthy();
    });

    it('should show full label with role name for linmas in "full" mode', () => {
      const user = createMockUser({ role: 'linmas', full_name: 'Sari Dewi' });
      const { getByText } = render(
        <UserMarker user={user} onPress={mockOnPress} labelMode="full" />
      );
      expect(getByText('Linmas - Sari Dewi')).toBeTruthy();
    });

    it('should show full label with role name for korlap in "full" mode', () => {
      const user = createMockUser({ role: 'korlap', full_name: 'Budi Santoso' });
      const { getByText } = render(
        <UserMarker user={user} onPress={mockOnPress} labelMode="full" />
      );
      expect(getByText('Korlap - Budi Santoso')).toBeTruthy();
    });
  });

  describe('dimmed mode', () => {
    it('should apply opacity 0.2 style when dimmed is true', () => {
      const user = createMockUser();
      const { getByTestId } = render(
        <UserMarker user={user} onPress={mockOnPress} labelMode="none" dimmed />
      );
      const marker = getByTestId('marker');
      // The dimmed style (opacity: 0.2) is applied directly to the Marker via the style prop
      expect(marker.props.style).toMatchObject({ opacity: 0.2 });
    });

    it('should not apply dimmed style when dimmed is false', () => {
      const user = createMockUser();
      const { getByTestId } = render(
        <UserMarker user={user} onPress={mockOnPress} labelMode="none" dimmed={false} />
      );
      const marker = getByTestId('marker');
      expect(marker.props.style).toBeUndefined();
    });

    it('should not apply dimmed style when dimmed prop is omitted', () => {
      const user = createMockUser();
      const { getByTestId } = render(
        <UserMarker user={user} onPress={mockOnPress} labelMode="none" />
      );
      const marker = getByTestId('marker');
      expect(marker.props.style).toBeUndefined();
    });

    it('should still render marker in dimmed mode', () => {
      const user = createMockUser();
      const { getByTestId } = render(
        <UserMarker user={user} onPress={mockOnPress} labelMode="none" dimmed />
      );
      expect(getByTestId('marker')).toBeTruthy();
    });
  });

  describe('edge cases', () => {
    it('should handle user with unknown role gracefully', () => {
      const user = createMockUser({ role: 'unknown' });
      // Should render without crashing — getRoleIcon returns default 'account-hard-hat'
      const { getAllByTestId } = render(
        <UserMarker user={user} onPress={mockOnPress} labelMode="none" />
      );
      const icons = getAllByTestId('icon');
      expect(icons[0].props.children).toBe('account-hard-hat');
    });

    it('should handle location with zero coordinates', () => {
      const user = createMockUser({ latitude: 0, longitude: 0 });
      const { getByTestId } = render(
        <UserMarker user={user} onPress={mockOnPress} labelMode="none" />
      );
      const marker = getByTestId('marker');
      expect(marker.props.coordinate).toEqual({ latitude: 0, longitude: 0 });
    });

    it('should render without battery level', () => {
      const user = createMockUser({ battery_level: null });
      const { getByTestId } = render(
        <UserMarker user={user} onPress={mockOnPress} labelMode="none" />
      );
      expect(getByTestId('marker')).toBeTruthy();
    });

    it('should include outside_boundary false in fixture without error', () => {
      const user = createMockUser({ outside_boundary: false });
      const { getByTestId } = render(
        <UserMarker user={user} onPress={mockOnPress} labelMode="none" />
      );
      expect(getByTestId('marker')).toBeTruthy();
    });

    it('should render when outside_boundary is true', () => {
      const user = createMockUser({ outside_boundary: true, status: 'outside_area' });
      const { getByTestId } = render(
        <UserMarker user={user} onPress={mockOnPress} labelMode="none" />
      );
      expect(getByTestId('marker')).toBeTruthy();
    });
  });
});
