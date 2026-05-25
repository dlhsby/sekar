/**
 * SekarLogoBox — the SEKAR pinwheel inside a white Neo-Brutalist box.
 * The compact brand lockup used on auth surfaces (e.g. the Login header).
 */

import React from 'react';
import { StyleSheet, View } from 'react-native';
import { nbColors, nbBorders, nbRadius, nbShadows } from '../../constants/nbTokens';
import { SekarPinwheel } from './SekarPinwheel';

export interface SekarLogoBoxProps {
  size?: number;
  testID?: string;
}

export function SekarLogoBox({ size = 56, testID }: SekarLogoBoxProps): React.JSX.Element {
  return (
    <View style={[styles.box, { width: size, height: size }]} testID={testID}>
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
