/**
 * Task Detail Screen
 * Phase 2C: 8-status workflow with accept/decline + verify/revision
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
  RefreshControl,
  Platform,
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
import { useAppSelector } from '../../store/hooks';

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
function getStatusVariant(status: TaskStatus): 'success' | 'primary' | 'warning' | 'gray' | 'danger' {
  switch (status) {
    case 'verified':
      return 'success';
    case 'completed':
    case 'in_progress':
      return 'primary';
    case 'assigned':
    case 'revision_needed':
      return 'warning';
    case 'declined':
      return 'danger';
    case 'accepted':
      return 'success';
    default:
      return 'gray';
  }
}

/**
 * Get Indonesian label for status (Phase 2C: 8 statuses)
 */
function getStatusLabel(status: TaskStatus): string {
  const labels: Record<TaskStatus, string> = {
    pending: 'Menunggu',
    assigned: 'Ditugaskan',
    accepted: 'Diterima',
    declined: 'Ditolak',
    in_progress: 'Dikerjakan',
    completed: 'Menunggu Verifikasi',
    verified: 'Terverifikasi',
    revision_needed: 'Perlu Revisi',
  };
  return labels[status] || status;
}

/**
 * Get Indonesian label for priority
 */
function getPriorityLabel(priority: TaskPriority): string {
  const labels: Record<TaskPriority, string> = {
    low: 'Rendah',
    medium: 'Biasa',
    high: 'Tinggi',
    urgent: 'Mendesak',
  };
  return labels[priority] || priority;
}

const TASK_VERIFIER_ROLES = ['korlap', 'kepala_rayon', 'top_management'];

export function TaskDetailScreen(): React.JSX.Element {
  const navigation = useNavigation<TaskDetailNavigationProp>();
  const route = useRoute<TaskDetailRouteProp>();
  const { taskId } = route.params;

  const user = useAppSelector((state) => state.auth.user);

  const [task, setTask] = useState<Task | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Inline input states for decline/revision reasons (cross-platform alternative to Alert.prompt)
  const [showDeclineInput, setShowDeclineInput] = useState(false);
  const [declineReason, setDeclineReason] = useState('');
  const [showRevisionInput, setShowRevisionInput] = useState(false);
  const [revisionReason, setRevisionReason] = useState('');

  const fetchTask = useCallback(async () => {
    try {
      const response = await tasksApi.getTaskById(taskId);
      if (response.data) {
        setTask(response.data);
      } else if (response.error) {
        Alert.alert('Error', response.error);
      }
    } catch {
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
      const response = await tasksApi.acceptTask(task.id);
      if (response.error) {
        Alert.alert('Error', response.error);
        return;
      }
      Alert.alert('Berhasil', 'Tugas diterima');
      fetchTask();
    } catch {
      Alert.alert('Error', 'Gagal menerima tugas');
    } finally {
      setIsSubmitting(false);
    }
  }, [task, fetchTask]);

  const handleDecline = useCallback(() => {
    setShowDeclineInput(true);
  }, []);

  const handleDeclineSubmit = useCallback(async () => {
    if (!task) {return;}
    if (!declineReason.trim()) {
      Alert.alert('Error', 'Alasan penolakan wajib diisi');
      return;
    }
    setIsSubmitting(true);
    try {
      const response = await tasksApi.declineTask(task.id, { reason: declineReason.trim() });
      if (response.error) {
        Alert.alert('Error', response.error);
        return;
      }
      Alert.alert('Berhasil', 'Tugas ditolak');
      setShowDeclineInput(false);
      setDeclineReason('');
      fetchTask();
    } catch {
      Alert.alert('Error', 'Gagal menolak tugas');
    } finally {
      setIsSubmitting(false);
    }
  }, [task, declineReason, fetchTask]);

  const handleStart = useCallback(async () => {
    if (!task) {return;}

    setIsSubmitting(true);
    try {
      const response = await tasksApi.startTask(task.id);
      if (response.error) {
        Alert.alert('Error', response.error);
        return;
      }
      Alert.alert('Berhasil', 'Tugas dimulai');
      fetchTask();
    } catch {
      Alert.alert('Error', 'Gagal memulai tugas');
    } finally {
      setIsSubmitting(false);
    }
  }, [task, fetchTask]);

  const handleComplete = useCallback(() => {
    if (!task) {return;}
    navigation.navigate('TaskComplete', { taskId: task.id });
  }, [task, navigation]);

  const handleVerify = useCallback(async () => {
    if (!task) {return;}
    setIsSubmitting(true);
    try {
      const response = await tasksApi.verifyTask(task.id);
      if (response.error) {
        Alert.alert('Error', response.error);
        return;
      }
      Alert.alert('Berhasil', 'Tugas terverifikasi');
      fetchTask();
    } catch {
      Alert.alert('Error', 'Gagal memverifikasi tugas');
    } finally {
      setIsSubmitting(false);
    }
  }, [task, fetchTask]);

  const handleRevision = useCallback(() => {
    setShowRevisionInput(true);
  }, []);

  const handleRevisionSubmit = useCallback(async () => {
    if (!task) {return;}
    if (!revisionReason.trim()) {
      Alert.alert('Error', 'Alasan revisi wajib diisi');
      return;
    }
    setIsSubmitting(true);
    try {
      const response = await tasksApi.requestRevision(task.id, { reason: revisionReason.trim() });
      if (response.error) {
        Alert.alert('Error', response.error);
        return;
      }
      Alert.alert('Berhasil', 'Permintaan revisi terkirim');
      setShowRevisionInput(false);
      setRevisionReason('');
      fetchTask();
    } catch {
      Alert.alert('Error', 'Gagal mengirim permintaan revisi');
    } finally {
      setIsSubmitting(false);
    }
  }, [task, revisionReason, fetchTask]);

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
            onAction={() => navigation.navigate('TasksActivities', { initialTab: 'tasks' })}
            testID="task-detail-error"
          />
        </View>
      </NBBackgroundPattern>
    );
  }

  const isDeadlinePast = task.deadline && new Date(task.deadline) < new Date();

  // Phase 2C: role-gated action visibility
  const isAssignee = user?.id === task.assigned_to;
  const canVerify = user ? TASK_VERIFIER_ROLES.includes(user.role) : false;

  // Accept/decline/start/complete: only for the assignee
  const showAccept = task.status === 'assigned' && isAssignee;
  const showDecline = task.status === 'assigned' && isAssignee;
  const showStart = (task.status === 'accepted' || task.status === 'revision_needed') && isAssignee;
  const showComplete = task.status === 'in_progress' && isAssignee;

  // Verify/revision: only for supervisor roles
  const showVerify = task.status === 'completed' && canVerify;
  const showRevision = task.status === 'completed' && canVerify;

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

          {task.assigned_user ? (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Ditugaskan Ke:</Text>
              <Text style={styles.detailValue}>{task.assigned_user.full_name}</Text>
            </View>
          ) : task.assigned_to ? (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Ditugaskan Ke:</Text>
              <Text style={styles.detailValue}>(petugas)</Text>
            </View>
          ) : (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Ditugaskan Ke:</Text>
              <Text style={[styles.detailValue, { color: nbColors.gray['600'] }]}>Belum ditugaskan</Text>
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

      {/* Completion Details (if completed or verified) */}
      {(task.status === 'completed' || task.status === 'verified') && (
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

      {/* Declined reason */}
      {task.status === 'declined' && task.decline_reason && (
        <NBCard style={styles.card}>
          <NBCardHeader>
            <Text style={styles.sectionTitle}>Alasan Penolakan</Text>
          </NBCardHeader>
          <NBCardContent>
            <Text style={styles.description}>{task.decline_reason}</Text>
            {task.declined_at && (
              <Text style={styles.relativeTime}>Ditolak pada {formatDateTime(task.declined_at)}</Text>
            )}
          </NBCardContent>
        </NBCard>
      )}

      {/* Revision reason */}
      {task.status === 'revision_needed' && task.revision_reason && (
        <NBCard style={styles.card}>
          <NBCardHeader>
            <Text style={styles.sectionTitle}>Alasan Revisi</Text>
          </NBCardHeader>
          <NBCardContent>
            <Text style={styles.description}>{task.revision_reason}</Text>
          </NBCardContent>
        </NBCard>
      )}

      {/* Verified info */}
      {task.status === 'verified' && (
        <NBCard style={styles.card}>
          <NBCardHeader>
            <Text style={styles.sectionTitle}>Verifikasi</Text>
          </NBCardHeader>
          <NBCardContent>
            {task.verifier && (
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Diverifikasi Oleh:</Text>
                <Text style={styles.detailValue}>{task.verifier.full_name}</Text>
              </View>
            )}
            {task.verified_at && (
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Pada:</Text>
                <Text style={styles.detailValue}>{formatDateTime(task.verified_at)}</Text>
              </View>
            )}
          </NBCardContent>
        </NBCard>
      )}

      {/* Action Buttons */}
      <View style={styles.actionContainer}>
        {/* Accept + Decline (when assigned) */}
        {(showAccept || showDecline) && !showDeclineInput && (
          <View style={styles.buttonRow}>
            {showAccept && (
              <View style={styles.buttonHalf}>
                <NBButton
                  title="Terima"
                  variant="success"
                  onPress={handleAccept}
                  disabled={isSubmitting}
                  loading={isSubmitting}
                />
              </View>
            )}
            {showDecline && (
              <View style={styles.buttonHalf}>
                <NBButton
                  title="Tolak"
                  variant="danger"
                  onPress={handleDecline}
                  disabled={isSubmitting}
                />
              </View>
            )}
          </View>
        )}

        {/* Inline Decline Reason Input */}
        {showDeclineInput && (
          <View style={styles.inlineInputContainer}>
            <Text style={styles.inlineInputLabel}>Alasan Penolakan</Text>
            <TextInput
              style={styles.reasonInput}
              placeholder="Masukkan alasan penolakan..."
              placeholderTextColor={nbColors.gray['400']}
              value={declineReason}
              onChangeText={setDeclineReason}
              multiline
            />
            <View style={styles.buttonRow}>
              <View style={styles.buttonHalf}>
                <NBButton
                  title="Batal"
                  variant="secondary"
                  onPress={() => { setShowDeclineInput(false); setDeclineReason(''); }}
                  disabled={isSubmitting}
                />
              </View>
              <View style={styles.buttonHalf}>
                <NBButton
                  title="Kirim Penolakan"
                  variant="danger"
                  onPress={handleDeclineSubmit}
                  disabled={isSubmitting || !declineReason.trim()}
                  loading={isSubmitting}
                />
              </View>
            </View>
          </View>
        )}

        {/* Start button (accepted or revision_needed) */}
        {showStart && (
          <NBButton
            title="Mulai Kerjakan"
            variant="primary"
            onPress={handleStart}
            disabled={isSubmitting}
            loading={isSubmitting}
          />
        )}

        {/* Complete button (in_progress) */}
        {showComplete && (
          <NBButton
            title="Selesaikan Tugas"
            variant="success"
            onPress={handleComplete}
            disabled={isSubmitting}
          />
        )}

        {/* Verify + Revision (when completed) */}
        {(showVerify || showRevision) && !showRevisionInput && (
          <View style={styles.buttonRow}>
            {showVerify && (
              <View style={styles.buttonHalf}>
                <NBButton
                  title="Verifikasi"
                  variant="success"
                  onPress={handleVerify}
                  disabled={isSubmitting}
                  loading={isSubmitting}
                />
              </View>
            )}
            {showRevision && (
              <View style={styles.buttonHalf}>
                <NBButton
                  title="Minta Revisi"
                  variant="info"
                  onPress={handleRevision}
                  disabled={isSubmitting}
                />
              </View>
            )}
          </View>
        )}

        {/* Inline Revision Reason Input */}
        {showRevisionInput && (
          <View style={styles.inlineInputContainer}>
            <Text style={styles.inlineInputLabel}>Alasan Revisi</Text>
            <TextInput
              style={styles.reasonInput}
              placeholder="Masukkan alasan revisi..."
              placeholderTextColor={nbColors.gray['400']}
              value={revisionReason}
              onChangeText={setRevisionReason}
              multiline
            />
            <View style={styles.buttonRow}>
              <View style={styles.buttonHalf}>
                <NBButton
                  title="Batal"
                  variant="secondary"
                  onPress={() => { setShowRevisionInput(false); setRevisionReason(''); }}
                  disabled={isSubmitting}
                />
              </View>
              <View style={styles.buttonHalf}>
                <NBButton
                  title="Kirim Revisi"
                  variant="info"
                  onPress={handleRevisionSubmit}
                  disabled={isSubmitting || !revisionReason.trim()}
                  loading={isSubmitting}
                />
              </View>
            </View>
          </View>
        )}

        <NBButton
          title="Kembali"
          variant="secondary"
          onPress={() => navigation.navigate('TasksActivities', { initialTab: 'tasks' })}
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
  buttonRow: {
    flexDirection: 'row',
    gap: nbSpacing.sm,
  },
  buttonHalf: {
    flex: 1,
  },
  inlineInputContainer: {
    gap: nbSpacing.sm,
  },
  inlineInputLabel: {
    fontSize: fontSizes.sm,
    fontWeight: nbTypography.fontWeight.semibold,
    color: nbColors.black,
  },
  reasonInput: {
    borderWidth: nbBorders.base,
    borderColor: nbColors.black,
    padding: nbSpacing.sm,
    fontSize: fontSizes.sm,
    color: nbColors.black,
    minHeight: 80,
    ...(Platform.OS === 'android' ? { textAlignVertical: 'top' as const } : {}),
  },
});

export default TaskDetailScreen;
