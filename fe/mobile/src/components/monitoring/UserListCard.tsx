/**
 * UserListCard Component
 * Phase 2D: Individual card (160x80px) in the bottom horizontal strip.
 * Shows status dot, user name, role badge, area, and last update time.
 */

import React, { useMemo } from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import {
  nbColors,
  nbSpacing,
  nbBorders,
  nbRadius,
  nbShadows,
} from '../../constants/nbTokens';
import { NBText } from '../nb/NBText';
import { getActivityColor, getRoleIcon } from '../../utils/mapUtils';
import { userAxes } from '../../utils/statusHelpers';
import { ROLE_LABELS } from '../../constants/roles';
import type { LiveUser, UserRole } from '../../types/models.types';

// ─── Types ────────────────────────────────────────────────────────────────────

interface UserListCardProps {
  user: LiveUser;
  onPress: (user: LiveUser) => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function UserListCard({ user, onPress }: UserListCardProps): React.JSX.Element {
  const { t } = useTranslation('common');

  const getRelativeTime = (isoString: string): string => {
    const diff = Date.now() - new Date(isoString).getTime();
    const seconds = Math.floor(diff / 1000);

    if (seconds < 5) { return t('time.justNow'); }
    if (seconds < 60) { return t('time.secondsAgo', { count: seconds }); }
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) { return t('time.minutesAgoShort', { count: minutes }); }
    const hours = Math.floor(minutes / 60);
    return t('time.hoursAgoShort', { count: hours });
  };

  const statusColor = useMemo(
    () => getActivityColor(userAxes(user).activity),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [user.status, user.activity, user.location, user.is_within_area],
  );
  const roleIcon = useMemo(() => getRoleIcon(user.role), [user.role]);
  const roleLabel = useMemo(
    () => ROLE_LABELS[user.role as UserRole] ?? user.role,
    [user.role],
  );
  const relativeTime = useMemo(
    () => getRelativeTime(user.last_update),
    [user.last_update, t],
  );
  const firstName = useMemo(
    () => user.full_name.split(' ')[0],
    [user.full_name],
  );

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={() => onPress(user)}
      activeOpacity={0.75}
      accessibilityLabel={`${user.full_name}, ${roleLabel}, ${user.area_name}`}
      accessibilityRole="button"
    >
      {/* Header row: status dot + name + time */}
      <View style={styles.header}>
        <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
        <NBText variant="body-sm" style={styles.name} numberOfLines={1}>
          {firstName}
        </NBText>
        <NBText variant="caption" color="gray500" style={styles.time}>
          {relativeTime}
        </NBText>
      </View>

      {/* Role badge */}
      <View style={styles.roleBadge}>
        <MaterialCommunityIcons
          name={roleIcon}
          size={12}
          color={nbColors.gray600}
        />
        <NBText variant="caption" color="gray600" style={styles.roleText} numberOfLines={1}>
          {roleLabel}
        </NBText>
      </View>

      {/* Area */}
      <NBText variant="caption" color="gray500" numberOfLines={1}>
        {user.area_name}
      </NBText>
    </TouchableOpacity>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  card: {
    width: 160,
    height: 80,
    backgroundColor: nbColors.white,
    borderRadius: nbRadius.base,
    borderWidth: nbBorders.widthThin,
    borderColor: nbColors.black,
    padding: nbSpacing.sm,
    justifyContent: 'space-between',
    ...nbShadows.sm,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: nbSpacing.xs,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    flexShrink: 0,
  },
  name: {
    flex: 1,
    color: nbColors.gray800,
  },
  time: {
    flexShrink: 0,
  },
  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  roleText: {
    flex: 1,
  },
});
