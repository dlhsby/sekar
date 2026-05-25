/**
 * PulsingDots — three staggered fading dots used as a lightweight "working"
 * indicator on the splash + success surfaces (hi-fi WL-1 / AS-5b).
 */

import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View, type ColorValue } from 'react-native';
import { nbColors } from '../../constants/nbTokens';

export interface PulsingDotsProps {
  color?: ColorValue;
  size?: number;
  testID?: string;
}

export function PulsingDots({
  color = nbColors.black,
  size = 8,
  testID,
}: PulsingDotsProps): React.JSX.Element {
  const values = useRef([0, 1, 2].map(() => new Animated.Value(0.3))).current;

  useEffect(() => {
    // Stagger the START once, then loop equal 800ms cycles so the dots keep a
    // fixed phase offset instead of drifting apart over time.
    const animations = values.map((value, i) =>
      Animated.sequence([
        Animated.delay(i * 200),
        Animated.loop(
          Animated.sequence([
            Animated.timing(value, { toValue: 1, duration: 400, useNativeDriver: true }),
            Animated.timing(value, { toValue: 0.3, duration: 400, useNativeDriver: true }),
          ]),
        ),
      ]),
    );
    animations.forEach((animation) => animation.start());
    return () => animations.forEach((animation) => animation.stop());
  }, [values]);

  return (
    <View style={styles.row} testID={testID}>
      {values.map((value, i) => (
        <Animated.View
          key={i}
          style={[
            styles.dot,
            { width: size, height: size, borderRadius: size / 2, backgroundColor: color, opacity: value },
          ]}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dot: {},
});

export default PulsingDots;
