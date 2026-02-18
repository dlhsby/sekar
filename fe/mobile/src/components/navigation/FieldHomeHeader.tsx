/**
 * Field Home Header
 * Unified 3-column navigation header for all screens.
 *
 * Main screens (no `onBack` prop):  [leaf icon 40×40]   | [Halo, name! + role badge] | [online status]
 * Sub screens (with `onBack`):      [back arrow 44×44]  | [page title 18px]          | [online status]
 *
 * All sub-screens must supply onBack — there is no spacer case.
 * Phase 2C: replaces WorkerHomeHeader and is the standard for all screens.
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { useAppSelector } from '../../store/store';
import { selectTotalPendingCount } from '../../store/slices/offlineSlice';
import { NBBadge } from '../nb';
import { nbColors, nbTypography, nbSpacing, nbBorders, nbShadows, withAlpha } from '../../constants/nbTokens';
import { ROLE_LABELS } from '../../constants/roles';

interface FieldHomeHeaderProps {
  /** When provided: back arrow is shown; otherwise leaf icon */
  onBack?: () => void;
  /** When provided: shown as page title; otherwise greeting + role badge are shown */
  title?: string;
}

export const FieldHomeHeader: React.FC<FieldHomeHeaderProps> = ({ onBack, title }) => {
  const { user } = useAppSelector((state) => state.auth);
  const { isOnline, isSyncing } = useAppSelector((state) => state.offline);
  const pendingCount = useAppSelector(selectTotalPendingCount);
  const roleLabel = user?.role ? ROLE_LABELS[user.role] : 'User';

  return (
    <View style={styles.container}>
      {/* Left column — 2 cases:
          - onBack provided: back arrow 44×44 WCAG touch target
          - no onBack:       leaf icon 40×40 (main tab screens)
          All sub-screens must supply onBack; there is no spacer case. */}
      {onBack ? (
        <TouchableOpacity
          onPress={onBack}
          style={styles.backButton}
          accessibilityLabel="Kembali"
          accessibilityRole="button"
        >
          <MaterialCommunityIcons name="arrow-left" size={24} color={nbColors.black} />
        </TouchableOpacity>
      ) : (
        <View style={styles.iconContainer}>
          <MaterialCommunityIcons name="leaf" size={24} color={nbColors.white} />
        </View>
      )}

      {/* Center column — page title (sub screens) or greeting + role badge (main screens) */}
      <View style={styles.center}>
        {title ? (
          <Text style={styles.pageTitle} numberOfLines={1} ellipsizeMode="tail">
            {title}
          </Text>
        ) : (
          <>
            <Text style={styles.greeting} numberOfLines={1} ellipsizeMode="tail">
              Halo, {user?.full_name}!
            </Text>
            <NBBadge text={roleLabel} color="success" size="sm" />
          </>
        )}
      </View>

      {/* Right column — always present: online / syncing / pending status */}
      <View style={styles.right}>
        {isSyncing ? (
          <View style={[styles.statusBadge, styles.syncingBadge]}>
            <View style={styles.syncingDot} />
            <Text style={styles.statusBadgeText}>Syncing</Text>
          </View>
        ) : pendingCount > 0 ? (
          <View style={[styles.statusBadge, styles.pendingBadge]}>
            <View style={styles.pendingDot} />
            <Text style={styles.statusBadgeText}>{pendingCount}</Text>
          </View>
        ) : (
          <View style={[styles.statusBadge, isOnline ? styles.onlineBadge : styles.offlineBadge]}>
            <View style={[styles.statusDot, isOnline ? styles.online : styles.offline]} />
            <Text style={styles.statusBadgeText}>{isOnline ? 'Online' : 'Offline'}</Text>
          </View>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: nbSpacing.md,
    paddingVertical: 6,
    // Use alignSelf + flex:1 instead of width:'100%' so it fills whatever
    // absolute-positioned container React Navigation gives us.
    flex: 1,
    alignSelf: 'stretch',
    height: 56,
  },
  /* Left column — leaf icon (main screens) */
  iconContainer: {
    width: 40,
    height: 40,
    backgroundColor: nbColors.primary,
    borderWidth: nbBorders.base,
    borderColor: nbColors.black,
    borderRadius: 0,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: nbSpacing.sm,  // 8px gap after left slot
    ...nbShadows.sm,
  },
  /* Left column — back arrow button (sub-screens with back, 44×44 WCAG)
     alignItems: 'flex-start' → arrow icon starts at 16px from screen edge (same as leaf box).
     marginRight: xs (4px) so total left-slot width = 44+4 = 48px = leaf's 40+8 = 48px,
     keeping the center text at the same x-position on every screen. */
  backButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'flex-start',
    marginRight: nbSpacing.xs,  // 4px (leaf uses 8px, but 44+4 = 40+8 = 48px total)
  },
  /* Center column */
  center: {
    flex: 1,
    justifyContent: 'center',
    marginRight: nbSpacing.xs,  // 4px gap before right slot
  },
  greeting: {
    fontSize: nbTypography.fontSize.base,
    fontWeight: nbTypography.fontWeight.extrabold,
    color: nbColors.black,
    marginBottom: 2,
  },
  pageTitle: {
    fontSize: nbTypography.fontSize.lg,    // 18px (was xl=20px) — better overflow protection
    fontWeight: nbTypography.fontWeight.extrabold,
    color: nbColors.black,
    textAlign: 'left',
  },
  /* Right column */
  right: {
    justifyContent: 'center',
    alignItems: 'flex-end',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,    // was 6 — improves readability
    paddingVertical: 4,
    borderWidth: 2,
    borderColor: nbColors.black,
    borderRadius: 0,
    backgroundColor: nbColors.white,
    minWidth: 64,             // was 60
  },
  onlineBadge: {
    backgroundColor: withAlpha(nbColors.success, 0.12),
    borderColor: nbColors.success,
  },
  offlineBadge: {
    backgroundColor: withAlpha(nbColors.danger, 0.12),
    borderColor: nbColors.danger,
  },
  pendingBadge: {
    backgroundColor: withAlpha(nbColors.warning, 0.12),
    borderColor: nbColors.warning,
  },
  syncingBadge: {
    backgroundColor: nbColors.white,
    borderColor: nbColors.black,
  },
  statusDot: { width: 8, height: 8, borderRadius: 0 },
  online: { backgroundColor: nbColors.success },
  offline: { backgroundColor: nbColors.danger },
  syncingDot: { width: 8, height: 8, borderRadius: 0, backgroundColor: nbColors.accentSky },
  pendingDot: { width: 8, height: 8, borderRadius: 0, backgroundColor: nbColors.warning },
  statusBadgeText: {
    fontSize: 11,             // was 10 — WCAG minimum for bold text
    fontWeight: nbTypography.fontWeight.bold,
    color: nbColors.black,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
});
