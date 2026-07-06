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

const makeStore = (name = 'Budi Santoso') =>
  configureStore({
    reducer: { auth: authReducer },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- legacy test preloadedState
    preloadedState: {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- legacy test preloadedState
      auth: {
        user: { id: 'u-1', role: 'satgas', full_name: name } as any,
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

  // Permissions are enforced (ADR-042 / OB-1) — there is no skip option.
  it('does not render a skip option', () => {
    const { queryByTestId } = renderScreen();
    expect(queryByTestId('onboarding-welcome-skip')).toBeNull();
  });

  it('renders the OnbClockIn SVG illustration without crashing', () => {
    // Smoke test: verify the component renders with the new SVG illustration
    const { queryByText } = renderScreen();
    // Verify the continue button is still present (proves component rendered)
    expect(queryByText('Lanjut')).toBeTruthy();
    // Verify greeting is still displayed
    expect(queryByText('Hai,')).toBeTruthy();
  });
});
