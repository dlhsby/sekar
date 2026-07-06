/**
 * SekarLogoBox — the canonical SEKAR brand lockup: the pinwheel inside a white
 * Neo-Brutalist box (thick border + hard-edge offset shadow), tilted for a
 * dynamic 3D feel. Matches the app icon and native splash exactly.
 *
 * The "3D" effect is a solid ink-coloured rect offset to bottom-right (same
 * technique used in the SVG generation scripts). React Native's elevation/
 * shadowOffset APIs produce a soft blurred shadow, which looks flat — hence
 * the explicit second View instead of nbShadows.
 */

import React from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';
import { nbColors } from '../../constants/nbTokens';
import { SekarPinwheel } from './SekarPinwheel';

export interface SekarLogoBoxProps {
  size?: number;
  /** Box tilt in degrees (default -6 for the dynamic brand look). */
  tilt?: number;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

export function SekarLogoBox({ size = 56, tilt = -6, style, testID }: SekarLogoBoxProps): React.JSX.Element {
  // All proportions mirror the SVG lockup() function in generate-app-icon.mjs
  const off = Math.round(size * 0.075);          // shadow offset (7.5% of box)
  const bw = Math.max(2, Math.round(size * 0.04)); // border width (4% of box)
  const rx = Math.round(size * 0.2);             // corner radius (20% of box)
  const pinSize = Math.round(size * 0.6);         // pinwheel diameter (60% of box)
  const containerSize = size + off;              // must fit box + offset shadow

  return (
    <View
      style={[{ width: containerSize, height: containerSize, transform: [{ rotate: `${tilt}deg` }] }, style]}
      testID={testID}
    >
      {/* Hard-edge ink shadow: solid black rect offset bottom-right */}
      <View
        style={{
          position: 'absolute',
          left: off,
          top: off,
          width: size,
          height: size,
          borderRadius: rx,
          backgroundColor: nbColors.black,
        }}
      />
      {/* White NB box with thick ink border */}
      <View
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          width: size,
          height: size,
          borderRadius: rx,
          backgroundColor: nbColors.white,
          borderWidth: bw,
          borderColor: nbColors.black,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <SekarPinwheel size={pinSize} />
      </View>
    </View>
  );
}

export default SekarLogoBox;
