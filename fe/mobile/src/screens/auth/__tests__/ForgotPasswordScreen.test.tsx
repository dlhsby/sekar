import React from 'react';
import { Linking } from 'react-native';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { ForgotPasswordScreen } from '../ForgotPasswordScreen';

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ goBack: jest.fn(), navigate: jest.fn() }),
}));

const mockGetRayons = jest.fn();
jest.mock('../../../services/api/rayonsApi', () => ({
  getRayons: (...args: unknown[]) => mockGetRayons(...args),
}));

describe('ForgotPasswordScreen', () => {
  beforeEach(() => {
    mockGetRayons.mockReset();
    jest.spyOn(Linking, 'openURL').mockResolvedValue(true as never);
  });

  it('renders rayon list with phone + WhatsApp buttons', async () => {
    mockGetRayons.mockResolvedValue({
      data: [
        {
          id: 'r-1',
          name: 'Rayon 1',
          contact_phone: '081200000001',
          contact_whatsapp: '081200000001',
        },
      ],
    });
    const { getByTestId } = render(<ForgotPasswordScreen />);
    await waitFor(() => {
      expect(getByTestId('rayon-card-r-1')).toBeTruthy();
    });
    expect(getByTestId('rayon-tel-r-1')).toBeTruthy();
    expect(getByTestId('rayon-wa-r-1')).toBeTruthy();
  });

  it('tapping phone opens tel: link', async () => {
    mockGetRayons.mockResolvedValue({
      data: [{ id: 'r-1', name: 'R1', contact_phone: '081200000001', contact_whatsapp: null }],
    });
    const { getByTestId } = render(<ForgotPasswordScreen />);
    await waitFor(() => getByTestId('rayon-tel-r-1'));
    fireEvent.press(getByTestId('rayon-tel-r-1'));
    expect(Linking.openURL).toHaveBeenCalledWith('tel:081200000001');
  });

  it('WhatsApp link normalises Indonesian leading-zero to +62', async () => {
    mockGetRayons.mockResolvedValue({
      data: [{ id: 'r-1', name: 'R1', contact_phone: null, contact_whatsapp: '081200000001' }],
    });
    const { getByTestId } = render(<ForgotPasswordScreen />);
    await waitFor(() => getByTestId('rayon-wa-r-1'));
    fireEvent.press(getByTestId('rayon-wa-r-1'));
    expect(Linking.openURL).toHaveBeenCalledWith('https://wa.me/6281200000001');
  });

  it('shows empty state when no rayons returned', async () => {
    mockGetRayons.mockResolvedValue({ data: [] });
    const { getByTestId } = render(<ForgotPasswordScreen />);
    await waitFor(() => {
      expect(getByTestId('forgot-password-empty')).toBeTruthy();
    });
  });

  it('shows error card on fetch failure', async () => {
    mockGetRayons.mockRejectedValue(new Error('Network down'));
    const { getByTestId } = render(<ForgotPasswordScreen />);
    await waitFor(() => {
      expect(getByTestId('forgot-password-error')).toBeTruthy();
    });
  });
});
