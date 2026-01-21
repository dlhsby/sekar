import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  RefreshControl,
  StyleSheet,
  SafeAreaView,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Button, Card, SyncStatusIndicator, LoadingSpinner } from '../../components/common';
import { theme } from '../../constants/theme';
import { useAppDispatch, useAppSelector } from '../../store/store';
import { shiftsApi } from '../../services/api';
import { setCurrentShift, setError } from '../../store/slices/shiftSlice';
import { formatTime, calculateDuration } from '../../utils/dateUtils';

/**
 * Worker Home Screen - Main dashboard for workers
 * Shows current shift status, summary stats, and quick actions
 */
export function WorkerHomeScreen(): JSX.Element {
  const navigation = useNavigation<any>();
  const dispatch = useAppDispatch();

  const { user, assignedArea } = useAppSelector((state) => state.auth);
  const { currentShift } = useAppSelector((state) => state.shift);
  const { isOnline, isSyncing, pendingShiftsCount, pendingReportsCount } = useAppSelector(
    (state) => state.offline
  );

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [timer, setTimer] = useState('00:00:00');

  // Load current shift on mount
  useEffect(() => {
    loadCurrentShift();
  }, []);

  // Update timer every second if shift is active
  // Fix: Use currentShift?.id as dependency to prevent multiple intervals
  useEffect(() => {
    if (!currentShift) {
      setTimer('00:00:00');
      return;
    }

    const interval = setInterval(() => {
      const elapsed = Date.now() - new Date(currentShift.clock_in_time).getTime();
      const hours = Math.floor(elapsed / 3600000);
      const minutes = Math.floor((elapsed % 3600000) / 60000);
      const seconds = Math.floor((elapsed % 60000) / 1000);

      setTimer(
        `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`
      );
    }, 1000);

    return () => clearInterval(interval);
  }, [currentShift?.id]);

  const pad = (num: number): string => String(num).padStart(2, '0');

  const loadCurrentShift = async () => {
    try {
      setLoading(true);
      const shift = await shiftsApi.getCurrentShift();
      dispatch(setCurrentShift(shift));
    } catch (error: any) {
      // No active shift is not an error - it's expected
      if (error.response?.status !== 404) {
        dispatch(setError(error.message || 'Failed to load shift'));
      }
      dispatch(setCurrentShift(null));
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadCurrentShift();
    setRefreshing(false);
  }, []);

  const handleClockInOut = () => {
    navigation.navigate('ClockInOut' as never);
  };

  const handleNewReport = () => {
    navigation.navigate('Report' as never);
  };

  // Derived state - must be before any early returns to satisfy React's rules of hooks
  const pendingCount = pendingShiftsCount + pendingReportsCount;

  // Memoize duration calculation - updates when timer's HH:MM changes (once per minute)
  // This avoids recalculating on every second tick while still staying accurate
  const timerMinutes = timer.slice(0, 5); // Extract HH:MM from HH:MM:SS
  const shiftDuration = useMemo(() => {
    if (!currentShift) return '0h';
    return calculateDuration(
      new Date(currentShift.clock_in_time),
      new Date()
    ).formatted;
  }, [currentShift?.clock_in_time, timerMinutes]);

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Halo, {user?.full_name}! 👋</Text>
          <Text style={styles.role}>Pekerja</Text>
        </View>
        <SyncStatusIndicator
          isOnline={isOnline}
          isSyncing={isSyncing}
          pendingCount={pendingCount}
        />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={[theme.colors.primary]}
          />
        }>
        {/* Current Shift Card */}
        {currentShift ? (
          <Card style={styles.shiftCard}>
            <Text style={styles.cardTitle}>Current Shift</Text>
            <Text style={styles.timer}>{timer}</Text>
            <View style={styles.shiftInfo}>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Area:</Text>
                <Text style={styles.infoValue}>
                  {currentShift.area?.name || 'Unknown'}
                </Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Clock-in:</Text>
                <Text style={styles.infoValue}>
                  {formatTime(currentShift.clock_in_time)}
                </Text>
              </View>
            </View>
          </Card>
        ) : (
          <Card style={styles.shiftCard}>
            <Text style={styles.cardTitle}>Not Clocked In</Text>
            <Text style={styles.noShiftText}>
              You haven't started your shift yet today.
            </Text>
            {assignedArea && (
              <View style={styles.assignedArea}>
                <Text style={styles.assignedAreaLabel}>Assigned Area:</Text>
                <Text style={styles.assignedAreaValue}>
                  {assignedArea.name}
                </Text>
              </View>
            )}
          </Card>
        )}

        {/* Summary Card */}
        <Card style={styles.summaryCard}>
          <Text style={styles.cardTitle}>Today's Summary</Text>
          <View style={styles.summaryRow}>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryValue}>0</Text>
              <Text style={styles.summaryLabel}>Reports</Text>
            </View>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryItem}>
              <Text style={styles.summaryValue}>{shiftDuration}</Text>
              <Text style={styles.summaryLabel}>Hours</Text>
            </View>
          </View>
        </Card>

        {/* Quick Actions */}
        <View style={styles.actions}>
          <Button
            title={currentShift ? 'Clock Out' : 'Clock In'}
            onPress={handleClockInOut}
            variant="primary"
            style={styles.primaryAction}
          />
          {currentShift && (
            <Button
              title="New Report"
              onPress={handleNewReport}
              variant="outline"
              style={styles.secondaryAction}
            />
          )}
        </View>

        {/* Empty state message if not assigned */}
        {!assignedArea && !currentShift && (
          <Card style={styles.warningCard}>
            <Text style={styles.warningText}>
              You are not assigned to any area yet. Please contact your supervisor.
            </Text>
          </Card>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: theme.spacing.lg,
    backgroundColor: theme.colors.white,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  greeting: {
    fontSize: theme.typography.fontSize.xl,
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.textPrimary,
  },
  role: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.xs,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: theme.spacing.lg,
  },
  shiftCard: {
    marginBottom: theme.spacing.lg,
  },
  cardTitle: {
    fontSize: theme.typography.fontSize.lg,
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.md,
  },
  timer: {
    fontSize: 48,
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.primary,
    textAlign: 'center',
    marginVertical: theme.spacing.lg,
  },
  shiftInfo: {
    marginTop: theme.spacing.md,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: theme.spacing.sm,
  },
  infoLabel: {
    fontSize: theme.typography.fontSize.md,
    color: theme.colors.textSecondary,
  },
  infoValue: {
    fontSize: theme.typography.fontSize.md,
    fontWeight: theme.typography.fontWeight.medium,
    color: theme.colors.textPrimary,
  },
  noShiftText: {
    fontSize: theme.typography.fontSize.md,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    marginVertical: theme.spacing.lg,
  },
  assignedArea: {
    marginTop: theme.spacing.md,
    paddingTop: theme.spacing.md,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  assignedAreaLabel: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.xs,
  },
  assignedAreaValue: {
    fontSize: theme.typography.fontSize.md,
    fontWeight: theme.typography.fontWeight.medium,
    color: theme.colors.primary,
  },
  summaryCard: {
    marginBottom: theme.spacing.lg,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  summaryItem: {
    flex: 1,
    alignItems: 'center',
  },
  summaryDivider: {
    width: 1,
    height: 40,
    backgroundColor: theme.colors.border,
  },
  summaryValue: {
    fontSize: 32,
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.primary,
  },
  summaryLabel: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.xs,
  },
  actions: {
    marginTop: theme.spacing.md,
  },
  primaryAction: {
    marginBottom: theme.spacing.md,
  },
  secondaryAction: {
    marginBottom: theme.spacing.md,
  },
  warningCard: {
    backgroundColor: theme.colors.warning + '20', // 20% opacity
    borderColor: theme.colors.warning,
    borderWidth: 1,
    marginTop: theme.spacing.md,
  },
  warningText: {
    fontSize: theme.typography.fontSize.md,
    color: theme.colors.warning,
    textAlign: 'center',
  },
});

export default WorkerHomeScreen;
