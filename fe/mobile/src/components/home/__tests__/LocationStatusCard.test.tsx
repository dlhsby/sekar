/**
 * LocationStatusCard Tests
 * Phase 2D: Tests for GPS location card on HomeScreen.
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { LocationStatusCard } from '../LocationStatusCard';

// ─── Mocks ──────────────────────────────────────────────────────────────────

jest.mock('react-native-vector-icons/MaterialCommunityIcons', () => {
  const React = require('react');
  const { Text } = require('react-native');
  return (props: any) =>
    React.createElement(Text, { testID: `icon-${props.name}`, ...props }, props.name);
});

jest.mock('../../nb', () => {
  const React = require('react');
  const { View } = require('react-native');
  return {
    NBCard: ({ children, testID, ...rest }: any) =>
      React.createElement(View, { testID: testID ?? 'nb-card', ...rest }, children),
  };
});

jest.mock('../../../constants/nbTokens', () => ({
  nbColors: {
    black: '#000000',
    white: '#FFFFFF',
    gray: { '400': '#BDBDBD', '500': '#9E9E9E', '600': '#757575', '700': '#616161' },
    primary: '#F97316',
    warning: '#EAB308',
    danger: '#EF4444',
    gray500: '#9E9E9E',
    gray600: '#757575',
  },
  nbType: {
    'display-xl': { fontFamily: "'Space Grotesk'", fontSize: 56, fontWeight: '800', lineHeight: 56 },
    display: { fontFamily: "'Space Grotesk'", fontSize: 40, fontWeight: '700', lineHeight: 42 },
    h1: { fontFamily: "'Space Grotesk'", fontSize: 28, fontWeight: '700', lineHeight: 34 },
    h2: { fontFamily: "'Space Grotesk'", fontSize: 22, fontWeight: '600', lineHeight: 29 },
    h3: { fontFamily: "'Space Grotesk'", fontSize: 18, fontWeight: '600', lineHeight: 24 },
    bodyLg: { fontFamily: "'Inter'", fontSize: 18, fontWeight: '500', lineHeight: 28 },
    body: { fontFamily: "'Inter'", fontSize: 16, fontWeight: '400', lineHeight: 24 },
    bodySm: { fontFamily: "'Inter'", fontSize: 14, fontWeight: '400', lineHeight: 20 },
    caption: { fontFamily: "'Inter'", fontSize: 12, fontWeight: '500', lineHeight: 17 },
    monoSm: { fontFamily: "'JetBrains Mono'", fontSize: 12, fontWeight: '500', lineHeight: 17 },
  },
  nbSpacing: { xs: 4, sm: 8, md: 16, lg: 24 },
  nbTypography: {
    fontSize: { xs: 10, sm: 12, base: 14, lg: 16 },
    fontWeight: { regular: '400', medium: '500', bold: '700' },
  },
  nbBorders: { base: 2 },
  nbRadius: { base: 8 },
  withAlpha: (hex: string, _alpha: number) => hex,
}));

// ─── Helpers ────────────────────────────────────────────────────────────────

const VALID_LOCATION = {
  latitude: -7.2905,
  longitude: 112.7398,
  accuracy: 10,
  isWithinArea: true,
  loading: false,
  error: null,
  updatedAt: new Date(),
};

const NO_LOCATION = {
  latitude: null,
  longitude: null,
  accuracy: null,
  isWithinArea: false,
  loading: false,
  error: null,
  updatedAt: null,
};

const LOADING_LOCATION = {
  latitude: null,
  longitude: null,
  accuracy: null,
  isWithinArea: false,
  loading: true,
  error: null,
  updatedAt: null,
};

const ERROR_LOCATION = {
  latitude: null,
  longitude: null,
  accuracy: null,
  isWithinArea: false,
  loading: false,
  error: 'GPS tidak tersedia',
  updatedAt: null,
};

// ─── Tests ──────────────────────────────────────────────────────────────────

describe('LocationStatusCard', () => {
  const onRefresh = jest.fn();
  const onPress = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('with valid location', () => {
    it('renders coordinates', () => {
      const { getByText } = render(
        <LocationStatusCard location={VALID_LOCATION} onRefresh={onRefresh} />,
      );

      expect(getByText('-7.290500, 112.739800')).toBeTruthy();
    });

    it('renders accuracy text', () => {
      const { getByText } = render(
        <LocationStatusCard location={VALID_LOCATION} onRefresh={onRefresh} />,
      );

      expect(getByText('Akurasi: ±10m')).toBeTruthy();
    });

    it('renders "Di dalam area kerja" when isWithinArea is true', () => {
      const { getByLabelText } = render(
        <LocationStatusCard location={VALID_LOCATION} onRefresh={onRefresh} />,
      );

      expect(getByLabelText('Di dalam area kerja')).toBeTruthy();
    });

    it('renders "Di luar area kerja" when isWithinArea is false', () => {
      const location = { ...VALID_LOCATION, isWithinArea: false };
      const { getByLabelText } = render(
        <LocationStatusCard location={location} onRefresh={onRefresh} />,
      );

      expect(getByLabelText('Di luar area kerja')).toBeTruthy();
    });

    it('renders updatedAt label', () => {
      const { getByText } = render(
        <LocationStatusCard location={VALID_LOCATION} onRefresh={onRefresh} />,
      );

      expect(getByText('Baru saja')).toBeTruthy();
    });

    it('renders minutes ago for older updates', () => {
      const threeMinAgo = new Date(Date.now() - 3 * 60 * 1000);
      const location = { ...VALID_LOCATION, updatedAt: threeMinAgo };
      const { getByText } = render(
        <LocationStatusCard location={location} onRefresh={onRefresh} />,
      );

      expect(getByText('3 mnt lalu')).toBeTruthy();
    });
  });

  describe('without location', () => {
    it('shows "Lokasi tidak tersedia" when no coordinates', () => {
      const { getByText } = render(
        <LocationStatusCard location={NO_LOCATION} onRefresh={onRefresh} />,
      );

      expect(getByText('Lokasi tidak tersedia')).toBeTruthy();
    });
  });

  describe('loading state', () => {
    it('shows loading indicator when loading and no coords', () => {
      const { getByText } = render(
        <LocationStatusCard location={LOADING_LOCATION} onRefresh={onRefresh} />,
      );

      expect(getByText('Mendapatkan lokasi...')).toBeTruthy();
    });
  });

  describe('error state', () => {
    it('shows error message', () => {
      const { getByText } = render(
        <LocationStatusCard location={ERROR_LOCATION} onRefresh={onRefresh} />,
      );

      expect(getByText('GPS tidak tersedia')).toBeTruthy();
    });
  });

  describe('accuracy warning', () => {
    it('shows warning emoji when accuracy > 50m', () => {
      const location = { ...VALID_LOCATION, accuracy: 80 };
      const { getByText } = render(
        <LocationStatusCard location={location} onRefresh={onRefresh} />,
      );

      expect(getByText(/⚠️.*Akurasi: ±80m/)).toBeTruthy();
    });

    it('does not show warning when accuracy <= 50m', () => {
      const { queryByText } = render(
        <LocationStatusCard location={VALID_LOCATION} onRefresh={onRefresh} />,
      );

      expect(queryByText(/⚠️/)).toBeNull();
    });
  });

  describe('onPress handler', () => {
    it('wraps in TouchableOpacity when onPress is provided', () => {
      const { getByLabelText } = render(
        <LocationStatusCard
          location={VALID_LOCATION}
          onRefresh={onRefresh}
          onPress={onPress}
        />,
      );

      fireEvent.press(getByLabelText('Lihat lokasi di peta'));
      expect(onPress).toHaveBeenCalledTimes(1);
    });

    it('does not wrap in TouchableOpacity when onPress is undefined', () => {
      const { queryByLabelText } = render(
        <LocationStatusCard location={VALID_LOCATION} onRefresh={onRefresh} />,
      );

      expect(queryByLabelText('Lihat lokasi di peta')).toBeNull();
    });

    it('shows tap hint when onPress is provided and has coords', () => {
      const { getByText } = render(
        <LocationStatusCard
          location={VALID_LOCATION}
          onRefresh={onRefresh}
          onPress={onPress}
        />,
      );

      expect(getByText('Ketuk untuk lihat di peta')).toBeTruthy();
    });

    it('does not show tap hint when onPress is undefined', () => {
      const { queryByText } = render(
        <LocationStatusCard location={VALID_LOCATION} onRefresh={onRefresh} />,
      );

      expect(queryByText('Ketuk untuk lihat di peta')).toBeNull();
    });

    it('does not show tap hint when no coords even with onPress', () => {
      const { queryByText } = render(
        <LocationStatusCard
          location={NO_LOCATION}
          onRefresh={onRefresh}
          onPress={onPress}
        />,
      );

      expect(queryByText('Ketuk untuk lihat di peta')).toBeNull();
    });
  });

  describe('refresh button', () => {
    it('calls onRefresh when refresh button is pressed', () => {
      const { getByLabelText } = render(
        <LocationStatusCard location={VALID_LOCATION} onRefresh={onRefresh} />,
      );

      fireEvent.press(getByLabelText('Perbarui lokasi'));
      expect(onRefresh).toHaveBeenCalledTimes(1);
    });

    it('disables refresh button when loading', () => {
      const loadingWithCoords = { ...VALID_LOCATION, loading: true };
      const { getByLabelText } = render(
        <LocationStatusCard location={loadingWithCoords} onRefresh={onRefresh} />,
      );

      const button = getByLabelText('Perbarui lokasi');
      expect(button.props.accessibilityState?.disabled ?? button.props.disabled).toBeTruthy();
    });
  });

  describe('header', () => {
    it('renders "Lokasi Anda" title', () => {
      const { getByText } = render(
        <LocationStatusCard location={VALID_LOCATION} onRefresh={onRefresh} />,
      );

      expect(getByText('Lokasi Anda')).toBeTruthy();
    });
  });
});
