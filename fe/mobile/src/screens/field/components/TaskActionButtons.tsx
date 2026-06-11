/**
 * TaskActionButtons Component
 * Renders all task action buttons and inline input sections
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import {
  NBButton,
  NBSelect,
  NBCardTextInput,
} from '../../../components/nb';
import { nbSpacing } from '../../../constants/nbTokens';
import { formatUser } from '../hooks/taskHelpers';
import type { User } from '../../../types/models.types';
import type { UseTaskVisibilityReturn } from '../hooks/useTaskVisibility';
import type { UseTaskActionsReturn } from '../hooks/useTaskActions';

interface TaskActionButtonsProps {
  visibility: UseTaskVisibilityReturn;
  actions: UseTaskActionsReturn;
  subordinates: User[];
  loadingSubordinates: boolean;
  onAssignClick: () => void;
}

export function TaskActionButtons({
  visibility,
  actions,
  subordinates,
  loadingSubordinates,
  onAssignClick,
}: TaskActionButtonsProps): React.JSX.Element {
  const {
    showAccept,
    showDecline,
    showStart,
    showComplete,
    showAssign,
    showReassign,
    showReassignByCreator,
    showDelegate,
    showVerify,
    showRevision,
  } = visibility;

  const {
    isSubmitting,
    showAssignInput,
    assigneeId,
    setAssigneeId,
    setShowAssignInput,
    handleAccept,
    handleDecline,
    handleDeclineSubmit,
    declineReason,
    setDeclineReason,
    showDeclineInput,
    setShowDeclineInput,
    handleStart,
    handleComplete,
    handleVerify,
    handleRevision,
    handleRevisionSubmit,
    revisionReason,
    setRevisionReason,
    showRevisionInput,
    setShowRevisionInput,
  } = actions;

  return (
    <View style={styles.actionContainer}>
      {/* Assign / Reassign buttons */}
      {(showAssign || showReassign || showReassignByCreator) && !showAssignInput && (
        <NBButton
          title={showAssign ? 'Tugaskan' : 'Tugaskan Ulang'}
          variant="primary"
          onPress={onAssignClick}
          disabled={isSubmitting}
        />
      )}

      {/* Inline Assign Picker */}
      {showAssignInput && (
        <View style={styles.inlineInputContainer}>
          <NBSelect
            label={
              showDelegate
                ? 'Disposisi ke Bawahan'
                : (showReassign || showReassignByCreator)
                  ? 'Pilih Petugas Pengganti'
                  : 'Pilih Petugas'
            }
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
                onPress={actions.handleAssignSubmit}
                disabled={isSubmitting || !assigneeId}
                loading={isSubmitting}
              />
            </View>
          </View>
        </View>
      )}

      {/* Accept + Decline buttons */}
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

      {/* Delegate button */}
      {showDelegate && !showAssignInput && !showDeclineInput && (
        <NBButton
          title="Disposisi ke Bawahan"
          variant="info"
          onPress={onAssignClick}
          disabled={isSubmitting}
        />
      )}

      {/* Inline Decline Input */}
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
        <NBButton title="Selesaikan Tugas" variant="success" onPress={handleComplete} disabled={isSubmitting} />
      )}

      {/* Verify + Revision buttons */}
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

      {/* Inline Revision Input */}
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
    </View>
  );
}

const styles = StyleSheet.create({
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
  inputSection: {
    gap: nbSpacing.sm,
  },
});
