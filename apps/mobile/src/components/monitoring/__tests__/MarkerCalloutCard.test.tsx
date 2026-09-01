/**
 * MarkerCalloutCard tests — Phase 4 M3 (CP-S1).
 *
 * The NB bubble shown over a tapped map marker: name + "Type · Role" meta (role
 * only when provided, i.e. petugas) + a "Lihat detail" footer.
 */

import React from 'react';
import { render } from '@testing-library/react-native';
import { MarkerCalloutCard } from '../MarkerCalloutCard';
import { nbColors } from '../../../constants/nbTokens';

jest.mock('react-native-vector-icons/MaterialCommunityIcons', () => {
  const React = require('react');
  const { Text } = require('react-native');
  return (props: any) => React.createElement(Text, { testID: `icon-${props.name}` }, props.name);
});

describe('MarkerCalloutCard', () => {
  it('renders the name, "Type · Role" meta and the Lihat detail footer for petugas', () => {
    const { getByText } = render(
      <MarkerCalloutCard
        title="Budi Santoso"
        typeText="Petugas"
        roleText="Satgas"
        accent={nbColors.primary}
        icon="account"
      />,
    );
    expect(getByText('Budi Santoso')).toBeTruthy();
    expect(getByText('Petugas · Satgas')).toBeTruthy();
    expect(getByText('Lihat detail')).toBeTruthy();
  });

  it('renders only the type (no role) when roleText is omitted', () => {
    const { getByText, queryByText } = render(
      <MarkerCalloutCard title="Taman Bungkul" typeText="Area" accent={nbColors.warning} icon="map-marker" />,
    );
    expect(getByText('Taman Bungkul')).toBeTruthy();
    expect(getByText('Area')).toBeTruthy();
    // No " · " separator without a role.
    expect(queryByText(/·/)).toBeNull();
  });

  it('renders the presence row (activity + location) when provided', () => {
    const { getByText } = render(
      <MarkerCalloutCard
        title="Budi Santoso"
        typeText="Petugas"
        roleText="Satgas"
        accent={nbColors.primary}
        icon="account"
        presence={{ activity: 'absent', location: 'luar_area' }}
      />,
    );
    expect(getByText('Tidak Hadir')).toBeTruthy();
    expect(getByText(/Luar area/)).toBeTruthy();
  });

  it('omits the location part of the presence row when unknown', () => {
    const { getByText, queryByText } = render(
      <MarkerCalloutCard
        title="Budi"
        typeText="Petugas"
        accent={nbColors.primary}
        presence={{ activity: 'absent', location: 'unknown' }}
      />,
    );
    expect(getByText('Tidak Hadir')).toBeTruthy();
    expect(queryByText(/Dalam area|Luar area/)).toBeNull();
  });
});
