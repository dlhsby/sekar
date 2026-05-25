/**
 * SplashScreen — Phase 4 M3 / Hifi WL-1
 *
 * The branded splash shown at launch for logged-out users. The native boot
 * splash (sage + pinwheel) hands off into this for a seamless sage→sage
 * transition; this adds the wordmark, tagline, and animated dots the OS splash
 * can't render. Holds briefly, then routes to the carousel.
 *
 * Logged-in users never reach this — RootNavigator sends them straight to Home.
 */

import React, { useEffect } from 'react';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { SplashSlide } from '../../components/auth/SplashSlide';

const HOLD_MS = 1500;

type Props = NativeStackScreenProps<Record<string, undefined>, 'Splash'>;

export function SplashScreen({ navigation }: Props): React.JSX.Element {
  useEffect(() => {
    const timer = setTimeout(() => navigation.replace('WelcomeCarousel'), HOLD_MS);
    return () => clearTimeout(timer);
  }, [navigation]);

  return <SplashSlide testID="splash-screen" />;
}

export default SplashScreen;
