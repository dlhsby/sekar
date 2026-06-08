/**
 * SyncStatusCard Component
 * Displays sync status and provides sync actions
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import {
  nbColors,
  nbType,
  nbSpacing,
  nbRadius,
  nbShadows,
  nbBorders,
} from '../../constants/nbTokens';
import { NBCard, NBButton } from '../nb';

export interface SyncStatus {
  pendingCount: number;
  failedCount: number;
}

interface SyncStatusCardProps {
  syncStatus: SyncStatus;
  isSyncing: boolean;
  onSyncNow: () => void;
  onRetryFailed: () => void;
  onClearFailed: () => void;
  testID?: string;
}

/**
 * SyncStatusCard Component
 */
export const SyncStatusCard: React.FC<SyncStatusCardProps> = ({
  syncStatus,
  isSyncing,
  onSyncNow,
  onRetryFailed,
  onClearFailed,
  testID = 'sync-status-card',
}) => {
  const { pendingCount, failedCount } = syncStatus;
  const hasPendingItems = pendingCount > 0 || failedCount > 0;

  // Don't render if no pending items
  if (!hasPendingItems) {
    return null;
  }

  return (
    <NBCard variant="elevated" style={styles.card} testID={testID}>
      <Text style={styles.cardTitle}>Sinkronisasi Data</Text>

      <View style={styles.syncStatusRow}>
        <Text style={styles.syncLabel}>Tertunda:</Text>
        <Text style={[styles.syncValue, pendingCount > 0 && styles.syncWarning]}>
          {pendingCount}
        </Text>
      </View>

      <View style={styles.syncStatusRow}>
        <Text style={styles.syncLabel}>Gagal:</Text>
        <Text style={[styles.syncValue, failedCount > 0 && styles.syncError]}>
          {failedCount}
        </Text>
      </View>

      <View style={styles.syncButtons}>
        <NBButton
          title="Sinkronkan"
          onPress={onSyncNow}
          disabled={isSyncing}
          loading={isSyncing}
          variant="primary"
          size="sm"
          testID="sync-now-button"
        />

        {failedCount > 0 && (
          <>
            <NBButton
              title="Coba Ulang"
              onPress={onRetryFailed}
              variant="secondary"
              size="sm"
              testID="retry-failed-button"
            />
            <NBButton
              title="Hapus Gagal"
              onPress={onClearFailed}
              variant="danger"
              size="sm"
              testID="clear-failed-button"
            />
          </>
        )}
      </View>
    </NBCard>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: nbColors.white,
    marginHorizontal: nbSpacing.md,
    marginBottom: nbSpacing.md,
    padding: nbSpacing.md,
    borderRadius: nbRadius.base,
    borderWidth: nbBorders.widthBase,
    borderColor: nbColors.black,
    ...nbShadows.sm,
  },
  cardTitle: {
    fontSize: nbType.body.fontSize,
    fontWeight: nbType.h2.fontWeight,
    color: nbColors.black,
    marginBottom: nbSpacing.md,
  },
  syncStatusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: nbSpacing.xs,
  },
  syncLabel: {
    fontSize: nbType.body.fontSize,
    color: nbColors.gray600,
  },
  syncValue: {
    fontSize: nbType.body.fontSize,
    fontWeight: nbType.h2.fontWeight,
    color: nbColors.black,
  },
  syncWarning: {
    color: nbColors.warning,
  },
  syncError: {
    color: nbColors.danger,
  },
  syncButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: nbSpacing.md,
    gap: nbSpacing.sm,
  },
});
