/**
 * SekarPinwheel — the SEKAR brand mark (8-blade pinwheel + center hub).
 * Ported verbatim from the hi-fi splash SVG (specs/design-system/mockups/project/hifi-mobile.html · WL-1).
 */

import React from 'react';
import Svg, { Circle, G, Path } from 'react-native-svg';
import { nbColors } from '../../constants/nbTokens';

const BLADE = 'M 0 -14 Q 18 -38 0 -42 Q -14 -38 0 -14 Z';
const ANGLES = [0, 45, 90, 135, 180, 225, 270, 315];

export interface SekarPinwheelProps {
  size?: number;
  bladeColor?: string;
  centerColor?: string;
  strokeColor?: string;
}

export function SekarPinwheel({
  size = 120,
  bladeColor = nbColors.primary,
  centerColor = nbColors.bgAccentYellow,
  strokeColor = nbColors.black,
}: SekarPinwheelProps): React.JSX.Element {
  return (
    <Svg width={size} height={size} viewBox="0 0 120 120">
      <G x={60} y={60}>
        {ANGLES.map((angle) => (
          <G key={angle} rotation={angle}>
            <Path
              d={BLADE}
              fill={bladeColor}
              stroke={strokeColor}
              strokeWidth={3}
              strokeLinejoin="round"
            />
          </G>
        ))}
        <Circle r={12} fill={centerColor} stroke={strokeColor} strokeWidth={3} />
      </G>
    </Svg>
  );
}

export default SekarPinwheel;
