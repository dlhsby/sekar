import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { OnboardingWelcomeScreen } from '../OnboardingWelcomeScreen';
import authReducer from '../../../store/slices/authSlice';

const mockNavigate = jest.fn();
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: mockNavigate }),
}));

const renderForRole = (role: string, name = 'Budi Santoso') => {
  const store = configureStore({
    reducer: { auth: authReducer },
    preloadedState: {
      auth: {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        user: { id: 'u-1', role, full_name: name } as any,
        isAuthenticated: true,
        isLoading: false,
        isRestoring: false,
        error: null,
      },
    },
  });
  return render(
    <Provider store={store}>
      <OnboardingWelcomeScreen />
    </Provider>,
  );
};

describe('OnboardingWelcomeScreen', () => {
  beforeEach(() => mockNavigate.mockReset());

  it.each([
    ['satgas', 'SATGAS'],
    ['korlap', 'KORLAP'],
    ['staff_kecamatan', 'STAFF KECAMATAN'],
    ['admin_data', 'ADMIN DATA'],
  ])('shows role badge for %s', (role, label) => {
    const { getByText } = renderForRole(role);
    expect(getByText(label)).toBeTruthy();
  });

  it('falls back to default copy for unknown role', () => {
    const { getByText } = renderForRole('mystery_role');
    expect(getByText('USER')).toBeTruthy();
  });

  it('continue navigates to OnboardingPermissions', () => {
    const { getByTestId } = renderForRole('satgas');
    fireEvent.press(getByTestId('onboarding-welcome-continue'));
    expect(mockNavigate).toHaveBeenCalledWith('OnboardingPermissions');
  });
});
