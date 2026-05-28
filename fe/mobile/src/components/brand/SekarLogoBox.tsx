/**
 * SekarLogoBox — the canonical SEKAR brand lockup: the pinwheel inside a white
 * Neo-Brutalist box (thick border + hard-edge shadow), tilted for a dynamic 3D
 * feel. This is the standard way to display the SEKAR mark everywhere (login,
 * splash, app icon). Pass `tilt={0}` for an upright variant.
 */

import React from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { nbColors, nbBorders, nbRadius, nbShadows } from '../../constants/nbTokens';
import { SekarPinwheel } from './SekarPinwheel';

export interface SekarLogoBoxProps {
  size?: number;
  /** Box tilt in degrees (default -6 for the dynamic brand look). */
  tilt?: number;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

export function SekarLogoBox({ size = 56, tilt = -6, style, testID }: SekarLogoBoxProps): React.JSX.Element {
  return (
    <View
      style={[
        styles.box,
        { width: size, height: size, transform: [{ rotate: `${tilt}deg` }] },
        style,
      ]}
      testID={testID}
    >
      <SekarPinwheel size={Math.round(size * 0.66)} />
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    backgroundColor: nbColors.white,
    borderWidth: nbBorders.widthThick,
    borderColor: nbColors.black,
    borderRadius: nbRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    ...nbShadows.sm,
  },
});

export default SekarLogoBox;
