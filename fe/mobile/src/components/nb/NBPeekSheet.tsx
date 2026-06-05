/**
 * NBPeekSheet — Design System v2.1 persistent peek bottom sheet.
 *
 * A thin wrapper over gorhom's `BottomSheet` (the non-modal one) that locks in
 * the Neo Brutalism chrome — white surface, 2px black top border, large top
 * corners, gray handle — and defaults to a persistent peek (never pans down to
 * close). Use this for always-visible, multi-snap surfaces (e.g. the monitoring
 * status peek) where `NBModal` (which is present/dismiss + backdrop) is wrong.
 *
 * The consumer supplies `snapPoints` and the scroll body (`BottomSheetFlatList`
 * / `BottomSheetScrollView`) as children; the NB chrome is enforced here and is
 * intentionally not overridable so every peek sheet looks identical.
 */

import React, { forwardRef } from 'react';
import { StyleSheet } from 'react-native';
import BottomSheet, { type BottomSheetProps } from '@gorhom/bottom-sheet';
import { nbColors, nbBorders, nbRadius } from '../../constants/nbTokens';

export interface NBPeekSheetProps
  extends Omit<BottomSheetProps, 'backgroundStyle' | 'handleIndicatorStyle'> {
  /** Peek + expanded heights, e.g. `[80, '50%', '90%']`. */
  snapPoints: (string | number)[];
  children: React.ReactNode;
}

export const NBPeekSheet = forwardRef<BottomSheet, NBPeekSheetProps>(
  (
    { snapPoints, index = 0, enablePanDownToClose = false, children, ...rest },
    ref,
  ): React.JSX.Element => {
    return (
      <BottomSheet
        ref={ref}
        {...rest}
        snapPoints={snapPoints}
        index={index}
        enablePanDownToClose={enablePanDownToClose}
        backgroundStyle={styles.background}
        handleIndicatorStyle={styles.handle}
      >
        {children}
      </BottomSheet>
    );
  },
);

NBPeekSheet.displayName = 'NBPeekSheet';

const styles = StyleSheet.create({
  background: {
    backgroundColor: nbColors.white,
    borderTopWidth: nbBorders.widthBase,
    borderTopColor: nbColors.black,
    borderTopLeftRadius: nbRadius.lg,
    borderTopRightRadius: nbRadius.lg,
  },
  handle: {
    backgroundColor: nbColors.gray400,
    width: 40,
    height: 4,
    borderRadius: 2,
  },
});

export default NBPeekSheet;
