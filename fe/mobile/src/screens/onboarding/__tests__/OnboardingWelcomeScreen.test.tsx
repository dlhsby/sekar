import React from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { OnboardingWelcomeScreen } from '../OnboardingWelcomeScreen';
import authReducer from '../../../store/slices/authSlice';

const mockNavigate = jest.fn();
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: mockNavigate }),
}));

const makeStore = (name = 'Budi Santoso') =>
  configureStore({
    reducer: { auth: authReducer },
    preloadedState: {
      auth: {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        user: { id: 'u-1', role: 'satgas', full_name: name } as any,
        isAuthenticated: true,
        isLoading: false,
        isRestoring: false,
        error: null,
        onboardingCompleted: false,
      },
    },
  });

const renderScreen = (store = makeStore()) => ({
  store,
  ...render(
    <Provider store={store}>
      <OnboardingWelcomeScreen />
    </Provider>,
  ),
});

describe('OnboardingWelcomeScreen', () => {
  beforeEach(() => mockNavigate.mockReset());

  it('greets the user by first name', () => {
    const { getByText } = renderScreen();
    expect(getByText('Hai,')).toBeTruthy();
    expect(getByText('Budi')).toBeTruthy();
  });

  it('continue navigates to OnboardingPermissions', () => {
    const { getByTestId } = renderScreen();
    fireEvent.press(getByTestId('onboarding-welcome-continue'));
    expect(mockNavigate).toHaveBeenCalledWith('OnboardingPermissions');
  });

  it('skip marks onboarding complete (routes to Home)', async () => {
    const { store, getByTestId } = renderScreen();
    fireEvent.press(getByTestId('onboarding-welcome-skip'));
    await waitFor(() => expect(store.getState().auth.onboardingCompleted).toBe(true));
    expect(mockNavigate).not.toHaveBeenCalled();
  });
});
