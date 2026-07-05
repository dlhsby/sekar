import React from 'react';
import { render } from '@testing-library/react-native';
import { SplashScreen } from '../SplashScreen';

const makeNavigation = () => ({
  replace: jest.fn(),
  navigate: jest.fn(),
  push: jest.fn(),
  goBack: jest.fn(),
});

describe('SplashScreen', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  it('renders the branded splash', () => {
    const navigation = makeNavigation();
    const { getByTestId } = render(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      <SplashScreen navigation={navigation as any} route={{ key: 'k', name: 'Splash' } as any} />,
    );
    expect(getByTestId('splash-screen')).toBeTruthy();
    // Splash holds before routing — should not navigate immediately.
    expect(navigation.replace).not.toHaveBeenCalled();
  });

  it('routes to the carousel after the hold', () => {
    const navigation = makeNavigation();
    render(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      <SplashScreen navigation={navigation as any} route={{ key: 'k', name: 'Splash' } as any} />,
    );
    jest.advanceTimersByTime(1500);
    expect(navigation.replace).toHaveBeenCalledWith('WelcomeCarousel');
  });
});
