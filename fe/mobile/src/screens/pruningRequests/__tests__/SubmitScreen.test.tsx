/**
 * SubmitScreen — redesigned scrollable form (Phase 3 Apr 27).
 *
 * Phase 4 polish: expand with full field-by-field coverage, GPS/permission
 * mocks, and submit-flow assertions. The wizard-era test was deleted along
 * with the wizard; this smoke test locks the new render shape.
 */

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
  };
});

jest.mock('react-native-geolocation-service', () => ({
  __esModule: true,
  default: { getCurrentPosition: jest.fn() },
}));

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
  useNavigation: () => ({ navigate: jest.fn(), goBack: jest.fn() }),
}));

import React from 'react';
import { render } from '@testing-library/react-native';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import pruningRequestsReducer from '../../../store/slices/pruningRequestsSlice';
import authReducer from '../../../store/slices/authSlice';

import { SubmitScreen } from '../SubmitScreen';

function makeStore() {
  return configureStore({
    reducer: {
      auth: authReducer,
      pruningRequests: pruningRequestsReducer,
    },
    preloadedState: {
      auth: {
        isAuthenticated: true,
        token: 'test',
        user: {
          id: 'u1',
          username: 'staff_kec_pusat',
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
    expect(getByText('Lokasi')).toBeTruthy();
    expect(getByText('Foto Pohon')).toBeTruthy();
    expect(getByText('Detail Pohon')).toBeTruthy();
    expect(getByText('Kontak')).toBeTruthy();
    expect(getByText('Catatan (Opsional)')).toBeTruthy();
  });

  it('shows the rayon and kecamatan presets pulled from the user profile', () => {
    const { getByText } = render(
      <Provider store={makeStore()}>
        <SubmitScreen />
      </Provider>,
    );
    expect(getByText('Pusat')).toBeTruthy();
    expect(getByText('Tegalsari')).toBeTruthy();
  });
});
