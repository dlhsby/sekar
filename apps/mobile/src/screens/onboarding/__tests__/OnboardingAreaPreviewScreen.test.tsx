import React from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { OnboardingAreaPreviewScreen } from '../OnboardingAreaPreviewScreen';
import authReducer from '../../../store/slices/authSlice';
import { ASYNC_STORAGE_KEYS } from '../../../services/storage/asyncStorageKeys';

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: jest.fn() }),
}));

const renderForRole = (role: string, userId = 'u-1', extra: Record<string, unknown> = {}) => {
  const store = configureStore({
    reducer: { auth: authReducer },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- legacy test preloadedState
    preloadedState: {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- legacy test preloadedState
      auth: {
        user: { id: userId, role, full_name: 'Test', ...extra } as any,
        assignedArea: null,
        isAuthenticated: true,
        isLoading: false,
        isRestoring: false,
        error: null,
        onboardingCompleted: false,
        token: null,
      } as any,
    },
  });
  return render(
    <Provider store={store}>
      <OnboardingAreaPreviewScreen />
    </Provider>,
  );
};

describe('OnboardingAreaPreviewScreen', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  it('shows clockable variant for satgas with area_id', () => {
    const { getByTestId } = renderForRole('satgas', 'u-1', { area_id: 'area-42' });
    expect(getByTestId('area-preview-clockable')).toBeTruthy();
  });

  it('shows kecamatan variant for staff_kecamatan', () => {
    const { getByTestId } = renderForRole('staff_kecamatan');
    expect(getByTestId('area-preview-kecamatan')).toBeTruthy();
  });

  it('shows admin variant for admin_rayon', () => {
    const { getByTestId } = renderForRole('admin_rayon');
    expect(getByTestId('area-preview-admin')).toBeTruthy();
  });

  it('finish sets onboarding_completed flag for the user', async () => {
    const { getByTestId } = renderForRole('satgas', 'u-42');
    fireEvent.press(getByTestId('onboarding-area-preview-finish'));
    await waitFor(async () => {
      const v = await AsyncStorage.getItem(
        `${ASYNC_STORAGE_KEYS.ONBOARDING_COMPLETED_PREFIX}u-42`,
      );
      expect(v).toBe('true');
    });
  });
});
