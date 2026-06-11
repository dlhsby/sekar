/**
 * ActionBar — admin + submitter action buttons at bottom of screen
 * Handles schedule, approve/reject, convert, cancel flows.
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { NBButton, NBCardTextInput } from '../../../components/nb';
import { nbSpacing } from '../../../constants/nbTokens';
import type { PruningRequest } from '../../../types/models.types';

interface ActionBarProps {
  request: PruningRequest;
  canAdmin: boolean;
  canCancel: boolean;
  showAdminBar: boolean;
  isReschedulable: boolean;
  needsSchedule: boolean;
  canActApprove: boolean;
  canReject: boolean;
  canConvert: boolean;
  showRejectInput: boolean;
  rejectReason: string;
  reviewingId: string | null;
  requestId: string;
  onReschedule: () => void;
  onApprove: () => void;
  onRejectPress: () => void;
  onRejectSubmit: () => void;
  onRejectCancel: () => void;
  onRejectReasonChange: (text: string) => void;
  onConvert: () => void;
  onCancel: () => void;
}

const styles = StyleSheet.create({
  actionBar: {
    paddingHorizontal: nbSpacing.md,
    paddingTop: nbSpacing.md,
    paddingBottom: nbSpacing.md,
    gap: nbSpacing.sm,
  },
  actionBarStack: {
    gap: nbSpacing.sm,
  },
  adminButtonRow: {
    flexDirection: 'row',
    gap: nbSpacing.sm,
  },
  adminButtonHalf: {
    flex: 1,
  },
  rejectInputSection: {
    marginHorizontal: nbSpacing.md,
    marginBottom: nbSpacing.md,
  },
});

export function ActionBar({
  request,
  canAdmin,
  canCancel,
  showAdminBar,
  isReschedulable,
  needsSchedule,
  canActApprove,
  canReject,
  canConvert,
  showRejectInput,
  rejectReason,
  reviewingId,
  requestId,
  onReschedule,
  onApprove,
  onRejectPress,
  onRejectSubmit,
  onRejectCancel,
  onRejectReasonChange,
  onConvert,
  onCancel,
}: ActionBarProps): React.JSX.Element | null {
  if (!showAdminBar && !canCancel) {
    return null;
  }

  return (
    <View style={styles.actionBar} pointerEvents="box-none">
      {showAdminBar ? (
        <View style={styles.actionBarStack}>
          {isReschedulable ? (
            <NBButton
              variant={needsSchedule ? 'primary' : 'secondary'}
              label={needsSchedule ? 'Atur Jadwal' : 'Atur Ulang Jadwal'}
              leftIcon="calendar-edit"
              onPress={onReschedule}
              testID="perantingan-reschedule-open"
              size="lg"
              fullWidth
            />
          ) : null}

          {canReject && !showRejectInput ? (
            <View style={styles.adminButtonRow}>
              <View style={styles.adminButtonHalf}>
                <NBButton
                  variant="danger"
                  label="Tolak"
                  leftIcon="close"
                  onPress={onRejectPress}
                  disabled={reviewingId === requestId}
                  size="lg"
                  fullWidth
                />
              </View>
              <View style={styles.adminButtonHalf}>
                <NBButton
                  variant="success"
                  label="Setujui"
                  leftIcon="check"
                  onPress={onApprove}
                  disabled={!canActApprove || reviewingId === requestId}
                  size="lg"
                  fullWidth
                />
              </View>
            </View>
          ) : null}

          {canReject && showRejectInput ? (
            <View style={styles.adminButtonRow}>
              <View style={styles.adminButtonHalf}>
                <NBButton
                  variant="secondary"
                  label="Batal"
                  onPress={onRejectCancel}
                  disabled={reviewingId === requestId}
                  size="lg"
                  fullWidth
                />
              </View>
              <View style={styles.adminButtonHalf}>
                <NBButton
                  variant="danger"
                  label="Kirim Penolakan"
                  leftIcon="close"
                  onPress={onRejectSubmit}
                  disabled={!rejectReason.trim() || reviewingId === requestId}
                  size="lg"
                  fullWidth
                />
              </View>
            </View>
          ) : null}

          {canAdmin && request.status === 'approved' ? (
            <NBButton
              variant="primary"
              label="Tugaskan ke Petugas"
              leftIcon="arrow-right"
              onPress={onConvert}
              disabled={!canConvert}
              size="lg"
              fullWidth
            />
          ) : null}
        </View>
      ) : null}

      {canCancel ? (
        <View style={styles.actionBarStack}>
          <NBButton
            variant="danger"
            label="Batalkan Permohonan"
            leftIcon="cancel"
            onPress={onCancel}
            testID="perantingan-cancel-cta"
            size="lg"
            fullWidth
          />
        </View>
      ) : null}

      {canAdmin && showRejectInput ? (
        <NBCardTextInput
          title="📝 Alasan Penolakan"
          required
          value={rejectReason}
          onChangeText={onRejectReasonChange}
          placeholder="Jelaskan alasan penolakan permohonan ini…"
          maxLength={1000}
          numberOfLines={4}
          style={styles.rejectInputSection}
        />
      ) : null}
    </View>
  );
}
