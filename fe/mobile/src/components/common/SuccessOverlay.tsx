/**
 * SuccessOverlay — full-screen confirmation: big check circle, title, subtitle,
 * and pulsing dots while a redirect settles. Used by AS-5b (password changed).
 */

import React from 'react';
import { StyleSheet, View } from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { nbColors, nbShadows, nbSpacing, nbRadius } from '../../constants/nbTokens';
import { NBText } from '../nb';
import { PulsingDots } from './PulsingDots';

export interface SuccessOverlayProps {
  title: string;
  subtitle?: string;
  testID?: string;
}

export function SuccessOverlay({ title, subtitle, testID }: SuccessOverlayProps): React.JSX.Element {
  return (
    <View style={styles.root} testID={testID}>
      <View style={styles.circle}>
        <MaterialCommunityIcons name="check-bold" size={56} color={nbColors.black} />
      </View>
      <NBText variant="h2" align="center" style={styles.title}>
        {title}
      </NBText>
      {subtitle ? (
        <NBText variant="body" color="gray600" align="center" style={styles.subtitle}>
          {subtitle}
        </NBText>
      ) : null}
      <PulsingDots />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: nbColors.bgCanvas,
    paddingHorizontal: nbSpacing.xl,
  },
  circle: {
    width: 108,
    height: 108,
    borderRadius: nbRadius.full,
    backgroundColor: nbColors.success,
    borderWidth: 3,
    borderColor: nbColors.black,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: nbSpacing.lg,
    ...nbShadows.md,
  },
  title: { marginBottom: nbSpacing.sm },
  subtitle: { marginBottom: nbSpacing.lg },
});

export default SuccessOverlay;
