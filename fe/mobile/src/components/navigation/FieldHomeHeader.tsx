/**
 * Field Home Header
 * Unified 3-column navigation header for all screens.
 *
 * Main screens (no `onBack` prop):  [role avatar 40×40] | [ROLE LABEL + name]  | [bell + online status]
 * Sub screens (with `onBack`):      [back arrow 44×44]  | [page title 18px]     | [online status]
 *
 * All sub-screens must supply onBack — there is no spacer case.
 * Phase 4 M3 (Home revamp): the leaf icon became a role-colored avatar and the
 * greeting became a mono role label above the display name (hi-fi HOME-1/2/3
 * masthead). The online/offline + sync/pending status chip is retained — it has
 * no hi-fi equivalent but is load-bearing for offline UX.
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { useAppSelector } from '../../store/store';
import { selectTotalPendingCount } from '../../store/slices/offlineSlice';
import { NBText } from '../nb/NBText';
import {
  nbColors,
  nbSpacing,
  nbBorders,
  nbRadius,
  nbShadows,
  withAlpha,
} from '../../constants/nbTokens';
import { ROLE_LABELS } from '../../constants/roles';
import type { UserRole } from '../../types/models.types';
import { NotificationBell } from './NotificationBell';

interface FieldHomeHeaderProps {
  /** When provided: back arrow is shown; otherwise role avatar */
  onBack?: () => void;
  /** When provided: shown as page title; otherwise role label + name are shown */
  title?: string;
}

/** Role → avatar accent token. Falls back to primary for unknown/undefined roles. */
const ROLE_AVATAR_COLOR: Record<UserRole, string> = {
  satgas: nbColors.roleSatgas,
  linmas: nbColors.roleLinmas,
  korlap: nbColors.roleKorlap,
  admin_data: nbColors.roleAdminData,
  kepala_rayon: nbColors.roleKepala,
  top_management: nbColors.roleTop,
  admin_system: nbColors.roleAdminSys,
  superadmin: nbColors.roleSuperadmin,
  staff_kecamatan: nbColors.roleKecamatan,
};

/** First + last initial from a full name, e.g. "Budi Santoso" → "BS". */
function getInitials(name?: string): string {
  if (!name) {
    return '?';
  }
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) {
    return '?';
  }
  const first = parts[0][0] ?? '';
  const last = parts.length > 1 ? parts[parts.length - 1][0] : '';
  return (first + last).toUpperCase();
}

export const FieldHomeHeader: React.FC<FieldHomeHeaderProps> = ({ onBack, title }) => {
  const { user, assignedArea } = useAppSelector((state) => state.auth);
  const { isOnline, isSyncing } = useAppSelector((state) => state.offline);
  const pendingCount = useAppSelector(selectTotalPendingCount);

  const roleLabel = user?.role ? ROLE_LABELS[user.role] : 'User';
  const roleColor = user?.role ? ROLE_AVATAR_COLOR[user.role] : nbColors.primary;
  const displayName = user?.full_name ?? 'Pengguna';
  const areaSuffix = assignedArea?.name ? ` · ${assignedArea.name}` : '';

  return (
    <View style={styles.container}>
      {/* Left column — back arrow (sub-screens) or role avatar (main screens).
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
        <View
          style={[
            styles.avatar,
            { backgroundColor: withAlpha(roleColor, 0.22), borderColor: roleColor },
          ]}
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
        >
          <NBText variant="mono-sm" color="black" style={styles.avatarText}>
            {getInitials(user?.full_name)}
          </NBText>
        </View>
      )}

      {/* Center column — page title (sub screens) or role label + name (main screens) */}
      <View style={styles.center}>
        {title ? (
          <Text style={styles.pageTitle} numberOfLines={1} ellipsizeMode="tail">
            {title}
          </Text>
        ) : (
          <>
            <NBText
              variant="mono-sm"
              color="gray600"
              uppercase
              numberOfLines={1}
              ellipsizeMode="tail"
              style={styles.roleLabel}
            >
              {roleLabel}{areaSuffix}
            </NBText>
            <NBText
              variant="h3"
              color="black"
              numberOfLines={1}
              ellipsizeMode="tail"
              style={styles.name}
            >
              {displayName}
            </NBText>
          </>
        )}
      </View>

      {/* Right column — bell + online/syncing/pending status. The bell is
          hidden on sub-screens (when onBack is provided) to keep the right
          slot from overflowing on small devices and because notifications
          are reachable from the main-tab headers anyway. */}
      <View style={styles.right}>
        {!onBack ? <NotificationBell /> : null}
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
  /* Left column — role-colored avatar (main screens). 40×40 + 8px gap = 48px
     total, matching the back button's 44+4 so the center text holds its x. */
  avatar: {
    width: 40,
    height: 40,
    borderWidth: nbBorders.widthBase,
    borderRadius: nbRadius.base,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: nbSpacing.sm,
    ...nbShadows.xs,
  },
  avatarText: {
    fontSize: 15,
    fontWeight: '700',
  },
  /* Left column — back arrow button (sub-screens with back, 44×44 WCAG).
     alignItems: 'flex-start' → arrow icon starts at 16px from screen edge.
     marginRight: xs so total left-slot width = 44+4 = 40+8 = 48px. */
  backButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'flex-start',
    marginRight: nbSpacing.xs,
  },
  /* Center column */
  center: {
    flex: 1,
    justifyContent: 'center',
    marginRight: nbSpacing.xs,
  },
  roleLabel: {
    letterSpacing: 0.6,
    marginBottom: 1,
  },
  name: {
    // size/weight from NBText variant="h3"
  },
  pageTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: nbColors.black,
    textAlign: 'left',
  },
  /* Right column — bell + status badge laid out horizontally. */
  right: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 4,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderWidth: nbBorders.widthBase,
    borderColor: nbColors.black,
    borderRadius: nbRadius.sm,
    backgroundColor: nbColors.white,
    minWidth: 64,
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
  statusDot: { width: 8, height: 8, borderRadius: nbRadius.full },
  online: { backgroundColor: nbColors.success },
  offline: { backgroundColor: nbColors.danger },
  syncingDot: { width: 8, height: 8, borderRadius: nbRadius.full, backgroundColor: nbColors.accentSky },
  pendingDot: { width: 8, height: 8, borderRadius: nbRadius.full, backgroundColor: nbColors.warning },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: nbColors.black,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
});
