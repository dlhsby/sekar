/**
 * Worker Home Header
 * Custom navigation header showing greeting, role badge and online status
 * Replaces the "Home" title in navigation
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { useAppSelector } from '../../store/store';
import { NBBadge } from '../nb';
import { nbColors, nbTypography, nbSpacing, nbBorders, nbShadows } from '../../constants/nbTokens';

export const WorkerHomeHeader: React.FC = () => {
  const { user } = useAppSelector((state) => state.auth);
  const { isOnline, isSyncing, pendingCount } = useAppSelector((state) => state.offline);

  return (
    <View style={styles.container}>
      {/* Left: Icon */}
      <View style={styles.iconContainer}>
        <MaterialCommunityIcons
          name="leaf"
          size={24}
          color={nbColors.white}
        />
      </View>

      {/* Center: Greeting + Badge */}
      <View style={styles.center}>
        <Text style={styles.greeting} numberOfLines={1} ellipsizeMode="tail">
          Halo, {user?.full_name}! 👋
        </Text>
        <NBBadge
          text="Pekerja"
          color="success"
          size="sm"
        />
      </View>

      {/* Right: Status Badge (vertically centered) */}
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
    paddingHorizontal: nbSpacing.sm, // 8px horizontal padding
    paddingVertical: 6, // 6px vertical padding for tighter fit
    width: '100%',
    gap: nbSpacing.xs, // 4px gap
    height: 56, // Reduced height for proportional balance
  },
  // Left: Icon
  iconContainer: {
    width: 40,
    height: 40,
    backgroundColor: nbColors.primary,
    borderWidth: nbBorders.default, // 3px
    borderColor: nbColors.black,
    borderRadius: 0, // Sharp corners
    justifyContent: 'center',
    alignItems: 'center',
    ...nbShadows.sm, // Smaller shadow for proportional balance
  },
  // Center: Greeting + Badge
  center: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: nbSpacing.xs, // 4px spacing from icon
  },
  greeting: {
    fontSize: nbTypography.fontSize.base, // 16px - proportional to reduced header
    fontWeight: nbTypography.fontWeight.extrabold,
    color: nbColors.black,
    marginBottom: 2, // Minimal margin
    numberOfLines: 1, // Force single line
  },
  // Right: Status Badge
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
    borderWidth: 2, // Thinner border
    borderColor: nbColors.black,
    borderRadius: 0, // Sharp corners
    backgroundColor: nbColors.white,
    minWidth: 60, // Ensure minimum width
  },
  onlineBadge: {
    backgroundColor: nbColors.success + '20', // Translucent green
    borderColor: nbColors.success,
  },
  offlineBadge: {
    backgroundColor: nbColors.danger + '20', // Translucent red
    borderColor: nbColors.danger,
  },
  pendingBadge: {
    backgroundColor: nbColors.warning + '20', // Translucent yellow
    borderColor: nbColors.warning,
  },
  syncingBadge: {
    backgroundColor: nbColors.white,
    borderColor: nbColors.black,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 0, // Square dots
  },
  online: {
    backgroundColor: nbColors.success,
  },
  offline: {
    backgroundColor: nbColors.danger,
  },
  syncingDot: {
    width: 8,
    height: 8,
    borderRadius: 0,
    backgroundColor: nbColors.accentSky, // Blue for syncing
  },
  pendingDot: {
    width: 8,
    height: 8,
    borderRadius: 0,
    backgroundColor: nbColors.warning,
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: nbTypography.fontWeight.bold,
    color: nbColors.black,
    textTransform: 'uppercase',
  },
});
