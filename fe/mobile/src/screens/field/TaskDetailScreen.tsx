/**
 * Task Detail Screen
 * Phase 2C: 8-status workflow with accept/decline + verify/revision
 * Refactored: logic extracted to hooks; JSX to components
 */

import React, { useCallback, useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  Modal,
  TouchableOpacity,
  BackHandler,
} from 'react-native';
import { useNavigation, useRoute, RouteProp, useFocusEffect } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import {
  NBCard,
  NBCardHeader,
  NBCardContent,
  NBBackgroundPattern,
  NBAlert,
  NBButton,
  NBSelect,
  NBText,
} from '../../components/nb';
import { nbColors, nbSpacing, nbRadius } from '../../constants/nbTokens';
import { PartialCompleteSheet } from '../../components/tasks/PartialCompleteSheet';

import type { MainTabParamList, MainTabScreenProps } from '../../types/navigation.types';
import type { TaskStatus } from '../../types/models.types';
import { useAppSelector } from '../../store/hooks';

import {
  useTaskDetail,
  useTaskActions,
  useTaskTags,
  useTaskAssignment,
  useTaskVisibility,
} from './hooks';
import {
  TaskHeader,
  TaskMetadata,
  TaskAssignmentInfo,
  TaskAuditTimeline,
  TaskDelegations,
  TaskCompletionPhotos,
  TaskActionButtons,
} from './components';

type TaskDetailRouteProp = RouteProp<MainTabParamList, 'TaskDetail'>;
type TaskDetailNavigationProp = MainTabScreenProps<'TaskDetail'>['navigation'];

export function TaskDetailScreen(): React.JSX.Element {
  const navigation = useNavigation<TaskDetailNavigationProp>();
  const route = useRoute<TaskDetailRouteProp>();
  const { taskId } = route.params;

  const user = useAppSelector((state) => state.auth.user);

  const { task, isLoading, isRefreshing, delegations, fetchTask, handleRefresh } =
    useTaskDetail(taskId);

  const { subordinates, loadingSubordinates, loadSubordinates } =
    useTaskAssignment(user?.role ?? undefined);

  const actions = useTaskActions(task, fetchTask);

  const tags = useTaskTags(task, fetchTask, loadSubordinates);

  const visibility = useTaskVisibility(task, user);

  const [showAuditTrail, setShowAuditTrail] = useState(false);
  const [showPartialComplete, setShowPartialComplete] = useState(false);

  const handleBack = useCallback(() => {
    const backTarget = route.params.from;
    const backTargetParams = route.params.fromParams;
    if (backTarget) {
      (navigation as any).navigate(backTarget, backTargetParams);
    } else {
      (navigation as any).navigate('TasksActivities', { initialTab: 'tasks' });
    }
  }, [route.params.from, route.params.fromParams, navigation]);

  useFocusEffect(
    useCallback(() => {
      const sub = BackHandler.addEventListener('hardwareBackPress', () => {
        handleBack();
        return true;
      });
      return () => sub.remove();
    }, [handleBack]),
  );

  const handleShowAssign = useCallback(() => {
    actions.setAssigneeId('');
    actions.setShowAssignInput(true);
    loadSubordinates();
  }, [actions, loadSubordinates]);

  const handlePartialCompleteSuccess = useCallback(() => {
    setShowPartialComplete(false);
    fetchTask();
  }, [fetchTask]);

  if (isLoading) {
    return (
      <NBBackgroundPattern pattern="dots" backgroundColor={nbColors.bgCanvas} patternColor={nbColors.primary} opacity={0.06}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={nbColors.primary} />
          <NBText variant="body" style={styles.loadingTextMargin}>Memuat tugas...</NBText>
        </View>
      </NBBackgroundPattern>
    );
  }

  if (!task) {
    return (
      <NBBackgroundPattern pattern="dots" backgroundColor={nbColors.bgCanvas} patternColor={nbColors.primary} opacity={0.06}>
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

  return (
    <NBBackgroundPattern pattern="dots" backgroundColor={nbColors.bgCanvas} patternColor={nbColors.primary} opacity={0.06}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.contentContainer}
        refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} />}
      >
        {/* ── Task Header Card ── */}
        <NBCard style={styles.card}>
          <NBCardContent>
            <TaskHeader task={task} />

            {/* Divider */}
            <View style={styles.divider} />

            {/* Metadata */}
            <TaskMetadata task={task} isDeadlinePast={visibility.isDeadlinePast} />
          </NBCardContent>
        </NBCard>

        {/* ── Assignment Info Card ── */}
        <NBCard style={styles.card}>
          <NBCardHeader>
            <NBText variant="h3" style={styles.sectionTitleStyle}>Penugasan</NBText>
          </NBCardHeader>
          <NBCardContent>
            <TaskAssignmentInfo task={task} />
          </NBCardContent>
        </NBCard>

        {/* ── Tagged Users (editable by creator or accepted assignee) ── */}
        {renderTagsSection()}

        {/* ── Declined/Revision Reasons ── */}
        {task.status === 'declined' && task.decline_reason && renderDeclineReason()}
        {task.status === 'revision_needed' && task.revision_reason && renderRevisionReason()}

        {/* ── Completion Details ── */}
        {(task.status === 'completed' || task.status === 'verified') && (
          <NBCard style={styles.card}>
            <NBCardHeader>
              <NBText variant="h3" style={styles.sectionTitleStyle}>Detail Penyelesaian</NBText>
            </NBCardHeader>
            <NBCardContent>
              <TaskCompletionPhotos task={task} />
            </NBCardContent>
          </NBCard>
        )}

        {/* ── Verified Info ── */}
        {task.status === 'verified' && renderVerifiedInfo()}

        {/* ── Delegation Chain (ADR-038) ── */}
        {delegations.length > 0 && (
          <NBCard style={styles.card}>
            <NBCardHeader>
              <NBText variant="h3" style={styles.sectionTitleStyle}>Riwayat Penugasan</NBText>
            </NBCardHeader>
            <NBCardContent>
              <TaskDelegations delegations={delegations} />
            </NBCardContent>
          </NBCard>
        )}

        {/* ── Action Buttons ── */}
        <TaskActionButtons
          visibility={visibility}
          actions={actions}
          subordinates={subordinates}
          loadingSubordinates={loadingSubordinates}
          onAssignClick={handleShowAssign}
        />

        <View style={styles.actionContainer}>
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
        animationType="fade"
        hardwareAccelerated={false}
        transparent
        onRequestClose={() => setShowAuditTrail(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <NBText variant="h2" style={styles.modalTitle}>Riwayat Tugas</NBText>
              <TouchableOpacity onPress={() => setShowAuditTrail(false)} style={styles.modalClose}>
                <Icon name="close" size={22} color={nbColors.black} />
              </TouchableOpacity>
            </View>
            <TaskAuditTimeline task={task} />
          </View>
        </View>
      </Modal>
    </NBBackgroundPattern>
  );

  function renderTagsSection() {
    if (!task) { return null; }
    const sealedStatuses: TaskStatus[] = ['completed', 'verified', 'declined'];
    const assigneeCanEdit = tags.isEditingTags === false &&
      (task.status === 'accepted' || task.status === 'in_progress' || task.status === 'revision_needed');
    const canEditTags = (user?.id === task.created_by || assigneeCanEdit) && !sealedStatuses.includes(task.status);
    const hasTags = task.tags && task.tags.length > 0;

    if (!hasTags && !canEditTags) { return null; }

    const tagOptions = subordinates.map((u) => ({
      label: `${(u.role.charAt(0).toUpperCase() + u.role.slice(1))} · ${u.full_name}`,
      value: u.id,
    }));

    return (
      <NBCard style={styles.card}>
        <NBCardHeader>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <NBText variant="h3" style={styles.sectionTitleStyle}>Tag Petugas Terlibat</NBText>
            {canEditTags && !tags.isEditingTags && (
              <TouchableOpacity onPress={tags.handleStartEditTags} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Icon name="pencil-outline" size={18} color={nbColors.primary} />
              </TouchableOpacity>
            )}
          </View>
        </NBCardHeader>
        <NBCardContent>
          {!tags.isEditingTags ? (
            hasTags ? (
              <View style={styles.tagsContainer}>
                {task.tags!.map((tag) => (
                  <View key={tag.id} style={styles.tagItem}>
                    <Icon name="tag-outline" size={14} color={nbColors.gray500} />
                    <NBText variant="body-sm" style={styles.tagNameStyle}>{tag.user?.full_name ?? '—'}</NBText>
                  </View>
                ))}
              </View>
            ) : (
              <NBText variant="body-sm" style={styles.subTextStyle}>
                Belum ada petugas yang di-tag. Tap ikon pensil untuk menambah.
              </NBText>
            )
          ) : (
            <View>
              {loadingSubordinates ? (
                <ActivityIndicator color={nbColors.primary} />
              ) : tagOptions.length === 0 ? (
                <NBText variant="body-sm" style={styles.subTextStyle}>
                  Tidak ada petugas yang dapat di-tag.
                </NBText>
              ) : (
                <NBSelect
                  label="Pilih petugas untuk di-tag"
                  selectedValues={tags.tagPickerSelection}
                  onValuesChange={tags.setTagPickerSelection}
                  options={tagOptions}
                  placeholder="Cari & pilih petugas..."
                  searchable
                  searchPlaceholder="Cari nama petugas..."
                />
              )}
              <View style={{ flexDirection: 'row', gap: nbSpacing.sm, marginTop: nbSpacing.md }}>
                <View style={{ flex: 1 }}>
                  <NBButton
                    title="Batal"
                    variant="ghost"
                    size="lg"
                    onPress={tags.handleCancelEditTags}
                    disabled={tags.isSavingTags}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <NBButton
                    title="Simpan"
                    variant="primary"
                    size="lg"
                    onPress={tags.handleSaveTags}
                    disabled={tags.isSavingTags}
                    loading={tags.isSavingTags}
                  />
                </View>
              </View>
            </View>
          )}
        </NBCardContent>
      </NBCard>
    );
  }

  function renderDeclineReason() {
    if (!task || !task.decline_reason) { return null; }
    return (
      <NBCard style={styles.card}>
        <NBCardHeader>
          <NBText variant="h3" style={[styles.sectionTitleStyle, styles.dangerTitleStyle]} color="danger">Alasan Penolakan</NBText>
        </NBCardHeader>
        <NBCardContent>
          <NBText variant="body" style={styles.descriptionStyle}>{task.decline_reason}</NBText>
          {task.declined_at && (
            <NBText variant="body-sm" style={styles.subTextStyle}>Ditolak pada {(new Date(task.declined_at)).toLocaleString()}</NBText>
          )}
        </NBCardContent>
      </NBCard>
    );
  }

  function renderRevisionReason() {
    if (!task || !task.revision_reason) { return null; }
    return (
      <NBCard style={styles.card}>
        <NBCardHeader>
          <NBText variant="h3" style={[styles.sectionTitleStyle, styles.warningTitleStyle]} color="warning">Alasan Revisi</NBText>
        </NBCardHeader>
        <NBCardContent>
          <NBText variant="body" style={styles.descriptionStyle}>{task.revision_reason}</NBText>
        </NBCardContent>
      </NBCard>
    );
  }

  function renderVerifiedInfo() {
    if (!task) { return null; }
    return (
      <NBCard style={styles.card}>
        <NBCardHeader>
          <NBText variant="h3" style={[styles.sectionTitleStyle, styles.successTitleStyle]} color="success">Verifikasi</NBText>
        </NBCardHeader>
        <NBCardContent>
          {task.verifier && (
            <View style={styles.detailRow}>
              <Icon name="shield-check" size={14} color={nbColors.success} />
              <NBText variant="body-sm" style={styles.detailRowTextStyle}>Diverifikasi oleh {task.verifier.full_name}</NBText>
            </View>
          )}
          {task.verified_at && (
            <View style={styles.detailRow}>
              <Icon name="clock-check" size={14} color={nbColors.gray500} />
              <NBText variant="body-sm" style={styles.detailRowTextStyle}>{(new Date(task.verified_at)).toLocaleString()}</NBText>
            </View>
          )}
        </NBCardContent>
      </NBCard>
    );
  }
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'transparent' },
  contentContainer: { paddingVertical: nbSpacing.md, paddingBottom: nbSpacing.xl },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingTextMargin: { marginTop: nbSpacing.md },
  card: { marginHorizontal: nbSpacing.md, marginBottom: nbSpacing.md },
  divider: { height: 1, backgroundColor: nbColors.gray200, marginVertical: nbSpacing.sm },
  sectionTitleStyle: { marginBottom: nbSpacing.xs },
  dangerTitleStyle: {},
  warningTitleStyle: {},
  successTitleStyle: {},
  subTextStyle: { marginTop: nbSpacing.xs },
  descriptionStyle: {},
  tagsContainer: { gap: nbSpacing.xs },
  tagItem: { flexDirection: 'row', alignItems: 'center', gap: nbSpacing.xs, paddingVertical: 2 },
  tagNameStyle: {},
  detailRow: { flexDirection: 'row', alignItems: 'center', gap: nbSpacing.xs, marginBottom: nbSpacing.xs },
  detailRowTextStyle: { flex: 1 },
  actionContainer: { marginHorizontal: nbSpacing.md, marginTop: nbSpacing.md, gap: nbSpacing.sm },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContainer: { backgroundColor: nbColors.white, borderTopLeftRadius: nbRadius.lg, borderTopRightRadius: nbRadius.lg, borderWidth: 1, borderColor: nbColors.black, maxHeight: '80%', paddingBottom: nbSpacing.xl },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: nbSpacing.md, paddingVertical: nbSpacing.md, borderBottomWidth: 1, borderBottomColor: nbColors.gray200 },
  modalTitle: {},
  modalClose: { padding: nbSpacing.xs },
});

export default TaskDetailScreen;
