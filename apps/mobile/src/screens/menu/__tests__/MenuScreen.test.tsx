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
    const { getByText } = renderMenu('admin_rayon');
    // section.title holds i18n keys; expect resolved text
    expect(getByText('Operasional')).toBeTruthy(); // menu:sections.operations
    expect(getByText('Perawatan Pohon')).toBeTruthy(); // menu:sections.treeCare
    expect(getByText('Laporan & Monitoring')).toBeTruthy(); // menu:sections.reportsMonitoring
  });

  it('renders a tile for every menu item of a field role', () => {
    const { getByText } = renderMenu('satgas');
    // Labels are i18n keys; expect resolved text
    expect(getByText('Kehadiran')).toBeTruthy(); // menu:tiles.attendance
    expect(getByText('Lembur')).toBeTruthy(); // menu:tiles.overtime
    expect(getByText('Tugas')).toBeTruthy(); // menu:tiles.tasks
    expect(getByText('Aktivitas')).toBeTruthy(); // menu:tiles.activities
  });

  it('navigates to the item route (with params) when a tile is tapped', () => {
    const { getByTestId, navigate } = renderMenu('kepala_rayon');
    // Lembur tile navigates to its own Lembur page.
    fireEvent.press(getByTestId('menu-Lembur'));
    expect(navigate).toHaveBeenCalledWith('Lembur', undefined);
  });

  it('navigates with undefined params for paramless items', () => {
    const { getByTestId, navigate } = renderMenu('satgas');
    fireEvent.press(getByTestId('menu-Tasks'));
    expect(navigate).toHaveBeenCalledWith('Tasks', undefined);
  });
});
