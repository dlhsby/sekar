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
import { useNavigation } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { useAppSelector } from '../../store/store';
import { selectTotalPendingCount } from '../../store/slices/offlineSlice';
import { NBText } from '../nb/NBText';
import { RoleAvatar } from '../common/RoleAvatar';
import {
  nbColors,
  nbSpacing,
  nbBorders,
  nbRadius,
  withAlpha,
} from '../../constants/nbTokens';
import { ROLE_LABELS } from '../../constants/roles';
import { NotificationBell } from './NotificationBell';

interface FieldHomeHeaderProps {
  /** When provided: back arrow is shown; otherwise role avatar */
  onBack?: () => void;
  /** When provided: shown as page title; otherwise role label + name are shown */
  title?: string;
}

export const FieldHomeHeader: React.FC<FieldHomeHeaderProps> = ({ onBack, title }) => {
  const { t } = useTranslation();
  const { user, assignedArea } = useAppSelector((state) => state.auth);
  const { isOnline, isSyncing } = useAppSelector((state) => state.offline);
  const pendingCount = useAppSelector(selectTotalPendingCount);
  const navigation = useNavigation<any>();

  const roleLabel = user?.role ? ROLE_LABELS[user.role] : t('common:ui.defaultUser');
  const displayName = user?.full_name ?? t('common:ui.defaultUser');
  const areaSuffix = assignedArea?.name ? ` · ${assignedArea.name}` : '';

  return (
    <View style={styles.container}>
      {/* Left column — back arrow (sub-screens) or role avatar (main screens).
          All sub-screens must supply onBack; there is no spacer case. */}
      {onBack ? (
        <TouchableOpacity
          onPress={onBack}
          style={styles.backButton}
          accessibilityLabel={t('common:actions.back')}
          accessibilityRole="button"
        >
          <MaterialCommunityIcons name="arrow-left" size={24} color={nbColors.black} />
        </TouchableOpacity>
      ) : (
        <TouchableOpacity
          onPress={() => navigation.navigate('Profile')}
          style={styles.avatarSpacing}
          accessibilityLabel={t('common:ui.openProfile')}
          accessibilityRole="button"
          activeOpacity={0.7}
        >
          <RoleAvatar
            name={user?.full_name}
            role={user?.role}
            photoUrl={user?.profile_picture_url}
            size={40}
            radius={nbRadius.base}
            withShadow
          />
        </TouchableOpacity>
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

      {/* Right column — online/syncing/pending status (left) + bell (rightmost).
          The status chip sits to the LEFT of the notification bell. The bell is
          hidden on sub-screens (when onBack is provided) to keep the right slot
          from overflowing on small devices and because notifications are
          reachable from the main-tab headers anyway. */}
      <View style={styles.right}>
        {isSyncing ? (
          <View style={[styles.statusBadge, styles.syncingBadge]}>
            <View style={styles.syncingDot} />
            <Text style={styles.statusBadgeText}>{t('status:presence.syncing')}</Text>
          </View>
        ) : pendingCount > 0 ? (
          <View style={[styles.statusBadge, styles.pendingBadge]}>
            <View style={styles.pendingDot} />
            <Text style={styles.statusBadgeText}>{pendingCount}</Text>
          </View>
        ) : (
          <View style={[styles.statusBadge, isOnline ? styles.onlineBadge : styles.offlineBadge]}>
            <View style={[styles.statusDot, isOnline ? styles.online : styles.offline]} />
            <Text style={styles.statusBadgeText}>{isOnline ? t('status:presence.online') : t('status:presence.offline')}</Text>
          </View>
        )}
        {!onBack ? <NotificationBell /> : null}
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
  /* Left column — role avatar (main screens). 40×40 + 8px gap = 48px total,
     matching the back button's 44+4 so the center text holds its x. Visuals +
     a11y + profile-photo fallback live in the shared `RoleAvatar` primitive. */
  avatarSpacing: { marginRight: nbSpacing.sm },
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
    // Smaller than the mono-sm default (12) so the role + assigned-area suffix
    // fits the narrow masthead slot before it ellipsizes (one-off; no 10px token).
    fontSize: 10,
    lineHeight: 13,
    letterSpacing: 0.5,
    marginBottom: 1,
  },
  name: {
    // Smaller than the h3 default (18) so longer names show in full on one line
    // before tail-ellipsis kicks in (one-off; family/weight kept from h3).
    fontSize: 15,
    lineHeight: 19,
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
  syncingDot: { width: 8, height: 8, borderRadius: nbRadius.full, backgroundColor: nbColors.info },
  pendingDot: { width: 8, height: 8, borderRadius: nbRadius.full, backgroundColor: nbColors.warning },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: nbColors.black,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
});
