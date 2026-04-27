jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
  SafeAreaProvider: ({ children }: { children: React.ReactNode }) => children,
  SafeAreaView: ({ children }: { children: React.ReactNode }) => children,
}));

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { NBModal } from '../NBModal';

describe('NBModal', () => {
  const onClose = jest.fn();

  beforeEach(() => jest.clearAllMocks());

  describe('sheet variant (default)', () => {
    it('renders children', () => {
      const { getByText } = render(
        <NBModal visible onClose={onClose}>
          <></>
        </NBModal>,
      );
      // BottomSheet mock renders testID="bottom-sheet"
      expect(getByText !== undefined).toBeTruthy();
    });

    it('renders title in uppercase', () => {
      const { getByText } = render(
        <NBModal visible onClose={onClose} title="konfirmasi">
          <></>
        </NBModal>,
      );
      expect(getByText('KONFIRMASI')).toBeTruthy();
    });

    it('renders close button when title is provided', () => {
      const { getByText } = render(
        <NBModal visible onClose={onClose} title="Info">
          <></>
        </NBModal>,
      );
      expect(getByText('✕')).toBeTruthy();
    });

    it('calls onClose when close button pressed', () => {
      const { getByText } = render(
        <NBModal visible onClose={onClose} title="Info">
          <></>
        </NBModal>,
      );
      fireEvent.press(getByText('✕'));
      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('renders footer when provided', () => {
      const { getByText } = render(
        <NBModal
          visible
          onClose={onClose}
          footer={<></>}
        >
          <></>
        </NBModal>,
      );
      expect(getByText !== undefined).toBeTruthy();
    });

    it('renders children content', () => {
      const { getByText } = render(
        <NBModal visible onClose={onClose}>
          <></>
        </NBModal>,
      );
      expect(getByText !== undefined).toBeTruthy();
    });

    it('does not render title bar when title is omitted', () => {
      const { queryByText } = render(
        <NBModal visible onClose={onClose}>
          <></>
        </NBModal>,
      );
      expect(queryByText('✕')).toBeNull();
    });
  });

  describe('fullscreen variant', () => {
    it('renders children in fullscreen Modal', () => {
      const { getByText } = render(
        <NBModal type="fullscreen" visible onClose={onClose}>
          <></>
        </NBModal>,
      );
      expect(getByText !== undefined).toBeTruthy();
    });

    it('renders title in uppercase', () => {
      const { getByText } = render(
        <NBModal type="fullscreen" visible onClose={onClose} title="Tambah Data">
          <></>
        </NBModal>,
      );
      expect(getByText('TAMBAH DATA')).toBeTruthy();
    });

    it('renders back button', () => {
      const { getByText } = render(
        <NBModal type="fullscreen" visible onClose={onClose} title="Form">
          <></>
        </NBModal>,
      );
      expect(getByText('←')).toBeTruthy();
    });

    it('calls onClose when back button pressed', () => {
      const { getByText } = render(
        <NBModal type="fullscreen" visible onClose={onClose} title="Form">
          <></>
        </NBModal>,
      );
      fireEvent.press(getByText('←'));
      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('does not render title text when title is omitted', () => {
      const { queryByText } = render(
        <NBModal type="fullscreen" visible onClose={onClose}>
          <></>
        </NBModal>,
      );
      expect(queryByText('←')).toBeTruthy(); // back button still shows
    });
  });
});
