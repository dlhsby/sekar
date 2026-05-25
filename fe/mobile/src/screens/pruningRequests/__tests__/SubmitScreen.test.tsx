/**
 * SubmitScreen — redesigned scrollable form (Phase 3 Apr 27).
 *
 * Phase 4 polish: expand with full field-by-field coverage, GPS/permission
 * mocks, and submit-flow assertions. The wizard-era test was deleted along
 * with the wizard; this smoke test locks the new render shape.
 */

// Heavy mock stack + draft-restore async paths blow past the default 30 s
// timeout on slower CI runners. Local fix; do not promote to jest.config
// (other suites are fine at 30 s).
jest.setTimeout(60000);

jest.mock('../../../constants/nbTokens', () => {
  const fontStack = (font: string) => `${font}, sans-serif`;
  const typeVariant = {
    fontFamily: fontStack('Inter'),
    fontWeight: '400',
    fontSize: 16,
    lineHeight: 24,
  };
  return {
    nbColors: new Proxy({}, { get: () => '#000000' }),
    nbSpacing: new Proxy({}, { get: () => 8 }),
    nbTypography: {
      fontFamily: { sans: 'Inter', display: 'Space Grotesk', mono: 'JetBrains Mono' },
      fontWeight: {
        regular: '400', medium: '500', semibold: '600', bold: '700', extrabold: '800',
      },
      fontSize: { xs: 12, sm: 14, base: 16, md: 16, lg: 18, xl: 20, '2xl': 24, '3xl': 30, '4xl': 36 },
      lineHeight: { tight: 1.2, normal: 1.5, relaxed: 1.75 },
    },
    nbType: new Proxy({}, { get: () => typeVariant }),
    nbFonts: { body: fontStack('Inter'), display: fontStack('Space Grotesk'), mono: fontStack('JetBrains Mono') },
    nbBorders: new Proxy({}, { get: () => 2 }),
    nbBorderRadius: new Proxy({}, { get: () => 4 }),
    nbRadius: new Proxy({}, { get: () => 4 }),
    nbShadows: new Proxy({}, { get: () => ({}) }),
    nbShadow: new Proxy({}, { get: () => ({}) }),
    nbTouchTarget: { minHeight: 44, minWidth: 44 },
    nbAnimation: { fast: 150, normal: 250, slow: 400 },
    nbMotion: new Proxy({}, { get: () => 250 }),
    nbTokens: {},
    withAlpha: (color: string, _opacity: number) => color,
  };
});

jest.mock('../../../components/navigation/FieldHomeHeader', () => ({
  FieldHomeHeader: ({ title }: any) => {
    const ReactLib = require('react');
    const { Text } = require('react-native');
    return ReactLib.createElement(Text, { testID: 'field-home-header' }, title);
  },
}));

jest.mock('react-native-geolocation-service', () => ({
  __esModule: true,
  default: { getCurrentPosition: jest.fn() },
}));

jest.mock('react-native-maps', () => {
  const React = require('react');
  const { View } = require('react-native');
  return {
    __esModule: true,
    default: ({ children, ...rest }: any) =>
      React.createElement(View, { testID: 'map-view', ...rest }, children),
    Marker: ({ children, coordinate, ...rest }: any) =>
      React.createElement(View, { testID: 'marker', coordinate, ...rest }, children),
    Circle: ({ ...rest }: any) =>
      React.createElement(View, { testID: 'circle', ...rest }),
    Polygon: ({ ...rest }: any) =>
      React.createElement(View, { testID: 'polygon', ...rest }),
    PROVIDER_GOOGLE: 'google',
  };
});

jest.mock('../../../services/permissions/permissionService', () => ({
  requestLocationPermission: jest.fn().mockResolvedValue({ status: 'granted' }),
  requestCameraPermission: jest.fn().mockResolvedValue({ status: 'granted' }),
}));

jest.mock('../../../services/media/mediaService', () => ({
  mediaService: {
    capturePhoto: jest.fn(),
    pickFromGallery: jest.fn(),
  },
}));

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    navigate: jest.fn(),
    goBack: jest.fn(),
    setOptions: jest.fn(),
    addListener: jest.fn(() => () => {}),
    dispatch: jest.fn(),
  }),
  useFocusEffect: (cb: any) => {
    const React = require('react');
    React.useEffect(() => {
      const cleanup = cb();
      return typeof cleanup === 'function' ? cleanup : undefined;
    }, []);
  },
}));

jest.mock('react-native-safe-area-context', () => ({
  __esModule: true,
  SafeAreaProvider: ({ children }: any) => children,
  SafeAreaView: ({ children }: any) => children,
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

jest.mock('../../../services/api', () => ({
  getRayons: jest.fn().mockResolvedValue({
    data: [
      { id: 'r1', name: 'Pusat', code: 'PUSAT' },
      { id: 'r2', name: 'Selatan', code: 'SELATAN' },
    ],
  }),
}));

import React from 'react';
import { render } from '@testing-library/react-native';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import pruningRequestsReducer from '../../../store/slices/pruningRequestsSlice';
import serviceCapacityReducer from '../../../store/slices/serviceCapacitySlice';
import authReducer from '../../../store/slices/authSlice';

import { SubmitScreen } from '../SubmitScreen';

function makeStore() {
  return configureStore({
    reducer: {
      auth: authReducer,
      pruningRequests: pruningRequestsReducer,
      serviceCapacity: serviceCapacityReducer,
    },
    preloadedState: {
      auth: {
        isAuthenticated: true,
        token: 'test',
        user: {
          id: 'u1',
          username: 'staff_kecamatan_pusat_1',
          full_name: 'Staff Kecamatan Pusat',
          role: 'staff_kecamatan',
          rayon_id: 'r1',
          rayon: { id: 'r1', name: 'Pusat', code: 'P', created_at: '', updated_at: '' },
          kecamatan_name: 'Tegalsari',
          created_at: '',
          updated_at: '',
        },
        loading: false,
        error: null,
      } as any,
    },
  });
}

describe('SubmitScreen (Phase 3 Apr 27 redesign)', () => {
  it('renders all five cards (Lokasi / Foto / Detail Pohon / Kontak / Catatan) without crashing', () => {
    const { getByText } = render(
      <Provider store={makeStore()}>
        <SubmitScreen />
      </Provider>,
    );
    expect(getByText('Lokasi *')).toBeTruthy();
    expect(getByText('Foto Pohon *')).toBeTruthy();
    expect(getByText('Detail Pohon')).toBeTruthy();
    expect(getByText('Kontak')).toBeTruthy();
    expect(getByText('Catatan (Opsional)')).toBeTruthy();
  });

  it('renders rayon + kecamatan as read-only presets for staff_kecamatan (May 2026)', () => {
    const { getByTestId } = render(
      <Provider store={makeStore()}>
        <SubmitScreen />
      </Provider>,
    );
    expect(getByTestId('perantingan-rayon-readonly')).toBeTruthy();
    expect(getByTestId('perantingan-kecamatan-readonly')).toBeTruthy();
  });

  it('renders the Minggu Preferensi card with a week picker (ADR-035 amendment 2026-05-01)', () => {
    const { getByText, getByTestId } = render(
      <Provider store={makeStore()}>
        <SubmitScreen />
      </Provider>,
    );
    expect(getByText('Minggu Preferensi (Opsional)')).toBeTruthy();
    expect(getByTestId('perantingan-pick-week')).toBeTruthy();
    expect(getByText('Pilih minggu…')).toBeTruthy();
  });
});
