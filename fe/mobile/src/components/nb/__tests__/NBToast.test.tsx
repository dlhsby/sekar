import React from 'react';
import { render } from '@testing-library/react-native';
import Toast from 'react-native-toast-message';
import { NBToast, NBToastProvider, nbToastConfig } from '../NBToast';

jest.mock('react-native-toast-message', () => ({
  __esModule: true,
  default: Object.assign(
    // Component
    ({ config }: any) => null,
    // Static methods
    {
      show: jest.fn(),
      hide: jest.fn(),
    },
  ),
}));

describe('NBToast', () => {
  beforeEach(() => jest.clearAllMocks());

  describe('NBToast.show()', () => {
    it('calls Toast.show with type=nbToast', () => {
      NBToast.show({ level: 'info', title: 'Info' });
      expect(Toast.show).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'nbToast' }),
      );
    });

    it('passes title as text1', () => {
      NBToast.show({ level: 'success', title: 'Berhasil' });
      expect(Toast.show).toHaveBeenCalledWith(
        expect.objectContaining({ text1: 'Berhasil' }),
      );
    });

    it('passes body as text2', () => {
      NBToast.show({ level: 'warning', title: 'Warning', body: 'Detail pesan' });
      expect(Toast.show).toHaveBeenCalledWith(
        expect.objectContaining({ text2: 'Detail pesan' }),
      );
    });

    it('uses default duration of 4000ms', () => {
      NBToast.show({ level: 'danger', title: 'Error' });
      expect(Toast.show).toHaveBeenCalledWith(
        expect.objectContaining({ visibilityTime: 4000 }),
      );
    });

    it('accepts custom duration', () => {
      NBToast.show({ level: 'info', title: 'Info', durationMs: 2000 });
      expect(Toast.show).toHaveBeenCalledWith(
        expect.objectContaining({ visibilityTime: 2000 }),
      );
    });

    it('positions toast at bottom', () => {
      NBToast.show({ level: 'info', title: 'Info' });
      expect(Toast.show).toHaveBeenCalledWith(
        expect.objectContaining({ position: 'bottom' }),
      );
    });

    it('passes level in props', () => {
      NBToast.show({ level: 'danger', title: 'Error' });
      expect(Toast.show).toHaveBeenCalledWith(
        expect.objectContaining({
          props: expect.objectContaining({ level: 'danger' }),
        }),
      );
    });

    it('persistent: true uses Number.MAX_SAFE_INTEGER as visibilityTime', () => {
      NBToast.show({ level: 'danger', title: 'Login gagal', persistent: true });
      expect(Toast.show).toHaveBeenCalledWith(
        expect.objectContaining({ visibilityTime: Number.MAX_SAFE_INTEGER }),
      );
    });

    it('persistent: true ignores durationMs', () => {
      NBToast.show({ level: 'info', title: 'Info', persistent: true, durationMs: 2000 });
      expect(Toast.show).toHaveBeenCalledWith(
        expect.objectContaining({ visibilityTime: Number.MAX_SAFE_INTEGER }),
      );
    });
  });

  describe('NBToast.hide()', () => {
    it('calls Toast.hide', () => {
      NBToast.hide();
      expect(Toast.hide).toHaveBeenCalledTimes(1);
    });
  });

  describe('NBToastProvider', () => {
    it('renders without crashing', () => {
      const { toJSON } = render(<NBToastProvider />);
      expect(toJSON()).toBeNull(); // mocked Toast renders null
    });
  });

  describe('nbToastConfig', () => {
    it('has nbToast key', () => {
      expect(nbToastConfig).toHaveProperty('nbToast');
      expect(typeof nbToastConfig.nbToast).toBe('function');
    });
  });
});
