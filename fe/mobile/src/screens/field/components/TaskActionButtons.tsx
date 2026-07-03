/**
 * TaskActionButtons Component
 * Renders all task action buttons and inline input sections
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
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
  const { t } = useTranslation();
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
          title={showAssign ? t('tasks:actionButtons.assign') : t('tasks:actionButtons.reassign')}
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
                ? t('tasks:actionButtons.selectDelegate')
                : (showReassign || showReassignByCreator)
                  ? t('tasks:actionButtons.selectReplacement')
                  : t('tasks:actionButtons.selectOfficer')
            }
            value={assigneeId}
            onValueChange={(v) => setAssigneeId(String(v))}
            options={[
              { label: t('tasks:actionButtons.placeholder'), value: '' },
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
                title={t('tasks:actionButtons.cancel')}
                variant="secondary"
                onPress={() => { setShowAssignInput(false); setAssigneeId(''); }}
                disabled={isSubmitting}
              />
            </View>
            <View style={styles.buttonHalf}>
              <NBButton
                title={t('tasks:actionButtons.submit')}
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
              <NBButton title={t('tasks:actionButtons.accept')} variant="success" onPress={handleAccept} disabled={isSubmitting} loading={isSubmitting} />
            </View>
          )}
          {showDecline && (
            <View style={styles.buttonHalf}>
              <NBButton title={t('tasks:actionButtons.decline')} variant="danger" onPress={handleDecline} disabled={isSubmitting} />
            </View>
          )}
        </View>
      )}

      {/* Delegate button */}
      {showDelegate && !showAssignInput && !showDeclineInput && (
        <NBButton
          title={t('tasks:actionButtons.delegate')}
          variant="info"
          onPress={onAssignClick}
          disabled={isSubmitting}
        />
      )}

      {/* Inline Decline Input */}
      {showDeclineInput && (
        <View style={styles.inputSection}>
          <NBCardTextInput
            title={`📝 ${t('tasks:actionButtons.declineReason')}`}
            required
            value={declineReason}
            onChangeText={setDeclineReason}
            placeholder={t('tasks:actionButtons.declineReasonPlaceholder')}
            maxLength={1000}
            numberOfLines={4}
          />
          <View style={styles.buttonRow}>
            <View style={styles.buttonHalf}>
              <NBButton title={t('tasks:actionButtons.cancel')} variant="secondary" onPress={() => { setShowDeclineInput(false); setDeclineReason(''); }} disabled={isSubmitting} />
            </View>
            <View style={styles.buttonHalf}>
              <NBButton title={t('tasks:actionButtons.sendDecline')} variant="danger" onPress={handleDeclineSubmit} disabled={isSubmitting || !declineReason.trim()} loading={isSubmitting} />
            </View>
          </View>
        </View>
      )}

      {/* Start button */}
      {showStart && (
        <NBButton title={t('tasks:actionButtons.start')} variant="primary" onPress={handleStart} disabled={isSubmitting} loading={isSubmitting} />
      )}

      {/* Complete button */}
      {showComplete && (
        <NBButton title={t('tasks:actionButtons.complete')} variant="success" onPress={handleComplete} disabled={isSubmitting} />
      )}

      {/* Verify + Revision buttons */}
      {(showVerify || showRevision) && !showRevisionInput && (
        <View style={styles.buttonRow}>
          {showVerify && (
            <View style={styles.buttonHalf}>
              <NBButton title={t('tasks:actionButtons.verify')} variant="success" onPress={handleVerify} disabled={isSubmitting} loading={isSubmitting} />
            </View>
          )}
          {showRevision && (
            <View style={styles.buttonHalf}>
              <NBButton title={t('tasks:actionButtons.revision')} variant="info" onPress={handleRevision} disabled={isSubmitting} />
            </View>
          )}
        </View>
      )}

      {/* Inline Revision Input */}
      {showRevisionInput && (
        <View style={styles.inputSection}>
          <NBCardTextInput
            title={`📝 ${t('tasks:actionButtons.revisionReason')}`}
            required
            value={revisionReason}
            onChangeText={setRevisionReason}
            placeholder={t('tasks:actionButtons.revisionReasonPlaceholder')}
            maxLength={1000}
            numberOfLines={4}
          />
          <View style={styles.buttonRow}>
            <View style={styles.buttonHalf}>
              <NBButton title={t('tasks:actionButtons.cancel')} variant="secondary" onPress={() => { setShowRevisionInput(false); setRevisionReason(''); }} disabled={isSubmitting} />
            </View>
            <View style={styles.buttonHalf}>
              <NBButton title={t('tasks:actionButtons.sendRevision')} variant="info" onPress={handleRevisionSubmit} disabled={isSubmitting || !revisionReason.trim()} loading={isSubmitting} />
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
