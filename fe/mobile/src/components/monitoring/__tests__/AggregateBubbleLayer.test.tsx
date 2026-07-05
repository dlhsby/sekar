/**
 * AggregateBubbleLayer Tests
 * One drill bubble per aggregate node; skips nodes without a center; forwards
 * the tapped node to onDrill.
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { AggregateBubbleLayer } from '../AggregateBubbleLayer';
import type { AggregateNode } from '../../../types/models.types';

jest.mock('react-native-maps', () => {
  const React = require('react');
  const { View } = require('react-native');
  return {
    Marker: ({ children, testID, onPress }: any) =>
      React.createElement(View, { testID, onPress }, children),
  };
});

function node(over: Partial<AggregateNode>): AggregateNode {
  return {
    id: 'r1',
    name: 'Rayon Selatan',
    type: 'rayon',
    center_lat: -7.3,
    center_lng: 112.7,
    counts_by_status: { active: 4, inactive: 0, outside_area: 0, missing: 1, offline: 0 },
    counts_by_role: { satgas: 4 },
    worker_count: 5,
    online_count: 4,
    required: 6,
    is_understaffed: true,
    area_count: 2,
    ...over,
  };
}

describe('AggregateBubbleLayer', () => {
  it('renders one bubble per node with a center', () => {
    const { getByTestId } = render(
      <AggregateBubbleLayer
        nodes={[node({ id: 'r1' }), node({ id: 'r2', name: 'Rayon Utara' })]}
        onDrill={jest.fn()}
      />,
    );
    expect(getByTestId('aggregate-bubble-r1')).toBeTruthy();
    expect(getByTestId('aggregate-bubble-r2')).toBeTruthy();
  });

  it('skips nodes without a center point', () => {
    const { queryByTestId } = render(
      <AggregateBubbleLayer
        nodes={[node({ id: 'r1', center_lat: null, center_lng: null })]}
        onDrill={jest.fn()}
      />,
    );
    expect(queryByTestId('aggregate-bubble-r1')).toBeNull();
  });

  it('forwards the tapped node to onDrill', () => {
    const onDrill = jest.fn();
    const n = node({ id: 'r1' });
    const { getByTestId } = render(<AggregateBubbleLayer nodes={[n]} onDrill={onDrill} />);
    fireEvent(getByTestId('aggregate-bubble-r1'), 'press');
    expect(onDrill).toHaveBeenCalledWith(n);
  });
});
