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

jest.mock('../CoordinatorHomeScreen', () => ({
  CoordinatorHomeScreen: () => {
    const { Text } = require('react-native');
    return <Text testID="coordinator-home">COORDINATOR_HOME</Text>;
  },
}));

jest.mock('../AdminDataHomeScreen', () => ({
  AdminDataHomeScreen: () => {
    const { Text } = require('react-native');
    return <Text testID="admin-home">ADMIN_HOME</Text>;
  },
}));

jest.mock('../ExecHomeScreen', () => ({
  ExecHomeScreen: () => {
    const { Text } = require('react-native');
    return <Text testID="exec-home">EXEC_HOME</Text>;
  },
}));

jest.mock('../KecamatanHomeScreen', () => ({
  KecamatanHomeScreen: () => {
    const { Text } = require('react-native');
    return <Text testID="kecamatan-home">KECAMATAN_HOME</Text>;
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
              created_at: '2026-01-01T00:00:00Z',
              updated_at: '2026-01-01T00:00:00Z',
            }
          : null,
        assignedArea: null,
        assignedAreas: [],
        isAuthenticated: !!role,
        isLoading: false,
        isRestoring: false,
        error: null,
        onboardingCompleted: false,
        token: null,
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
  it.each<UserRole>(['satgas', 'linmas'])(
    'renders the field dashboard (HOME-1) for %s',
    (role) => {
      const { getByTestId, queryByTestId } = renderForRole(role);
      expect(getByTestId('field-home')).toBeTruthy();
      expect(queryByTestId('coordinator-home')).toBeNull();
      expect(queryByTestId('admin-home')).toBeNull();
    }
  );

  it.each<UserRole>(['korlap', 'kepala_rayon'])(
    'renders the coordinator dashboard (HOME-2) for %s',
    (role) => {
      const { getByTestId, queryByTestId } = renderForRole(role);
      expect(getByTestId('coordinator-home')).toBeTruthy();
      expect(queryByTestId('field-home')).toBeNull();
    }
  );

  it('renders the admin-data dashboard (HOME-3) for admin_data', () => {
    const { getByTestId, queryByTestId } = renderForRole('admin_data');
    expect(getByTestId('admin-home')).toBeTruthy();
    expect(queryByTestId('field-home')).toBeNull();
  });

  it.each<UserRole>(['top_management', 'admin_system', 'superadmin'])(
    'renders the exec city-overview dashboard for %s',
    (role) => {
      const { getByTestId, queryByTestId } = renderForRole(role);
      expect(getByTestId('exec-home')).toBeTruthy();
      expect(queryByTestId('field-home')).toBeNull();
    }
  );

  it('renders the kecamatan dashboard for staff_kecamatan', () => {
    const { getByTestId, queryByTestId } = renderForRole('staff_kecamatan');
    expect(getByTestId('kecamatan-home')).toBeTruthy();
    expect(queryByTestId('field-home')).toBeNull();
  });

  it('renders the field dashboard when the role is undefined', () => {
    const { getByTestId } = renderForRole(undefined);
    expect(getByTestId('field-home')).toBeTruthy();
  });
});
