/**
 * StatusSummaryBar Component
 * Phase 2D: bar showing the four-status counts as tappable cards.
 * Tapping a card filters the map to show only that status.
 *
 * Phase 4 M3 (CP2): merged the peek status row + the old "Ringkasan" tile grid
 * into this single surface. The statuses render as fixed-size tone-tinted cards
 * (big count + status dot + mono label) in a horizontal scroller — fixed width
 * AND height keep the cards symmetrical regardless of label length, and the
 * scroll content is padded on every side so the hard-edge shadow has room
 * instead of being clipped at the viewport edges. The active card gets a black
 * border + heavier shadow.
 */

import React, { useCallback, useMemo } from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
// react-native-gesture-handler's ScrollView is the correct nested scroller
// inside @gorhom/bottom-sheet — its native gesture handler coordinates with the
// sheet's pan handler so horizontal drags aren't swallowed by the sheet's
// vertical pan or the parent BottomSheetFlatList hosting this bar.
import { ScrollView } from 'react-native-gesture-handler';
import { NBText } from '../nb/NBText';
import { nbColors, nbSpacing, nbBorders, nbRadius, nbShadows } from '../../constants/nbTokens';
import { userAxes, presenceActivityPill } from '../../utils/statusHelpers';
import { getActivityColor } from '../../utils/mapUtils';
import type { LiveUser, PresenceActivity } from '../../types/models.types';

// ─── Types ────────────────────────────────────────────────────────────────────

interface ActivityBucket {
  total: number;
  dalam: number;
  luar: number;
}

interface StatusSummaryBarProps {
  liveUsers: LiveUser[];
  /** Active ACTIVITY filter (CP6) — location is filtered via the wrench, not here. */
  activeActivity: PresenceActivity | null;
  onActivityChange: (activity: PresenceActivity | null) => void;
}

// ─── Constants ────────────────────────────────────────────────────────────────

// Presence model: two chips only — Aktif and Tidak aktif (idle/missing/offline
// folded together). 'idle' is the display bucket for all non-aktif workers.
const DISPLAYED_ACTIVITIES: PresenceActivity[] = ['aktif', 'idle'];

const ACTIVITY_BG: Record<string, string> = {
  aktif: nbColors.statusActiveBg,
  idle: nbColors.statusIdleBg,
  missing: nbColors.statusMissingBg,
};

// Text color on the SELECTED (solid-fill) chip — WCAG AA on each accent.
// Idle/amber (#D97706) is too light for white, so it gets black.
const ACTIVITY_SELECTED_ON: Record<string, 'white' | 'black'> = {
  aktif: 'white',
  idle: 'black',
  missing: 'white',
};

// ─── Component ────────────────────────────────────────────────────────────────

export function StatusSummaryBar({
  liveUsers,
  activeActivity,
  onActivityChange,
}: StatusSummaryBarProps): React.JSX.Element {
  // Tally the activity buckets + their dalam/luar split, from the live roster.
  const buckets = useMemo(() => {
    const acc: Record<PresenceActivity, ActivityBucket> = {
      aktif: { total: 0, dalam: 0, luar: 0 },
      idle: { total: 0, dalam: 0, luar: 0 },
      missing: { total: 0, dalam: 0, luar: 0 },
      offline: { total: 0, dalam: 0, luar: 0 },
    };
    for (const u of liveUsers) {
      // Ad-hoc / off-schedule workers are shown on the map but not counted here.
      if (u.is_scheduled === false) { continue; }
      const { activity, location } = userAxes(u);
      // Offline = no active shift (not on the map); the rest fold into aktif or
      // the single "tidak aktif" (idle) bucket (idle + missing).
      if (activity === 'offline') { continue; }
      const b = acc[activity === 'aktif' ? 'aktif' : 'idle'];
      b.total += 1;
      if (location === 'dalam_area') { b.dalam += 1; }
      else if (location === 'luar_area') { b.luar += 1; }
    }
    return acc;
  }, [liveUsers]);

  const handleChipPress = useCallback(
    (activity: PresenceActivity) => {
      onActivityChange(activeActivity === activity ? null : activity);
    },
    [activeActivity, onActivityChange],
  );

  return (
    <View style={styles.container}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        nestedScrollEnabled
      >
        {DISPLAYED_ACTIVITIES.map(activity => (
          <ActivityChip
            key={activity}
            activity={activity}
            bucket={buckets[activity]}
            isActive={activeActivity === activity}
            onPress={handleChipPress}
          />
        ))}
      </ScrollView>
    </View>
  );
}

// ─── ActivityChip sub-component ───────────────────────────────────────────────

interface ActivityChipProps {
  activity: PresenceActivity;
  bucket: ActivityBucket;
  isActive: boolean;
  onPress: (activity: PresenceActivity) => void;
}

function ActivityChip({ activity, bucket, isActive, onPress }: ActivityChipProps): React.JSX.Element {
  const { t } = useTranslation();
  const { label } = presenceActivityPill(activity);
  const accent = getActivityColor(activity);
  // Missing has no usable fix → no dalam/luar split line.
  const hasLocation = activity !== 'missing';

  // Selected = solid accent fill + contrasting text; unselected = tinted bg.
  const onKey = ACTIVITY_SELECTED_ON[activity];
  const onColor = onKey === 'white' ? nbColors.white : nbColors.black;

  const withinLabel = t('common:ui.withinArea');
  const outsideLabel = t('common:ui.outsideArea');

  return (
    <TouchableOpacity
      onPress={() => onPress(activity)}
      activeOpacity={0.75}
      accessibilityLabel={`Filter ${label}: ${bucket.total}${hasLocation ? `, ${bucket.dalam} ${withinLabel}, ${bucket.luar} ${outsideLabel}` : ''}`}
      accessibilityRole="button"
      accessibilityState={{ selected: isActive }}
      testID={`activity-chip-${activity}`}
    >
      <View
        style={[
          styles.chip,
          isActive
            ? { backgroundColor: accent, borderColor: nbColors.black }
            : { backgroundColor: ACTIVITY_BG[activity], borderColor: accent },
          isActive && styles.chipActive,
        ]}
      >
        <View style={styles.chipTop}>
          <View style={[styles.dot, { backgroundColor: isActive ? onColor : accent }]} />
          <NBText variant="h3" color={isActive ? onKey : 'black'}>{bucket.total}</NBText>
          <NBText
            variant="mono-sm"
            uppercase
            color={isActive ? onKey : 'gray700'}
            style={styles.chipLabel}
          >
            {label}
          </NBText>
        </View>
        {hasLocation ? (
          <NBText
            variant="caption"
            color={isActive ? onKey : 'gray600'}
            style={styles.chipSplit}
          >
            {`${bucket.dalam} ${withinLabel} · ${bucket.luar} ${outsideLabel}`}
          </NBText>
        ) : (
          // Missing has no dalam/luar — keep an invisible spacer so all three
          // chips share the same height and the activity row stays aligned.
          <NBText variant="caption" style={[styles.chipSplit, styles.chipSplitSpacer]}>
            —
          </NBText>
        )}
      </View>
    </TouchableOpacity>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    backgroundColor: nbColors.white,
    borderBottomWidth: nbBorders.widthThin,
    borderBottomColor: nbColors.gray300,
  },
  scrollContent: {
    paddingHorizontal: nbSpacing.md,
    paddingVertical: nbSpacing.sm,
    gap: nbSpacing.sm,
  },
  // Auto-width 2-line card: [dot count label] on top, "X dalam · Y luar" below.
  chip: {
    alignItems: 'flex-start',
    gap: 2,
    paddingHorizontal: nbSpacing.md,
    paddingVertical: nbSpacing.sm,
    borderWidth: nbBorders.widthBase,
    borderRadius: nbRadius.base,
    ...nbShadows.xs,
  },
  chipTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: nbSpacing.xs,
  },
  // Active filter: black ring + heavier hard-edge shadow over the tone fill.
  chipActive: {
    borderColor: nbColors.black,
    ...nbShadows.sm,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: nbColors.black,
  },
  chipLabel: {
    fontSize: 10,
    letterSpacing: 0.3,
  },
  chipSplit: {
    fontSize: 10,
  },
  chipSplitSpacer: {
    opacity: 0,
  },
});
