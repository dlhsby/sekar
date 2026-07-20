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
        nodes={[node({ id: 'r1' }), node({ id: 'r2', name: 'Rayon Utara' })]}
        onDrill={jest.fn()}
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
      />,
    );
    expect(queryByTestId('node-marker-r1')).toBeNull();
  });

  it('forwards the tapped node to onDrill', () => {
    const onDrill = jest.fn();
    const n = node({ id: 'r1' });
    const { getByTestId } = render(<AggregateBubbleLayer nodes={[n]} onDrill={onDrill} />);
    fireEvent(getByTestId('node-marker-r1'), 'press');
    expect(onDrill).toHaveBeenCalledWith(n);
  });
});
