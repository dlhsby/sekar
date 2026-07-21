/**
 * AggregateBubbleLayer Tests
 * One drill node marker per node; skips nodes without a center; forwards the
 * tapped node to onDrill.
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { AggregateBubbleLayer, type NodeMarker } from '../AggregateBubbleLayer';

jest.mock('react-native-maps', () => {
  const React = require('react');
  const { View } = require('react-native');
  return {
    Marker: ({ children, testID, onPress }: any) =>
      React.createElement(View, { testID, onPress }, children),
  };
});

function node(over: Partial<NodeMarker>): NodeMarker {
  return {
    id: 'r1',
    name: 'Rayon Selatan',
    variant: 'district',
    lat: -7.3,
    lng: 112.7,
    scheduled: 6,
    clocked_in: 4,
    not_clocked_in: 2,
    ...over,
  };
}

describe('AggregateBubbleLayer', () => {
  it('renders one node marker per node with a center', () => {
    const { getByTestId } = render(
      <AggregateBubbleLayer
        // Far apart + zoomed in → rendered as individual nodes, not a cluster.
        nodes={[node({ id: 'r1', lat: -7.2, lng: 112.7 }), node({ id: 'r2', name: 'Rayon Utara', lat: -7.4, lng: 112.9 })]}
        onDrill={jest.fn()}
        latitudeDelta={0.005}
        onClusterPress={jest.fn()}
      />,
    );
    expect(getByTestId('node-marker-r1')).toBeTruthy();
    expect(getByTestId('node-marker-r2')).toBeTruthy();
  });

  it('skips nodes without a center point', () => {
    const { queryByTestId } = render(
      <AggregateBubbleLayer
        nodes={[node({ id: 'r1', lat: null as unknown as number, lng: null as unknown as number })]}
        onDrill={jest.fn()}
        latitudeDelta={0.005}
        onClusterPress={jest.fn()}
      />,
    );
    expect(queryByTestId('node-marker-r1')).toBeNull();
  });

  it('forwards the tapped node to onDrill', () => {
    const onDrill = jest.fn();
    const n = node({ id: 'r1' });
    const { getByTestId } = render(
      <AggregateBubbleLayer nodes={[n]} onDrill={onDrill} latitudeDelta={0.005} onClusterPress={jest.fn()} />,
    );
    fireEvent(getByTestId('node-marker-r1'), 'press');
    expect(onDrill).toHaveBeenCalledWith(n);
  });

  it('collapses coincident nodes into a cluster; a tap zooms in (no drill)', () => {
    const onDrill = jest.fn();
    const onClusterPress = jest.fn();
    const { getByTestId, queryByTestId } = render(
      <AggregateBubbleLayer
        nodes={[node({ id: 'a', lat: -7.25, lng: 112.75 }), node({ id: 'b', lat: -7.2501, lng: 112.7501 })]}
        onDrill={onDrill}
        latitudeDelta={0.1}
        onClusterPress={onClusterPress}
      />,
    );
    expect(queryByTestId('node-marker-a')).toBeNull();
    const cluster = getByTestId(/^node-cluster-/); // hashed, order-independent id
    fireEvent(cluster, 'press');
    expect(onClusterPress).toHaveBeenCalledTimes(1);
    expect(onDrill).not.toHaveBeenCalled();
  });
});
