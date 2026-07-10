/**
 * SplashSlide — WL-1, the first frame of the pre-login carousel.
 * Sage→deep-green gradient, tilted pinwheel lockup, wordmark, tagline, and a
 * pulsing "loading" indicator. Auto-advances to WL-2 (timer lives in the
 * carousel screen). Mirrors specs/design-system/mockups/project/hifi-mobile.html · WL-1.
 */

import React from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
import { nbColors, nbSpacing } from '../../constants/nbTokens';
import { NBText } from '../nb';
import { SekarLogoBox } from '../brand/SekarLogoBox';
import { PulsingDots } from '../common/PulsingDots';

export interface SplashSlideProps {
  testID?: string;
}

export function SplashSlide({ testID }: SplashSlideProps): React.JSX.Element {
  return (
    <View style={styles.root} testID={testID}>
      <Svg style={StyleSheet.absoluteFill} width="100%" height="100%">
        <Defs>
          <LinearGradient id="splashBg" x1="0.2" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={nbColors.primary} />
            <Stop offset="1" stopColor={nbColors.primaryActive} />
          </LinearGradient>
        </Defs>
        <Rect x="0" y="0" width="100%" height="100%" fill="url(#splashBg)" />
      </Svg>

      <View style={styles.center}>
        <SekarLogoBox size={120} style={styles.logo} />
        <NBText variant="display-xl" align="center" style={styles.wordmark}>
          SEKAR
        </NBText>
        <NBText variant="mono-sm" align="center" color="gray700" style={styles.tagline}>
          SISTEM EVALUASI KINERJA SATGAS RTH
        </NBText>
        <PulsingDots />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: nbSpacing.xl,
  },
  logo: { marginBottom: 28 },
  wordmark: { letterSpacing: -1, marginBottom: nbSpacing.sm },
  tagline: { letterSpacing: 2, marginBottom: nbSpacing.xl },
});

export default SplashSlide;
