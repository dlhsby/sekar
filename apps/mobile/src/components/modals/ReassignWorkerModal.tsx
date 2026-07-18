/**
 * ReassignWorkerModal Component
 * Phase 2D Gap #5: Modal for reassigning workers between areas.
 * Lists active workers from source rayon, allows selection and reassignment.
 */

import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { NBModal } from '../nb';
import { NBButton } from '../nb';
import {
  nbColors,
  nbSpacing,
  nbType,
  nbBorders,
  nbRadius,
} from '../../constants/nbTokens';
import { getStatusColor } from '../../utils/mapUtils';
import { ROLE_LABELS } from '../../constants/roles';
import { getLiveUsers, reassignWorker } from '../../services/api/monitoringApi';
import type { LiveUser, AreaBoundary, UserRole, TrackingStatus } from '../../types/models.types';

// ─── Props ────────────────────────────────────────────────────────────────────

interface ReassignWorkerModalProps {
  visible: boolean;
  onClose: () => void;
  targetArea: AreaBoundary | null;
  sourceRayonId?: string;
  onSuccess?: () => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function ReassignWorkerModal({
  visible,
  onClose,
  targetArea,
  sourceRayonId,
  onSuccess,
}: ReassignWorkerModalProps): React.JSX.Element {
  const { t } = useTranslation('monitoring');
  const [candidates, setCandidates] = useState<LiveUser[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [reason, setReason] = useState('');

  // Fetch candidates when modal opens
  useEffect(() => {
    if (!visible || !sourceRayonId) {
      setCandidates([]);
      setSelectedUserId(null);
      setReason('');
      return;
    }
    setIsLoading(true);
    getLiveUsers({ rayon_id: sourceRayonId, status: ['active'] })
      .then(res => {
        if (res.data?.users) {
          // Exclude workers already in the target area
          const filtered = res.data.users.filter(
            u => u.location_id !== targetArea?.id,
          );
          setCandidates(filtered);
        }
      })
      .catch(() => {})
      .finally(() => setIsLoading(false));
  }, [visible, sourceRayonId, targetArea?.id]);

  const handleSubmit = useCallback(async () => {
    if (!selectedUserId || !targetArea) return;

    setIsSubmitting(true);
    const res = await reassignWorker({
      user_id: selectedUserId,
      target_area_id: targetArea.id,
      reason: reason.trim() || undefined,
    });

    setIsSubmitting(false);

    if (res.error) {
      Alert.alert(t('reassignWorkerModal.errorTitle'), res.error);
      return;
    }

    const user = candidates.find(u => u.id === selectedUserId);
    Alert.alert(
      t('reassignWorkerModal.successTitle'),
      t('reassignWorkerModal.successMessage', {
        name: user?.full_name ?? '',
        area: targetArea.name,
      }),
    );
    onSuccess?.();
    onClose();
  }, [selectedUserId, targetArea, reason, candidates, onClose, onSuccess, t]);

  const footerContent = (
    <NBButton
      title={t('reassignWorkerModal.confirmButton')}
      variant="primary"
      onPress={handleSubmit}
      disabled={!selectedUserId || isSubmitting}
      loading={isSubmitting}
      fullWidth
    />
  );

  return (
    <NBModal
      visible={visible}
      onClose={onClose}
      title={t('reassignWorkerModal.title')}
      type="sheet"
      avoidKeyboard
      footer={footerContent}
    >
      {/* Target area info */}
      {targetArea && (
        <View style={styles.targetInfo}>
          <Text style={styles.targetLabel}>{t('reassignWorkerModal.targetLabel')}</Text>
          <Text style={styles.targetName}>{targetArea.name}</Text>
          <Text style={styles.targetStats}>
            {targetArea.total_active}/{targetArea.total_required} {t('reassignWorkerModal.active')}
          </Text>
        </View>
      )}

      {isLoading ? (
        <ActivityIndicator
          size="small"
          color={nbColors.primary}
          style={styles.loader}
        />
      ) : candidates.length === 0 ? (
        <Text style={styles.emptyText}>
          {t('reassignWorkerModal.noWorkersAvailable')}
        </Text>
      ) : (
        <>
          <Text style={styles.sectionLabel}>{t('reassignWorkerModal.selectWorkerLabel')}</Text>
          {candidates.map(user => {
            const isSelected = selectedUserId === user.id;
            const statusColor = getStatusColor(user.status as TrackingStatus);
            return (
              <TouchableOpacity
                key={user.id}
                style={[styles.userRow, isSelected && styles.userRowSelected]}
                onPress={() => setSelectedUserId(user.id)}
                activeOpacity={0.7}
              >
                <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
                <View style={styles.userInfo}>
                  <Text style={styles.userName}>{user.full_name}</Text>
                  <Text style={styles.userMeta}>
                    {ROLE_LABELS[user.role as UserRole] ?? user.role} - {user.area_name}
                  </Text>
                </View>
                {isSelected && (
                  <MaterialCommunityIcons
                    name="check-circle"
                    size={20}
                    color={nbColors.primary}
                  />
                )}
              </TouchableOpacity>
            );
          })}
        </>
      )}

      {/* Reason input */}
      {selectedUserId && (
        <View style={styles.reasonSection}>
          <Text style={styles.sectionLabel}>{t('reassignWorkerModal.reasonLabel')}</Text>
          <TextInput
            style={styles.reasonInput}
            value={reason}
            onChangeText={setReason}
            placeholder={t('reassignWorkerModal.reasonPlaceholder')}
            placeholderTextColor={nbColors.gray400}
            multiline
            maxLength={200}
          />
          <Text style={styles.charCount}>{reason.length}/200</Text>
        </View>
      )}
    </NBModal>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  targetInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: nbSpacing.md,
    paddingVertical: nbSpacing.sm,
    marginBottom: nbSpacing.md,
    backgroundColor: nbColors.gray100,
    borderRadius: nbRadius.base,
    gap: nbSpacing.xs,
  },
  targetLabel: {
    fontSize: nbType.bodySm.fontSize,
    color: nbColors.gray600,
  },
  targetName: {
    fontSize: nbType.bodySm.fontSize,
    fontWeight: nbType.h1.fontWeight,
    color: nbColors.black,
    flex: 1,
  },
  targetStats: {
    fontSize: nbType.caption.fontSize,
    color: nbColors.gray600,
  },
  loader: {
    marginVertical: nbSpacing.xl,
  },
  emptyText: {
    fontSize: nbType.bodySm.fontSize,
    color: nbColors.gray500,
    fontStyle: 'italic',
    textAlign: 'center',
    marginVertical: nbSpacing.xl,
  },
  sectionLabel: {
    fontSize: nbType.bodySm.fontSize,
    fontWeight: nbType.h1.fontWeight,
    color: nbColors.gray700,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: nbSpacing.sm,
  },
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: nbSpacing.sm,
    paddingHorizontal: nbSpacing.sm,
    borderRadius: nbRadius.base,
    marginBottom: nbSpacing.xs,
    backgroundColor: nbColors.gray100,
    gap: nbSpacing.sm,
  },
  userRowSelected: {
    backgroundColor: `${nbColors.primary}22`,
    borderWidth: 1,
    borderColor: nbColors.primary,
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: nbType.body.fontSize,
    fontWeight: nbType.h2.fontWeight,
    color: nbColors.black,
  },
  userMeta: {
    fontSize: nbType.bodySm.fontSize,
    color: nbColors.gray600,
    marginTop: 2,
  },
  reasonSection: {
    marginTop: nbSpacing.md,
  },
  reasonInput: {
    backgroundColor: nbColors.gray100,
    borderRadius: nbRadius.base,
    borderWidth: nbBorders.widthThin,
    borderColor: nbColors.gray300,
    paddingHorizontal: nbSpacing.md,
    paddingVertical: nbSpacing.sm,
    fontSize: nbType.body.fontSize,
    color: nbColors.black,
    minHeight: 60,
    textAlignVertical: 'top',
  },
  charCount: {
    fontSize: nbType.caption.fontSize,
    color: nbColors.gray400,
    textAlign: 'right',
    marginTop: 4,
  },
});
