/**
 * MarkerCalloutCard — the NB bubble shown over a tapped map marker (petugas /
 * area / rayon), rendered by MarkerPreview (a custom overlay, NOT a native
 * react-native-maps Callout, which crashes on Fabric/Android with custom markers).
 *
 * Content: a type-tinted icon chip, the name, a "Type · Role" meta line (role only
 * for petugas), and a "Lihat detail" footer. The whole card is the press target.
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { NBText } from '../nb/NBText';
import {
  nbColors,
  nbSpacing,
  nbBorders,
  nbRadius,
  nbShadows,
  withAlpha,
} from '../../constants/nbTokens';
import { presenceActivityPill, locationLabel } from '../../utils/statusHelpers';
import { getActivityColor } from '../../utils/mapUtils';
import type { PresenceActivity, PresenceLocation } from '../../types/models.types';

interface MarkerCalloutCardProps {
  title: string;
  /** 'Petugas' | 'Area' | 'Rayon' */
  typeText: string;
  /** Role label — shown after the type for petugas only. */
  roleText?: string;
  /** Type tint (a token color value). */
  accent: string;
  /** Type icon (MaterialCommunityIcons name). */
  icon?: string;
  /** Petugas only — two-axis presence shown as an activity dot + label · location. */
  presence?: { activity: PresenceActivity; location: PresenceLocation };
}

export function MarkerCalloutCard({
  title,
  typeText,
  roleText,
  accent,
  icon,
  presence,
}: MarkerCalloutCardProps): React.JSX.Element {
  const meta = roleText ? `${typeText} · ${roleText}` : typeText;

  return (
    <View style={styles.wrapper}>
      <View style={styles.bubble}>
        <View style={styles.header}>
          <View style={[styles.iconChip, { backgroundColor: withAlpha(accent, 0.16), borderColor: accent }]}>
            <MaterialCommunityIcons name={icon ?? 'map-marker'} size={18} color={accent} />
          </View>
          <View style={styles.textCol}>
            <NBText variant="body-sm" color="black" numberOfLines={1} style={styles.title}>
              {title}
            </NBText>
            <NBText variant="caption" color="gray600" numberOfLines={1}>
              {meta}
            </NBText>
          </View>
        </View>

        {presence ? (
          <View style={styles.presenceRow}>
            <View style={[styles.presenceDot, { backgroundColor: getActivityColor(presence.activity) }]} />
            <NBText variant="caption" color="black" style={styles.presenceText}>
              {presenceActivityPill(presence.activity).label}
            </NBText>
            {presence.location !== 'unknown' ? (
              <NBText
                variant="caption"
                color={presence.location === 'luar_area' ? 'statusOutside' : 'gray600'}
              >
                {` · ${locationLabel(presence.location)}`}
              </NBText>
            ) : null}
          </View>
        ) : null}

        <View style={styles.footer}>
          <NBText variant="caption" style={[styles.detailText, { color: accent }]}>
            Lihat detail
          </NBText>
          <MaterialCommunityIcons name="chevron-right" size={16} color={accent} />
        </View>
      </View>

      {/* Arrow pointing down to the marker. */}
      <View style={styles.arrow} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    alignItems: 'center',
  },
  bubble: {
    backgroundColor: nbColors.white,
    borderWidth: nbBorders.widthBase,
    borderColor: nbColors.black,
    borderRadius: nbRadius.base,
    paddingHorizontal: nbSpacing.sm,
    paddingVertical: nbSpacing.sm,
    minWidth: 180,
    maxWidth: 240,
    ...nbShadows.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: nbSpacing.sm,
  },
  iconChip: {
    width: 36,
    height: 36,
    borderRadius: nbRadius.sm,
    borderWidth: nbBorders.widthThin,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textCol: {
    flex: 1,
    minWidth: 0,
  },
  title: {
    fontWeight: '700',
  },
  presenceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: nbSpacing.xs,
  },
  presenceDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: nbColors.black,
  },
  presenceText: {
    fontWeight: '600',
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 2,
    marginTop: nbSpacing.xs,
    paddingTop: nbSpacing.xs,
    borderTopWidth: nbBorders.widthThin,
    borderTopColor: nbColors.gray300,
  },
  detailText: {
    fontWeight: '700',
  },
  arrow: {
    width: 0,
    height: 0,
    backgroundColor: 'transparent',
    borderStyle: 'solid',
    borderLeftWidth: 7,
    borderRightWidth: 7,
    borderTopWidth: 8,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopColor: nbColors.black,
    marginTop: -1,
  },
});

export default MarkerCalloutCard;
