/**
 * EditProfileScreen (PRF-3) tests — locked account fields, photo pick→save flow,
 * NBToast feedback, and back-to-Profile navigation.
 */
import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { EditProfileScreen } from '../EditProfileScreen';
import authReducer, { setUser } from '../../../store/slices/authSlice';
import * as usersApi from '../../../services/api/usersApi';
import * as imagePicker from 'react-native-image-picker';
import { NBToast } from '../../../components/nb';

const mockNavigate = jest.fn();
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: mockNavigate, goBack: jest.fn() }),
}));
jest.mock('../../../services/api/usersApi');
jest.mock('react-native-image-picker', () => ({
  launchCamera: jest.fn(),
  launchImageLibrary: jest.fn(),
}));

const uploadMock = usersApi.uploadProfilePicture as jest.Mock;

function renderScreen(userOverrides = {}) {
  const store = configureStore({ reducer: { auth: authReducer } });
  store.dispatch(
    setUser({
      user: {
        id: 'u1',
        username: 'satgas_pusat_1',
        full_name: 'Budi Santoso',
        role: 'satgas',
        phone_number: '081200000006',
        district: { id: 'r1', name: 'Pusat' },
        ...userOverrides,
      } as any,
    }),
  );
  return render(
    <Provider store={store}>
      <EditProfileScreen />
    </Provider>,
  );
}

describe('EditProfileScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(NBToast, 'show').mockImplementation(() => {});
  });

  it('renders the locked account fields read-only', () => {
    const { getByText } = renderScreen();
    expect(getByText('Tidak bisa diubah')).toBeTruthy();
    expect(getByText('Budi Santoso')).toBeTruthy();
    expect(getByText('satgas_pusat_1')).toBeTruthy();
    expect(getByText('Satgas · Pusat')).toBeTruthy();
    expect(getByText('081200000006')).toBeTruthy();
  });

  it('disables Save until a new photo is picked', () => {
    const { getByText } = renderScreen();
    const save = getByText('Simpan Perubahan');
    expect(save).toBeTruthy();
    // Pressing without a picked photo toasts an info and does not upload.
    fireEvent.press(save);
    expect(uploadMock).not.toHaveBeenCalled();
  });

  it('uploads, toasts success, and returns to Profile after picking a photo', async () => {
    (imagePicker.launchImageLibrary as jest.Mock).mockResolvedValue({
      assets: [{ uri: 'file:///new.jpg' }],
    });
    uploadMock.mockResolvedValue({ data: { profile_picture_url: 'https://cdn.x/new.jpg' } });
    // Auto-press the "Galeri" button on the source action sheet.
    jest.spyOn(Alert, 'alert').mockImplementation((_t, _m, buttons) => {
      const galeri = buttons?.find((b) => b.text === 'Galeri');
      galeri?.onPress?.();
    });

    const { getByText, getByLabelText } = renderScreen();
    fireEvent.press(getByLabelText('Ganti foto profil'));
    await waitFor(() => expect(getByText('Foto baru dipilih')).toBeTruthy());

    fireEvent.press(getByText('Simpan Perubahan'));
    await waitFor(() => expect(uploadMock).toHaveBeenCalledWith('u1', 'file:///new.jpg'));
    expect(NBToast.show).toHaveBeenCalledWith(expect.objectContaining({ level: 'success' }));
    expect(mockNavigate).toHaveBeenCalledWith('Profile');
  });

  it('toasts an error when the upload fails', async () => {
    (imagePicker.launchImageLibrary as jest.Mock).mockResolvedValue({
      assets: [{ uri: 'file:///new.jpg' }],
    });
    uploadMock.mockResolvedValue({ error: 'Upload gagal' });
    jest.spyOn(Alert, 'alert').mockImplementation((_t, _m, buttons) => {
      buttons?.find((b) => b.text === 'Galeri')?.onPress?.();
    });

    const { getByText, getByLabelText } = renderScreen();
    fireEvent.press(getByLabelText('Ganti foto profil'));
    await waitFor(() => expect(getByText('Foto baru dipilih')).toBeTruthy());
    fireEvent.press(getByText('Simpan Perubahan'));
    await waitFor(() =>
      expect(NBToast.show).toHaveBeenCalledWith(
        expect.objectContaining({ level: 'danger', body: 'Upload gagal' }),
      ),
    );
  });
});
