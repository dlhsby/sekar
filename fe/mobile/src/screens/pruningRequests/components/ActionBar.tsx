/**
 * ActionBar — admin + submitter action buttons at bottom of screen
 * Handles schedule, approve/reject, convert, cancel flows.
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
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
  const { t } = useTranslation('pruning');

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
              label={needsSchedule ? t('detail.scheduleButtonLabel') : t('detail.rescheduleButtonLabel')}
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
                  label={t('detail.rejectButtonLabel')}
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
                  label={t('actions.approve.yes')}
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
                  label={t('actions.cancel.no')}
                  onPress={onRejectCancel}
                  disabled={reviewingId === requestId}
                  size="lg"
                  fullWidth
                />
              </View>
              <View style={styles.adminButtonHalf}>
                <NBButton
                  variant="danger"
                  label={t('actions.reject.confirm')}
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
              label={t('actionBar.convertLabel')}
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
            label={t('actions.cancel.confirm')}
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
          title={`📝 ${t('submit.reasonLabel')}`}
          required
          value={rejectReason}
          onChangeText={onRejectReasonChange}
          placeholder={t('reassign.reasonPlaceholder')}
          maxLength={1000}
          numberOfLines={4}
          style={styles.rejectInputSection}
        />
      ) : null}
    </View>
  );
}
