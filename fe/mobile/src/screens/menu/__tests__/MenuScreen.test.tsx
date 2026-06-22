/**
 * MenuScreen Tests — role-aware launcher grid.
 */
import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import authReducer from '../../../store/slices/authSlice';
import { MenuScreen } from '../MenuScreen';
import { MENU_CONFIGS } from '../../../constants/menuConfigs';

const makeStore = (role: string) =>
  configureStore({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- test fixture
    reducer: { auth: authReducer as any },
    preloadedState: {
      auth: {
        user: { id: 'u1', username: 'u', full_name: 'U', role },
        token: 't',
        isAuthenticated: true,
        loading: false,
        error: null,
        assignedArea: null,
      } as any,
    },
  });

const renderMenu = (role: string, navigate = jest.fn()) => {
  const utils = render(
    <Provider store={makeStore(role)}>
      <MenuScreen navigation={{ navigate } as any} />
    </Provider>,
  );
  return { ...utils, navigate };
};

describe('MenuScreen', () => {
  it('renders the section titles for the role', () => {
    const { getByText } = renderMenu('admin_data');
    MENU_CONFIGS.admin_data.forEach((section) => {
      expect(getByText(section.title)).toBeTruthy();
    });
  });

  it('renders a tile for every menu item of a field role', () => {
    const { getByText } = renderMenu('satgas');
    const labels = MENU_CONFIGS.satgas.flatMap((s) => s.items.map((i) => i.label));
    labels.forEach((label) => expect(getByText(label)).toBeTruthy());
  });

  it('navigates to the item route (with params) when a tile is tapped', () => {
    const { getByTestId, navigate } = renderMenu('kepala_rayon');
    // Lembur tile carries the { initialTab: 'lembur' } param on the Absensi route.
    fireEvent.press(getByTestId('menu-Absensi-Lembur'));
    expect(navigate).toHaveBeenCalledWith('Absensi', { initialTab: 'lembur' });
  });

  it('navigates with undefined params for paramless items', () => {
    const { getByTestId, navigate } = renderMenu('satgas');
    fireEvent.press(getByTestId('menu-Tasks-Tugas'));
    expect(navigate).toHaveBeenCalledWith('Tasks', undefined);
  });
});
