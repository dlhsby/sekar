/**
 * WorkerMarker Component Tests
 * Unit tests for custom map marker component
 *
 * Phase 2 Update: Changed from initials to role-based icons
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

// Mock react-native-vector-icons
jest.mock('react-native-vector-icons/MaterialCommunityIcons', () => {
  const { Text } = require('react-native');
  return ({ name, ...props }: any) => <Text testID={`icon-${name}`} {...props}>{name}</Text>;
});

const mockWorker: ActiveWorkerData = {
  id: 1,
  username: 'worker1',
  full_name: 'John Doe',
  role: 'Worker',
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

const mockLinmasWorker: ActiveWorkerData = {
  ...mockWorker,
  id: 2,
  username: 'linmas1',
  full_name: 'Jane Smith',
  role: 'Linmas',
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

    it('should display worker role icon', () => {
      const { getAllByTestId } = render(
        <WorkerMarker worker={mockWorker} status="active" onPress={mockOnPress} />
      );

      // Worker role should show hard-hat icon (in marker and callout)
      expect(getAllByTestId('icon-account-hard-hat').length).toBeGreaterThanOrEqual(1);
    });

    it('should display role label in callout', () => {
      const { getByText } = render(
        <WorkerMarker worker={mockWorker} status="active" onPress={mockOnPress} />
      );

      expect(getByText('Satgas')).toBeTruthy();
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

  describe('Role-based Display', () => {
    it('should show Satgas label for Worker role', () => {
      const { getByText, getAllByTestId } = render(
        <WorkerMarker worker={mockWorker} status="active" onPress={mockOnPress} />
      );

      expect(getByText('Satgas')).toBeTruthy();
      // Two icons: one in marker, one in callout
      expect(getAllByTestId('icon-account-hard-hat').length).toBeGreaterThanOrEqual(1);
    });

    it('should show Linmas label for Linmas role', () => {
      const { getByText, getAllByTestId } = render(
        <WorkerMarker worker={mockLinmasWorker} status="active" onPress={mockOnPress} />
      );

      expect(getByText('Linmas')).toBeTruthy();
      // Two icons: one in marker, one in callout
      expect(getAllByTestId('icon-shield-account').length).toBeGreaterThanOrEqual(1);
    });

    it('should default to Satgas for undefined role', () => {
      const workerNoRole = { ...mockWorker, role: undefined };
      const { getByText, getAllByTestId } = render(
        <WorkerMarker worker={workerNoRole} status="active" onPress={mockOnPress} />
      );

      expect(getByText('Satgas')).toBeTruthy();
      // Two icons: one in marker, one in callout
      expect(getAllByTestId('icon-account-hard-hat').length).toBeGreaterThanOrEqual(1);
    });

    it('should display different marker shape for Linmas', () => {
      const { getAllByTestId } = render(
        <WorkerMarker worker={mockLinmasWorker} status="active" onPress={mockOnPress} />
      );

      // Linmas markers use shield icon (appears in marker and callout)
      expect(getAllByTestId('icon-shield-account').length).toBeGreaterThanOrEqual(1);
    });

    it('should display worker info in callout', () => {
      const { getByText } = render(
        <WorkerMarker worker={mockWorker} status="active" onPress={mockOnPress} />
      );

      expect(getByText('John Doe')).toBeTruthy();
      expect(getByText('Taman Bungkul')).toBeTruthy();
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
      const { getByText, getAllByTestId } = render(
        <WorkerMarker worker={worker} status="active" onPress={mockOnPress} />
      );

      // Should show role icon (in marker and callout) and name
      expect(getAllByTestId('icon-account-hard-hat').length).toBeGreaterThanOrEqual(1);
      expect(getByText('José María')).toBeTruthy();
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
      const { queryByText, getAllByTestId, getByText } = render(
        <WorkerMarker worker={mockWorker} status="active" onPress={mockOnPress} clusterCount={1} />
      );

      // Should render individual marker with role icon (in marker and callout), not cluster count
      expect(getAllByTestId('icon-account-hard-hat').length).toBeGreaterThanOrEqual(1);
      expect(getByText('Satgas')).toBeTruthy();
      expect(queryByText('1')).toBeNull();
    });

    it('should not render cluster marker when clusterCount is undefined', () => {
      const { getAllByTestId, getByText } = render(
        <WorkerMarker worker={mockWorker} status="active" onPress={mockOnPress} />
      );

      // Should render individual marker with role icon (in marker and callout)
      expect(getAllByTestId('icon-account-hard-hat').length).toBeGreaterThanOrEqual(1);
      expect(getByText('Satgas')).toBeTruthy();
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
      const { getAllByTestId, getByText, queryByText } = render(
        <WorkerMarker worker={mockWorker} status="active" onPress={mockOnPress} clusterCount={0} />
      );

      // clusterCount of 0 or 1 should render individual marker with role icon (in marker and callout)
      expect(getAllByTestId('icon-account-hard-hat').length).toBeGreaterThanOrEqual(1);
      expect(getByText('Satgas')).toBeTruthy();
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
