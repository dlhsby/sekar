import React from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { WelcomeCarouselScreen } from '../WelcomeCarouselScreen';
import { ASYNC_STORAGE_KEYS } from '../../../services/storage/asyncStorageKeys';

const makeNavigation = () => ({
  replace: jest.fn(),
  navigate: jest.fn(),
  push: jest.fn(),
  goBack: jest.fn(),
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const renderScreen = (navigation: any) =>
  render(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    <WelcomeCarouselScreen navigation={navigation as any} route={{ key: 'k', name: 'WelcomeCarousel' } as any} />,
  );

describe('WelcomeCarouselScreen', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  it('opens on WL-2 and surfaces all 4 scene panels (no WL-1 splash)', () => {
    const { getByTestId, queryByTestId } = renderScreen(makeNavigation());
    expect(queryByTestId('carousel-slide-WL-1')).toBeNull();
    expect(getByTestId('carousel-slide-WL-2')).toBeTruthy();
    expect(getByTestId('carousel-slide-WL-5')).toBeTruthy();
  });

  it('first slide shows "Lanjut" + "Lewati" (not the final CTA)', () => {
    const { getByText, getByTestId, queryByText } = renderScreen(makeNavigation());
    expect(getByText('Lanjut')).toBeTruthy();
    expect(getByTestId('carousel-skip')).toBeTruthy();
    expect(queryByText('Mulai (Masuk)')).toBeNull();
  });

  it('"Lewati" jumps to the last slide instead of redirecting to Login', () => {
    const navigation = makeNavigation();
    const { getByTestId, getByText, queryByTestId } = renderScreen(navigation);
    fireEvent.press(getByTestId('carousel-skip'));
    // Footer flips to the final CTA; skip disappears; no navigation yet.
    expect(getByText('Mulai (Masuk)')).toBeTruthy();
    expect(queryByTestId('carousel-skip')).toBeNull();
    expect(navigation.navigate).not.toHaveBeenCalled();
  });

  it('the final CTA finishes the flow → Login + sets carousel_seen', async () => {
    const navigation = makeNavigation();
    const { getByTestId } = renderScreen(navigation);
    fireEvent.press(getByTestId('carousel-skip')); // advance to the last slide
    fireEvent.press(getByTestId('carousel-primary')); // "Mulai (Masuk)"

    await waitFor(() => {
      expect(navigation.navigate).toHaveBeenCalledWith('Login');
    });
    expect(await AsyncStorage.getItem(ASYNC_STORAGE_KEYS.CAROUSEL_SEEN)).toBe('true');
  });

  it('"Lanjut" advances without navigating to Login', () => {
    const navigation = makeNavigation();
    const { getByTestId } = renderScreen(navigation);
    fireEvent.press(getByTestId('carousel-primary'));
    expect(navigation.navigate).not.toHaveBeenCalled();
  });
});
