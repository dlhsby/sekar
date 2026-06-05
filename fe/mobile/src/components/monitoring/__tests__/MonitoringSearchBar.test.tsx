/**
 * MonitoringSearchBar tests — Phase 4 M3 (CP-S2).
 * The bar is a non-editable trigger that opens the search modal.
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { MonitoringSearchBar } from '../MonitoringSearchBar';

jest.mock('react-native-vector-icons/MaterialCommunityIcons', () => {
  const React = require('react');
  const { Text } = require('react-native');
  return (props: any) => React.createElement(Text, { testID: `icon-${props.name}` }, props.name);
});

describe('MonitoringSearchBar', () => {
  it('shows the placeholder and opens on press', () => {
    const onPress = jest.fn();
    const { getByText, getByTestId } = render(<MonitoringSearchBar onPress={onPress} />);
    expect(getByText('Cari petugas, area, rayon…')).toBeTruthy();
    fireEvent.press(getByTestId('monitoring-search'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('shows the active value + clear affordance and clears on press', () => {
    const onClear = jest.fn();
    const { getByText, getByTestId } = render(
      <MonitoringSearchBar onPress={jest.fn()} value="Budi" onClear={onClear} />,
    );
    expect(getByText('Budi')).toBeTruthy();
    fireEvent.press(getByTestId('monitoring-search-clear'));
    expect(onClear).toHaveBeenCalledTimes(1);
  });

  it('hides the clear affordance when there is no value', () => {
    const { queryByTestId } = render(<MonitoringSearchBar onPress={jest.fn()} />);
    expect(queryByTestId('monitoring-search-clear')).toBeNull();
  });
});
