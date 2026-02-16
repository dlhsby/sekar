/**
 * Field Home Header
 * Custom navigation header showing greeting, dynamic role badge, and online status
 * Phase 2C: replaces WorkerHomeHeader with dynamic role label
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { useAppSelector } from '../../store/store';
import { selectTotalPendingCount } from '../../store/slices/offlineSlice';
import { NBBadge } from '../nb';
import { nbColors, nbTypography, nbSpacing, nbBorders, nbShadows, withAlpha } from '../../constants/nbTokens';
import { ROLE_LABELS } from '../../constants/roles';

export const FieldHomeHeader: React.FC = () => {
  const { user } = useAppSelector((state) => state.auth);
  const { isOnline, isSyncing } = useAppSelector((state) => state.offline);
  const pendingCount = useAppSelector(selectTotalPendingCount);
  const roleLabel = user?.role ? ROLE_LABELS[user.role] : 'User';

  return (
    <View style={styles.container}>
      <View style={styles.iconContainer}>
        <MaterialCommunityIcons name="leaf" size={24} color={nbColors.white} />
      </View>

      <View style={styles.center}>
        <Text style={styles.greeting} numberOfLines={1} ellipsizeMode="tail">
          Halo, {user?.full_name}!
        </Text>
        <NBBadge text={roleLabel} color="success" size="sm" />
      </View>

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
    paddingHorizontal: nbSpacing.sm,
    paddingVertical: 6,
    width: '100%',
    gap: nbSpacing.xs,
    height: 56,
  },
  iconContainer: {
    width: 40,
    height: 40,
    backgroundColor: nbColors.primary,
    borderWidth: nbBorders.base,
    borderColor: nbColors.black,
    borderRadius: 0,
    justifyContent: 'center',
    alignItems: 'center',
    ...nbShadows.sm,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: nbSpacing.xs,
  },
  greeting: {
    fontSize: nbTypography.fontSize.base,
    fontWeight: nbTypography.fontWeight.extrabold,
    color: nbColors.black,
    marginBottom: 2,
  },
  right: {
    justifyContent: 'center',
    alignItems: 'flex-end',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 6,
    paddingVertical: 4,
    borderWidth: 2,
    borderColor: nbColors.black,
    borderRadius: 0,
    backgroundColor: nbColors.white,
    minWidth: 60,
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
    fontSize: 10,
    fontWeight: nbTypography.fontWeight.bold,
    color: nbColors.black,
    textTransform: 'uppercase',
  },
});
