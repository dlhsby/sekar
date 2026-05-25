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

describe('WelcomeCarouselScreen', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  it('opens on WL-2 and surfaces all 4 carousel slides (no WL-1 splash)', () => {
    const navigation = makeNavigation();
    const { getByTestId, queryByTestId } = render(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      <WelcomeCarouselScreen navigation={navigation as any} route={{ key: 'k', name: 'WelcomeCarousel' } as any} />,
    );
    // WL-1 (splash) is no longer a carousel slide — the carousel opens on WL-2.
    expect(queryByTestId('carousel-slide-WL-1')).toBeNull();
    expect(getByTestId('carousel-slide-WL-2')).toBeTruthy();
    expect(getByTestId('carousel-slide-WL-5')).toBeTruthy();
  });

  it('"Lewati" finishes and navigates to Login + sets carousel_seen', async () => {
    const navigation = makeNavigation();
    const { getByTestId } = render(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      <WelcomeCarouselScreen navigation={navigation as any} route={{ key: 'k', name: 'WelcomeCarousel' } as any} />,
    );
    // WL-1 is the branded splash (no skip). "Lewati" lives on slides WL-2…WL-4.
    fireEvent.press(getByTestId('carousel-slide-WL-2-secondary'));

    await waitFor(() => {
      expect(navigation.replace).toHaveBeenCalledWith('Login');
    });
    expect(await AsyncStorage.getItem(ASYNC_STORAGE_KEYS.CAROUSEL_SEEN)).toBe('true');
  });

  it('"Masuk" on WL-5 finishes the flow', async () => {
    const navigation = makeNavigation();
    const { getByTestId } = render(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      <WelcomeCarouselScreen navigation={navigation as any} route={{ key: 'k', name: 'WelcomeCarousel' } as any} />,
    );
    // WL-5 is rendered in the FlatList — its primary CTA triggers finish.
    fireEvent.press(getByTestId('carousel-slide-WL-5-primary'));

    await waitFor(() => {
      expect(navigation.replace).toHaveBeenCalledWith('Login');
    });
    expect(await AsyncStorage.getItem(ASYNC_STORAGE_KEYS.CAROUSEL_SEEN)).toBe('true');
  });

});
