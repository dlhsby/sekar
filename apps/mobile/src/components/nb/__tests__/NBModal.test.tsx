// Mutable insets so individual tests can exercise the safe-area-inset branch
// (footer padding + footerH estimate). jest hoists this mock; the `mock`-prefixed
// variable is allowed to be referenced from the factory.
let mockInsets = { top: 0, bottom: 0, left: 0, right: 0 };
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => mockInsets,
  SafeAreaProvider: ({ children }: { children: React.ReactNode }) => children,
  SafeAreaView: ({ children }: { children: React.ReactNode }) => children,
}));

import React from 'react';
import { Text, Platform, StyleSheet } from 'react-native';
import { render, fireEvent } from '@testing-library/react-native';
import { NBText } from '../NBText';
import { NBModal } from '../NBModal';

const layout = (height: number) => ({
  nativeEvent: { layout: { x: 0, y: 0, width: 320, height } },
});

describe('NBModal', () => {
  const onClose = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockInsets = { top: 0, bottom: 0, left: 0, right: 0 };
  });

  describe('sheet variant (default)', () => {
    it('renders children and the sheet container when visible', () => {
      const { getByText, getByTestId } = render(
        <NBModal visible onClose={onClose}>
          <Text>Konten</Text>
        </NBModal>,
      );
      expect(getByTestId('bottom-sheet')).toBeTruthy();
      expect(getByText('Konten')).toBeTruthy();
    });

    it('renders title as-is (no uppercase transform)', () => {
      const { getByText } = render(
        <NBModal visible onClose={onClose} title="konfirmasi">
          <></>
        </NBModal>,
      );
      expect(getByText('konfirmasi')).toBeTruthy();
    });

    it('renders close button when title is provided', () => {
      const { getByLabelText } = render(
        <NBModal visible onClose={onClose} title="Info">
          <></>
        </NBModal>,
      );
      expect(getByLabelText('Tutup')).toBeTruthy();
    });

    it('calls onClose (via onDismiss) when the close button is pressed', () => {
      const { getByLabelText } = render(
        <NBModal visible onClose={onClose} title="Info">
          <></>
        </NBModal>,
      );
      fireEvent.press(getByLabelText('Tutup'));
      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('renders a backdrop', () => {
      const { getByTestId } = render(
        <NBModal visible onClose={onClose}>
          <></>
        </NBModal>,
      );
      expect(getByTestId('bottom-sheet-backdrop')).toBeTruthy();
    });

    it('renders footer via footerComponent when provided', () => {
      const { getByText, getByTestId } = render(
        <NBModal visible onClose={onClose} footer={<NBText>Terapkan</NBText>}>
          <></>
        </NBModal>,
      );
      expect(getByTestId('bottom-sheet-footer')).toBeTruthy();
      expect(getByTestId('nbmodal-footer')).toBeTruthy();
      expect(getByText('Terapkan')).toBeTruthy();
    });

    it('does not mount a footer when none is provided', () => {
      const { queryByTestId } = render(
        <NBModal visible onClose={onClose}>
          <></>
        </NBModal>,
      );
      expect(queryByTestId('bottom-sheet-footer')).toBeNull();
    });

    it('does not call onClose when mounted hidden (no spurious dismiss)', () => {
      const { queryByTestId } = render(
        <NBModal visible={false} onClose={onClose}>
          <></>
        </NBModal>,
      );
      expect(onClose).not.toHaveBeenCalled();
      expect(queryByTestId('bottom-sheet')).toBeNull();
    });

    it('presents on visible=true and dismisses (calling onClose) on visible=false', () => {
      const { rerender, queryByTestId } = render(
        <NBModal visible={false} onClose={onClose}>
          <></>
        </NBModal>,
      );
      expect(queryByTestId('bottom-sheet')).toBeNull();

      rerender(
        <NBModal visible onClose={onClose}>
          <></>
        </NBModal>,
      );
      expect(queryByTestId('bottom-sheet')).toBeTruthy();

      rerender(
        <NBModal visible={false} onClose={onClose}>
          <></>
        </NBModal>,
      );
      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('does not render the title bar when title is omitted', () => {
      const { queryByLabelText, queryByTestId } = render(
        <NBModal visible onClose={onClose}>
          <></>
        </NBModal>,
      );
      expect(queryByLabelText('Tutup')).toBeNull();
      expect(queryByTestId('nbmodal-title-bar')).toBeNull();
    });

    it('renders with noPadding without crashing', () => {
      const { getByText } = render(
        <NBModal visible onClose={onClose} noPadding>
          <Text>Edge</Text>
        </NBModal>,
      );
      expect(getByText('Edge')).toBeTruthy();
    });

    it('renders with avoidKeyboard without crashing', () => {
      const { getByText } = render(
        <NBModal visible onClose={onClose} avoidKeyboard footer={<NBText>OK</NBText>}>
          <Text>Form</Text>
        </NBModal>,
      );
      expect(getByText('Form')).toBeTruthy();
    });

    it('measures the title bar height on layout', () => {
      const { getByTestId, getByText } = render(
        <NBModal visible onClose={onClose} title="Ukur">
          <Text>Body</Text>
        </NBModal>,
      );
      fireEvent(getByTestId('nbmodal-title-bar'), 'layout', layout(60));
      expect(getByText('Body')).toBeTruthy();
    });

    it('measures the footer height on layout', () => {
      const { getByTestId, getByText } = render(
        <NBModal visible onClose={onClose} footer={<NBText>Aksi</NBText>}>
          <Text>Body</Text>
        </NBModal>,
      );
      fireEvent(getByTestId('nbmodal-footer'), 'layout', layout(80));
      expect(getByText('Body')).toBeTruthy();
    });

    it('accounts for the safe-area bottom inset on the footer', () => {
      mockInsets = { top: 0, bottom: 34, left: 0, right: 0 };
      const { getByTestId, getByText } = render(
        <NBModal visible onClose={onClose} footer={<NBText>Simpan</NBText>}>
          <Text>Body</Text>
        </NBModal>,
      );
      expect(getByTestId('nbmodal-footer')).toBeTruthy();
      expect(getByText('Simpan')).toBeTruthy();
    });
  });

  describe('fixed-height sheet (sheetHeight)', () => {
    it('renders children in a non-scrolling fixed-height body', () => {
      const { getByText, getByTestId } = render(
        <NBModal visible onClose={onClose} sheetHeight="92%" testID="map-sheet" title="Peta">
          <Text>MapBody</Text>
        </NBModal>,
      );
      expect(getByTestId('map-sheet')).toBeTruthy();
      expect(getByText('MapBody')).toBeTruthy();
    });

    it('renders the headerRight slot in the sheet title bar', () => {
      const { getByText } = render(
        <NBModal
          visible
          onClose={onClose}
          sheetHeight="92%"
          title="Ahmad"
          headerRight={<NBText>Stepper</NBText>}
        >
          <></>
        </NBModal>,
      );
      expect(getByText('Stepper')).toBeTruthy();
    });

    it('applies the titleStyle override to the title text', () => {
      const { getByText } = render(
        <NBModal
          visible
          onClose={onClose}
          sheetHeight="92%"
          title="Nama Sangat Panjang Sekali"
          titleStyle={{ fontSize: 12 }}
        >
          <></>
        </NBModal>,
      );
      const flat = StyleSheet.flatten(getByText('Nama Sangat Panjang Sekali').props.style);
      expect(flat.fontSize).toBe(12);
    });

    it('resolves a numeric sheetHeight too', () => {
      const { getByText } = render(
        <NBModal visible onClose={onClose} sheetHeight={500} title="Peta">
          <Text>NumBody</Text>
        </NBModal>,
      );
      expect(getByText('NumBody')).toBeTruthy();
    });
  });

  describe('fullscreen variant', () => {
    it('renders children in a fullscreen Modal', () => {
      const { getByText } = render(
        <NBModal type="fullscreen" visible onClose={onClose}>
          <Text>Layar</Text>
        </NBModal>,
      );
      expect(getByText('Layar')).toBeTruthy();
    });

    it('renders title as-is (no uppercase transform)', () => {
      const { getByText } = render(
        <NBModal type="fullscreen" visible onClose={onClose} title="Tambah Data">
          <></>
        </NBModal>,
      );
      expect(getByText('Tambah Data')).toBeTruthy();
    });

    it('renders the back button and calls onClose when pressed', () => {
      const { getByLabelText } = render(
        <NBModal type="fullscreen" visible onClose={onClose} title="Form">
          <></>
        </NBModal>,
      );
      const back = getByLabelText('Kembali');
      expect(back).toBeTruthy();
      fireEvent.press(back);
      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('shows the back button even when title is omitted', () => {
      const { getByLabelText } = render(
        <NBModal type="fullscreen" visible onClose={onClose}>
          <></>
        </NBModal>,
      );
      expect(getByLabelText('Kembali')).toBeTruthy();
    });

    it('renders a scrollable body', () => {
      const { getByText } = render(
        <NBModal type="fullscreen" visible onClose={onClose} scrollable>
          <Text>Scrollable</Text>
        </NBModal>,
      );
      expect(getByText('Scrollable')).toBeTruthy();
    });

    it('renders a scrollable + noPadding body', () => {
      const { getByText } = render(
        <NBModal type="fullscreen" visible onClose={onClose} scrollable noPadding>
          <Text>EdgeScroll</Text>
        </NBModal>,
      );
      expect(getByText('EdgeScroll')).toBeTruthy();
    });

    it('renders a non-scrollable noPadding body (maps/calendars)', () => {
      const { getByText } = render(
        <NBModal type="fullscreen" visible onClose={onClose} noPadding>
          <Text>FullBleed</Text>
        </NBModal>,
      );
      expect(getByText('FullBleed')).toBeTruthy();
    });

    it('renders the headerRight slot when provided', () => {
      const { getByText } = render(
        <NBModal type="fullscreen" visible onClose={onClose} title="Filter" headerRight={<NBText>Reset</NBText>}>
          <></>
        </NBModal>,
      );
      expect(getByText('Reset')).toBeTruthy();
    });

    it('renders footer + avoidKeyboard (KeyboardAvoidingView path)', () => {
      const { getByText } = render(
        <NBModal type="fullscreen" visible onClose={onClose} avoidKeyboard footer={<NBText>Gunakan</NBText>}>
          <Text>Body</Text>
        </NBModal>,
      );
      expect(getByText('Gunakan')).toBeTruthy();
      expect(getByText('Body')).toBeTruthy();
    });

    it('renders avoidKeyboard without a footer', () => {
      const { getByText } = render(
        <NBModal type="fullscreen" visible onClose={onClose} avoidKeyboard>
          <Text>NoFooter</Text>
        </NBModal>,
      );
      expect(getByText('NoFooter')).toBeTruthy();
    });

    it('renders a fixed footer without avoidKeyboard', () => {
      const { getByText } = render(
        <NBModal type="fullscreen" visible onClose={onClose} footer={<NBText>Simpan</NBText>}>
          <Text>Body</Text>
        </NBModal>,
      );
      expect(getByText('Simpan')).toBeTruthy();
      expect(getByText('Body')).toBeTruthy();
    });

    it.each(['ios', 'android'] as const)(
      'picks a KeyboardAvoidingView behavior for %s',
      (os) => {
        const original = Platform.OS;
        (Platform as { OS: string }).OS = os;
        try {
          const { getByText } = render(
            <NBModal type="fullscreen" visible onClose={onClose} avoidKeyboard>
              <Text>KAV</Text>
            </NBModal>,
          );
          expect(getByText('KAV')).toBeTruthy();
        } finally {
          (Platform as { OS: string }).OS = original;
        }
      },
    );
  });
});
