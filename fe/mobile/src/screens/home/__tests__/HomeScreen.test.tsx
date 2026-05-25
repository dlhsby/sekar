/**
 * Home dispatcher tests — verifies the role-aware anchor selects the right
 * per-role variant. Until HOME-2/HOME-3 land, every Home-tab role resolves to
 * the field dashboard.
 */
import React from 'react';
import { render } from '@testing-library/react-native';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import authReducer from '../../../store/slices/authSlice';
import { HomeScreen } from '../HomeScreen';
import type { UserRole } from '../../../types/models.types';

jest.mock('../FieldHomeScreen', () => ({
  FieldHomeScreen: () => {
    const { Text } = require('react-native');
    return <Text testID="field-home">FIELD_HOME</Text>;
  },
}));

const renderForRole = (role: UserRole | undefined) => {
  const store = configureStore({
    reducer: { auth: authReducer },
    preloadedState: {
      auth: {
        user: role
          ? {
              id: 'u1',
              username: 'u',
              full_name: 'Test User',
              role,
              created_at: new Date('2026-01-01T00:00:00Z'),
              updated_at: new Date('2026-01-01T00:00:00Z'),
            }
          : null,
        assignedArea: null,
        isAuthenticated: !!role,
        isLoading: false,
        isRestoring: false,
        error: null,
        onboardingCompleted: false,
      },
    },
  });
  return render(
    <Provider store={store}>
      <HomeScreen />
    </Provider>
  );
};

describe('HomeScreen dispatcher', () => {
  it.each<UserRole>(['satgas', 'linmas', 'korlap', 'kepala_rayon', 'admin_data'])(
    'renders the field dashboard for %s (HOME-2/HOME-3 not yet split out)',
    (role) => {
      const { getByTestId } = renderForRole(role);
      expect(getByTestId('field-home')).toBeTruthy();
    }
  );

  it('renders the field dashboard when the role is undefined', () => {
    const { getByTestId } = renderForRole(undefined);
    expect(getByTestId('field-home')).toBeTruthy();
  });
});
