/**
 * Integration Example
 * Shows how to integrate the Offline Sync Manager in your React Native app
 */

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import {
  syncManager,
  addToQueue,
  getPendingCount,
  getPendingCountsByType,
} from './index';

/**
 * STEP 1: Initialize Sync Manager in App.tsx
 *
 * Add this to your root App component:
 */
export function AppWithSyncManager() {
  useEffect(() => {
    console.log('[App] Initializing Sync Manager...');
    syncManager.initialize();

    return () => {
      console.log('[App] Cleaning up Sync Manager...');
      syncManager.cleanup();
    };
  }, []);

  return <YourAppContent />;
}

/**
 * STEP 2: Sync Status Indicator Component
 *
 * Shows pending sync count and sync progress
 */
export function SyncStatusIndicator() {
  const [pendingCount, setPendingCount] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);
  const [progress, setProgress] = useState({ completed: 0, total: 0 });
  const [isOnline, setIsOnline] = useState(true);

  // Update pending count
  useEffect(() => {
    const updateCount = async () => {
      const count = await getPendingCount();
      setPendingCount(count);
    };

    updateCount();
    const interval = setInterval(updateCount, 5000);

    return () => clearInterval(interval);
  }, []);

  // Listen to sync events
  useEffect(() => {
    const onSyncStart = () => {
      setIsSyncing(true);
      setProgress({ completed: 0, total: 0 });
    };

    const onSyncProgress = (completed: number, total: number) => {
      setProgress({ completed, total });
    };

    const onSyncComplete = (successCount: number, failureCount: number) => {
      setIsSyncing(false);

      if (failureCount > 0) {
        Alert.alert(
          'Sync Warning',
          `${successCount} items synced successfully, ${failureCount} items failed.`,
          [{ text: 'OK' }],
        );
      }
    };

    const onSyncError = (error: string) => {
      setIsSyncing(false);
      Alert.alert('Sync Error', error, [{ text: 'OK' }]);
    };

    syncManager.on('syncStart', onSyncStart);
    syncManager.on('syncProgress', onSyncProgress);
    syncManager.on('syncComplete', onSyncComplete);
    syncManager.on('syncError', onSyncError);

    return () => {
      syncManager.off('syncStart', onSyncStart);
      syncManager.off('syncProgress', onSyncProgress);
      syncManager.off('syncComplete', onSyncComplete);
      syncManager.off('syncError', onSyncError);
    };
  }, []);

  // Monitor network status
  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener(state => {
      setIsOnline(state.isConnected === true && state.isInternetReachable === true);
    });

    return () => unsubscribe();
  }, []);

  if (pendingCount === 0) {
    return null;
  }

  return (
    <View style={styles.indicator}>
      <View style={[styles.statusDot, isOnline ? styles.online : styles.offline]} />

      <View style={styles.textContainer}>
        {isSyncing ? (
          <View style={styles.syncingContainer}>
            <ActivityIndicator size="small" color="#007AFF" />
            <Text style={styles.syncingText}>
              Syncing... ({progress.completed}/{progress.total})
            </Text>
          </View>
        ) : (
          <Text style={styles.pendingText}>
            {pendingCount} {pendingCount === 1 ? 'item' : 'items'} pending sync
          </Text>
        )}
      </View>

      {!isSyncing && (
        <TouchableOpacity
          onPress={() => syncManager.forceSyncNow()}
          style={styles.retryButton}>
          <Text style={styles.retryText}>Retry</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

/**
 * STEP 3: Detailed Pending Sync Component
 *
 * Shows breakdown by type
 */
export function DetailedPendingSync() {
  const [counts, setCounts] = useState({
    'clock-in': 0,
    'clock-out': 0,
    report: 0,
    location: 0,
  });

  useEffect(() => {
    const updateCounts = async () => {
      const newCounts = await getPendingCountsByType();
      setCounts(newCounts);
    };

    updateCounts();
    const interval = setInterval(updateCounts, 5000);

    return () => clearInterval(interval);
  }, []);

  const total = counts['clock-in'] + counts['clock-out'] + counts.report + counts.location;

  if (total === 0) {
    return null;
  }

  return (
    <View style={styles.detailedContainer}>
      <Text style={styles.detailedTitle}>Pending Sync</Text>

      {counts['clock-in'] > 0 && (
        <View style={styles.detailedRow}>
          <Text style={styles.detailedType}>Clock-in</Text>
          <Text style={styles.detailedCount}>{counts['clock-in']}</Text>
        </View>
      )}

      {counts['clock-out'] > 0 && (
        <View style={styles.detailedRow}>
          <Text style={styles.detailedType}>Clock-out</Text>
          <Text style={styles.detailedCount}>{counts['clock-out']}</Text>
        </View>
      )}

      {counts.report > 0 && (
        <View style={styles.detailedRow}>
          <Text style={styles.detailedType}>Reports</Text>
          <Text style={styles.detailedCount}>{counts.report}</Text>
        </View>
      )}

      {counts.location > 0 && (
        <View style={styles.detailedRow}>
          <Text style={styles.detailedType}>Location Pings</Text>
          <Text style={styles.detailedCount}>{counts.location}</Text>
        </View>
      )}
    </View>
  );
}

/**
 * STEP 4: Using addToQueue in API calls
 *
 * Example: Clock-in with offline fallback
 */
export async function handleClockInWithOffline(
  areaId: number,
  gpsLat: number,
  gpsLng: number,
  selfiePhoto: string,
): Promise<void> {
  try {
    // Check network first
    const netInfo = await NetInfo.fetch();

    if (!netInfo.isConnected || !netInfo.isInternetReachable) {
      console.log('[ClockIn] Offline - adding to queue');
      await addToQueue('clock-in', {
        area_id: areaId,
        gps_lat: gpsLat,
        gps_lng: gpsLng,
        selfie_photo: selfiePhoto,
      });

      Alert.alert(
        'Offline Mode',
        'You are offline. Your clock-in will be synced when connection is restored.',
        [{ text: 'OK' }],
      );
      return;
    }

    // Try online API call
    const { clockIn } = require('../api/shiftsApi');
    const result = await clockIn(areaId, gpsLat, gpsLng, selfiePhoto);

    if (result.error) {
      // API failed, add to queue
      console.log('[ClockIn] API error - adding to queue');
      await addToQueue('clock-in', {
        area_id: areaId,
        gps_lat: gpsLat,
        gps_lng: gpsLng,
        selfie_photo: selfiePhoto,
      });

      Alert.alert(
        'Clock-in Queued',
        'Clock-in failed but has been saved. It will sync automatically.',
        [{ text: 'OK' }],
      );
      return;
    }

    // Success
    Alert.alert('Success', 'Clocked in successfully!', [{ text: 'OK' }]);
  } catch (error: any) {
    console.error('[ClockIn] Error:', error);

    // Network error, add to queue
    await addToQueue('clock-in', {
      area_id: areaId,
      gps_lat: gpsLat,
      gps_lng: gpsLng,
      selfie_photo: selfiePhoto,
    });

    Alert.alert(
      'Clock-in Queued',
      'Could not connect to server. Your clock-in will sync when online.',
      [{ text: 'OK' }],
    );
  }
}

/**
 * STEP 5: Report submission with offline fallback
 */
export async function handleReportSubmitWithOffline(reportData: any): Promise<void> {
  try {
    const netInfo = await NetInfo.fetch();

    if (!netInfo.isConnected || !netInfo.isInternetReachable) {
      await addToQueue('report', reportData);

      Alert.alert(
        'Offline Mode',
        'You are offline. Your report will be synced when connection is restored.',
        [{ text: 'OK' }],
      );
      return;
    }

    const { createReport } = require('../api/reportsApi');
    const result = await createReport(reportData);

    if (result.error) {
      await addToQueue('report', reportData);

      Alert.alert(
        'Report Queued',
        'Report submission failed but has been saved. It will sync automatically.',
        [{ text: 'OK' }],
      );
      return;
    }

    Alert.alert('Success', 'Report submitted successfully!', [{ text: 'OK' }]);
  } catch (error: any) {
    console.error('[Report] Error:', error);
    await addToQueue('report', reportData);

    Alert.alert(
      'Report Queued',
      'Could not connect to server. Your report will sync when online.',
      [{ text: 'OK' }],
    );
  }
}

/**
 * Dummy component for example
 */
function YourAppContent() {
  return (
    <View style={styles.container}>
      <Text>Your App Content</Text>
      <SyncStatusIndicator />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  // Sync Status Indicator
  indicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF9E6',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    marginVertical: 8,
    borderWidth: 1,
    borderColor: '#FFD700',
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 8,
  },
  online: {
    backgroundColor: '#4CAF50',
  },
  offline: {
    backgroundColor: '#F44336',
  },
  textContainer: {
    flex: 1,
  },
  pendingText: {
    fontSize: 14,
    color: '#856404',
  },
  syncingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  syncingText: {
    fontSize: 14,
    color: '#007AFF',
    marginLeft: 8,
  },
  retryButton: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    backgroundColor: '#007AFF',
    borderRadius: 4,
  },
  retryText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  // Detailed Pending Sync
  detailedContainer: {
    backgroundColor: '#F5F5F5',
    padding: 12,
    borderRadius: 8,
    marginVertical: 8,
  },
  detailedTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
    color: '#333333',
  },
  detailedRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  detailedType: {
    fontSize: 14,
    color: '#666666',
  },
  detailedCount: {
    fontSize: 14,
    fontWeight: '600',
    color: '#007AFF',
  },
});
