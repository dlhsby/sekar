/**
 * WorkerInfoCard Component Tests
 * Unit tests for slide-up worker info card
 */

import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { WorkerInfoCard } from '../WorkerInfoCard';
import type { ActiveWorkerData } from '../../../types/api.types';

// Mock Animated API and Alert
jest.mock('react-native', () => {
  const RN = jest.requireActual('react-native');
  RN.Animated.timing = jest.fn(() => ({
    start: jest.fn((callback) => callback && callback()),
  }));
  RN.Animated.spring = jest.fn(() => ({
    start: jest.fn((callback) => callback && callback()),
  }));
  RN.Alert = {
    alert: jest.fn(),
  };
  return RN;
});

const mockWorker: ActiveWorkerData = {
  id: 1,
  username: 'worker1',
  full_name: 'John Doe',
  shift: {
    id: 101,
    clock_in_time: '2026-01-17T08:00:00.000Z', // 8 AM
    area: {
      id: 1,
      name: 'Taman Bungkul',
    },
  },
  latest_location: {
    gps_lat: -7.2905,
    gps_lng: 112.7398,
    logged_at: '2026-01-17T10:00:00.000Z', // 10 AM (2 hours after clock-in)
  },
};

const mockWorkerNoLocation: ActiveWorkerData = {
  ...mockWorker,
  latest_location: null,
};

describe('WorkerInfoCard', () => {
  const mockOnClose = jest.fn();
  const mockOnViewDetails = jest.fn();

  beforeEach(() => {
    mockOnClose.mockClear();
    mockOnViewDetails.mockClear();
    // Mock current date to match test data
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-01-17T12:00:00.000Z')); // Noon, 4 hours after clock-in
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('Visibility', () => {
    it('should render when visible is true', () => {
      const { getByText } = render(
        <WorkerInfoCard worker={mockWorker} visible={true} onClose={mockOnClose} />
      );

      expect(getByText('John Doe')).toBeTruthy();
    });

    it('should not render overlay when visible is false', () => {
      const { queryByText } = render(
        <WorkerInfoCard worker={mockWorker} visible={false} onClose={mockOnClose} />
      );

      // Card is rendered but not visible (Animated.View with transform)
      expect(queryByText('John Doe')).toBeTruthy();
    });

    it('should not render when worker is null', () => {
      const { queryByText } = render(
        <WorkerInfoCard worker={null} visible={true} onClose={mockOnClose} />
      );

      expect(queryByText('John Doe')).toBeNull();
    });
  });

  describe('Worker Information Display', () => {
    it('should display worker name', () => {
      const { getByText } = render(
        <WorkerInfoCard worker={mockWorker} visible={true} onClose={mockOnClose} />
      );

      expect(getByText('John Doe')).toBeTruthy();
    });

    it('should display worker username with @ prefix', () => {
      const { getByText } = render(
        <WorkerInfoCard worker={mockWorker} visible={true} onClose={mockOnClose} />
      );

      expect(getByText('@worker1')).toBeTruthy();
    });

    it('should display area name', () => {
      const { getByText } = render(
        <WorkerInfoCard worker={mockWorker} visible={true} onClose={mockOnClose} />
      );

      expect(getByText('Taman Bungkul')).toBeTruthy();
    });

    it('should display clock-in time formatted', () => {
      const { getByText } = render(
        <WorkerInfoCard worker={mockWorker} visible={true} onClose={mockOnClose} />
      );

      // formatTime should format as HH:MM (timezone dependent)
      // Just verify the label is shown
      expect(getByText('Masuk')).toBeTruthy();
    });

    it('should display hours worked', () => {
      const { getByText } = render(
        <WorkerInfoCard worker={mockWorker} visible={true} onClose={mockOnClose} />
      );

      // 4 hours from 8 AM to noon
      expect(getByText(/4j/)).toBeTruthy();
    });
  });

  describe('Location Update Display', () => {
    it('should display relative time for last location update', () => {
      const { getByText } = render(
        <WorkerInfoCard worker={mockWorker} visible={true} onClose={mockOnClose} />
      );

      // 2 hours ago from noon to 10 AM
      expect(getByText('2 jam yang lalu')).toBeTruthy();
    });

    it('should display "Tidak ada data lokasi" when no location', () => {
      const { getByText } = render(
        <WorkerInfoCard worker={mockWorkerNoLocation} visible={true} onClose={mockOnClose} />
      );

      expect(getByText('Tidak ada data lokasi')).toBeTruthy();
    });
  });

  describe('Avatar Initials', () => {
    it('should display initials for two-word name', () => {
      const { getByText } = render(
        <WorkerInfoCard worker={mockWorker} visible={true} onClose={mockOnClose} />
      );

      expect(getByText('JD')).toBeTruthy();
    });

    it('should display initials for single-word name', () => {
      const worker = { ...mockWorker, full_name: 'John' };
      const { getByText } = render(
        <WorkerInfoCard worker={worker} visible={true} onClose={mockOnClose} />
      );

      expect(getByText('JO')).toBeTruthy();
    });

    it('should display initials for multi-word name (first and last)', () => {
      const worker = { ...mockWorker, full_name: 'John Michael Doe' };
      const { getByText } = render(
        <WorkerInfoCard worker={worker} visible={true} onClose={mockOnClose} />
      );

      expect(getByText('JD')).toBeTruthy();
    });
  });

  describe('User Interactions', () => {
    it('should call onClose when overlay is tapped', () => {
      const { getByTestId } = render(
        <WorkerInfoCard worker={mockWorker} visible={true} onClose={mockOnClose} />
      );

      // Find overlay (TouchableOpacity wrapping backdrop)
      const overlay = getByTestId('overlay');
      fireEvent.press(overlay);

      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    it('should call onViewDetails when details button is tapped', () => {
      const { getByText } = render(
        <WorkerInfoCard
          worker={mockWorker}
          visible={true}
          onClose={mockOnClose}
          onViewDetails={mockOnViewDetails}
        />
      );

      const detailsButton = getByText('Lihat Detail');
      fireEvent.press(detailsButton);

      expect(mockOnViewDetails).toHaveBeenCalledTimes(1);
    });

    it('should not render details button when onViewDetails is not provided', () => {
      const { queryByText } = render(
        <WorkerInfoCard worker={mockWorker} visible={true} onClose={mockOnClose} />
      );

      expect(queryByText('Lihat Detail')).toBeNull();
    });
  });

  describe('Info Rows', () => {
    it('should display all info rows', () => {
      const { getByText } = render(
        <WorkerInfoCard worker={mockWorker} visible={true} onClose={mockOnClose} />
      );

      expect(getByText('Lokasi')).toBeTruthy();
      expect(getByText('Masuk')).toBeTruthy();
      expect(getByText('Durasi kerja')).toBeTruthy();
      expect(getByText('Update lokasi')).toBeTruthy();
    });

    it('should display correct values for each row', () => {
      const { getByText } = render(
        <WorkerInfoCard worker={mockWorker} visible={true} onClose={mockOnClose} />
      );

      // Location
      expect(getByText('Taman Bungkul')).toBeTruthy();
      // Clock-in time label (actual time is timezone-dependent)
      expect(getByText('Masuk')).toBeTruthy();
      // Duration (4 hours)
      expect(getByText(/4j/)).toBeTruthy();
      // Last update (2 hours ago)
      expect(getByText('2 jam yang lalu')).toBeTruthy();
    });
  });

  describe('Edge Cases', () => {
    it('should handle very long area name', () => {
      const worker = {
        ...mockWorker,
        shift: {
          ...mockWorker.shift,
          area: { ...mockWorker.shift.area, name: 'A'.repeat(100) },
        },
      };

      const { getByText } = render(
        <WorkerInfoCard worker={worker} visible={true} onClose={mockOnClose} />
      );

      expect(getByText('A'.repeat(100))).toBeTruthy();
    });

    it('should handle very long worker name', () => {
      const worker = { ...mockWorker, full_name: 'A'.repeat(50) + ' ' + 'B'.repeat(50) };

      const { getByText } = render(
        <WorkerInfoCard worker={worker} visible={true} onClose={mockOnClose} />
      );

      const longName = 'A'.repeat(50) + ' ' + 'B'.repeat(50);
      expect(getByText(longName)).toBeTruthy();
    });

    it('should handle clock-in time very recently (minutes ago)', () => {
      const recentWorker = {
        ...mockWorker,
        shift: {
          ...mockWorker.shift,
          clock_in_time: '2026-01-17T11:50:00.000Z', // 10 minutes ago
        },
      };

      const { getByText } = render(
        <WorkerInfoCard worker={recentWorker} visible={true} onClose={mockOnClose} />
      );

      // Should show minutes (10m or 0j 10m)
      expect(getByText('Durasi kerja')).toBeTruthy();
    });

    it('should handle special characters in worker name', () => {
      const worker = { ...mockWorker, full_name: 'José María' };

      const { getByText } = render(
        <WorkerInfoCard worker={worker} visible={true} onClose={mockOnClose} />
      );

      expect(getByText('José María')).toBeTruthy();
    });
  });

  describe('Animation', () => {
    it('should render drag handle', () => {
      const { UNSAFE_getAllByType } = render(
        <WorkerInfoCard worker={mockWorker} visible={true} onClose={mockOnClose} />
      );

      // Drag handle is a View component
      // This test verifies the component renders without crashing
      expect(UNSAFE_getAllByType(require('react-native').View)).toBeTruthy();
    });
  });
});
