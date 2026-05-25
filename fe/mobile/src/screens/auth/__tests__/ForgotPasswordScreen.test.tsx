import React from 'react';
import { Linking } from 'react-native';
import { fireEvent, render } from '@testing-library/react-native';
import { ForgotPasswordScreen } from '../ForgotPasswordScreen';

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ goBack: jest.fn(), navigate: jest.fn() }),
}));

describe('ForgotPasswordScreen', () => {
  beforeEach(() => {
    jest.spyOn(Linking, 'openURL').mockResolvedValue(true as never);
  });

  it('renders the static WhatsApp + phone hotline contacts', () => {
    const { getByTestId } = render(<ForgotPasswordScreen />);
    expect(getByTestId('forgot-wa')).toBeTruthy();
    expect(getByTestId('forgot-tel')).toBeTruthy();
  });

  it('tapping phone opens a tel: link', () => {
    const { getByTestId } = render(<ForgotPasswordScreen />);
    fireEvent.press(getByTestId('forgot-tel'));
    expect(Linking.openURL).toHaveBeenCalledWith('tel:0317788990');
  });

  it('WhatsApp link normalises the Indonesian leading-zero to 62', () => {
    const { getByTestId } = render(<ForgotPasswordScreen />);
    fireEvent.press(getByTestId('forgot-wa'));
    expect(Linking.openURL).toHaveBeenCalledWith('https://wa.me/6281200000000');
  });
});
