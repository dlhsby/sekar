/**
 * A pin's name label, placed on one side of the pin.
 *
 * Why a side per tier: with every label under its pin, a lokasi inside a kawasan
 * inside a rayon printed three names on the same strip of map and none of them
 * were readable. Rayon goes below, kawasan left, lokasi right, people above — so
 * overlapping tiers write in different directions. The mapping is shared with
 * web (`lib/monitoring/markers.ts`) so the two platforms agree.
 *
 * Why the symmetric spacer: `react-native-maps` anchors a custom marker by a
 * FRACTION of the rendered view, and on Android the view is snapshotted to a
 * bitmap — anything outside its bounds is clipped, so the label cannot simply be
 * absolutely positioned outside the pin. Reserving an equal, empty slot on the
 * opposite side keeps the pin at the view's exact centre, which means `anchor`
 * stays `{x: 0.5, y: 0.5}` and the pin does not drift off its coordinate as the
 * name gets longer.
 *
 * The slots are fixed-size for the same bitmap reason: a label that grew the
 * view would move the pin. Names therefore wrap to at most two lines inside the
 * slot instead of running off across the map.
 */
import React from 'react';
import { View, StyleSheet } from 'react-native';
import { NBText } from '../nb/NBText';
import { nbColors } from '../../constants/nbTokens';

export type LabelPlacement = 'bottom' | 'top' | 'left' | 'right';

/** Which side each tier's name sits on. Mirrors web's `NODE_LABEL_PLACEMENT`. */
export const NODE_LABEL_PLACEMENT: Record<string, LabelPlacement> = {
  district: 'bottom',
  region: 'left',
  location: 'right',
  surabaya: 'bottom',
};

const SLOT_W = 96;
const SLOT_H = 30;

export function LabeledMarker({
  label,
  placement,
  children,
}: {
  /** Null or empty hides the label (and its spacer) entirely. */
  label?: string | null;
  placement: LabelPlacement;
  children: React.ReactNode;
}): React.JSX.Element {
  if (!label) {
    return <>{children}</>;
  }

  const horizontal = placement === 'left' || placement === 'right';
  const text = (
    <View style={horizontal ? styles.slotH : styles.slotV}>
      <NBText
        variant="caption"
        style={[
          styles.text,
          placement === 'left' && styles.alignRight,
          placement === 'right' && styles.alignLeft,
        ]}
        numberOfLines={2}
      >
        {label}
      </NBText>
    </View>
  );
  // The empty twin. Same size, no content — it exists only to keep the pin in
  // the middle of the snapshotted view.
  const spacer = <View style={horizontal ? styles.slotH : styles.slotV} />;

  return (
    <View style={horizontal ? styles.rowWrap : styles.colWrap}>
      {placement === 'left' || placement === 'top' ? text : spacer}
      {children}
      {placement === 'left' || placement === 'top' ? spacer : text}
    </View>
  );
}

const styles = StyleSheet.create({
  rowWrap: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  colWrap: {
    flexDirection: 'column',
    alignItems: 'center',
  },
  slotH: {
    width: SLOT_W,
    justifyContent: 'center',
  },
  slotV: {
    height: SLOT_H,
    width: 132,
    justifyContent: 'center',
  },
  text: {
    fontSize: 10,
    fontWeight: '700',
    color: nbColors.black,
    textAlign: 'center',
    // A white halo, so a name stays readable over any base-map colour — the
    // same treatment web gives it via text-shadow.
    textShadowColor: nbColors.white,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 3,
    paddingHorizontal: 4,
  },
  alignRight: {
    textAlign: 'right',
  },
  alignLeft: {
    textAlign: 'left',
  },
});
