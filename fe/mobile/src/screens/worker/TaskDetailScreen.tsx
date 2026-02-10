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
  TouchableOpacity,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import {
  NBButton,
  NBCard,
  NBCardHeader,
  NBCardContent,
  NBBadge,
  NBBackgroundPattern,
  NBAlert,
} from '../../components/nb';
import { nbColors, nbSpacing, nbTypography, nbShadows, nbBorders } from '../../constants/nbTokens';

const fontSizes = nbTypography.fontSize;
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

  // Set up header with back button to Tasks List
  useEffect(() => {
    navigation.setOptions({
      headerLeft: () => (
        <TouchableOpacity
          onPress={() => navigation.navigate('TasksReports', { activeTab: 'tasks' })}
          style={styles.backButton}
          accessibilityLabel="Kembali ke Daftar Tugas"
          accessibilityRole="button"
        >
          <Icon name="arrow-left" size={24} color={nbColors.black} />
        </TouchableOpacity>
      ),
    });
  }, [navigation]);

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
      <NBBackgroundPattern
        pattern="dots"
        backgroundColor={nbColors.background}
        patternColor={nbColors.primary}
        opacity={0.06}
      >
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={nbColors.primary} />
          <Text style={styles.loadingText}>Memuat tugas...</Text>
        </View>
      </NBBackgroundPattern>
    );
  }

  if (!task) {
    return (
      <NBBackgroundPattern
        pattern="dots"
        backgroundColor={nbColors.background}
        patternColor={nbColors.primary}
        opacity={0.06}
      >
        <View style={styles.container}>
          <NBAlert
            variant="danger"
            title="Tugas Tidak Ditemukan"
            message="Tugas yang Anda cari tidak ditemukan atau telah dihapus"
            actionLabel="Kembali"
            onAction={() => navigation.goBack()}
            testID="task-detail-error"
          />
        </View>
      </NBBackgroundPattern>
    );
  }

  const isDeadlinePast = task.deadline && new Date(task.deadline) < new Date();
  const showAcceptDecline = task.status === 'assigned';
  const showStart = task.status === 'accepted';
  const showComplete = task.status === 'in_progress';

  return (
    <NBBackgroundPattern
      pattern="dots"
      backgroundColor={nbColors.background}
      patternColor={nbColors.primary}
      opacity={0.06}
    >
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
            />
            <NBButton
              title="Tolak Tugas"
              variant="danger"
              onPress={handleDecline}
              disabled={isSubmitting}
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
          />
        )}

        {showComplete && (
          <NBButton
            title="Selesaikan Tugas"
            variant="success"
            onPress={handleComplete}
            disabled={isSubmitting}
          />
        )}

        <NBButton
          title="Kembali"
          variant="secondary"
          onPress={() => navigation.goBack()}
        />
      </View>
      </ScrollView>
    </NBBackgroundPattern>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  contentContainer: {
    paddingVertical: nbSpacing.md,
    paddingBottom: nbSpacing.xl,
  },
  backButton: {
    marginLeft: nbSpacing.md,
    padding: nbSpacing.xs,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: nbSpacing.md,
    fontSize: fontSizes.base,
    color: nbColors.gray['600'],
  },
  card: {
    marginHorizontal: nbSpacing.md,
    marginBottom: nbSpacing.md,
  },
  headerRow: {
    flexDirection: 'row',
    gap: nbSpacing.sm,
  },
  title: {
    fontSize: fontSizes.xl,
    fontWeight: nbTypography.fontWeight.bold,
    color: nbColors.black,
    marginBottom: nbSpacing.sm,
  },
  description: {
    fontSize: fontSizes.base,
    color: nbColors.gray['600'],
    lineHeight: fontSizes.base * nbTypography.lineHeight.normal,
  },
  sectionTitle: {
    fontSize: fontSizes.lg,
    fontWeight: nbTypography.fontWeight.semibold,
    color: nbColors.black,
  },
  detailRow: {
    flexDirection: 'row',
    marginBottom: nbSpacing.sm,
  },
  detailLabel: {
    width: 120,
    fontSize: fontSizes.sm,
    color: nbColors.gray['600'],
    fontWeight: nbTypography.fontWeight.medium,
  },
  detailValueContainer: {
    flex: 1,
  },
  detailValue: {
    flex: 1,
    fontSize: fontSizes.sm,
    color: nbColors.black,
  },
  relativeTime: {
    fontSize: fontSizes.xs,
    color: nbColors.gray['600'],
    marginTop: 2,
  },
  deadlinePast: {
    color: nbColors.danger,
  },
  declineReason: {
    fontSize: fontSizes.base,
    color: nbColors.danger,
    fontStyle: 'italic',
  },
  actionContainer: {
    marginHorizontal: nbSpacing.md,
    marginTop: nbSpacing.md,
    gap: nbSpacing.sm,
  },
});

export default TaskDetailScreen;
