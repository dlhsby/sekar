import React from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { theme } from '../../constants/theme';

interface SyncStatusIndicatorProps {
  isOnline: boolean;
  isSyncing: boolean;
  pendingCount?: number;
}

/**
 * Status indicator showing online/offline/syncing state with pending count
 */
export function SyncStatusIndicator({
  isOnline,
  isSyncing,
  pendingCount = 0,
}: SyncStatusIndicatorProps): JSX.Element {
  if (isSyncing) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="small" color={theme.colors.warning} />
        <Text style={styles.text}>Syncing...</Text>
      </View>
    );
  }

  if (!isOnline) {
    return (
      <View style={styles.container}>
        <View style={[styles.dot, styles.dotOffline]} />
        <Text style={styles.text}>
          Offline{pendingCount > 0 ? ` (${pendingCount})` : ''}
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={[styles.dot, styles.dotOnline]} />
      <Text style={styles.text}>Online</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: theme.spacing.xs,
  },
  dotOnline: {
    backgroundColor: theme.colors.success,
  },
  dotOffline: {
    backgroundColor: theme.colors.error,
  },
  text: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.textSecondary,
  },
});

export default SyncStatusIndicator;
