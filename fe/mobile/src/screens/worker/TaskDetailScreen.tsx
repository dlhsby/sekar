/**
 * Task Detail Screen
 *
 * Displays task details and allows workers to:
 * - Accept or decline assigned tasks
 * - Start working on accepted tasks
 * - View task information and deadline
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { NBButton, NBCard, NBCardHeader, NBCardContent, NBBadge } from '../../components/nb';
import { colors, spacing, typography, borderRadius } from '../../constants/theme';

const fontSizes = typography.fontSize;
import { formatDateTime, formatRelativeTime } from '../../utils/dateUtils';
import * as tasksApi from '../../services/api/tasksApi';
import type { WorkerTabParamList } from '../../types/navigation.types';
import type { Task, TaskStatus, TaskPriority } from '../../types/models.types';

type TaskDetailRouteProp = RouteProp<WorkerTabParamList, 'TaskDetail'>;
type TaskDetailNavigationProp = NativeStackNavigationProp<WorkerTabParamList, 'TaskDetail'>;

/**
 * Get badge variant based on priority
 */
function getPriorityVariant(priority: TaskPriority): 'danger' | 'warning' | 'primary' | 'gray' {
  switch (priority) {
    case 'urgent':
      return 'danger';
    case 'high':
      return 'warning';
    case 'medium':
      return 'primary';
    default:
      return 'gray';
  }
}

/**
 * Get badge variant based on status
 */
function getStatusVariant(status: TaskStatus): 'success' | 'primary' | 'warning' | 'gray' {
  switch (status) {
    case 'completed':
      return 'success';
    case 'in_progress':
      return 'primary';
    case 'accepted':
    case 'assigned':
      return 'warning';
    default:
      return 'gray';
  }
}

/**
 * Get Indonesian label for status
 */
function getStatusLabel(status: TaskStatus): string {
  const labels: Record<TaskStatus, string> = {
    pending: 'Menunggu',
    assigned: 'Ditugaskan',
    accepted: 'Diterima',
    in_progress: 'Dikerjakan',
    completed: 'Selesai',
    declined: 'Ditolak',
  };
  return labels[status] || status;
}

/**
 * Get Indonesian label for priority
 */
function getPriorityLabel(priority: TaskPriority): string {
  const labels: Record<TaskPriority, string> = {
    low: 'Rendah',
    medium: 'Sedang',
    high: 'Tinggi',
    urgent: 'Mendesak',
  };
  return labels[priority] || priority;
}

export function TaskDetailScreen(): React.JSX.Element {
  const navigation = useNavigation<TaskDetailNavigationProp>();
  const route = useRoute<TaskDetailRouteProp>();
  const { taskId } = route.params;

  const [task, setTask] = useState<Task | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [declineReason, setDeclineReason] = useState('');

  const fetchTask = useCallback(async () => {
    try {
      const response = await tasksApi.getTaskById(taskId);
      if (response.data) {
        setTask(response.data);
      }
    } catch (error) {
      console.error('Failed to fetch task:', error);
      Alert.alert('Error', 'Gagal memuat detail tugas');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [taskId]);

  useEffect(() => {
    fetchTask();
  }, [fetchTask]);

  const handleRefresh = useCallback(() => {
    setIsRefreshing(true);
    fetchTask();
  }, [fetchTask]);

  const handleAccept = useCallback(async () => {
    if (!task) {return;}

    setIsSubmitting(true);
    try {
      await tasksApi.acceptTask(task.id);
      Alert.alert('Berhasil', 'Tugas diterima');
      fetchTask();
    } catch (error) {
      console.error('Failed to accept task:', error);
      Alert.alert('Error', 'Gagal menerima tugas');
    } finally {
      setIsSubmitting(false);
    }
  }, [task, fetchTask]);

  const handleDecline = useCallback(() => {
    Alert.prompt(
      'Tolak Tugas',
      'Berikan alasan penolakan:',
      [
        { text: 'Batal', style: 'cancel' },
        {
          text: 'Tolak',
          style: 'destructive',
          onPress: async (reason) => {
            if (!task) {return;}
            if (!reason?.trim()) {
              Alert.alert('Error', 'Alasan penolakan harus diisi');
              return;
            }

            setIsSubmitting(true);
            try {
              await tasksApi.declineTask(task.id, reason.trim());
              Alert.alert('Berhasil', 'Tugas ditolak', [
                { text: 'OK', onPress: () => navigation.goBack() },
              ]);
            } catch (error) {
              console.error('Failed to decline task:', error);
              Alert.alert('Error', 'Gagal menolak tugas');
            } finally {
              setIsSubmitting(false);
            }
          },
        },
      ],
      'plain-text',
      declineReason
    );
  }, [task, navigation, declineReason]);

  const handleStart = useCallback(async () => {
    if (!task) {return;}

    setIsSubmitting(true);
    try {
      await tasksApi.startTask(task.id);
      Alert.alert('Berhasil', 'Tugas dimulai');
      fetchTask();
    } catch (error) {
      console.error('Failed to start task:', error);
      Alert.alert('Error', 'Gagal memulai tugas');
    } finally {
      setIsSubmitting(false);
    }
  }, [task, fetchTask]);

  const handleComplete = useCallback(() => {
    if (!task) {return;}
    navigation.navigate('TaskComplete', { taskId: task.id });
  }, [task, navigation]);

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Memuat tugas...</Text>
      </View>
    );
  }

  if (!task) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Tugas tidak ditemukan</Text>
        <NBButton
          title="Kembali"
          variant="secondary"
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        />
      </View>
    );
  }

  const isDeadlinePast = task.deadline && new Date(task.deadline) < new Date();
  const showAcceptDecline = task.status === 'assigned';
  const showStart = task.status === 'accepted';
  const showComplete = task.status === 'in_progress';

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      refreshControl={
        <RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} />
      }
    >
      {/* Header Card */}
      <NBCard style={styles.card}>
        <NBCardHeader>
          <View style={styles.headerRow}>
            <NBBadge text={getStatusLabel(task.status)} color={getStatusVariant(task.status)} />
            <NBBadge text={getPriorityLabel(task.priority)} color={getPriorityVariant(task.priority)} />
          </View>
        </NBCardHeader>
        <NBCardContent>
          <Text style={styles.title}>{task.title}</Text>
          {task.description && (
            <Text style={styles.description}>{task.description}</Text>
          )}
        </NBCardContent>
      </NBCard>

      {/* Details Card */}
      <NBCard style={styles.card}>
        <NBCardHeader>
          <Text style={styles.sectionTitle}>Detail Tugas</Text>
        </NBCardHeader>
        <NBCardContent>
          {task.deadline && (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Deadline:</Text>
              <View style={styles.detailValueContainer}>
                <Text
                  style={[
                    styles.detailValue,
                    isDeadlinePast && styles.deadlinePast,
                  ]}
                >
                  {formatDateTime(task.deadline)}
                </Text>
                <Text
                  style={[
                    styles.relativeTime,
                    isDeadlinePast && styles.deadlinePast,
                  ]}
                >
                  ({formatRelativeTime(new Date(task.deadline))})
                </Text>
              </View>
            </View>
          )}

          {task.area && (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Area:</Text>
              <Text style={styles.detailValue}>{task.area.name}</Text>
            </View>
          )}

          {task.activity_type && (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Jenis Kegiatan:</Text>
              <Text style={styles.detailValue}>{task.activity_type.name}</Text>
            </View>
          )}

          {task.created_at && (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Dibuat:</Text>
              <Text style={styles.detailValue}>
                {formatDateTime(task.created_at)}
              </Text>
            </View>
          )}

          {task.assigned_by && (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Ditugaskan Oleh:</Text>
              <Text style={styles.detailValue}>{task.assigned_by.full_name}</Text>
            </View>
          )}
        </NBCardContent>
      </NBCard>

      {/* Decline Reason (if declined) */}
      {task.status === 'declined' && task.decline_reason && (
        <NBCard style={styles.card}>
          <NBCardHeader>
            <Text style={styles.sectionTitle}>Alasan Penolakan</Text>
          </NBCardHeader>
          <NBCardContent>
            <Text style={styles.declineReason}>{task.decline_reason}</Text>
          </NBCardContent>
        </NBCard>
      )}

      {/* Completion Details (if completed) */}
      {task.status === 'completed' && (
        <NBCard style={styles.card}>
          <NBCardHeader>
            <Text style={styles.sectionTitle}>Detail Penyelesaian</Text>
          </NBCardHeader>
          <NBCardContent>
            {task.completed_at && (
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Selesai Pada:</Text>
                <Text style={styles.detailValue}>
                  {formatDateTime(task.completed_at)}
                </Text>
              </View>
            )}
            {task.completion_notes && (
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Catatan:</Text>
                <Text style={styles.detailValue}>{task.completion_notes}</Text>
              </View>
            )}
          </NBCardContent>
        </NBCard>
      )}

      {/* Action Buttons */}
      <View style={styles.actionContainer}>
        {showAcceptDecline && (
          <>
            <NBButton
              title="Terima Tugas"
              variant="primary"
              onPress={handleAccept}
              disabled={isSubmitting}
              loading={isSubmitting}
              style={styles.actionButton}
            />
            <NBButton
              title="Tolak Tugas"
              variant="danger"
              onPress={handleDecline}
              disabled={isSubmitting}
              style={styles.actionButton}
            />
          </>
        )}

        {showStart && (
          <NBButton
            title="Mulai Kerjakan"
            variant="primary"
            onPress={handleStart}
            disabled={isSubmitting}
            loading={isSubmitting}
            style={styles.actionButton}
          />
        )}

        {showComplete && (
          <NBButton
            title="Selesaikan Tugas"
            variant="success"
            onPress={handleComplete}
            disabled={isSubmitting}
            style={styles.actionButton}
          />
        )}

        <NBButton
          title="Kembali"
          variant="secondary"
          onPress={() => navigation.goBack()}
          style={styles.actionButton}
        />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  contentContainer: {
    padding: spacing.md,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  loadingText: {
    marginTop: spacing.md,
    fontSize: fontSizes.md,
    color: colors.textSecondary,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
    padding: spacing.lg,
  },
  errorText: {
    fontSize: fontSizes.lg,
    color: colors.danger,
    marginBottom: spacing.md,
    textAlign: 'center',
  },
  backButton: {
    marginTop: spacing.md,
  },
  card: {
    marginBottom: spacing.md,
  },
  headerRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  title: {
    fontSize: fontSizes.xl,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing.sm,
  },
  description: {
    fontSize: fontSizes.md,
    color: colors.textSecondary,
    lineHeight: 22,
  },
  sectionTitle: {
    fontSize: fontSizes.lg,
    fontWeight: '600',
    color: colors.text,
  },
  detailRow: {
    flexDirection: 'row',
    marginBottom: spacing.sm,
  },
  detailLabel: {
    width: 120,
    fontSize: fontSizes.sm,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  detailValueContainer: {
    flex: 1,
  },
  detailValue: {
    flex: 1,
    fontSize: fontSizes.sm,
    color: colors.text,
  },
  relativeTime: {
    fontSize: fontSizes.xs,
    color: colors.textSecondary,
    marginTop: 2,
  },
  deadlinePast: {
    color: colors.danger,
  },
  declineReason: {
    fontSize: fontSizes.md,
    color: colors.danger,
    fontStyle: 'italic',
  },
  actionContainer: {
    marginTop: spacing.md,
    gap: spacing.sm,
  },
  actionButton: {
    marginBottom: spacing.xs,
  },
});

export default TaskDetailScreen;
