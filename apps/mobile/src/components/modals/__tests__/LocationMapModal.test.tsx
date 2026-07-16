/**
 * LocationMapModal Tests
 * Component now delegates modal chrome to NBModal — tests verify map, overlays, and info strip.
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { View, Text, TouchableOpacity } from 'react-native';
import { LocationMapModal } from '../LocationMapModal';

// ─── Mocks ──────────────────────────────────────────────────────────────────

jest.mock('react-native-maps', () => {
  const React = require('react');
  const { View } = require('react-native');

  return {
    __esModule: true,
    default: ({ children, ...rest }: any) =>
      React.createElement(View, { testID: 'map-view', ...rest }, children),
    Marker: ({ children, coordinate, ...rest }: any) =>
      React.createElement(View, { testID: 'marker', coordinate, ...rest }, children),
    Circle: ({ center, radius, ...rest }: any) =>
      React.createElement(View, { testID: 'circle', center, radius, ...rest }),
    Polygon: ({ coordinates, ...rest }: any) =>
      React.createElement(View, { testID: 'polygon', coordinates, ...rest }),
    PROVIDER_GOOGLE: 'google',
  };
});

jest.mock('react-native-vector-icons/MaterialCommunityIcons', () => {
  const React = require('react');
  const { Text } = require('react-native');
  return (props: any) =>
    React.createElement(Text, { testID: `icon-${props.name}`, ...props }, props.name);
});

// NBText stub — avoids loading the NB barrel (NBButton crashes jest due to nbTouchTarget)
jest.mock('../../nb/NBText', () => ({
  NBText: ({ children, accessibilityLabel, style }: any) => {
    const React = require('react');
    const { Text } = require('react-native');
    return React.createElement(Text, { accessibilityLabel, style }, children);
  },
}));

// NBModal stub — renders title + children + close button
jest.mock('../../nb/NBModal', () => ({
  NBModal: ({ visible, onClose, title, children, footer }: any) => {
    const React = require('react');
    const { View, Text, TouchableOpacity } = require('react-native');
    if (!visible) return null;
    return React.createElement(
      View,
      { testID: 'nb-modal' },
      title ? React.createElement(Text, null, title) : null,
      React.createElement(
        TouchableOpacity,
        { onPress: onClose, accessibilityLabel: 'Tutup' },
        React.createElement(Text, null, '×'),
      ),
      children,
      footer,
    );
  },
}));

// nb barrel stub — provides what LocationMapModal uses from '../nb'
jest.mock('../../nb', () => ({
  NBModal: ({ visible, onClose, title, children, footer }: any) => {
    const React = require('react');
    const { View, Text, TouchableOpacity } = require('react-native');
    if (!visible) return null;
    return React.createElement(
      View,
      { testID: 'nb-modal' },
      title ? React.createElement(Text, null, title) : null,
      React.createElement(
        TouchableOpacity,
        { onPress: onClose, accessibilityLabel: 'Tutup' },
        React.createElement(Text, null, '×'),
      ),
      children,
      footer,
    );
  },
}));

jest.mock('../../../constants/nbTokens', () => ({
  nbColors: {
    black: '#000000',
    white: '#FFFFFF',
    gray100: '#F5F5F5',
    gray400: '#BDBDBD',
    gray500: '#9E9E9E',
    gray600: '#757575',
    gray700: '#616161',
    warning: '#EAB308',
    successDark: '#15803D',
    statusIdle: '#F59E0B',
    requestUnderReview: '#2563EB',
  },
  nbSpacing: { xs: 4, sm: 8, md: 16, lg: 24 },
  nbBorders: { base: 1, thick: 2 },
  nbRadius: { base: 8, sm: 6 },
  nbShadows: { md: {}, lg: {} },
  withAlpha: (hex: string, _alpha: number) => hex,
}));

// ─── Helpers ────────────────────────────────────────────────────────────────

const VALID_LOCATION = {
  latitude: -7.2905,
  longitude: 112.7398,
  accuracy: 10,
  isWithinArea: true,
  updatedAt: new Date(),
};

const NO_LOCATION = {
  latitude: null,
  longitude: null,
  accuracy: null,
  isWithinArea: false,
  updatedAt: null,
};

const POLYGON_AREA = {
  gps_lat: -7.2888,
  gps_lng: 112.7378,
  radius_meters: 150,
  boundary_polygon: {
    type: 'Polygon' as const,
    coordinates: [
      [
        [112.768, -7.250] as [number, number],
        [112.770, -7.252] as [number, number],
        [112.766, -7.252] as [number, number],
      ],
    ],
  },
  name: 'Taman Bungkul',
};

/** A lokasi with a centre but no drawn boundary. */
const CENTRE_ONLY_AREA = {
  gps_lat: -7.2888,
  gps_lng: 112.7378,
  boundary_polygon: null,
  name: 'Taman Kecil',
};

// ─── Tests ──────────────────────────────────────────────────────────────────

describe('LocationMapModal', () => {
  const onClose = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('does not render when visible=false', () => {
    const { queryByTestId } = render(
      <LocationMapModal visible={false} onClose={onClose} location={VALID_LOCATION} />,
    );
    expect(queryByTestId('nb-modal')).toBeNull();
  });

  describe('rendering with valid coordinates', () => {
    it('renders map and marker when location has coordinates', () => {
      const { getByTestId, queryByTestId } = render(
        <LocationMapModal visible onClose={onClose} location={VALID_LOCATION} />,
      );

      expect(getByTestId('map-view')).toBeTruthy();
      expect(getByTestId('marker')).toBeTruthy();
      expect(queryByTestId('icon-map-marker-off')).toBeNull();
    });

    it('displays coordinates in info strip', () => {
      const { getByText } = render(
        <LocationMapModal visible onClose={onClose} location={VALID_LOCATION} />,
      );

      expect(getByText('-7.290500, 112.739800')).toBeTruthy();
    });

    it('displays accuracy text', () => {
      const { getByText } = render(
        <LocationMapModal visible onClose={onClose} location={VALID_LOCATION} />,
      );

      expect(getByText('Akurasi: ±10m')).toBeTruthy();
    });

    it('displays "Di dalam area kerja" badge when isWithinArea is true', () => {
      const { getByText } = render(
        <LocationMapModal visible onClose={onClose} location={VALID_LOCATION} />,
      );

      expect(getByText('Di dalam area kerja')).toBeTruthy();
    });

    it('displays "Di luar area kerja" badge when isWithinArea is false', () => {
      const location = { ...VALID_LOCATION, isWithinArea: false };
      const { getByText } = render(
        <LocationMapModal visible onClose={onClose} location={location} />,
      );

      expect(getByText('Di luar area kerja')).toBeTruthy();
    });
  });

  describe('rendering without coordinates', () => {
    it('shows no-location fallback instead of map', () => {
      const { getByTestId, getByText, queryByTestId } = render(
        <LocationMapModal visible onClose={onClose} location={NO_LOCATION} />,
      );

      expect(getByTestId('icon-map-marker-off')).toBeTruthy();
      expect(getByText('Lokasi tidak tersedia')).toBeTruthy();
      expect(queryByTestId('map-view')).toBeNull();
    });

    it('shows GPS not active message in info strip', () => {
      const { getByText } = render(
        <LocationMapModal visible onClose={onClose} location={NO_LOCATION} />,
      );

      expect(getByText('GPS tidak aktif atau belum tersedia')).toBeTruthy();
    });
  });

  describe('boundary rendering', () => {
    it('renders polygon when area has boundary_polygon', () => {
      const { getByTestId } = render(
        <LocationMapModal
          visible
          onClose={onClose}
          location={VALID_LOCATION}
          area={POLYGON_AREA}
        />,
      );

      expect(getByTestId('polygon')).toBeTruthy();
    });

    // The circle fallback is retired with `radius_meters`: a lokasi with no ring
    // draws no boundary, rather than a circle the server does not share.
    it('draws no boundary when the area has no boundary_polygon', () => {
      const { queryByTestId } = render(
        <LocationMapModal
          visible
          onClose={onClose}
          location={VALID_LOCATION}
          area={CENTRE_ONLY_AREA}
        />,
      );

      expect(queryByTestId('circle')).toBeNull();
      expect(queryByTestId('polygon')).toBeNull();
    });

    it('does not render boundary when no area is provided', () => {
      const { queryByTestId } = render(
        <LocationMapModal visible onClose={onClose} location={VALID_LOCATION} />,
      );

      expect(queryByTestId('polygon')).toBeNull();
      expect(queryByTestId('circle')).toBeNull();
    });
  });

  describe('accuracy warning', () => {
    it('shows warning when accuracy exceeds 50m', () => {
      const location = { ...VALID_LOCATION, accuracy: 75 };
      const { getByText } = render(
        <LocationMapModal visible onClose={onClose} location={location} />,
      );

      expect(getByText(/⚠️.*Akurasi: ±75m/)).toBeTruthy();
    });

    it('does not show warning when accuracy is under 50m', () => {
      const { queryByText } = render(
        <LocationMapModal visible onClose={onClose} location={VALID_LOCATION} />,
      );

      expect(queryByText(/⚠️/)).toBeNull();
    });
  });

  describe('updatedAt display', () => {
    it('shows "Diperbarui baru saja" for recent updates', () => {
      const { getByText } = render(
        <LocationMapModal visible onClose={onClose} location={VALID_LOCATION} />,
      );

      expect(getByText('Diperbarui baru saja')).toBeTruthy();
    });

    it('shows minutes ago for older updates', () => {
      const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000);
      const location = { ...VALID_LOCATION, updatedAt: fiveMinAgo };
      const { getByText } = render(
        <LocationMapModal visible onClose={onClose} location={location} />,
      );

      expect(getByText('Diperbarui 5 menit yang lalu')).toBeTruthy();
    });

    it('shows "Belum diperbarui" when updatedAt is null', () => {
      const location = { ...VALID_LOCATION, updatedAt: null };
      const { getByText } = render(
        <LocationMapModal visible onClose={onClose} location={location} />,
      );

      expect(getByText('Belum diperbarui')).toBeTruthy();
    });
  });

  describe('close interaction', () => {
    it('calls onClose when NBModal close is triggered', () => {
      const { getByLabelText } = render(
        <LocationMapModal visible onClose={onClose} location={VALID_LOCATION} />,
      );

      fireEvent.press(getByLabelText('Tutup'));
      expect(onClose).toHaveBeenCalledTimes(1);
    });
  });

  describe('title and props', () => {
    it('renders default title "Lokasi Anda"', () => {
      const { getByText } = render(
        <LocationMapModal visible onClose={onClose} location={VALID_LOCATION} />,
      );

      expect(getByText('Lokasi Anda')).toBeTruthy();
    });

    it('renders custom title when provided', () => {
      const { getByText } = render(
        <LocationMapModal
          visible
          onClose={onClose}
          location={VALID_LOCATION}
          title="Lokasi Perantingan"
        />,
      );

      expect(getByText('Lokasi Perantingan')).toBeTruthy();
    });

    it('hides area status badge when hideAreaStatus=true', () => {
      const { queryByText } = render(
        <LocationMapModal
          visible
          onClose={onClose}
          location={VALID_LOCATION}
          hideAreaStatus
        />,
      );

      expect(queryByText('Di dalam area kerja')).toBeNull();
      expect(queryByText('Di luar area kerja')).toBeNull();
    });

    it('hides updatedAt when hideUpdatedAt=true', () => {
      const { queryByText } = render(
        <LocationMapModal
          visible
          onClose={onClose}
          location={VALID_LOCATION}
          hideUpdatedAt
        />,
      );

      expect(queryByText('Diperbarui baru saja')).toBeNull();
    });
  });

  describe('MultiPolygon boundary', () => {
    it('renders polygon overlay for MultiPolygon boundary type', () => {
      const multiPolygonArea = {
        gps_lat: -7.2888,
        gps_lng: 112.7378,
        radius_meters: 150,
        boundary_polygon: {
          type: 'MultiPolygon' as const,
          coordinates: [
            [
              [
                [112.768, -7.250] as [number, number],
                [112.770, -7.252] as [number, number],
                [112.766, -7.252] as [number, number],
              ],
            ],
          ],
        },
      };

      const { getByTestId } = render(
        <LocationMapModal
          visible
          onClose={onClose}
          location={VALID_LOCATION}
          area={multiPolygonArea}
        />,
      );

      expect(getByTestId('polygon')).toBeTruthy();
    });
  });
});
