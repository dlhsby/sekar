/**
 * ListItemCard — the standardized list-row card used across Tugas / Aktivitas /
 * Lembur (and the Home "hari ini" sheets + Shift history). Gives every list a
 * consistent anatomy so the user always finds the same thing in the same place:
 *
 *   ┌────────────────────────────────────┐
 *   │ ● STATUS              21 Mei · 08:00 │  row 1: dotted status pill + right date
 *   │ Title                                │  row 2: title
 *   │ Description (max 2 lines)            │  row 3: description (optional)
 *   │ 📍 Area   ⏱ Durasi   📷 2 foto       │  row 4: meta chips (optional)
 *   │ 👤 role · Nama                       │  row 5: creator (optional)
 *   └────────────────────────────────────┘
 */

import React from 'react';
import { TouchableOpacity, View, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { NBText } from '../nb';
import { StatusPill, type StatusTone } from '../home/StatusPill';
import { nbColors, nbSpacing, nbBorders, nbRadius, nbShadows } from '../../constants/nbTokens';

export interface ListItemMeta {
  /** MaterialCommunityIcons name. */
  icon: string;
  label: string;
}

export interface ListItemCardProps {
  statusTone: StatusTone;
  statusLabel: string;
  /** Top-right text — by convention the created date · time. */
  rightText?: string;
  /** Optional extra chip rendered right after the status pill (e.g. a tag flag). */
  extraTag?: React.ReactNode;
  title: string;
  titleLines?: number;
  description?: string;
  meta?: ListItemMeta[];
  /** Creator line, e.g. "korlap · Budi S.". */
  creatorText?: string;
  onPress: () => void;
  /** Extra container style — list screens pass a bottom margin for row spacing. */
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
  testID?: string;
}

export const ListItemCard = React.memo(function ListItemCard({
  statusTone,
  statusLabel,
  rightText,
  extraTag,
  title,
  titleLines = 2,
  description,
  meta,
  creatorText,
  onPress,
  style,
  accessibilityLabel,
  testID,
}: ListItemCardProps): React.JSX.Element {
  return (
    <TouchableOpacity
      style={[styles.card, style]}
      onPress={onPress}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      testID={testID}
    >
      {/* Row 1: status pill (+ optional tag) | created date */}
      <View style={styles.topRow}>
        <View style={styles.topLeft}>
          <StatusPill dot tone={statusTone} label={statusLabel} />
          {extraTag}
        </View>
        {rightText ? (
          <NBText variant="mono-sm" color="gray500" numberOfLines={1} style={styles.rightText}>
            {rightText}
          </NBText>
        ) : null}
      </View>

      {/* Row 2: title */}
      <NBText variant="body" color="black" numberOfLines={titleLines} style={styles.title}>
        {title}
      </NBText>

      {/* Row 3: description */}
      {description ? (
        <NBText variant="body-sm" color="gray600" numberOfLines={2} style={styles.description}>
          {description}
        </NBText>
      ) : null}

      {/* Row 4: meta chips */}
      {meta && meta.length > 0 ? (
        <View style={styles.metaRow}>
          {meta.map((m, i) => (
            <View key={`${m.icon}-${i}`} style={styles.metaChip}>
              <MaterialCommunityIcons name={m.icon} size={12} color={nbColors.gray500} />
              <NBText variant="caption" color="gray500" style={styles.metaLabel}>{m.label}</NBText>
            </View>
          ))}
        </View>
      ) : null}

      {/* Row 5: creator */}
      {creatorText ? (
        <View style={styles.creatorRow}>
          <MaterialCommunityIcons name="account-outline" size={12} color={nbColors.gray500} />
          <NBText variant="caption" color="gray500" style={styles.metaLabel}>{creatorText}</NBText>
        </View>
      ) : null}
    </TouchableOpacity>
  );
});

const styles = StyleSheet.create({
  card: {
    backgroundColor: nbColors.white,
    borderWidth: nbBorders.widthBase,
    borderColor: nbColors.black,
    borderRadius: nbRadius.base,
    paddingHorizontal: nbSpacing.md,
    paddingVertical: nbSpacing.sm,
    ...nbShadows.sm,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: nbSpacing.sm,
    marginBottom: nbSpacing.xs,
  },
  topLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: nbSpacing.xs,
    flexShrink: 1,
  },
  rightText: {
    fontSize: 10,
  },
  title: {
    fontWeight: '700',
  },
  description: {
    marginTop: 2,
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: nbSpacing.sm,
    marginTop: nbSpacing.xs,
  },
  metaChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  metaLabel: {},
  creatorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    marginTop: nbSpacing.xs,
  },
});

export default ListItemCard;
