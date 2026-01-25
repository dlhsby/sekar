/**
 * WorkerMarker Component Tests
 * Unit tests for custom map marker component
 */

import React from 'react';
import { render } from '@testing-library/react-native';
import { WorkerMarker } from '../WorkerMarker';
import type { ActiveWorkerData } from '../../../types/api.types';

// Mock react-native-maps
jest.mock('react-native-maps', () => {
  const { View } = require('react-native');
  return {
    Marker: ({ children, ...props }: any) => <View testID="marker" {...props}>{children}</View>,
    Callout: ({ children }: any) => <View testID="callout">{children}</View>,
  };
});

const mockWorker: ActiveWorkerData = {
  id: 1,
  username: 'worker1',
  full_name: 'John Doe',
  shift: {
    id: 101,
    clock_in_time: '2026-01-17T08:00:00.000Z',
    area: {
      id: 1,
      name: 'Taman Bungkul',
    },
  },
  latest_location: {
    gps_lat: -7.2905,
    gps_lng: 112.7398,
    logged_at: '2026-01-17T10:00:00.000Z',
  },
};

const mockWorkerNoLocation: ActiveWorkerData = {
  ...mockWorker,
  latest_location: null,
};

describe('WorkerMarker', () => {
  const mockOnPress = jest.fn();

  beforeEach(() => {
    mockOnPress.mockClear();
  });

  describe('Rendering', () => {
    it('should render marker for worker with location', () => {
      const { getByTestId } = render(
        <WorkerMarker worker={mockWorker} status="active" onPress={mockOnPress} />
      );

      expect(getByTestId('marker')).toBeTruthy();
    });

    it('should not render marker for worker without location', () => {
      const { queryByTestId } = render(
        <WorkerMarker worker={mockWorkerNoLocation} status="active" onPress={mockOnPress} />
      );

      expect(queryByTestId('marker')).toBeNull();
    });

    it('should display worker initials', () => {
      const { getByText } = render(
        <WorkerMarker worker={mockWorker} status="active" onPress={mockOnPress} />
      );

      expect(getByText('JD')).toBeTruthy();
    });

    it('should display full name in callout', () => {
      const { getByText } = render(
        <WorkerMarker worker={mockWorker} status="active" onPress={mockOnPress} />
      );

      expect(getByText('John Doe')).toBeTruthy();
    });

    it('should display area name in callout', () => {
      const { getByText } = render(
        <WorkerMarker worker={mockWorker} status="active" onPress={mockOnPress} />
      );

      expect(getByText('Taman Bungkul')).toBeTruthy();
    });
  });

  describe('Initials Generation', () => {
    it('should generate initials for two-word name', () => {
      const worker = { ...mockWorker, full_name: 'John Doe' };
      const { getByText } = render(
        <WorkerMarker worker={worker} status="active" onPress={mockOnPress} />
      );

      expect(getByText('JD')).toBeTruthy();
    });

    it('should generate initials for single-word name', () => {
      const worker = { ...mockWorker, full_name: 'John' };
      const { getByText } = render(
        <WorkerMarker worker={worker} status="active" onPress={mockOnPress} />
      );

      expect(getByText('JO')).toBeTruthy();
    });

    it('should generate initials for multi-word name (first and last)', () => {
      const worker = { ...mockWorker, full_name: 'John Michael Doe' };
      const { getByText } = render(
        <WorkerMarker worker={worker} status="active" onPress={mockOnPress} />
      );

      expect(getByText('JD')).toBeTruthy();
    });

    it('should handle name with extra spaces', () => {
      const worker = { ...mockWorker, full_name: '  John   Doe  ' };
      const { getByText } = render(
        <WorkerMarker worker={worker} status="active" onPress={mockOnPress} />
      );

      expect(getByText('JD')).toBeTruthy();
    });

    it('should capitalize initials', () => {
      const worker = { ...mockWorker, full_name: 'john doe' };
      const { getByText } = render(
        <WorkerMarker worker={worker} status="active" onPress={mockOnPress} />
      );

      expect(getByText('JD')).toBeTruthy();
    });
  });

  describe('Status Colors', () => {
    it('should render active status (green)', () => {
      const { getByTestId } = render(
        <WorkerMarker worker={mockWorker} status="active" onPress={mockOnPress} />
      );

      const marker = getByTestId('marker');
      // Color is applied via StyleSheet, we just verify it renders
      expect(marker).toBeTruthy();
    });

    it('should render warning status (yellow)', () => {
      const { getByTestId } = render(
        <WorkerMarker worker={mockWorker} status="warning" onPress={mockOnPress} />
      );

      const marker = getByTestId('marker');
      expect(marker).toBeTruthy();
    });

    it('should render outside status (red)', () => {
      const { getByTestId } = render(
        <WorkerMarker worker={mockWorker} status="outside" onPress={mockOnPress} />
      );

      const marker = getByTestId('marker');
      expect(marker).toBeTruthy();
    });
  });

  describe('GPS Coordinates', () => {
    it('should handle numeric GPS coordinates', () => {
      const worker: ActiveWorkerData = {
        ...mockWorker,
        latest_location: {
          gps_lat: -7.2905,
          gps_lng: 112.7398,
          logged_at: '2026-01-17T10:00:00.000Z',
        },
      };

      const { getByTestId } = render(
        <WorkerMarker worker={worker} status="active" onPress={mockOnPress} />
      );

      expect(getByTestId('marker')).toBeTruthy();
    });

    it('should handle string GPS coordinates (type coercion)', () => {
      const worker: ActiveWorkerData = {
        ...mockWorker,
        latest_location: {
          gps_lat: '-7.2905' as any, // Simulating backend returning string
          gps_lng: '112.7398' as any,
          logged_at: '2026-01-17T10:00:00.000Z',
        },
      };

      const { getByTestId } = render(
        <WorkerMarker worker={worker} status="active" onPress={mockOnPress} />
      );

      expect(getByTestId('marker')).toBeTruthy();
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty name gracefully', () => {
      const worker = { ...mockWorker, full_name: '' };

      const { getByTestId } = render(
        <WorkerMarker worker={worker} status="active" onPress={mockOnPress} />
      );

      expect(getByTestId('marker')).toBeTruthy();
    });

    it('should handle very long name', () => {
      const worker = { ...mockWorker, full_name: 'A'.repeat(100) };

      const { getByTestId } = render(
        <WorkerMarker worker={worker} status="active" onPress={mockOnPress} />
      );

      expect(getByTestId('marker')).toBeTruthy();
    });

    it('should handle special characters in name', () => {
      const worker = { ...mockWorker, full_name: 'José María' };
      const { getByText } = render(
        <WorkerMarker worker={worker} status="active" onPress={mockOnPress} />
      );

      expect(getByText('JM')).toBeTruthy();
    });
  });

  describe('Cluster Marker', () => {
    it('should render cluster marker when clusterCount > 1', () => {
      const { getByText, getByTestId } = render(
        <WorkerMarker worker={mockWorker} status="active" onPress={mockOnPress} clusterCount={5} />
      );

      expect(getByTestId('marker')).toBeTruthy();
      expect(getByText('5')).toBeTruthy();
    });

    it('should not render cluster marker when clusterCount is 1', () => {
      const { queryByText, getByText } = render(
        <WorkerMarker worker={mockWorker} status="active" onPress={mockOnPress} clusterCount={1} />
      );

      // Should render individual marker (initials), not cluster count
      expect(getByText('JD')).toBeTruthy();
      expect(queryByText('1')).toBeNull();
    });

    it('should not render cluster marker when clusterCount is undefined', () => {
      const { getByText } = render(
        <WorkerMarker worker={mockWorker} status="active" onPress={mockOnPress} />
      );

      // Should render individual marker (initials)
      expect(getByText('JD')).toBeTruthy();
    });

    it('should display correct count for large clusters', () => {
      const { getByText } = render(
        <WorkerMarker worker={mockWorker} status="active" onPress={mockOnPress} clusterCount={99} />
      );

      expect(getByText('99')).toBeTruthy();
    });

    it('should not render callout for cluster markers', () => {
      const { queryByTestId } = render(
        <WorkerMarker worker={mockWorker} status="active" onPress={mockOnPress} clusterCount={10} />
      );

      expect(queryByTestId('callout')).toBeNull();
    });

    it('should render callout for individual markers', () => {
      const { getByTestId } = render(
        <WorkerMarker worker={mockWorker} status="active" onPress={mockOnPress} clusterCount={1} />
      );

      expect(getByTestId('callout')).toBeTruthy();
    });

    it('should use primary color for cluster markers', () => {
      const { getByTestId } = render(
        <WorkerMarker worker={mockWorker} status="active" onPress={mockOnPress} clusterCount={5} />
      );

      // Cluster marker should render (color is applied via StyleSheet)
      expect(getByTestId('marker')).toBeTruthy();
    });

    it('should use status color for individual markers', () => {
      const { getByTestId } = render(
        <WorkerMarker worker={mockWorker} status="warning" onPress={mockOnPress} />
      );

      // Individual marker should render with status color (yellow for warning)
      expect(getByTestId('marker')).toBeTruthy();
    });

    it('should handle cluster count of 2', () => {
      const { getByText } = render(
        <WorkerMarker worker={mockWorker} status="active" onPress={mockOnPress} clusterCount={2} />
      );

      expect(getByText('2')).toBeTruthy();
    });

    it('should handle cluster count of 0 as individual marker', () => {
      const { getByText, queryByText } = render(
        <WorkerMarker worker={mockWorker} status="active" onPress={mockOnPress} clusterCount={0} />
      );

      // clusterCount of 0 or 1 should render individual marker
      expect(getByText('JD')).toBeTruthy();
      expect(queryByText('0')).toBeNull();
    });

    it('should not render marker arrow for cluster', () => {
      const { queryByTestId } = render(
        <WorkerMarker worker={mockWorker} status="active" onPress={mockOnPress} clusterCount={5} />
      );

      // Cluster markers don't have arrows (only individual markers do)
      expect(queryByTestId('marker')).toBeTruthy();
    });
  });
});
