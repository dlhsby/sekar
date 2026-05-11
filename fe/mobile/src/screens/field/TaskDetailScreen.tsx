/**
 * Task Detail Screen
 * Phase 2C: 8-status workflow with accept/decline + verify/revision
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
  RefreshControl,
  Modal,
  TouchableOpacity,
  FlatList,
} from 'react-native';
import { useNavigation, useRoute, RouteProp, useFocusEffect } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import {
  NBButton,
  NBCard,
  NBCardHeader,
  NBCardContent,
  NBBadge,
  NBBackgroundPattern,
  NBAlert,
  NBSelect,
  NBCardTextInput,
} from '../../components/nb';
import { nbColors, nbSpacing, nbTypography, nbBorders, nbBorderRadius } from '../../constants/nbTokens';
import { PartialCompleteSheet } from '../../components/tasks/PartialCompleteSheet';

const fontSizes = nbTypography.fontSize;
import { formatDateTime } from '../../utils/dateUtils';
import * as tasksApi from '../../services/api/tasksApi';
import { getUsers } from '../../services/api';
import type { MainTabParamList, MainTabScreenProps } from '../../types/navigation.types';
import type { Task, TaskStatus, TaskPriority } from '../../types/models.types';
import type { User } from '../../types/models.types';
import { useAppSelector } from '../../store/hooks';
import { FILTER_SUBORDINATE_ROLES } from '../../constants/roles';
import { toTitleCase } from '../../utils/filterHelpers';

type TaskDetailRouteProp = RouteProp<MainTabParamList, 'TaskDetail'>;
type TaskDetailNavigationProp = MainTabScreenProps<'TaskDetail'>['navigation'];

function getPriorityVariant(priority: TaskPriority): 'danger' | 'warning' | 'primary' | 'gray' {
  switch (priority) {
    case 'urgent': return 'danger';
    case 'high': return 'warning';
    case 'medium': return 'primary';
    default: return 'gray';
  }
}

function getStatusVariant(status: TaskStatus): 'success' | 'primary' | 'warning' | 'gray' | 'danger' {
  switch (status) {
    case 'verified': return 'success';
    case 'completed':
    case 'in_progress': return 'primary';
    case 'assigned':
    case 'revision_needed': return 'warning';
    case 'declined': return 'danger';
    case 'accepted': return 'success';
    default: return 'gray';
  }
}

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

function getPriorityLabel(priority: TaskPriority): string {
  const labels: Record<TaskPriority, string> = {
    low: 'Rendah',
    medium: 'Biasa',
    high: 'Tinggi',
    urgent: 'Mendesak',
  };
  return labels[priority] || priority;
}

/** Format user display as "Role - Nama" */
function formatUser(user: User | null | undefined): string {
  if (!user) return '—';
  return `${toTitleCase(user.role)} - ${user.full_name}`;
}

const TASK_VERIFIER_ROLES = ['korlap', 'kepala_rayon', 'top_management'];

type AuditEvent = {
  key: string;
  event: string;
  timestamp: Date | string;
  icon: string;
  color: string;
  actor?: string;
  note?: string;
};

function buildAuditEvents(task: Task | null): AuditEvent[] {
  if (!task) { return []; }
  const events: AuditEvent[] = [];

  events.push({
    key: 'created',
    event: 'Dibuat',
    timestamp: task.created_at,
    icon: 'plus-circle',
    color: nbColors.primary,
    actor: task.creator ? formatUser(task.creator) : undefined,
  });

  if (task.assigned_at) {
    events.push({
      key: 'assigned',
      event: 'Ditugaskan',
      timestamp: task.assigned_at,
      icon: 'account-arrow-right',
      color: nbColors.accentSunshine,
      actor: task.assignee ? formatUser(task.assignee) : undefined,
    });
  }

  if (task.accepted_at) {
    events.push({
      key: 'accepted',
      event: 'Diterima',
      timestamp: task.accepted_at,
      icon: 'check-circle',
      color: nbColors.success,
      actor: task.assignee ? formatUser(task.assignee) : undefined,
    });
  }

  if (task.declined_at) {
    events.push({
      key: 'declined',
      event: 'Ditolak',
      timestamp: task.declined_at,
      icon: 'close-circle',
      color: nbColors.danger,
      actor: task.assignee ? formatUser(task.assignee) : undefined,
      note: task.decline_reason ?? undefined,
    });
  }

  if (task.started_at) {
    events.push({
      key: 'started',
      event: 'Dikerjakan',
      timestamp: task.started_at,
      icon: 'play-circle',
      color: nbColors.primary,
      actor: task.assignee ? formatUser(task.assignee) : undefined,
    });
  }

  if (task.completed_at) {
    events.push({
      key: 'completed',
      event: 'Diselesaikan',
      timestamp: task.completed_at,
      icon: 'check-all',
      color: nbColors.success,
      actor: task.assignee ? formatUser(task.assignee) : undefined,
    });
  }

  if (task.revision_reason && task.status === 'revision_needed') {
    events.push({
      key: 'revision',
      event: 'Diminta Revisi',
      timestamp: task.updated_at,
      icon: 'pencil-circle',
      color: nbColors.accentSunshine,
      actor: task.verifier ? formatUser(task.verifier) : undefined,
      note: task.revision_reason,
    });
  }

  if (task.verified_at) {
    events.push({
      key: 'verified',
      event: 'Terverifikasi',
      timestamp: task.verified_at,
      icon: 'shield-check',
      color: nbColors.success,
      actor: task.verifier ? formatUser(task.verifier) : undefined,
    });
  }

  return events;
}

export function TaskDetailScreen(): React.JSX.Element {
  const navigation = useNavigation<TaskDetailNavigationProp>();
  const route = useRoute<TaskDetailRouteProp>();
  const { taskId } = route.params;
  // Optional caller-supplied back target (e.g. PruningDetail → "Lihat
  // Tugas" passes `from: 'PruningDetail'` + `fromParams: { requestId,
  // adminMode }`). When unset, defaults to the global Tugas list.
  const backTarget = (route.params as any)?.from as string | undefined;
  const backTargetParams = (route.params as any)?.fromParams as Record<string, unknown> | undefined;
  const handleBack = useCallback(() => {
    if (backTarget) {
      (navigation as any).navigate(backTarget, backTargetParams);
    } else {
      (navigation as any).navigate('TasksActivities', { initialTab: 'tasks' });
    }
  }, [backTarget, backTargetParams, navigation]);

  const user = useAppSelector((state) => state.auth.user);

  const [task, setTask] = useState<Task | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  // ADR-038: chronological assignment chain for this task.
  const [delegations, setDelegations] = useState<tasksApi.TaskDelegation[]>([]);

  const [showDeclineInput, setShowDeclineInput] = useState(false);
  const [declineReason, setDeclineReason] = useState('');
  const [showRevisionInput, setShowRevisionInput] = useState(false);
  const [revisionReason, setRevisionReason] = useState('');

  const [showAssignInput, setShowAssignInput] = useState(false);
  const [assigneeId, setAssigneeId] = useState('');
  const [subordinates, setSubordinates] = useState<User[]>([]);
  const [loadingSubordinates, setLoadingSubordinates] = useState(false);

  const [showAuditTrail, setShowAuditTrail] = useState(false);

  const [showPartialComplete, setShowPartialComplete] = useState(false);

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

  // ADR-038: load the assignment chain. Failures are silent — the chain
  // is informational and should never block the screen from rendering.
  const fetchDelegations = useCallback(async () => {
    try {
      const response = await tasksApi.getTaskDelegations(taskId);
      if (response.data) {
        setDelegations(response.data);
      }
    } catch {
      // best-effort
    }
  }, [taskId]);

  // Initial load
  useEffect(() => {
    fetchTask();
    fetchDelegations();
  }, [fetchTask, fetchDelegations]);

  // Refresh on every screen focus (e.g. after completing a task and coming back)
  const isMounted = React.useRef(false);
  useFocusEffect(
    useCallback(() => {
      if (isMounted.current) {
        fetchTask();
      } else {
        isMounted.current = true;
      }
    }, [fetchTask]),
  );

  const handleRefresh = useCallback(() => {
    setIsRefreshing(true);
    fetchTask();
  }, [fetchTask]);

  const loadSubordinates = useCallback(async () => {
    if (!user?.role) { return; }
    const subordinateRoles = FILTER_SUBORDINATE_ROLES[user.role] ?? [];
    if (subordinateRoles.length === 0) { return; }
    setLoadingSubordinates(true);
    try {
      const response = await getUsers(100);
      const all: User[] = response.data ?? [];
      setSubordinates(all.filter((u) => subordinateRoles.includes(u.role as any)));
    } catch {
      // non-critical
    } finally {
      setLoadingSubordinates(false);
    }
  }, [user?.role]);

  const handleShowAssign = useCallback(() => {
    setAssigneeId('');
    setShowAssignInput(true);
    loadSubordinates();
  }, [loadSubordinates]);

  const handleAssignSubmit = useCallback(async () => {
    if (!task || !assigneeId) { return; }
    setIsSubmitting(true);
    try {
      const response = await tasksApi.assignTask(task.id, { assigned_to: assigneeId });
      if (response.error) {
        Alert.alert('Error', response.error);
        return;
      }
      setShowAssignInput(false);
      setAssigneeId('');
      Alert.alert('Berhasil', 'Tugas berhasil ditugaskan');
      fetchTask();
    } catch {
      Alert.alert('Error', 'Gagal menugaskan tugas');
    } finally {
      setIsSubmitting(false);
    }
  }, [task, assigneeId, fetchTask]);

  const handleAccept = useCallback(async () => {
    if (!task) {return;}
    setIsSubmitting(true);
    try {
      const response = await tasksApi.acceptTask(task.id);
      if (response.error) { Alert.alert('Error', response.error); return; }
      Alert.alert('Berhasil', 'Tugas diterima');
      fetchTask();
    } catch {
      Alert.alert('Error', 'Gagal menerima tugas');
    } finally {
      setIsSubmitting(false);
    }
  }, [task, fetchTask]);

  const handleDecline = useCallback(() => { setShowDeclineInput(true); }, []);

  const handleDeclineSubmit = useCallback(async () => {
    if (!task) {return;}
    if (!declineReason.trim()) { Alert.alert('Error', 'Alasan penolakan wajib diisi'); return; }
    setIsSubmitting(true);
    try {
      const response = await tasksApi.declineTask(task.id, { reason: declineReason.trim() });
      if (response.error) { Alert.alert('Error', response.error); return; }
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
      if (response.error) { Alert.alert('Error', response.error); return; }
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

  const handleVerify = useCallback(() => {
    if (!task) {return;}
    Alert.alert(
      'Konfirmasi Verifikasi',
      'Apakah Anda yakin ingin memverifikasi tugas ini? Tindakan ini tidak dapat dibatalkan.',
      [
        { text: 'Batal', style: 'cancel' },
        {
          text: 'Ya, Verifikasi',
          style: 'default',
          onPress: async () => {
            setIsSubmitting(true);
            try {
              const response = await tasksApi.verifyTask(task.id);
              if (response.error) { Alert.alert('Error', response.error); return; }
              Alert.alert('Berhasil', 'Tugas berhasil diverifikasi');
              fetchTask();
            } catch {
              Alert.alert('Error', 'Gagal memverifikasi tugas');
            } finally {
              setIsSubmitting(false);
            }
          },
        },
      ],
    );
  }, [task, fetchTask]);

  const handleRevision = useCallback(() => { setShowRevisionInput(true); }, []);

  const handleRevisionSubmit = useCallback(async () => {
    if (!task) {return;}
    if (!revisionReason.trim()) { Alert.alert('Error', 'Alasan revisi wajib diisi'); return; }
    Alert.alert(
      'Konfirmasi Minta Revisi',
      'Apakah Anda yakin ingin meminta revisi? Petugas akan mengerjakan ulang tugas ini.',
      [
        { text: 'Batal', style: 'cancel' },
        {
          text: 'Ya, Minta Revisi',
          style: 'destructive',
          onPress: async () => {
            setIsSubmitting(true);
            try {
              const response = await tasksApi.requestRevision(task.id, { reason: revisionReason.trim() });
              if (response.error) { Alert.alert('Error', response.error); return; }
              Alert.alert('Berhasil', 'Permintaan revisi terkirim');
              setShowRevisionInput(false);
              setRevisionReason('');
              fetchTask();
            } catch {
              Alert.alert('Error', 'Gagal mengirim permintaan revisi');
            } finally {
              setIsSubmitting(false);
            }
          },
        },
      ],
    );
  }, [task, revisionReason, fetchTask]);

  const handlePartialCompleteSuccess = useCallback(() => {
    setShowPartialComplete(false);
    fetchTask();
  }, [fetchTask]);

  if (isLoading) {
    return (
      <NBBackgroundPattern pattern="dots" backgroundColor={nbColors.background} patternColor={nbColors.primary} opacity={0.06}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={nbColors.primary} />
          <Text style={styles.loadingText}>Memuat tugas...</Text>
        </View>
      </NBBackgroundPattern>
    );
  }

  if (!task) {
    return (
      <NBBackgroundPattern pattern="dots" backgroundColor={nbColors.background} patternColor={nbColors.primary} opacity={0.06}>
        <View style={styles.container}>
          <NBAlert
            variant="danger"
            title="Tugas Tidak Ditemukan"
            message="Tugas yang Anda cari tidak ditemukan atau telah dihapus"
            actionLabel="Kembali"
            onAction={handleBack}
            testID="task-detail-error"
          />
        </View>
      </NBBackgroundPattern>
    );
  }

  const isDeadlinePast = task.deadline && new Date(task.deadline) < new Date();

  const isAssignee = user?.id === task.assigned_to;
  const isCreator = user?.id === task.created_by;
  const canVerify = user ? TASK_VERIFIER_ROLES.includes(user.role) : false;

  const showAccept = task.status === 'assigned' && isAssignee;
  const showDecline = task.status === 'assigned' && isAssignee;
  const showStart = (task.status === 'accepted' || task.status === 'revision_needed') && isAssignee;
  const showComplete = task.status === 'in_progress' && isAssignee;
  const showAssign = task.status === 'pending' && isCreator;
  const showReassign = task.status === 'declined' && isCreator;
  // ADR-038: current assignee can delegate before accepting (e.g. kepala_rayon
  // forwards the task to a korlap they manage). Reuses /tasks/:id/assign on
  // the backend, which now permits ASSIGNED + caller===assigned_to.
  const hasSubordinates =
    user?.role &&
    (FILTER_SUBORDINATE_ROLES[user.role as keyof typeof FILTER_SUBORDINATE_ROLES] ?? []).length > 0;
  const showDelegate = task.status === 'assigned' && isAssignee && !!hasSubordinates;
  const showVerify = task.status === 'completed' && canVerify;
  const showRevision = task.status === 'completed' && canVerify;

  const completionPhotos = task.completion_photo_urls ?? [];

  return (
    <NBBackgroundPattern pattern="dots" backgroundColor={nbColors.background} patternColor={nbColors.primary} opacity={0.06}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.contentContainer}
        refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} />}
      >
        {/* ── Task Header Card ── */}
        <NBCard style={styles.card}>
          <NBCardContent>
            {/* Status + Priority row */}
            <View style={styles.badgeRow}>
              <NBBadge text={getStatusLabel(task.status)} color={getStatusVariant(task.status)} />
              <NBBadge text={getPriorityLabel(task.priority)} color={getPriorityVariant(task.priority)} />
            </View>

            {/* Title */}
            <Text style={styles.title}>{task.title}</Text>

            {/* Description */}
            {task.description ? (
              <Text style={styles.description}>{task.description}</Text>
            ) : (
              <Text style={styles.descriptionEmpty}>Tidak ada deskripsi</Text>
            )}

            {/* Divider */}
            <View style={styles.divider} />

            {/* Key metadata row */}
            <View style={styles.metaGrid}>
              {task.deadline && (
                <View style={styles.metaItem}>
                  <Icon name="calendar-clock" size={14} color={isDeadlinePast ? nbColors.danger : nbColors.gray['500']} />
                  <Text style={[styles.metaText, isDeadlinePast && styles.metaTextDanger]}>
                    {formatDateTime(task.deadline)}
                  </Text>
                </View>
              )}
              {task.area && (
                <View style={styles.metaItem}>
                  <Icon name="map-marker" size={14} color={nbColors.gray['500']} />
                  <Text style={styles.metaText}>{task.area.name}</Text>
                </View>
              )}
              {task.rayon && (
                <View style={styles.metaItem}>
                  <Icon name="map" size={14} color={nbColors.gray['500']} />
                  <Text style={styles.metaText}>{task.rayon.name}</Text>
                </View>
              )}
            </View>
          </NBCardContent>
        </NBCard>

        {/* ── Assignment Info Card ── */}
        <NBCard style={styles.card}>
          <NBCardHeader>
            <Text style={styles.sectionTitle}>Penugasan</Text>
          </NBCardHeader>
          <NBCardContent>
            <View style={styles.assignRow}>
              <View style={styles.assignBlock}>
                <Text style={styles.assignLabel}>Dibuat oleh</Text>
                <View style={styles.assignUserRow}>
                  <Icon name="account-circle" size={16} color={nbColors.gray['500']} />
                  <Text style={styles.assignValue}>{formatUser(task.creator)}</Text>
                </View>
                {task.created_at && (
                  <Text style={styles.assignDate}>{formatDateTime(task.created_at)}</Text>
                )}
              </View>

              <View style={styles.assignArrow}>
                <Icon name="arrow-right" size={20} color={nbColors.gray['400']} />
              </View>

              <View style={styles.assignBlock}>
                <Text style={styles.assignLabel}>Ditugaskan ke</Text>
                <View style={styles.assignUserRow}>
                  <Icon
                    name={task.assigned_to ? 'account' : 'account-question'}
                    size={16}
                    color={task.assigned_to ? nbColors.primary : nbColors.gray['400']}
                  />
                  <Text style={[styles.assignValue, !task.assigned_to && styles.assignValueEmpty]}>
                    {task.assignee ? formatUser(task.assignee) : task.assigned_to ? '(petugas)' : 'Belum ditugaskan'}
                  </Text>
                </View>
                {task.assigned_at && (
                  <Text style={styles.assignDate}>{formatDateTime(task.assigned_at)}</Text>
                )}
              </View>
            </View>
          </NBCardContent>
        </NBCard>

        {/* ── Tagged Users ── */}
        {task.tags && task.tags.length > 0 && (
          <NBCard style={styles.card}>
            <NBCardHeader>
              <Text style={styles.sectionTitle}>Tag Petugas</Text>
            </NBCardHeader>
            <NBCardContent>
              <View style={styles.tagsContainer}>
                {task.tags.map((tag) => (
                  <View key={tag.id} style={styles.tagItem}>
                    <Icon name="tag-outline" size={14} color={nbColors.gray['500']} />
                    <Text style={styles.tagName}>{tag.user?.full_name ?? '—'}</Text>
                  </View>
                ))}
              </View>
            </NBCardContent>
          </NBCard>
        )}

        {/* ── Declined Reason ── */}
        {task.status === 'declined' && task.decline_reason && (
          <NBCard style={styles.card}>
            <NBCardHeader>
              <Text style={[styles.sectionTitle, styles.dangerTitle]}>Alasan Penolakan</Text>
            </NBCardHeader>
            <NBCardContent>
              <Text style={styles.description}>{task.decline_reason}</Text>
              {task.declined_at && (
                <Text style={styles.subText}>Ditolak pada {formatDateTime(task.declined_at)}</Text>
              )}
            </NBCardContent>
          </NBCard>
        )}

        {/* ── Revision Reason ── */}
        {task.status === 'revision_needed' && task.revision_reason && (
          <NBCard style={styles.card}>
            <NBCardHeader>
              <Text style={[styles.sectionTitle, styles.warningTitle]}>Alasan Revisi</Text>
            </NBCardHeader>
            <NBCardContent>
              <Text style={styles.description}>{task.revision_reason}</Text>
            </NBCardContent>
          </NBCard>
        )}

        {/* ── Completion Details (completed / verified) ── */}
        {(task.status === 'completed' || task.status === 'verified') && (
          <NBCard style={styles.card}>
            <NBCardHeader>
              <Text style={styles.sectionTitle}>Detail Penyelesaian</Text>
            </NBCardHeader>
            <NBCardContent>
              {task.completed_at && (
                <View style={styles.detailRow}>
                  <Icon name="check-circle" size={14} color={nbColors.success} />
                  <Text style={styles.detailRowText}>Selesai {formatDateTime(task.completed_at)}</Text>
                </View>
              )}
              {task.completion_notes && (
                <Text style={[styles.description, { marginTop: nbSpacing.sm }]}>{task.completion_notes}</Text>
              )}

              {/* Completion photos */}
              {completionPhotos.length > 0 && (
                <View style={styles.photoGrid}>
                  <Text style={styles.photoLabel}>Foto Bukti ({completionPhotos.length})</Text>
                  <View style={styles.photoRow}>
                    {completionPhotos.map((uri, index) => (
                      <Image
                        key={index}
                        source={{ uri }}
                        style={[
                          styles.completionPhoto,
                          completionPhotos.length === 1 && styles.completionPhotoFull,
                        ]}
                        resizeMode="cover"
                      />
                    ))}
                  </View>
                </View>
              )}
            </NBCardContent>
          </NBCard>
        )}

        {/* ── Verified Info ── */}
        {task.status === 'verified' && (
          <NBCard style={styles.card}>
            <NBCardHeader>
              <Text style={[styles.sectionTitle, styles.successTitle]}>Verifikasi</Text>
            </NBCardHeader>
            <NBCardContent>
              {task.verifier && (
                <View style={styles.detailRow}>
                  <Icon name="shield-check" size={14} color={nbColors.success} />
                  <Text style={styles.detailRowText}>Diverifikasi oleh {formatUser(task.verifier)}</Text>
                </View>
              )}
              {task.verified_at && (
                <View style={styles.detailRow}>
                  <Icon name="clock-check" size={14} color={nbColors.gray['500']} />
                  <Text style={styles.detailRowText}>{formatDateTime(task.verified_at)}</Text>
                </View>
              )}
            </NBCardContent>
          </NBCard>
        )}

        {/* ── Delegation Chain (ADR-038) ── */}
        {delegations.length > 0 && (
          <NBCard style={styles.card}>
            <NBCardHeader>
              <Text style={styles.sectionTitle}>Riwayat Penugasan</Text>
            </NBCardHeader>
            <NBCardContent>
              {delegations.map((d, idx) => (
                <View key={d.id} style={styles.detailRow}>
                  <Icon
                    name={idx === delegations.length - 1 ? 'arrow-right-circle' : 'arrow-right'}
                    size={14}
                    color={nbColors.gray['500']}
                  />
                  <Text style={styles.detailRowText}>
                    {d.from_user
                      ? `${d.from_user.full_name} (${d.from_user.role})`
                      : 'Sistem'}
                    {' → '}
                    {d.to_user.full_name} ({d.to_user.role})
                    {'  ·  '}
                    {formatDateTime(d.created_at)}
                  </Text>
                </View>
              ))}
            </NBCardContent>
          </NBCard>
        )}

        {/* ── Action Buttons ── */}
        <View style={styles.actionContainer}>
          {/* Assign (pending) / Reassign (declined) — creator only */}
          {(showAssign || showReassign) && !showAssignInput && (
            <NBButton
              title={showReassign ? 'Tugaskan Ulang' : 'Tugaskan'}
              variant="primary"
              onPress={handleShowAssign}
              disabled={isSubmitting}
            />
          )}

          {/* Inline Assign Picker */}
          {showAssignInput && (
            <View style={styles.inlineInputContainer}>
              <Text style={styles.inlineInputLabel}>
                {showDelegate
                  ? 'Disposisi ke Bawahan'
                  : showReassign
                    ? 'Pilih Petugas Pengganti'
                    : 'Pilih Petugas'}
              </Text>
              <NBSelect
                value={assigneeId}
                onValueChange={(v) => setAssigneeId(String(v))}
                options={[
                  { label: '— Pilih Petugas —', value: '' },
                  ...subordinates.map((u) => ({
                    label: formatUser(u),
                    value: u.id,
                  })),
                ]}
                disabled={loadingSubordinates}
                searchable
              />
              <View style={[styles.buttonRow, { marginTop: 12 }]}>
                <View style={styles.buttonHalf}>
                  <NBButton
                    title="Batal"
                    variant="secondary"
                    onPress={() => { setShowAssignInput(false); setAssigneeId(''); }}
                    disabled={isSubmitting}
                  />
                </View>
                <View style={styles.buttonHalf}>
                  <NBButton
                    title="Tugaskan"
                    variant="primary"
                    onPress={handleAssignSubmit}
                    disabled={isSubmitting || !assigneeId}
                    loading={isSubmitting}
                  />
                </View>
              </View>
            </View>
          )}

          {/* Accept + Decline (when assigned) */}
          {(showAccept || showDecline) && !showDeclineInput && !showAssignInput && (
            <View style={styles.buttonRow}>
              {showAccept && (
                <View style={styles.buttonHalf}>
                  <NBButton title="Terima" variant="success" onPress={handleAccept} disabled={isSubmitting} loading={isSubmitting} />
                </View>
              )}
              {showDecline && (
                <View style={styles.buttonHalf}>
                  <NBButton title="Tolak" variant="danger" onPress={handleDecline} disabled={isSubmitting} />
                </View>
              )}
            </View>
          )}

          {/* Disposisi (delegate) — current assignee only, ADR-038 */}
          {showDelegate && !showAssignInput && !showDeclineInput && (
            <NBButton
              title="Disposisi ke Bawahan"
              variant="info"
              onPress={handleShowAssign}
              disabled={isSubmitting}
            />
          )}

          {/* Inline Decline Reason Input */}
          {showDeclineInput && (
            <View style={styles.inputSection}>
              <NBCardTextInput
                title="📝 Alasan Penolakan"
                required
                value={declineReason}
                onChangeText={setDeclineReason}
                placeholder="Jelaskan alasan penolakan tugas ini..."
                maxLength={1000}
                numberOfLines={4}
              />
              <View style={styles.buttonRow}>
                <View style={styles.buttonHalf}>
                  <NBButton title="Batal" variant="secondary" onPress={() => { setShowDeclineInput(false); setDeclineReason(''); }} disabled={isSubmitting} />
                </View>
                <View style={styles.buttonHalf}>
                  <NBButton title="Kirim Penolakan" variant="danger" onPress={handleDeclineSubmit} disabled={isSubmitting || !declineReason.trim()} loading={isSubmitting} />
                </View>
              </View>
            </View>
          )}

          {/* Start button */}
          {showStart && (
            <NBButton title="Mulai Kerjakan" variant="primary" onPress={handleStart} disabled={isSubmitting} loading={isSubmitting} />
          )}

          {/* Complete button */}
          {showComplete && (
            <View style={styles.buttonRow}>
              <View style={styles.buttonHalf}>
                <NBButton title="Selesai Sebagian" variant="info" onPress={() => setShowPartialComplete(true)} disabled={isSubmitting} />
              </View>
              <View style={styles.buttonHalf}>
                <NBButton title="Selesaikan Tugas" variant="success" onPress={handleComplete} disabled={isSubmitting} />
              </View>
            </View>
          )}

          {/* Verify + Revision */}
          {(showVerify || showRevision) && !showRevisionInput && (
            <View style={styles.buttonRow}>
              {showVerify && (
                <View style={styles.buttonHalf}>
                  <NBButton title="Verifikasi" variant="success" onPress={handleVerify} disabled={isSubmitting} loading={isSubmitting} />
                </View>
              )}
              {showRevision && (
                <View style={styles.buttonHalf}>
                  <NBButton title="Minta Revisi" variant="info" onPress={handleRevision} disabled={isSubmitting} />
                </View>
              )}
            </View>
          )}

          {/* Inline Revision Reason Input */}
          {showRevisionInput && (
            <View style={styles.inputSection}>
              <NBCardTextInput
                title="📝 Alasan Revisi"
                required
                value={revisionReason}
                onChangeText={setRevisionReason}
                placeholder="Jelaskan alasan mengapa tugas perlu direvisi..."
                maxLength={1000}
                numberOfLines={4}
              />
              <View style={styles.buttonRow}>
                <View style={styles.buttonHalf}>
                  <NBButton title="Batal" variant="secondary" onPress={() => { setShowRevisionInput(false); setRevisionReason(''); }} disabled={isSubmitting} />
                </View>
                <View style={styles.buttonHalf}>
                  <NBButton title="Kirim Revisi" variant="info" onPress={handleRevisionSubmit} disabled={isSubmitting || !revisionReason.trim()} loading={isSubmitting} />
                </View>
              </View>
            </View>
          )}

          <NBButton
            title="Riwayat Tugas"
            variant="secondary"
            onPress={() => setShowAuditTrail(true)}
          />

          <NBButton
            title="Kembali"
            variant="secondary"
            onPress={handleBack}
          />
        </View>
      </ScrollView>

      {/* ── Partial Complete Sheet ── */}
      <PartialCompleteSheet
        visible={showPartialComplete}
        onClose={() => setShowPartialComplete(false)}
        task={task}
        onSuccess={handlePartialCompleteSuccess}
      />

      {/* ── Audit Trail Modal ── */}
      <Modal
        visible={showAuditTrail}
        animationType="slide"
        transparent
        onRequestClose={() => setShowAuditTrail(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Riwayat Tugas</Text>
              <TouchableOpacity onPress={() => setShowAuditTrail(false)} style={styles.modalClose}>
                <Icon name="close" size={22} color={nbColors.black} />
              </TouchableOpacity>
            </View>
            <FlatList
              data={buildAuditEvents(task)}
              keyExtractor={(item) => item.key}
              contentContainerStyle={styles.timelineContainer}
              renderItem={({ item, index }) => (
                <View style={styles.timelineRow}>
                  <View style={styles.timelineLeft}>
                    <View style={[styles.timelineDot, { backgroundColor: item.color }]} />
                    {index < buildAuditEvents(task).length - 1 && (
                      <View style={styles.timelineLine} />
                    )}
                  </View>
                  <View style={styles.timelineContent}>
                    <View style={styles.timelineEventRow}>
                      <Icon name={item.icon} size={14} color={item.color} />
                      <Text style={[styles.timelineEvent, { color: item.color }]}>{item.event}</Text>
                    </View>
                    <Text style={styles.timelineTime}>{formatDateTime(item.timestamp)}</Text>
                    {item.actor ? (
                      <Text style={styles.timelineActor}>{item.actor}</Text>
                    ) : null}
                    {item.note ? (
                      <Text style={styles.timelineNote}>{item.note}</Text>
                    ) : null}
                  </View>
                </View>
              )}
            />
          </View>
        </View>
      </Modal>
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
  // Header card
  badgeRow: {
    flexDirection: 'row',
    gap: nbSpacing.sm,
    marginBottom: nbSpacing.sm,
  },
  title: {
    fontSize: fontSizes.xl,
    fontWeight: nbTypography.fontWeight.bold,
    color: nbColors.black,
    marginBottom: nbSpacing.xs,
  },
  description: {
    fontSize: fontSizes.base,
    color: nbColors.gray['700'],
    lineHeight: fontSizes.base * nbTypography.lineHeight.normal,
  },
  descriptionEmpty: {
    fontSize: fontSizes.sm,
    color: nbColors.gray['400'],
    fontStyle: 'italic',
  },
  divider: {
    height: 1,
    backgroundColor: nbColors.gray['200'],
    marginVertical: nbSpacing.sm,
  },
  metaGrid: {
    gap: nbSpacing.xs,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: nbSpacing.xs,
  },
  metaText: {
    fontSize: fontSizes.sm,
    color: nbColors.gray['600'],
  },
  metaTextDanger: {
    color: nbColors.danger,
    fontWeight: nbTypography.fontWeight.semibold,
  },
  // Section header
  sectionTitle: {
    fontSize: fontSizes.base,
    fontWeight: nbTypography.fontWeight.semibold,
    color: nbColors.black,
  },
  dangerTitle: { color: nbColors.danger },
  warningTitle: { color: nbColors.accentSunshine },
  successTitle: { color: nbColors.success },
  subText: {
    fontSize: fontSizes.xs,
    color: nbColors.gray['500'],
    marginTop: nbSpacing.xs,
  },
  // Assignment block
  assignRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: nbSpacing.sm,
  },
  assignBlock: {
    flex: 1,
  },
  assignArrow: {
    paddingTop: nbSpacing.lg,
    alignItems: 'center',
  },
  assignLabel: {
    fontSize: fontSizes.xs,
    color: nbColors.gray['500'],
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: nbSpacing.xs,
  },
  assignUserRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: nbSpacing.xs,
  },
  assignValue: {
    flex: 1,
    fontSize: fontSizes.sm,
    fontWeight: nbTypography.fontWeight.semibold,
    color: nbColors.black,
  },
  assignValueEmpty: {
    color: nbColors.gray['400'],
    fontWeight: nbTypography.fontWeight.regular,
    fontStyle: 'italic',
  },
  assignDate: {
    fontSize: fontSizes.xs,
    color: nbColors.gray['500'],
    marginTop: 2,
  },
  // Tags
  tagsContainer: {
    gap: nbSpacing.xs,
  },
  tagItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: nbSpacing.xs,
    paddingVertical: 2,
  },
  tagName: {
    fontSize: fontSizes.sm,
    color: nbColors.black,
  },
  // Detail rows
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: nbSpacing.xs,
    marginBottom: nbSpacing.xs,
  },
  detailRowText: {
    flex: 1,
    fontSize: fontSizes.sm,
    color: nbColors.gray['700'],
  },
  // Photos
  photoGrid: {
    marginTop: nbSpacing.sm,
  },
  photoLabel: {
    fontSize: fontSizes.xs,
    color: nbColors.gray['500'],
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: nbSpacing.sm,
  },
  photoRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: nbSpacing.sm,
  },
  completionPhoto: {
    width: 100,
    height: 100,
    borderWidth: nbBorders.base,
    borderColor: nbColors.black,
    borderRadius: nbBorderRadius.sm,
  },
  completionPhotoFull: {
    width: '100%',
    height: 200,
  },
  // Actions
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
  inputSection: {
    gap: nbSpacing.sm,
  },
  // Audit trail modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: nbColors.white,
    borderTopLeftRadius: nbBorderRadius.lg,
    borderTopRightRadius: nbBorderRadius.lg,
    borderWidth: nbBorders.base,
    borderColor: nbColors.black,
    maxHeight: '80%',
    paddingBottom: nbSpacing.xl,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: nbSpacing.md,
    paddingVertical: nbSpacing.md,
    borderBottomWidth: nbBorders.base,
    borderBottomColor: nbColors.gray['200'],
  },
  modalTitle: {
    fontSize: fontSizes.lg,
    fontWeight: nbTypography.fontWeight.bold,
    color: nbColors.black,
  },
  modalClose: {
    padding: nbSpacing.xs,
  },
  timelineContainer: {
    paddingHorizontal: nbSpacing.md,
    paddingTop: nbSpacing.md,
  },
  timelineRow: {
    flexDirection: 'row',
    minHeight: 60,
  },
  timelineLeft: {
    width: 24,
    alignItems: 'center',
  },
  timelineDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: nbColors.white,
    marginTop: 2,
    zIndex: 1,
  },
  timelineLine: {
    flex: 1,
    width: 2,
    backgroundColor: nbColors.gray['200'],
    marginTop: 2,
  },
  timelineContent: {
    flex: 1,
    paddingLeft: nbSpacing.sm,
    paddingBottom: nbSpacing.md,
  },
  timelineEventRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: nbSpacing.xs,
  },
  timelineEvent: {
    fontSize: fontSizes.sm,
    fontWeight: nbTypography.fontWeight.semibold,
  },
  timelineTime: {
    fontSize: fontSizes.xs,
    color: nbColors.gray['500'],
    marginTop: 2,
  },
  timelineActor: {
    fontSize: fontSizes.xs,
    color: nbColors.gray['600'],
    marginTop: 2,
  },
  timelineNote: {
    fontSize: fontSizes.xs,
    color: nbColors.gray['700'],
    fontStyle: 'italic',
    marginTop: 4,
    backgroundColor: nbColors.gray['100'],
    paddingHorizontal: nbSpacing.sm,
    paddingVertical: nbSpacing.xs,
    borderRadius: nbBorderRadius.sm,
    borderLeftWidth: 2,
    borderLeftColor: nbColors.gray['300'],
  },
});

export default TaskDetailScreen;
