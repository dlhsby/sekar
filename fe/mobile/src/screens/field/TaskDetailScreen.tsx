/**
 * Task Detail Screen
 * Phase 2C: Simplified — no accept/decline, shows tags and rayon
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
import type { MainTabParamList, MainTabScreenProps } from '../../types/navigation.types';
import type { Task, TaskStatus, TaskPriority } from '../../types/models.types';

type TaskDetailRouteProp = RouteProp<MainTabParamList, 'TaskDetail'>;
type TaskDetailNavigationProp = MainTabScreenProps<'TaskDetail'>['navigation'];

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
    case 'assigned':
      return 'warning';
    default:
      return 'gray';
  }
}

/**
 * Get Indonesian label for status (Phase 2C: 4 statuses only)
 */
function getStatusLabel(status: TaskStatus): string {
  const labels: Record<TaskStatus, string> = {
    pending: 'Menunggu',
    assigned: 'Ditugaskan',
    in_progress: 'Dikerjakan',
    completed: 'Selesai',
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

  const fetchTask = useCallback(async () => {
    try {
      const response = await tasksApi.getTaskById(taskId);
      if (response.data) {
        setTask(response.data);
      }
    } catch (error) {
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

  // Phase 2C: start directly from 'assigned' (no accept step)
  const handleStart = useCallback(async () => {
    if (!task) {return;}

    setIsSubmitting(true);
    try {
      await tasksApi.startTask(task.id);
      Alert.alert('Berhasil', 'Tugas dimulai');
      fetchTask();
    } catch (error) {
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
  // Phase 2C: start directly from assigned (no accept step)
  const showStart = task.status === 'assigned';
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

          {/* Phase 2C: Show rayon if present */}
          {task.rayon && (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Rayon:</Text>
              <Text style={styles.detailValue}>{task.rayon.name}</Text>
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

          {task.creator && (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Ditugaskan Oleh:</Text>
              <Text style={styles.detailValue}>{task.creator.full_name}</Text>
            </View>
          )}
        </NBCardContent>
      </NBCard>

      {/* Phase 2C: Tagged Users */}
      {task.tags && task.tags.length > 0 && (
        <NBCard style={styles.card}>
          <NBCardHeader>
            <Text style={styles.sectionTitle}>Tag Pengguna</Text>
          </NBCardHeader>
          <NBCardContent>
            <View style={styles.tagsContainer}>
              {task.tags.map((tag) => (
                <View key={tag.id} style={styles.tagItem}>
                  <Icon name="account-circle" size={20} color={nbColors.gray['600']} />
                  <Text style={styles.tagName}>
                    {tag.user?.full_name ?? 'Pengguna'}
                  </Text>
                </View>
              ))}
            </View>
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
  tagsContainer: {
    gap: nbSpacing.sm,
  },
  tagItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: nbSpacing.sm,
    paddingVertical: nbSpacing.xs,
  },
  tagName: {
    fontSize: fontSizes.sm,
    color: nbColors.black,
    fontWeight: nbTypography.fontWeight.medium,
  },
  actionContainer: {
    marginHorizontal: nbSpacing.md,
    marginTop: nbSpacing.md,
    gap: nbSpacing.sm,
  },
});

export default TaskDetailScreen;
