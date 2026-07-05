/**
 * MarkerPreview — a custom NB callout card shown over a tapped map marker.
 *
 * react-native-maps' native `<Callout>` crashes on Fabric/Android when a marker
 * has both a custom icon view and a Callout child ("addViewAt: failed to insert
 * view … MapMarker"). Instead, the parent recenters the tapped marker and renders
 * THIS absolutely-positioned card at the (fixed) viewport-center point — always
 * correct regardless of zoom/region, no projection. The whole card is the press
 * target → opens the detail flow.
 */

import React from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { MarkerCalloutCard } from './MarkerCalloutCard';
import type { PresenceActivity, PresenceLocation } from '../../types/models.types';

// Fixed footprint so the card can be centered + lifted with constant transforms
// (no onLayout measure → no reflow/jump → snappy). The bubble (min 160 / max 240)
// centers within this width; the height estimate clears a single-line title card.
const CARD_WIDTH = 220;
const CARD_HEIGHT = 104;

export interface MarkerPreviewData {
  /** Screen-space anchor point (the recentred marker's coordinate = viewport center). */
  x: number;
  y: number;
  /** Marker's visual height above its anchor point (px) — lifts the card clear. */
  anchorOffset: number;
  card: {
    title: string;
    typeText: string;
    roleText?: string;
    accent: string;
    icon?: string;
    presence?: { activity: PresenceActivity; location: PresenceLocation };
  };
  /** Opens the detail surface (UserDetailSheet / BoundaryDetailModal). */
  onDetail: () => void;
}

interface MarkerPreviewProps {
  data: MarkerPreviewData;
}

export function MarkerPreview({ data }: MarkerPreviewProps): React.JSX.Element {
  const { x, y, anchorOffset, card, onDetail } = data;

  return (
    <View
      pointerEvents="box-none"
      style={[
        styles.anchor,
        {
          left: x,
          top: y,
          width: CARD_WIDTH,
          // Center on the marker (−½ width) and lift the card above it (−height −
          // the marker's own height), all constant → no measure, no reflow.
          transform: [
            { translateX: -CARD_WIDTH / 2 },
            { translateY: -(CARD_HEIGHT + anchorOffset) },
          ],
        },
      ]}
    >
      <TouchableOpacity activeOpacity={0.85} onPress={onDetail} testID="marker-preview">
        <MarkerCalloutCard
          title={card.title}
          typeText={card.typeText}
          roleText={card.roleText}
          accent={card.accent}
          icon={card.icon}
          presence={card.presence}
        />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  anchor: {
    position: 'absolute',
    alignItems: 'center',
  },
});

export default MarkerPreview;
