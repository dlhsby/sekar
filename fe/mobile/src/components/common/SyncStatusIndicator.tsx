import React from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
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
  // Determine descriptive accessibility label based on state
  const getAccessibilityLabel = () => {
    if (isSyncing) {
      return 'Menyinkronkan data';
    }
    if (!isOnline) {
      return pendingCount > 0
        ? `Mode luring. ${pendingCount} item menunggu sinkronisasi`
        : 'Mode luring';
    }
    return 'Daring dan tersambung';
  };

  if (isSyncing) {
    return (
      <View
        style={styles.container}
        accessibilityLiveRegion="polite"
        accessibilityLabel={getAccessibilityLabel()}
      >
        <ActivityIndicator size="small" color={theme.colors.warning} />
        <Text style={styles.text}>Menyinkronkan...</Text>
      </View>
    );
  }

  if (!isOnline) {
    return (
      <View
        style={styles.container}
        accessibilityLiveRegion="polite"
        accessibilityLabel={getAccessibilityLabel()}
      >
        <MaterialCommunityIcons
          name="cloud-off-outline"
          size={16}
          color={theme.colors.error}
          style={styles.icon}
        />
        <View style={[styles.dot, styles.dotOffline]} />
        <Text style={styles.text}>
          Luring{pendingCount > 0 ? ` (${pendingCount})` : ''}
        </Text>
      </View>
    );
  }

  return (
    <View
      style={styles.container}
      accessibilityLiveRegion="polite"
      accessibilityLabel={getAccessibilityLabel()}
    >
      <MaterialCommunityIcons
        name="check-circle-outline"
        size={16}
        color={theme.colors.success}
        style={styles.icon}
      />
      <View style={[styles.dot, styles.dotOnline]} />
      <Text style={styles.text}>Daring</Text>
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
  icon: {
    marginRight: theme.spacing.xs / 2,
  },
  dot: {
    width: 12, // Increased from 8 to 12dp for better visibility
    height: 12,
    borderRadius: 6,
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
