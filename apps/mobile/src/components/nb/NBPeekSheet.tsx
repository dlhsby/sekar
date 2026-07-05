/**
 * NBPeekSheet — gorhom-free persistent peek bottom sheet.
 *
 * @gorhom/bottom-sheet does not present on the current stack (RN 0.86 New Arch +
 * reanimated 4.4); this is a self-contained replacement built on RN `Animated` +
 * `PanResponder` (no reanimated, no gorhom). It renders an always-visible panel
 * anchored to the bottom of its (full-height) parent that the user can drag — or
 * tap the handle — to move between snap points (e.g. peek → half → full). The
 * NB chrome (white surface, 2px black top border, large top corners, gray
 * handle) is enforced here.
 *
 * The consumer supplies `snapPoints` (ascending visible heights, px or '%') and
 * the scroll body as children (a plain RN `FlatList`/`ScrollView` with `flex:1`).
 */

import React, {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  View,
  Animated,
  PanResponder,
  StyleSheet,
  Dimensions,
  type LayoutChangeEvent,
} from 'react-native';
import { nbColors, nbBorders, nbRadius } from '../../constants/nbTokens';

export interface NBPeekSheetHandle {
  /** Animate to the snap point at `index` (0 = most collapsed / peek). */
  snapToIndex: (index: number) => void;
  /** Snap to the most expanded point. */
  expand: () => void;
  /** Snap to the peek (index 0). */
  collapse: () => void;
}

export interface NBPeekSheetProps {
  /** Ascending visible heights, e.g. `[88, '50%', '90%']`. */
  snapPoints: (string | number)[];
  /** Initial snap index. Default 0 (peek). */
  index?: number;
  children: React.ReactNode;
}

const SCREEN_H = Dimensions.get('window').height;

/** Resolve a snap ('50%' or px number) to a pixel visible-height against `base`. */
function resolveSnap(snap: string | number, base: number): number {
  if (typeof snap === 'number') {
    return snap;
  }
  const m = /^(\d+(?:\.\d+)?)%$/.exec(snap.trim());
  return m ? (parseFloat(m[1]) / 100) * base : base;
}

export const NBPeekSheet = forwardRef<NBPeekSheetHandle, NBPeekSheetProps>(
  ({ snapPoints, index = 0, children }, ref): React.JSX.Element => {
    // Height of the parent area (measured); falls back to screen height until then.
    const [containerH, setContainerH] = useState(0);
    const base = containerH || SCREEN_H;

    // Visible heights (ascending) → the tallest is the panel's rendered height.
    const visibleHeights = useMemo(
      () => snapPoints.map((s) => Math.min(resolveSnap(s, base), base)),
      [snapPoints, base],
    );
    const panelHeight = visibleHeights[visibleHeights.length - 1] ?? base;

    // translateY offset per snap: 0 = fully shown (tallest), larger = more hidden.
    const offsets = useMemo(
      () => visibleHeights.map((v) => Math.max(0, panelHeight - v)),
      [visibleHeights, panelHeight],
    );

    const translateY = useRef(new Animated.Value(0)).current;
    const currentIndexRef = useRef(index);
    const dragStartRef = useRef(0);

    const minOffset = offsets[offsets.length - 1] ?? 0; // most expanded
    const maxOffset = offsets[0] ?? 0; // peek

    const animateTo = useRef((toValue: number) => {
      Animated.spring(translateY, {
        toValue,
        useNativeDriver: true,
        bounciness: 0,
        speed: 14,
      }).start();
    }).current;

    const snapToIndexRef = useRef((i: number) => {
      const clamped = Math.max(0, Math.min(i, offsets.length - 1));
      currentIndexRef.current = clamped;
      animateTo(offsets[clamped]);
    });
    // Keep the closure's `offsets` fresh across re-measures.
    snapToIndexRef.current = (i: number) => {
      const clamped = Math.max(0, Math.min(i, offsets.length - 1));
      currentIndexRef.current = clamped;
      animateTo(offsets[clamped]);
    };

    useImperativeHandle(ref, () => ({
      snapToIndex: (i: number) => snapToIndexRef.current(i),
      expand: () => snapToIndexRef.current(offsets.length - 1),
      collapse: () => snapToIndexRef.current(0),
    }));

    const onLayout = (e: LayoutChangeEvent) => {
      const h = Math.round(e.nativeEvent.layout.height);
      if (h > 0 && h !== containerH) {
        setContainerH(h);
      }
    };

    // Re-anchor to the current snap whenever the resolved offsets change — on
    // mount and on every container re-measure. Without this the panel keeps the
    // stale screen-height-based offset after the real (smaller) container height
    // arrives and can sit entirely below the clip, rendering invisible.
    useEffect(() => {
      const i = Math.min(currentIndexRef.current, offsets.length - 1);
      translateY.setValue(offsets[i] ?? 0);
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [offsets]);

    const panResponder = useMemo(
      () =>
        PanResponder.create({
          onStartShouldSetPanResponder: () => true,
          onMoveShouldSetPanResponder: (_e, g) => Math.abs(g.dy) > 3,
          onPanResponderGrant: () => {
            translateY.stopAnimation((v: number) => {
              dragStartRef.current = v;
            });
          },
          onPanResponderMove: (_e, g) => {
            const next = Math.max(
              minOffset,
              Math.min(maxOffset, dragStartRef.current + g.dy),
            );
            translateY.setValue(next);
          },
          onPanResponderRelease: (_e, g) => {
            // A tap (negligible movement) cycles to the next snap, wrapping back
            // to peek from the top — a no-fuss expand/collapse without dragging.
            if (Math.abs(g.dy) < 6 && Math.abs(g.vy) < 0.3) {
              const next = (currentIndexRef.current + 1) % offsets.length;
              snapToIndexRef.current(next);
              return;
            }
            // Otherwise snap to the offset nearest the release point, biased by
            // fling velocity (downward fling → more hidden, upward → more shown).
            const projected = dragStartRef.current + g.dy + g.vy * 120;
            let nearest = 0;
            let best = Infinity;
            offsets.forEach((o, i) => {
              const d = Math.abs(o - projected);
              if (d < best) {
                best = d;
                nearest = i;
              }
            });
            snapToIndexRef.current(nearest);
          },
        }),
      [minOffset, maxOffset, offsets],
    );

    return (
      <View style={styles.host} pointerEvents="box-none" onLayout={onLayout}>
        <Animated.View
          style={[
            styles.panel,
            { height: panelHeight, transform: [{ translateY }] },
          ]}
        >
          <View style={styles.handleArea} {...panResponder.panHandlers}>
            <View style={styles.handle} />
          </View>
          <View style={styles.body}>{children}</View>
        </Animated.View>
      </View>
    );
  },
);

NBPeekSheet.displayName = 'NBPeekSheet';

const styles = StyleSheet.create({
  // Fills the parent and clips the panel's hidden overflow; lets touches through
  // to the map where the panel isn't.
  host: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    overflow: 'hidden',
    justifyContent: 'flex-end',
  },
  panel: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: nbColors.white,
    borderTopWidth: nbBorders.widthBase,
    borderTopColor: nbColors.black,
    borderTopLeftRadius: nbRadius.lg,
    borderTopRightRadius: nbRadius.lg,
    // Hard-edge top shadow (NB) — manual since RN shadows only cast downward.
    borderLeftWidth: nbBorders.widthThin,
    borderRightWidth: nbBorders.widthThin,
    borderLeftColor: nbColors.gray300,
    borderRightColor: nbColors.gray300,
    elevation: 12,
  },
  handleArea: {
    alignItems: 'center',
    paddingTop: 8,
    paddingBottom: 6,
  },
  handle: {
    width: 48,
    height: 5,
    borderRadius: 3,
    backgroundColor: nbColors.gray400,
  },
  body: {
    flex: 1,
  },
});

export default NBPeekSheet;
