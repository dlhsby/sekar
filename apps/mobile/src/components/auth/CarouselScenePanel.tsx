/**
 * CarouselScenePanel — the bordered illustration box that is the only swiping
 * element of the pre-login carousel (one per WL-2…WL-5 slide). Mirrors the
 * `.scene-illust` primitive in specs/design-system/mockups/project/hifi-mobile.html.
 */

import React from 'react';
import { StyleSheet, View } from 'react-native';
import { nbColors, nbBorders, nbRadius, nbShadows } from '../../constants/nbTokens';

export interface CarouselScenePanelProps {
  bg?: string;
  children: React.ReactNode;
  testID?: string;
}

export function CarouselScenePanel({
  bg = nbColors.bgAccentMint,
  children,
  testID,
}: CarouselScenePanelProps): React.JSX.Element {
  return (
    <View style={[styles.panel, { backgroundColor: bg }]} testID={testID}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    flex: 1,
    borderWidth: nbBorders.widthBase,
    borderColor: nbColors.black,
    borderRadius: nbRadius.lg,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    ...nbShadows.md,
  },
});

export default CarouselScenePanel;
