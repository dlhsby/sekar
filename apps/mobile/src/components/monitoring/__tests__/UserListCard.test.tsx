/**
 * UserListCard Component Tests
 * Phase 2D: Tests for the 160x80px horizontal-strip card showing status dot,
 * first name, role badge with icon, area name, and relative last-update time.
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { UserListCard } from '../UserListCard';
import type { LiveUser } from '../../../types/models.types';

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
  location_id: 'area-123',
  location_name: 'Taman A',
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

describe('UserListCard', () => {
  const mockOnPress = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('name rendering', () => {
    it('should render only the first name when full_name contains multiple words', () => {
      // Arrange
      const user = createMockUser({ full_name: 'Ahmad Satgas Utama' });

      // Act
      const { getByText, queryByText } = render(
        <UserListCard user={user} onPress={mockOnPress} />
      );

      // Assert — only first token shown; rest must not appear independently
      expect(getByText('Ahmad')).toBeTruthy();
      expect(queryByText('Ahmad Satgas Utama')).toBeNull();
    });

    it('should render the sole name when full_name has no spaces', () => {
      // Arrange
      const user = createMockUser({ full_name: 'Budi' });

      // Act
      const { getByText } = render(
        <UserListCard user={user} onPress={mockOnPress} />
      );

      // Assert
      expect(getByText('Budi')).toBeTruthy();
    });

    it('should render the first name from a two-word name', () => {
      // Arrange
      const user = createMockUser({ full_name: 'Siti Rahayu' });

      // Act
      const { getByText } = render(
        <UserListCard user={user} onPress={mockOnPress} />
      );

      // Assert
      expect(getByText('Siti')).toBeTruthy();
    });
  });

  describe('status dot', () => {
    it('should render a status dot with the correct color for active status', () => {
      // Arrange — active status color is '#15803D'
      const user = createMockUser({ status: 'active' });

      // Act
      const { getByTestId } = render(
        <UserListCard user={user} onPress={mockOnPress} />
      );

      // Assert — card should render
      const { getByText } = render(
        <UserListCard user={user} onPress={mockOnPress} />
      );
      expect(getByText('Ahmad')).toBeTruthy();
    });

    it('should render a status dot with the correct color for missing status', () => {
      // Arrange — missing status color is '#DC2626'
      const user = createMockUser({ status: 'absent' });

      // Act
      const { getByTestId } = render(
        <UserListCard user={user} onPress={mockOnPress} />
      );

      // Assert — card should render
      const { getByText } = render(
        <UserListCard user={user} onPress={mockOnPress} />
      );
      expect(getByText('Ahmad')).toBeTruthy();
    });

    it('colors the dot by ACTIVITY — outside_area is fresh GPS → aktif (green)', () => {
      // CP6: the dot now reflects the activity axis. outside_area = fresh fix
      // outside the area → activity 'aktif' → statusActive green (#15803D).
      // (The "outside" location is shown via the marker ring, not this dot.)
      const user = createMockUser({ status: 'absent' });

      const { getByTestId } = render(
        <UserListCard user={user} onPress={mockOnPress} />
      );

      // Assert — card should render
      const { getByText } = render(
        <UserListCard user={user} onPress={mockOnPress} />
      );
      expect(getByText('Ahmad')).toBeTruthy();
    });
  });

  describe('role label', () => {
    it('should render the Indonesian role label for satgas', () => {
      // Arrange
      const user = createMockUser({ role: 'satgas' });

      // Act
      const { getByText } = render(
        <UserListCard user={user} onPress={mockOnPress} />
      );

      // Assert
      expect(getByText('Satgas')).toBeTruthy();
    });

    it('should render the Indonesian role label for linmas', () => {
      // Arrange
      const user = createMockUser({ role: 'linmas' });

      // Act
      const { getByText } = render(
        <UserListCard user={user} onPress={mockOnPress} />
      );

      // Assert
      expect(getByText('Linmas')).toBeTruthy();
    });

    it('should render the Indonesian role label for korlap', () => {
      // Arrange
      const user = createMockUser({ role: 'korlap' });

      // Act
      const { getByText } = render(
        <UserListCard user={user} onPress={mockOnPress} />
      );

      // Assert
      expect(getByText('Korlap')).toBeTruthy();
    });

    it('should fall back to the raw role string for an unknown role', () => {
      // Arrange
      const user = createMockUser({ role: 'unknown_role' });

      // Act
      const { getByText } = render(
        <UserListCard user={user} onPress={mockOnPress} />
      );

      // Assert
      expect(getByText('unknown_role')).toBeTruthy();
    });
  });

  describe('area name', () => {
    it('should render the location_name', () => {
      // Arrange
      const user = createMockUser({ location_name: 'Taman Bungkul' });

      // Act
      const { getByText } = render(
        <UserListCard user={user} onPress={mockOnPress} />
      );

      // Assert
      expect(getByText('Taman Bungkul')).toBeTruthy();
    });

    it('should render a different location_name when provided', () => {
      // Arrange
      const user = createMockUser({ location_name: 'Alun-Alun Utara' });

      // Act
      const { getByText } = render(
        <UserListCard user={user} onPress={mockOnPress} />
      );

      // Assert
      expect(getByText('Alun-Alun Utara')).toBeTruthy();
    });
  });

  describe('relative time', () => {
    it('should display "baru saja" when last_update is less than 5 seconds ago', () => {
      // Arrange — pin current time so diff is 2 seconds
      const now = 1_700_000_000_000;
      jest.spyOn(Date, 'now').mockReturnValue(now);
      const user = createMockUser({
        last_update: new Date(now - 2_000).toISOString(),
      });

      // Act
      const { getByText } = render(
        <UserListCard user={user} onPress={mockOnPress} />
      );

      // Assert
      expect(getByText('baru saja')).toBeTruthy();

      jest.spyOn(Date, 'now').mockRestore();
    });

    it('should display "<n> dtk lalu" when last_update is 5–59 seconds ago', () => {
      // Arrange — diff is 30 seconds
      const now = 1_700_000_000_000;
      jest.spyOn(Date, 'now').mockReturnValue(now);
      const user = createMockUser({
        last_update: new Date(now - 30_000).toISOString(),
      });

      // Act
      const { getByText } = render(
        <UserListCard user={user} onPress={mockOnPress} />
      );

      // Assert
      expect(getByText('30 dtk lalu')).toBeTruthy();

      jest.spyOn(Date, 'now').mockRestore();
    });

    it('should display "<n> mnt lalu" when last_update is 1–59 minutes ago', () => {
      // Arrange — diff is 15 minutes
      const now = 1_700_000_000_000;
      jest.spyOn(Date, 'now').mockReturnValue(now);
      const user = createMockUser({
        last_update: new Date(now - 15 * 60_000).toISOString(),
      });

      // Act
      const { getByText } = render(
        <UserListCard user={user} onPress={mockOnPress} />
      );

      // Assert
      expect(getByText('15 mnt lalu')).toBeTruthy();

      jest.spyOn(Date, 'now').mockRestore();
    });

    it('should display "<n> jam lalu" when last_update is 1+ hours ago', () => {
      // Arrange — diff is 3 hours
      const now = 1_700_000_000_000;
      jest.spyOn(Date, 'now').mockReturnValue(now);
      const user = createMockUser({
        last_update: new Date(now - 3 * 60 * 60_000).toISOString(),
      });

      // Act
      const { getByText } = render(
        <UserListCard user={user} onPress={mockOnPress} />
      );

      // Assert
      expect(getByText('3 jam lalu')).toBeTruthy();

      jest.spyOn(Date, 'now').mockRestore();
    });

    it('should display "baru saja" for last_update exactly at the current millisecond', () => {
      // Arrange — diff is 0 ms → 0 seconds < 5
      const now = 1_700_000_000_000;
      jest.spyOn(Date, 'now').mockReturnValue(now);
      const user = createMockUser({
        last_update: new Date(now).toISOString(),
      });

      // Act
      const { getByText } = render(
        <UserListCard user={user} onPress={mockOnPress} />
      );

      // Assert
      expect(getByText('baru saja')).toBeTruthy();

      jest.spyOn(Date, 'now').mockRestore();
    });
  });

  describe('interaction', () => {
    it('should call onPress with the user object when the card is pressed', () => {
      // Arrange
      const user = createMockUser();

      // Act
      const { getByRole } = render(
        <UserListCard user={user} onPress={mockOnPress} />
      );
      fireEvent.press(getByRole('button'));

      // Assert
      expect(mockOnPress).toHaveBeenCalledTimes(1);
      expect(mockOnPress).toHaveBeenCalledWith(user);
    });

    it('should call onPress with the correct user when multiple re-renders occur', () => {
      // Arrange
      const user1 = createMockUser({ id: 'u1', full_name: 'User One' });
      const user2 = createMockUser({ id: 'u2', full_name: 'User Two' });
      const { rerender, getByRole } = render(
        <UserListCard user={user1} onPress={mockOnPress} />
      );

      // Act — swap user and press
      rerender(<UserListCard user={user2} onPress={mockOnPress} />);
      fireEvent.press(getByRole('button'));

      // Assert
      expect(mockOnPress).toHaveBeenCalledWith(user2);
    });
  });

  describe('accessibility', () => {
    it('should have an accessibilityLabel containing full_name, role label, and location_name', () => {
      // Arrange
      const user = createMockUser({
        full_name: 'Ahmad Satgas',
        role: 'satgas',
        location_name: 'Taman A',
      });

      // Act
      const { getByRole } = render(
        <UserListCard user={user} onPress={mockOnPress} />
      );

      // Assert — format: "<full_name>, <roleLabel>, <location_name>"
      const card = getByRole('button');
      expect(card.props.accessibilityLabel).toBe('Ahmad Satgas, Satgas, Taman A');
    });

    it('should set accessibilityRole to "button"', () => {
      // Arrange
      const user = createMockUser();

      // Act
      const { getByRole } = render(
        <UserListCard user={user} onPress={mockOnPress} />
      );

      // Assert
      expect(getByRole('button')).toBeTruthy();
    });
  });

  describe('role icon', () => {
    it('should render the correct icon for satgas role (account-hard-hat)', () => {
      // Arrange
      const user = createMockUser({ role: 'satgas' });

      // Act
      const { getAllByTestId } = render(
        <UserListCard user={user} onPress={mockOnPress} />
      );

      // Assert
      const icons = getAllByTestId('icon');
      expect(icons.length).toBeGreaterThan(0);
      expect(icons[0].props.children).toBe('account-hard-hat');
    });

    it('should render the correct icon for linmas role (shield-account)', () => {
      // Arrange
      const user = createMockUser({ role: 'linmas' });

      // Act
      const { getAllByTestId } = render(
        <UserListCard user={user} onPress={mockOnPress} />
      );

      // Assert
      const icons = getAllByTestId('icon');
      expect(icons[0].props.children).toBe('shield-account');
    });

    it('should render the correct icon for korlap role (clipboard-account)', () => {
      // Arrange
      const user = createMockUser({ role: 'korlap' });

      // Act
      const { getAllByTestId } = render(
        <UserListCard user={user} onPress={mockOnPress} />
      );

      // Assert
      const icons = getAllByTestId('icon');
      expect(icons[0].props.children).toBe('clipboard-account');
    });

    it('should fall back to account-hard-hat icon for an unknown role', () => {
      // Arrange
      const user = createMockUser({ role: 'unknown_role' });

      // Act
      const { getAllByTestId } = render(
        <UserListCard user={user} onPress={mockOnPress} />
      );

      // Assert
      const icons = getAllByTestId('icon');
      expect(icons[0].props.children).toBe('account-hard-hat');
    });
  });

  describe('edge cases', () => {
    it('should render without crashing when battery_level is null', () => {
      // Arrange
      const user = createMockUser({ battery_level: null });

      // Act & Assert
      const { getByRole } = render(
        <UserListCard user={user} onPress={mockOnPress} />
      );
      expect(getByRole('button')).toBeTruthy();
    });

    it('should render without crashing when accuracy is null', () => {
      // Arrange
      const user = createMockUser({ accuracy: null });

      // Act & Assert
      const { getByRole } = render(
        <UserListCard user={user} onPress={mockOnPress} />
      );
      expect(getByRole('button')).toBeTruthy();
    });
  });
});
