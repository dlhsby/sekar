/**
 * UserListStrip Component Tests
 * Phase 2D: Tests for horizontal scrollable strip of UserListCard components.
 * Verifies empty state, card count, status-priority sort order, press delegation,
 * scroll container, and single-user rendering.
 */

import React from 'react';
import { ScrollView } from 'react-native';
import { render, fireEvent } from '@testing-library/react-native';
import { UserListStrip } from '../UserListStrip';
import type { LiveUser } from '../../../types/models.types';

// Mock UserListCard to decouple from its implementation details
jest.mock('../UserListCard', () => {
  const React = require('react');
  const { TouchableOpacity, Text } = require('react-native');
  return {
    UserListCard: ({ user, onPress }: { user: any; onPress: (u: any) => void }) =>
      React.createElement(
        TouchableOpacity,
        {
          testID: `user-card-${user.id}`,
          onPress: () => onPress(user),
          accessibilityLabel: user.full_name,
        },
        React.createElement(Text, null, user.full_name),
      ),
  };
});

// Mock vector icons (propagated from UserListCard mock path, but kept for safety)
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

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('UserListStrip', () => {
  const mockOnUserPress = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('empty state', () => {
    it('should show empty state text "Tidak ada pengguna aktif" when users array is empty', () => {
      // Arrange & Act
      const { getByText } = render(
        <UserListStrip users={[]} onUserPress={mockOnUserPress} />
      );

      // Assert
      expect(getByText('Tidak ada pengguna aktif')).toBeTruthy();
    });

    it('should NOT render a ScrollView when the users array is empty', () => {
      // Arrange & Act
      const { UNSAFE_queryByType } = render(
        <UserListStrip users={[]} onUserPress={mockOnUserPress} />
      );

      // Assert
      expect(UNSAFE_queryByType(ScrollView)).toBeNull();
    });
  });

  describe('card rendering', () => {
    it('should render the correct number of cards for a given users array', () => {
      // Arrange
      const users = [
        createMockUser({ id: 'u1', full_name: 'User One', status: 'active' }),
        createMockUser({ id: 'u2', full_name: 'User Two', status: 'inactive' }),
        createMockUser({ id: 'u3', full_name: 'User Three', status: 'missing' }),
      ];

      // Act
      const { getByTestId } = render(
        <UserListStrip users={users} onUserPress={mockOnUserPress} />
      );

      // Assert
      expect(getByTestId('user-card-u1')).toBeTruthy();
      expect(getByTestId('user-card-u2')).toBeTruthy();
      expect(getByTestId('user-card-u3')).toBeTruthy();
    });

    it('should handle a single user correctly', () => {
      // Arrange
      const users = [createMockUser({ id: 'solo', full_name: 'Solo User' })];

      // Act
      const { getByTestId, getByText } = render(
        <UserListStrip users={users} onUserPress={mockOnUserPress} />
      );

      // Assert
      expect(getByTestId('user-card-solo')).toBeTruthy();
      expect(getByText('Solo User')).toBeTruthy();
    });
  });

  describe('sort order', () => {
    it('should sort users by status priority: missing first, then outside_area, inactive, active', () => {
      // Arrange — provide users in reverse priority order
      const users = [
        createMockUser({ id: 'active-user',       full_name: 'Active User',       status: 'active' }),
        createMockUser({ id: 'inactive-user',     full_name: 'Inactive User',     status: 'inactive' }),
        createMockUser({ id: 'outside-user',      full_name: 'Outside User',      status: 'outside_area' }),
        createMockUser({ id: 'missing-user',      full_name: 'Missing User',      status: 'missing' }),
      ];

      // Act
      const { getAllByLabelText } = render(
        <UserListStrip users={users} onUserPress={mockOnUserPress} />
      );

      // Assert — rendered order should reflect priority (missing → outside_area → inactive → active)
      const cards = getAllByLabelText(/User/);
      expect(cards[0].props.accessibilityLabel).toBe('Missing User');
      expect(cards[1].props.accessibilityLabel).toBe('Outside User');
      expect(cards[2].props.accessibilityLabel).toBe('Inactive User');
      expect(cards[3].props.accessibilityLabel).toBe('Active User');
    });

    it('should keep relative order of users with the same status', () => {
      // Arrange — two active users; their relative order should be preserved
      const users = [
        createMockUser({ id: 'a1', full_name: 'Alpha Active', status: 'active' }),
        createMockUser({ id: 'a2', full_name: 'Beta Active',  status: 'active' }),
      ];

      // Act
      const { getAllByLabelText } = render(
        <UserListStrip users={users} onUserPress={mockOnUserPress} />
      );

      // Assert
      const cards = getAllByLabelText(/Active/);
      expect(cards[0].props.accessibilityLabel).toBe('Alpha Active');
      expect(cards[1].props.accessibilityLabel).toBe('Beta Active');
    });
  });

  describe('interaction', () => {
    it('should call onUserPress with the correct user when a card is tapped', () => {
      // Arrange
      const user = createMockUser({ id: 'press-test', full_name: 'Pressed User' });

      // Act
      const { getByTestId } = render(
        <UserListStrip users={[user]} onUserPress={mockOnUserPress} />
      );
      fireEvent.press(getByTestId('user-card-press-test'));

      // Assert
      expect(mockOnUserPress).toHaveBeenCalledTimes(1);
      expect(mockOnUserPress).toHaveBeenCalledWith(user);
    });

    it('should call onUserPress with the specific tapped user when multiple cards are present', () => {
      // Arrange
      const users = [
        createMockUser({ id: 'u-a', full_name: 'User A', status: 'active' }),
        createMockUser({ id: 'u-b', full_name: 'User B', status: 'missing' }),
      ];

      // Act
      const { getByTestId } = render(
        <UserListStrip users={users} onUserPress={mockOnUserPress} />
      );
      fireEvent.press(getByTestId('user-card-u-a'));

      // Assert — only the tapped card's user should be passed
      expect(mockOnUserPress).toHaveBeenCalledWith(users[0]);
    });
  });

  describe('scroll container', () => {
    it('should render a horizontal ScrollView when there are users', () => {
      // Arrange
      const users = [createMockUser()];

      // Act
      const { UNSAFE_getByType } = render(
        <UserListStrip users={users} onUserPress={mockOnUserPress} />
      );

      // Assert
      const scrollView = UNSAFE_getByType(ScrollView);
      expect(scrollView).toBeTruthy();
      expect(scrollView.props.horizontal).toBe(true);
    });

    it('should disable horizontal scroll indicator for clean UI', () => {
      // Arrange
      const users = [createMockUser()];

      // Act
      const { UNSAFE_getByType } = render(
        <UserListStrip users={users} onUserPress={mockOnUserPress} />
      );

      // Assert
      const scrollView = UNSAFE_getByType(ScrollView);
      expect(scrollView.props.showsHorizontalScrollIndicator).toBe(false);
    });
  });
});
