/**
 * UserMarker Component Tests
 * Phase 2D: Tests for custom map marker with LiveUser data, role icons, four-status colors
 */

import React from 'react';
import { render } from '@testing-library/react-native';
import { UserMarker } from '../UserMarker';
import type { LiveUser } from '../../../types/models.types';

// Mock react-native-maps components
jest.mock('react-native-maps', () => {
  const React = require('react');
  const { View } = require('react-native');

  return {
    Marker: ({ children, testID, onPress, ...props }: any) =>
      React.createElement(View, { testID: testID || 'marker', onPress, ...props }, children),
    Callout: ({ children, testID }: any) =>
      React.createElement(View, { testID: testID || 'callout' }, children),
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
  last_update: '2026-02-15T08:00:00Z',
  is_within_area: true,
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
      const { getByTestId } = render(<UserMarker user={user} onPress={mockOnPress} />);
      const marker = getByTestId('marker');
      expect(marker).toBeTruthy();
      expect(marker.props.coordinate).toEqual({
        latitude: -7.250445,
        longitude: 112.768845,
      });
    });

    it('should render callout for single marker', () => {
      const user = createMockUser();
      const { getByTestId } = render(<UserMarker user={user} onPress={mockOnPress} />);
      expect(getByTestId('callout')).toBeTruthy();
    });

    it('should display user full name', () => {
      const user = createMockUser({ full_name: 'Budi Santoso' });
      const { getByText } = render(<UserMarker user={user} onPress={mockOnPress} />);
      expect(getByText('Budi Santoso')).toBeTruthy();
    });

    it('should display area name in callout', () => {
      const user = createMockUser({ area_name: 'Taman Bungkul' });
      const { getByText } = render(<UserMarker user={user} onPress={mockOnPress} />);
      expect(getByText('Taman Bungkul')).toBeTruthy();
    });

    it('should display role label in callout', () => {
      const user = createMockUser({ role: 'satgas' });
      const { getByText } = render(<UserMarker user={user} onPress={mockOnPress} />);
      expect(getByText('Satgas')).toBeTruthy();
    });
  });

  describe('role-specific rendering', () => {
    it('should render satgas role icon', () => {
      const user = createMockUser({ role: 'satgas' });
      const { getAllByTestId } = render(<UserMarker user={user} onPress={mockOnPress} />);
      const icons = getAllByTestId('icon');
      expect(icons.length).toBeGreaterThan(0);
      expect(icons[0].props.children).toBe('account-hard-hat');
    });

    it('should render linmas role icon', () => {
      const user = createMockUser({ role: 'linmas' });
      const { getAllByTestId } = render(<UserMarker user={user} onPress={mockOnPress} />);
      const icons = getAllByTestId('icon');
      expect(icons.length).toBeGreaterThan(0);
      expect(icons[0].props.children).toBe('shield-account');
    });

    it('should render korlap role icon', () => {
      const user = createMockUser({ role: 'korlap' });
      const { getAllByTestId } = render(<UserMarker user={user} onPress={mockOnPress} />);
      const icons = getAllByTestId('icon');
      expect(icons.length).toBeGreaterThan(0);
      expect(icons[0].props.children).toBe('clipboard-account');
    });

    it('should render admin_data role icon', () => {
      const user = createMockUser({ role: 'admin_data' });
      const { getAllByTestId } = render(<UserMarker user={user} onPress={mockOnPress} />);
      const icons = getAllByTestId('icon');
      expect(icons.length).toBeGreaterThan(0);
      expect(icons[0].props.children).toBe('file-document-edit');
    });

    it('should render kepala_rayon role icon', () => {
      const user = createMockUser({ role: 'kepala_rayon' });
      const { getAllByTestId } = render(<UserMarker user={user} onPress={mockOnPress} />);
      const icons = getAllByTestId('icon');
      expect(icons.length).toBeGreaterThan(0);
      expect(icons[0].props.children).toBe('account-star');
    });

    it('should default to satgas icon for unknown role', () => {
      const user = createMockUser({ role: 'unknown_role' });
      const { getAllByTestId } = render(<UserMarker user={user} onPress={mockOnPress} />);
      const icons = getAllByTestId('icon');
      expect(icons.length).toBeGreaterThan(0);
      expect(icons[0].props.children).toBe('account-hard-hat');
    });
  });

  describe('cluster rendering', () => {
    it('should render cluster marker when clusterCount > 1', () => {
      const user = createMockUser();
      const { getByText, queryByTestId } = render(
        <UserMarker user={user} onPress={mockOnPress} clusterCount={5} />
      );
      expect(getByText('5')).toBeTruthy();
      expect(queryByTestId('callout')).toBeNull();
    });

    it('should render normal marker when clusterCount is 1', () => {
      const user = createMockUser();
      const { queryByText, getByTestId } = render(
        <UserMarker user={user} onPress={mockOnPress} clusterCount={1} />
      );
      expect(queryByText('1')).toBeNull();
      expect(getByTestId('callout')).toBeTruthy();
    });

    it('should render normal marker when clusterCount is undefined', () => {
      const user = createMockUser();
      const { getByTestId } = render(<UserMarker user={user} onPress={mockOnPress} />);
      expect(getByTestId('callout')).toBeTruthy();
    });
  });

  describe('interaction', () => {
    it('should call onPress when marker is pressed', () => {
      const user = createMockUser();
      const { getByTestId } = render(<UserMarker user={user} onPress={mockOnPress} />);
      const marker = getByTestId('marker');
      marker.props.onPress();
      expect(mockOnPress).toHaveBeenCalledTimes(1);
    });

    it('should set tracksViewChanges to false for performance', () => {
      const user = createMockUser();
      const { getByTestId } = render(<UserMarker user={user} onPress={mockOnPress} />);
      const marker = getByTestId('marker');
      expect(marker.props.tracksViewChanges).toBe(false);
    });
  });

  describe('status colors', () => {
    it('should render for active status', () => {
      const user = createMockUser({ status: 'active' });
      const { UNSAFE_getAllByType } = render(<UserMarker user={user} onPress={mockOnPress} />);
      expect(UNSAFE_getAllByType('View').length).toBeGreaterThan(0);
    });

    it('should render for inactive status', () => {
      const user = createMockUser({ status: 'inactive' });
      const { UNSAFE_getAllByType } = render(<UserMarker user={user} onPress={mockOnPress} />);
      expect(UNSAFE_getAllByType('View').length).toBeGreaterThan(0);
    });

    it('should render for outside_area status', () => {
      const user = createMockUser({ status: 'outside_area' });
      const { UNSAFE_getAllByType } = render(<UserMarker user={user} onPress={mockOnPress} />);
      expect(UNSAFE_getAllByType('View').length).toBeGreaterThan(0);
    });

    it('should render for missing status', () => {
      const user = createMockUser({ status: 'missing' });
      const { UNSAFE_getAllByType } = render(<UserMarker user={user} onPress={mockOnPress} />);
      expect(UNSAFE_getAllByType('View').length).toBeGreaterThan(0);
    });
  });

  describe('edge cases', () => {
    it('should handle user with unknown role gracefully', () => {
      const user = createMockUser({ role: 'unknown' });
      // Should render without crashing — getRoleIcon returns default 'account-hard-hat'
      const { getAllByTestId } = render(<UserMarker user={user} onPress={mockOnPress} />);
      const icons = getAllByTestId('icon');
      expect(icons[0].props.children).toBe('account-hard-hat');
    });

    it('should handle location with zero coordinates', () => {
      const user = createMockUser({ latitude: 0, longitude: 0 });
      const { getByTestId } = render(<UserMarker user={user} onPress={mockOnPress} />);
      const marker = getByTestId('marker');
      expect(marker.props.coordinate).toEqual({ latitude: 0, longitude: 0 });
    });

    it('should render without battery level', () => {
      const user = createMockUser({ battery_level: null });
      const { getByTestId } = render(<UserMarker user={user} onPress={mockOnPress} />);
      expect(getByTestId('marker')).toBeTruthy();
    });
  });
});
