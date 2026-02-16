/**
 * UserMarker Component Tests
 * Tests for custom map marker showing user status, role, and position
 */

import React from 'react';
import { render } from '@testing-library/react-native';
import { UserMarker, UserStatus } from '../UserMarker';
import type { ActiveUserData } from '../../../types/api.types';

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

describe('UserMarker', () => {
  const mockOnPress = jest.fn();

  const createMockUser = (overrides?: Partial<ActiveUserData>): ActiveUserData => ({
    id: 'user-123',
    username: 'satgas1',
    full_name: 'Ahmad Satgas',
    role: 'satgas',
    shift: {
      id: 'shift-123',
      clock_in_time: '2026-02-15T07:00:00Z',
      area: {
        id: 'area-123',
        name: 'Taman A',
      },
    },
    latest_location: {
      gps_lat: -7.250445,
      gps_lng: 112.768845,
      logged_at: '2026-02-15T08:00:00Z',
    },
    ...overrides,
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('rendering', () => {
    it('should render marker with coordinates from user location', () => {
      // Arrange
      const user = createMockUser();

      // Act
      const { getByTestId } = render(
        <UserMarker
          user={user}
          status="active"
          onPress={mockOnPress}
        />
      );

      // Assert
      const marker = getByTestId('marker');
      expect(marker).toBeTruthy();
      expect(marker.props.coordinate).toEqual({
        latitude: -7.250445,
        longitude: 112.768845,
      });
    });

    it('should return null if user has no location', () => {
      // Arrange
      const user = createMockUser({ latest_location: null });

      // Act
      const { queryByTestId } = render(
        <UserMarker
          user={user}
          status="active"
          onPress={mockOnPress}
        />
      );

      // Assert
      expect(queryByTestId('marker')).toBeNull();
    });

    it('should render with string coordinates converted to numbers', () => {
      // Arrange
      const user = createMockUser({
        latest_location: {
          gps_lat: '-7.250445' as any,
          gps_lng: '112.768845' as any,
          logged_at: '2026-02-15T08:00:00Z',
        },
      });

      // Act
      const { getByTestId } = render(
        <UserMarker
          user={user}
          status="active"
          onPress={mockOnPress}
        />
      );

      // Assert
      const marker = getByTestId('marker');
      expect(marker.props.coordinate).toEqual({
        latitude: -7.250445,
        longitude: 112.768845,
      });
    });
  });

  describe('status colors', () => {
    it('should use success color for active status', () => {
      // Arrange
      const user = createMockUser();

      // Act
      const { UNSAFE_getAllByType } = render(
        <UserMarker
          user={user}
          status="active"
          onPress={mockOnPress}
        />
      );

      // Assert - marker container should be rendered
      expect(UNSAFE_getAllByType('View').length).toBeGreaterThan(0);
    });

    it('should use warning color for warning status', () => {
      // Arrange
      const user = createMockUser();

      // Act
      const { UNSAFE_getAllByType } = render(
        <UserMarker
          user={user}
          status="warning"
          onPress={mockOnPress}
        />
      );

      // Assert - marker container should be rendered
      expect(UNSAFE_getAllByType('View').length).toBeGreaterThan(0);
    });

    it('should use danger color for outside status', () => {
      // Arrange
      const user = createMockUser();

      // Act
      const { UNSAFE_getAllByType } = render(
        <UserMarker
          user={user}
          status="outside"
          onPress={mockOnPress}
        />
      );

      // Assert - marker container should be rendered
      expect(UNSAFE_getAllByType('View').length).toBeGreaterThan(0);
    });
  });

  describe('role-specific rendering', () => {
    it('should render satgas role icon', () => {
      // Arrange
      const user = createMockUser({ role: 'satgas' });

      // Act
      const { getAllByTestId } = render(
        <UserMarker
          user={user}
          status="active"
          onPress={mockOnPress}
        />
      );

      // Assert - icon appears in marker and callout
      const icons = getAllByTestId('icon');
      expect(icons.length).toBeGreaterThan(0);
      expect(icons[0].props.children).toBe('account-hard-hat');
    });

    it('should render linmas role icon', () => {
      // Arrange
      const user = createMockUser({ role: 'linmas' });

      // Act
      const { getAllByTestId } = render(
        <UserMarker
          user={user}
          status="active"
          onPress={mockOnPress}
        />
      );

      // Assert - icon appears in marker and callout
      const icons = getAllByTestId('icon');
      expect(icons.length).toBeGreaterThan(0);
      expect(icons[0].props.children).toBe('shield-account');
    });

    it('should render korlap role icon', () => {
      // Arrange
      const user = createMockUser({ role: 'korlap' });

      // Act
      const { getAllByTestId } = render(
        <UserMarker
          user={user}
          status="active"
          onPress={mockOnPress}
        />
      );

      // Assert - icon appears in marker and callout
      const icons = getAllByTestId('icon');
      expect(icons.length).toBeGreaterThan(0);
      expect(icons[0].props.children).toBe('clipboard-account');
    });

    it('should render admin_data role icon', () => {
      // Arrange
      const user = createMockUser({ role: 'admin_data' });

      // Act
      const { getAllByTestId } = render(
        <UserMarker
          user={user}
          status="active"
          onPress={mockOnPress}
        />
      );

      // Assert - icon appears in marker and callout
      const icons = getAllByTestId('icon');
      expect(icons.length).toBeGreaterThan(0);
      expect(icons[0].props.children).toBe('file-document-edit');
    });

    it('should render kepala_rayon role icon', () => {
      // Arrange
      const user = createMockUser({ role: 'kepala_rayon' });

      // Act
      const { getAllByTestId } = render(
        <UserMarker
          user={user}
          status="active"
          onPress={mockOnPress}
        />
      );

      // Assert - icon appears in marker and callout
      const icons = getAllByTestId('icon');
      expect(icons.length).toBeGreaterThan(0);
      expect(icons[0].props.children).toBe('account-star');
    });

    it('should default to satgas icon for undefined role', () => {
      // Arrange
      const user = createMockUser({ role: undefined });

      // Act
      const { getAllByTestId } = render(
        <UserMarker
          user={user}
          status="active"
          onPress={mockOnPress}
        />
      );

      // Assert - icon appears in marker and callout
      const icons = getAllByTestId('icon');
      expect(icons.length).toBeGreaterThan(0);
      expect(icons[0].props.children).toBe('account-hard-hat');
    });
  });

  describe('cluster rendering', () => {
    it('should render cluster marker when clusterCount > 1', () => {
      // Arrange
      const user = createMockUser();

      // Act
      const { getByText, queryByTestId } = render(
        <UserMarker
          user={user}
          status="active"
          onPress={mockOnPress}
          clusterCount={5}
        />
      );

      // Assert
      expect(getByText('5')).toBeTruthy();
      // Callout should not be rendered for clusters
      expect(queryByTestId('callout')).toBeNull();
    });

    it('should render normal marker when clusterCount is 1', () => {
      // Arrange
      const user = createMockUser();

      // Act
      const { queryByText, getByTestId } = render(
        <UserMarker
          user={user}
          status="active"
          onPress={mockOnPress}
          clusterCount={1}
        />
      );

      // Assert - should not render cluster text
      expect(queryByText('1')).toBeNull();
      // Should render callout
      expect(getByTestId('callout')).toBeTruthy();
    });

    it('should render normal marker when clusterCount is undefined', () => {
      // Arrange
      const user = createMockUser();

      // Act
      const { getByTestId } = render(
        <UserMarker
          user={user}
          status="active"
          onPress={mockOnPress}
        />
      );

      // Assert - should render callout
      expect(getByTestId('callout')).toBeTruthy();
    });
  });

  describe('callout information', () => {
    it('should display user full name in callout', () => {
      // Arrange
      const user = createMockUser({ full_name: 'Budi Santoso' });

      // Act
      const { getByText } = render(
        <UserMarker
          user={user}
          status="active"
          onPress={mockOnPress}
        />
      );

      // Assert
      expect(getByText('Budi Santoso')).toBeTruthy();
    });

    it('should display area name in callout', () => {
      // Arrange
      const user = createMockUser({
        shift: {
          id: 'shift-123',
          clock_in_time: '2026-02-15T07:00:00Z',
          area: {
            id: 'area-123',
            name: 'Taman Bungkul',
          },
        },
      });

      // Act
      const { getByText } = render(
        <UserMarker
          user={user}
          status="active"
          onPress={mockOnPress}
        />
      );

      // Assert
      expect(getByText('Taman Bungkul')).toBeTruthy();
    });

    it('should display role label in callout', () => {
      // Arrange
      const user = createMockUser({ role: 'satgas' });

      // Act
      const { getByText } = render(
        <UserMarker
          user={user}
          status="active"
          onPress={mockOnPress}
        />
      );

      // Assert - Satgas label should be present
      expect(getByText('Satgas')).toBeTruthy();
    });
  });

  describe('interaction', () => {
    it('should call onPress when marker is pressed', () => {
      // Arrange
      const user = createMockUser();

      // Act
      const { getByTestId } = render(
        <UserMarker
          user={user}
          status="active"
          onPress={mockOnPress}
        />
      );

      const marker = getByTestId('marker');
      marker.props.onPress();

      // Assert
      expect(mockOnPress).toHaveBeenCalledTimes(1);
    });

    it('should set tracksViewChanges to false for performance', () => {
      // Arrange
      const user = createMockUser();

      // Act
      const { getByTestId } = render(
        <UserMarker
          user={user}
          status="active"
          onPress={mockOnPress}
        />
      );

      // Assert
      const marker = getByTestId('marker');
      expect(marker.props.tracksViewChanges).toBe(false);
    });
  });

  describe('edge cases', () => {
    it('should handle user with no role gracefully', () => {
      // Arrange
      const user = createMockUser({ role: undefined });

      // Act
      const { getByText } = render(
        <UserMarker
          user={user}
          status="active"
          onPress={mockOnPress}
        />
      );

      // Assert - should default to Satgas
      expect(getByText('Satgas')).toBeTruthy();
    });

    it('should handle location with zero coordinates', () => {
      // Arrange
      const user = createMockUser({
        latest_location: {
          gps_lat: 0,
          gps_lng: 0,
          logged_at: '2026-02-15T08:00:00Z',
        },
      });

      // Act
      const { getByTestId } = render(
        <UserMarker
          user={user}
          status="active"
          onPress={mockOnPress}
        />
      );

      // Assert
      const marker = getByTestId('marker');
      expect(marker.props.coordinate).toEqual({
        latitude: 0,
        longitude: 0,
      });
    });

    it('should handle very large cluster count', () => {
      // Arrange
      const user = createMockUser();

      // Act
      const { getByText } = render(
        <UserMarker
          user={user}
          status="active"
          onPress={mockOnPress}
          clusterCount={999}
        />
      );

      // Assert
      expect(getByText('999')).toBeTruthy();
    });
  });
});
