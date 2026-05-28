/**
 * ProfileMenu (PRF-1 grouped menu) tests — Akun/Aplikasi rows, field-only Riwayat
 * Shift, logout danger row, and handler wiring.
 */
import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { ProfileMenu } from '../ProfileMenu';

function setup(extra = {}) {
  const handlers = {
    onEditProfile: jest.fn(),
    onChangePassword: jest.fn(),
    onSettings: jest.fn(),
    onAbout: jest.fn(),
    onLogout: jest.fn(),
  };
  const utils = render(<ProfileMenu {...handlers} {...extra} />);
  return { ...utils, handlers };
}

describe('ProfileMenu', () => {
  it('renders the two section titles', () => {
    const { getByText } = setup();
    expect(getByText('Akun')).toBeTruthy();
    expect(getByText('Aplikasi')).toBeTruthy();
  });

  it('renders the core Akun + Aplikasi rows', () => {
    const { getByText } = setup();
    ['Edit Profil', 'Ubah Password', 'Pengaturan', 'Tentang Aplikasi', 'Keluar'].forEach((label) =>
      expect(getByText(label)).toBeTruthy(),
    );
  });

  it('hides Riwayat Shift when onShiftHistory is not provided', () => {
    const { queryByTestId } = setup();
    expect(queryByTestId('shift-history-button')).toBeNull();
  });

  it('shows Riwayat Shift when onShiftHistory is provided (field roles)', () => {
    const onShiftHistory = jest.fn();
    const { getByTestId } = setup({ onShiftHistory });
    fireEvent.press(getByTestId('shift-history-button'));
    expect(onShiftHistory).toHaveBeenCalledTimes(1);
  });

  it.each([
    ['edit-profile-button', 'onEditProfile'],
    ['change-password-button', 'onChangePassword'],
    ['settings-button', 'onSettings'],
    ['about-button', 'onAbout'],
    ['logout-button', 'onLogout'],
  ])('wires %s to %s', (testID, handlerName) => {
    const { getByTestId, handlers } = setup();
    fireEvent.press(getByTestId(testID));
    expect((handlers as any)[handlerName]).toHaveBeenCalledTimes(1);
  });

  it('exposes accessible button roles/labels for every row', () => {
    const { getByLabelText } = setup({ onShiftHistory: jest.fn() });
    ['Edit Profil', 'Ubah Password', 'Riwayat Shift', 'Pengaturan', 'Tentang Aplikasi', 'Keluar'].forEach(
      (label) => expect(getByLabelText(label)).toBeTruthy(),
    );
  });
});
