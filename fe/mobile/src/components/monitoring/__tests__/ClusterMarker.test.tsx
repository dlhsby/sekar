/**
 * ClusterMarker Component Tests
 * Phase 3 sub-phase 3-5: Cluster bubble rendering, stability constraints,
 * and press handler forwarding.
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { ClusterMarker } from '../ClusterMarker';

// Mock react-native-maps
jest.mock('react-native-maps', () => {
  const React = require('react');
  const { View } = require('react-native');

  return {
    Marker: ({ children, testID, onPress, tracksViewChanges, ...props }: any) =>
      React.createElement(
        View,
        { testID: testID || 'cluster-marker', onPress, tracksViewChanges, ...props },
        children,
      ),
  };
});

// Mock vector icons (not used by ClusterMarker but needed for module resolution)
jest.mock('react-native-vector-icons/MaterialCommunityIcons', () => {
  const React = require('react');
  const { Text } = require('react-native');
  return (props: any) => React.createElement(Text, { testID: 'icon', ...props }, props.name);
});

// ─── Helpers ─────────────────────────────────────────────────────────────────

const defaultProps = {
  coordinate: { latitude: -7.25, longitude: 112.75 },
  count: 5,
  zoomBucket: 3,
  onClusterPress: jest.fn(),
};

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('ClusterMarker', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('rendering', () => {
    it('renders a Marker at the given coordinate', () => {
      const { getByTestId } = render(<ClusterMarker {...defaultProps} />);
      const marker = getByTestId('cluster-marker');
      expect(marker).toBeTruthy();
      expect(marker.props.coordinate).toEqual({
        latitude: -7.25,
        longitude: 112.75,
      });
    });

    it('displays the count as text', () => {
      const { getByText } = render(<ClusterMarker {...defaultProps} count={12} />);
      expect(getByText('12')).toBeTruthy();
    });

    it('displays count of 1', () => {
      const { getByText } = render(<ClusterMarker {...defaultProps} count={1} />);
      expect(getByText('1')).toBeTruthy();
    });

    it('displays large counts without truncation', () => {
      const { getByText } = render(<ClusterMarker {...defaultProps} count={999} />);
      expect(getByText('999')).toBeTruthy();
    });
  });

  describe('stability constraints (Apr 24 fixes)', () => {
    it('has tracksViewChanges set to false', () => {
      const { getByTestId } = render(<ClusterMarker {...defaultProps} />);
      const marker = getByTestId('cluster-marker');
      // tracksViewChanges={false} prevents continuous Android bitmap redraw
      expect(marker.props.tracksViewChanges).toBe(false);
    });

    it('accepts zoomBucket without rendering it as visible text', () => {
      const { queryByText } = render(
        <ClusterMarker {...defaultProps} zoomBucket={7} />,
      );
      // zoomBucket is metadata for the parent key, not a visible label
      expect(queryByText('7')).toBeNull();
    });
  });

  describe('press handling', () => {
    it('calls onClusterPress when pressed', () => {
      const onPress = jest.fn();
      const { getByTestId } = render(
        <ClusterMarker {...defaultProps} onClusterPress={onPress} />,
      );
      const marker = getByTestId('cluster-marker');
      marker.props.onPress();
      expect(onPress).toHaveBeenCalledTimes(1);
    });

    it('does not call onClusterPress on render', () => {
      const onPress = jest.fn();
      render(<ClusterMarker {...defaultProps} onClusterPress={onPress} />);
      expect(onPress).not.toHaveBeenCalled();
    });
  });

  describe('key stability', () => {
    it('re-renders with new count without crashing', () => {
      const { rerender, getByText } = render(<ClusterMarker {...defaultProps} count={3} />);
      expect(getByText('3')).toBeTruthy();
      rerender(<ClusterMarker {...defaultProps} count={7} />);
      expect(getByText('7')).toBeTruthy();
    });

    it('re-renders with new zoomBucket without crashing', () => {
      const { rerender, getByText } = render(
        <ClusterMarker {...defaultProps} zoomBucket={2} />,
      );
      expect(getByText('5')).toBeTruthy();
      rerender(<ClusterMarker {...defaultProps} zoomBucket={4} />);
      expect(getByText('5')).toBeTruthy();
    });
  });

  describe('accessibility', () => {
    it('provides an accessibilityLabel with count', () => {
      const { getByLabelText } = render(<ClusterMarker {...defaultProps} count={8} />);
      expect(getByLabelText('8 petugas')).toBeTruthy();
    });
  });
});
