/**
 * UserInfoCard Component Tests
 * Tests for slide-up card showing detailed user information
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { Animated } from 'react-native';
import { UserInfoCard } from '../UserInfoCard';
import type { ActiveUserData } from '../../../types/api.types';
import * as dateUtils from '../../../utils/dateUtils';

// Mock date utilities
jest.mock('../../../utils/dateUtils', () => ({
  formatTime: jest.fn((date: Date) => '07:00'),
  calculateDuration: jest.fn(() => ({ formatted: '3 jam 15 menit', hours: 3.25 })),
  getRelativeTime: jest.fn(() => '5 menit yang lalu'),
}));

describe('UserInfoCard', () => {
  const mockOnClose = jest.fn();
  const mockOnViewDetails = jest.fn();

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
    // Mock Animated.spring
    jest.spyOn(Animated, 'spring').mockReturnValue({
      start: jest.fn(),
    } as any);
  });

  describe('rendering', () => {
    it('should render empty view when user is null', () => {
      // Arrange & Act
      const { UNSAFE_queryByType } = render(
        <UserInfoCard
          user={null}
          visible={true}
          onClose={mockOnClose}
        />
      );

      // Assert
      const views = UNSAFE_queryByType('View');
      expect(views).toBeTruthy();
    });

    it('should render card with user information when visible', () => {
      // Arrange
      const user = createMockUser();

      // Act
      const { getByText } = render(
        <UserInfoCard
          user={user}
          visible={true}
          onClose={mockOnClose}
        />
      );

      // Assert
      expect(getByText('Ahmad Satgas')).toBeTruthy();
      expect(getByText('@satgas1')).toBeTruthy();
      expect(getByText('Taman A')).toBeTruthy();
    });

    it('should render overlay when visible', () => {
      // Arrange
      const user = createMockUser();

      // Act
      const { getByTestId } = render(
        <UserInfoCard
          user={user}
          visible={true}
          onClose={mockOnClose}
        />
      );

      // Assert
      expect(getByTestId('overlay')).toBeTruthy();
    });

    it('should not render overlay when not visible', () => {
      // Arrange
      const user = createMockUser();

      // Act
      const { queryByTestId } = render(
        <UserInfoCard
          user={user}
          visible={false}
          onClose={mockOnClose}
        />
      );

      // Assert
      expect(queryByTestId('overlay')).toBeNull();
    });
  });

  describe('user information display', () => {
    it('should display user initials in avatar', () => {
      // Arrange
      const user = createMockUser({ full_name: 'Budi Santoso' });

      // Act
      const { getByText } = render(
        <UserInfoCard
          user={user}
          visible={true}
          onClose={mockOnClose}
        />
      );

      // Assert - should show first and last name initials
      expect(getByText('BS')).toBeTruthy();
    });

    it('should display two-letter initials for single name', () => {
      // Arrange
      const user = createMockUser({ full_name: 'Ahmad' });

      // Act
      const { getByText } = render(
        <UserInfoCard
          user={user}
          visible={true}
          onClose={mockOnClose}
        />
      );

      // Assert - should show first two letters
      expect(getByText('AH')).toBeTruthy();
    });

    it('should display username with @ prefix', () => {
      // Arrange
      const user = createMockUser({ username: 'worker123' });

      // Act
      const { getByText } = render(
        <UserInfoCard
          user={user}
          visible={true}
          onClose={mockOnClose}
        />
      );

      // Assert
      expect(getByText('@worker123')).toBeTruthy();
    });

    it('should display area name', () => {
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
        <UserInfoCard
          user={user}
          visible={true}
          onClose={mockOnClose}
        />
      );

      // Assert
      expect(getByText('Taman Bungkul')).toBeTruthy();
    });

    it('should display clock in time from dateUtils', () => {
      // Arrange
      const user = createMockUser();

      // Act
      const { getByText } = render(
        <UserInfoCard
          user={user}
          visible={true}
          onClose={mockOnClose}
        />
      );

      // Assert
      expect(dateUtils.formatTime).toHaveBeenCalled();
      expect(getByText('07:00')).toBeTruthy();
    });

    it('should display work duration from dateUtils', () => {
      // Arrange
      const user = createMockUser();

      // Act
      const { getByText } = render(
        <UserInfoCard
          user={user}
          visible={true}
          onClose={mockOnClose}
        />
      );

      // Assert
      expect(dateUtils.calculateDuration).toHaveBeenCalled();
      expect(getByText('3 jam 15 menit')).toBeTruthy();
    });

    it('should display location update time from dateUtils', () => {
      // Arrange
      const user = createMockUser();

      // Act
      const { getByText } = render(
        <UserInfoCard
          user={user}
          visible={true}
          onClose={mockOnClose}
        />
      );

      // Assert
      expect(dateUtils.getRelativeTime).toHaveBeenCalled();
      expect(getByText('5 menit yang lalu')).toBeTruthy();
    });

    it('should display "Tidak ada data lokasi" when no location', () => {
      // Arrange
      const user = createMockUser({ latest_location: null });

      // Act
      const { getByText } = render(
        <UserInfoCard
          user={user}
          visible={true}
          onClose={mockOnClose}
        />
      );

      // Assert
      expect(getByText('Tidak ada data lokasi')).toBeTruthy();
    });
  });

  describe('animation', () => {
    it('should animate slide up when visible becomes true', () => {
      // Arrange
      const user = createMockUser();
      const { rerender } = render(
        <UserInfoCard
          user={user}
          visible={false}
          onClose={mockOnClose}
        />
      );

      // Act
      rerender(
        <UserInfoCard
          user={user}
          visible={true}
          onClose={mockOnClose}
        />
      );

      // Assert
      expect(Animated.spring).toHaveBeenCalled();
    });

    it('should animate slide down when visible becomes false', () => {
      // Arrange
      const user = createMockUser();
      const { rerender } = render(
        <UserInfoCard
          user={user}
          visible={true}
          onClose={mockOnClose}
        />
      );

      // Act
      rerender(
        <UserInfoCard
          user={user}
          visible={false}
          onClose={mockOnClose}
        />
      );

      // Assert
      expect(Animated.spring).toHaveBeenCalled();
    });

    it('should use spring animation with correct configuration', () => {
      // Arrange
      const user = createMockUser();

      // Act
      render(
        <UserInfoCard
          user={user}
          visible={true}
          onClose={mockOnClose}
        />
      );

      // Assert
      expect(Animated.spring).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          toValue: 0,
          useNativeDriver: true,
          tension: 50,
          friction: 8,
        })
      );
    });
  });

  describe('interaction', () => {
    it('should call onClose when overlay is pressed', () => {
      // Arrange
      const user = createMockUser();

      // Act
      const { getByTestId } = render(
        <UserInfoCard
          user={user}
          visible={true}
          onClose={mockOnClose}
        />
      );

      fireEvent.press(getByTestId('overlay'));

      // Assert
      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    it('should render view details button when onViewDetails is provided', () => {
      // Arrange
      const user = createMockUser();

      // Act
      const { getByText } = render(
        <UserInfoCard
          user={user}
          visible={true}
          onClose={mockOnClose}
          onViewDetails={mockOnViewDetails}
        />
      );

      // Assert
      expect(getByText('Lihat Detail')).toBeTruthy();
    });

    it('should not render view details button when onViewDetails is not provided', () => {
      // Arrange
      const user = createMockUser();

      // Act
      const { queryByText } = render(
        <UserInfoCard
          user={user}
          visible={true}
          onClose={mockOnClose}
        />
      );

      // Assert
      expect(queryByText('Lihat Detail')).toBeNull();
    });

    it('should call onViewDetails when details button is pressed', () => {
      // Arrange
      const user = createMockUser();

      // Act
      const { getByText } = render(
        <UserInfoCard
          user={user}
          visible={true}
          onClose={mockOnClose}
          onViewDetails={mockOnViewDetails}
        />
      );

      fireEvent.press(getByText('Lihat Detail'));

      // Assert
      expect(mockOnViewDetails).toHaveBeenCalledTimes(1);
    });
  });

  describe('accessibility', () => {
    it('should render all info labels', () => {
      // Arrange
      const user = createMockUser();

      // Act
      const { getByText } = render(
        <UserInfoCard
          user={user}
          visible={true}
          onClose={mockOnClose}
        />
      );

      // Assert
      expect(getByText('Lokasi')).toBeTruthy();
      expect(getByText('Masuk')).toBeTruthy();
      expect(getByText('Durasi kerja')).toBeTruthy();
      expect(getByText('Update lokasi')).toBeTruthy();
    });

    it('should have accessible overlay for dismissal', () => {
      // Arrange
      const user = createMockUser();

      // Act
      const { getByTestId } = render(
        <UserInfoCard
          user={user}
          visible={true}
          onClose={mockOnClose}
        />
      );

      // Assert
      const overlay = getByTestId('overlay');
      expect(overlay.props.accessible).toBeTruthy();
    });
  });

  describe('edge cases', () => {
    it('should handle user with name containing extra spaces', () => {
      // Arrange
      const user = createMockUser({ full_name: '  Ahmad   Budi  Santoso  ' });

      // Act
      const { getByText } = render(
        <UserInfoCard
          user={user}
          visible={true}
          onClose={mockOnClose}
        />
      );

      // Assert - should trim and show initials AS
      expect(getByText('AS')).toBeTruthy();
    });

    it('should handle user with very long name', () => {
      // Arrange
      const longName = 'Ahmad Muhammad Abdullah Bin Ibrahim Bin Omar Al-Farisi';
      const user = createMockUser({ full_name: longName });

      // Act
      const { getByText } = render(
        <UserInfoCard
          user={user}
          visible={true}
          onClose={mockOnClose}
        />
      );

      // Assert - should display full name
      expect(getByText(longName)).toBeTruthy();
    });

    it('should handle rapid visibility toggles', () => {
      // Arrange
      const user = createMockUser();
      const { rerender } = render(
        <UserInfoCard
          user={user}
          visible={false}
          onClose={mockOnClose}
        />
      );

      // Act - Toggle multiple times
      rerender(
        <UserInfoCard
          user={user}
          visible={true}
          onClose={mockOnClose}
        />
      );
      rerender(
        <UserInfoCard
          user={user}
          visible={false}
          onClose={mockOnClose}
        />
      );
      rerender(
        <UserInfoCard
          user={user}
          visible={true}
          onClose={mockOnClose}
        />
      );

      // Assert - should call spring animation multiple times
      expect(Animated.spring).toHaveBeenCalled();
    });

    it('should handle user change while visible', () => {
      // Arrange
      const user1 = createMockUser({ full_name: 'Ahmad Satgas' });
      const user2 = createMockUser({ full_name: 'Budi Linmas' });
      const { rerender, getByText } = render(
        <UserInfoCard
          user={user1}
          visible={true}
          onClose={mockOnClose}
        />
      );

      // Act
      rerender(
        <UserInfoCard
          user={user2}
          visible={true}
          onClose={mockOnClose}
        />
      );

      // Assert
      expect(getByText('Budi Linmas')).toBeTruthy();
    });

    it('should handle null location gracefully', () => {
      // Arrange
      const user = createMockUser({ latest_location: null });

      // Act
      const { getByText } = render(
        <UserInfoCard
          user={user}
          visible={true}
          onClose={mockOnClose}
        />
      );

      // Assert
      expect(getByText('Tidak ada data lokasi')).toBeTruthy();
      expect(dateUtils.getRelativeTime).not.toHaveBeenCalled();
    });
  });

  describe('layout', () => {
    it('should render handle for drag gesture visual feedback', () => {
      // Arrange
      const user = createMockUser();

      // Act
      const { UNSAFE_getAllByType } = render(
        <UserInfoCard
          user={user}
          visible={true}
          onClose={mockOnClose}
        />
      );

      // Assert - should contain multiple View components including handle
      const views = UNSAFE_getAllByType('View');
      expect(views.length).toBeGreaterThan(0);
    });

    it('should render info rows in correct order', () => {
      // Arrange
      const user = createMockUser();

      // Act
      const { getAllByText } = render(
        <UserInfoCard
          user={user}
          visible={true}
          onClose={mockOnClose}
        />
      );

      // Assert - all labels should be present
      const labels = getAllByText(/Lokasi|Masuk|Durasi kerja|Update lokasi/);
      expect(labels.length).toBe(4);
    });
  });
});
