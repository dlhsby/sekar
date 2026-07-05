/**
 * ClusteredUserMarkers Component Tests
 * Phase 3 sub-phase 3-5: Switching between cluster bubbles and individual
 * UserMarker components based on zoom threshold.
 */

import React from 'react';
import { render } from '@testing-library/react-native';
import { ClusteredUserMarkers } from '../ClusteredUserMarkers';
import type { LiveUser } from '../../../types/models.types';

// Mock react-native-maps
jest.mock('react-native-maps', () => {
  const React = require('react');
  const { View } = require('react-native');

  return {
    Marker: ({ children, testID, onPress, tracksViewChanges, coordinate, ...props }: any) =>
      React.createElement(
        View,
        {
          testID: testID || 'marker',
          onPress,
          tracksViewChanges,
          coordinate,
          ...props,
        },
        children,
      ),
  };
});

// Mock vector icons
jest.mock('react-native-vector-icons/MaterialCommunityIcons', () => {
  const React = require('react');
  const { Text } = require('react-native');
  return (props: any) => React.createElement(Text, { testID: 'icon', ...props }, props.name);
});

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const makeUser = (overrides: Partial<LiveUser> = {}): LiveUser => ({
  id: 'user-1',
  full_name: 'Ahmad Wijaya',
  role: 'satgas',
  phone: null,
  status: 'active',
  area_id: 'area-1',
  area_name: 'Taman A',
  rayon_id: 'rayon-1',
  rayon_name: 'Rayon 1',
  latitude: -7.25,
  longitude: 112.75,
  accuracy: 10,
  battery_level: 80,
  last_update: '2026-04-26T08:00:00Z',
  is_within_area: true,
  outside_boundary: false,
  shift_id: 'shift-1',
  shift_name: 'Pagi',
  shift_definition_id: null,
  clock_in_time: '2026-04-26T07:00:00Z',
  current_task_status: null,
  current_task_title: null,
  ...overrides,
});

// Two workers far apart (>0.01 deg apart)
const workerA = makeUser({ id: 'user-A', latitude: -7.25, longitude: 112.75 });
const workerB = makeUser({ id: 'user-B', latitude: -7.30, longitude: 112.80 });
// Two workers very close (within 0.01 deg)
const workerC = makeUser({ id: 'user-C', latitude: -7.25, longitude: 112.75 });
const workerD = makeUser({ id: 'user-D', latitude: -7.255, longitude: 112.755 });

const defaultProps = {
  zoom: 0.03, // below threshold → individual markers
  clusterZoomThreshold: 0.05,
  labelMode: 'none' as const,
  selectedUserId: null,
  onUserPress: jest.fn(),
  onClusterPress: jest.fn(),
};

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('ClusteredUserMarkers', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('individual marker mode (zoom < threshold)', () => {
    it('renders one UserMarker per worker when zoomed in', () => {
      const { getAllByTestId } = render(
        <ClusteredUserMarkers
          {...defaultProps}
          workers={[workerA, workerB]}
          zoom={0.03}
        />,
      );
      // Each UserMarker renders a Marker
      const markers = getAllByTestId('marker');
      expect(markers.length).toBe(2);
    });

    it('renders nothing when workers array is empty', () => {
      const { queryAllByTestId } = render(
        <ClusteredUserMarkers
          {...defaultProps}
          workers={[]}
          zoom={0.03}
        />,
      );
      expect(queryAllByTestId('marker').length).toBe(0);
    });
  });

  describe('cluster mode (zoom >= threshold)', () => {
    it('renders a ClusterMarker for workers at the same location', () => {
      // workerC and workerD are within 0.01 deg of each other → should cluster
      const { queryAllByTestId, getByText } = render(
        <ClusteredUserMarkers
          {...defaultProps}
          workers={[workerC, workerD]}
          zoom={0.06} // above threshold
        />,
      );
      // Should render 1 cluster marker showing count "2"
      expect(getByText('2')).toBeTruthy();
      // The cluster renders 1 Marker
      expect(queryAllByTestId('marker').length).toBe(1);
    });

    it('renders individual UserMarkers for workers far apart', () => {
      // workerA and workerB are >0.01 deg apart → each gets its own marker
      const { getAllByTestId, queryByText } = render(
        <ClusteredUserMarkers
          {...defaultProps}
          workers={[workerA, workerB]}
          zoom={0.06} // above threshold
        />,
      );
      // 2 individual markers, no cluster count text
      expect(getAllByTestId('marker').length).toBe(2);
      expect(queryByText('2')).toBeNull();
    });

    it('renders single UserMarker (not ClusterMarker) when a cluster contains 1 worker', () => {
      const { getAllByTestId, queryByText } = render(
        <ClusteredUserMarkers
          {...defaultProps}
          workers={[workerA]}
          zoom={0.06}
        />,
      );
      expect(getAllByTestId('marker').length).toBe(1);
      expect(queryByText('1')).toBeNull();
    });
  });

  describe('zoom threshold boundary', () => {
    it('uses individual markers when zoom equals threshold (< is the cluster condition)', () => {
      // zoom === clusterZoomThreshold: 0.05 >= 0.05 → cluster mode
      const { getByText } = render(
        <ClusteredUserMarkers
          {...defaultProps}
          workers={[workerC, workerD]}
          zoom={0.05}
          clusterZoomThreshold={0.05}
        />,
      );
      // Both workers close together → cluster
      expect(getByText('2')).toBeTruthy();
    });

    it('uses individual markers just below threshold', () => {
      const { getAllByTestId, queryByText } = render(
        <ClusteredUserMarkers
          {...defaultProps}
          workers={[workerC, workerD]}
          zoom={0.049}
          clusterZoomThreshold={0.05}
        />,
      );
      // Individual markers
      expect(getAllByTestId('marker').length).toBe(2);
      expect(queryByText('2')).toBeNull();
    });
  });

  describe('press handlers', () => {
    it('calls onUserPress with correct id when individual marker is pressed', () => {
      const onUserPress = jest.fn();
      const { getAllByTestId } = render(
        <ClusteredUserMarkers
          {...defaultProps}
          workers={[workerA]}
          zoom={0.03}
          onUserPress={onUserPress}
        />,
      );
      const markers = getAllByTestId('marker');
      markers[0].props.onPress();
      expect(onUserPress).toHaveBeenCalledWith('user-A');
    });

    it('calls onClusterPress when a cluster marker is pressed', () => {
      const onClusterPress = jest.fn();
      const { getAllByTestId } = render(
        <ClusteredUserMarkers
          {...defaultProps}
          workers={[workerC, workerD]}
          zoom={0.06}
          onClusterPress={onClusterPress}
        />,
      );
      const markers = getAllByTestId('marker');
      markers[0].props.onPress();
      expect(onClusterPress).toHaveBeenCalledTimes(1);
      expect(onClusterPress).toHaveBeenCalledWith(
        expect.objectContaining({
          latitude: expect.any(Number),
          longitude: expect.any(Number),
        }),
      );
    });
  });
});
