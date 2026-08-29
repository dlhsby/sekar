/**
 * Notable-plant markers.
 *
 * This component was a STUB for three phases — it returned null unconditionally
 * while the Tanaman toggle sat in the tools sheet controlling nothing. These
 * tests exist so it cannot quietly return to that.
 */
import React from 'react';
import { render } from '@testing-library/react-native';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { PlantOverlayLayer } from '../PlantOverlayLayer';

jest.mock('react-native-maps', () => {
  const { View } = require('react-native');
  return { Marker: ({ children, testID }: never) => <View testID={testID}>{children}</View> };
});
jest.mock('react-native-vector-icons/MaterialCommunityIcons', () => {
  const { Text } = require('react-native');
  return () => <Text>icon</Text>;
});

const plant = (over = {}) => ({
  id: 'p1',
  areaId: 'a1',
  speciesId: 's1',
  gpsLat: -7.29,
  gpsLng: 112.73,
  label: 'Trembesi Tua',
  heritage: false,
  photoUrls: [],
  notes: null,
  species: { id: 's1', nameId: 'Trembesi', category: 'peneduh' },
  createdAt: '',
  updatedAt: '',
  ...over,
});

const renderWith = (notableByArea: Record<string, unknown[]>, props = {}) => {
  const store = configureStore({
    reducer: { plants: (state = { notableByArea }) => state },
  });
  return render(
    <Provider store={store}>
      <PlantOverlayLayer visible areaId="a1" {...props} />
    </Provider>,
  );
};

describe('PlantOverlayLayer', () => {
  it('draws a marker per plant in the open lokasi', () => {
    const { getByTestId } = renderWith({ a1: [plant()] });
    expect(getByTestId('plant-marker-p1')).toBeTruthy();
  });

  it('draws nothing when the layer is off', () => {
    // The toggle must actually control something — for three phases it did not.
    const { queryByTestId } = renderWith({ a1: [plant()] }, { visible: false });
    expect(queryByTestId('plant-marker-p1')).toBeNull();
  });

  it('draws nothing above lokasi scope', () => {
    // The endpoint is per-location; there is nothing to draw until you are in one.
    const { queryByTestId } = renderWith({ a1: [plant()] }, { areaId: null });
    expect(queryByTestId('plant-marker-p1')).toBeNull();
  });

  it('skips a plant with unusable coordinates', () => {
    const { queryByTestId, getByTestId } = renderWith({
      a1: [plant(), plant({ id: 'bad', gpsLat: null })],
    });
    expect(getByTestId('plant-marker-p1')).toBeTruthy();
    expect(queryByTestId('plant-marker-bad')).toBeNull();
  });
});
