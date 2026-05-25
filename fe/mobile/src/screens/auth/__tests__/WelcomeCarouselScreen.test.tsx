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

  it('renders WL-1 first and surfaces all 5 slides', () => {
    const navigation = makeNavigation();
    const { getByTestId } = render(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      <WelcomeCarouselScreen navigation={navigation as any} route={{ key: 'k', name: 'WelcomeCarousel' } as any} />,
    );
    expect(getByTestId('carousel-slide-WL-1')).toBeTruthy();
    expect(getByTestId('carousel-slide-WL-2')).toBeTruthy();
    expect(getByTestId('carousel-slide-WL-5')).toBeTruthy();
  });

  it('"Lewati" finishes and navigates to Login + sets carousel_seen', async () => {
    const navigation = makeNavigation();
    const { getByTestId } = render(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      <WelcomeCarouselScreen navigation={navigation as any} route={{ key: 'k', name: 'WelcomeCarousel' } as any} />,
    );
    fireEvent.press(getByTestId('carousel-slide-WL-1-secondary'));

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

  it('WL-1 auto-advance after 2.5s does not finish the flow', () => {
    const navigation = makeNavigation();
    render(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      <WelcomeCarouselScreen navigation={navigation as any} route={{ key: 'k', name: 'WelcomeCarousel' } as any} />,
    );
    jest.advanceTimersByTime(2500);
    expect(navigation.replace).not.toHaveBeenCalled();
  });
});
