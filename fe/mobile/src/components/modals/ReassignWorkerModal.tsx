/**
 * ReassignWorkerModal Component
 * Phase 2D Gap #5: Modal for reassigning workers between areas.
 * Lists active workers from source rayon, allows selection and reassignment.
 */

import React, { useState, useCallback, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
} from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { NBModal } from '../nb';
import { NBButton } from '../nb';
import {
  nbColors,
  nbSpacing,
  nbTypography,
  nbBorders,
  nbRadius,
  nbShadows,
} from '../../constants/nbTokens';
import { getStatusColor, getStatusLabel } from '../../utils/mapUtils';
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
            u => u.area_id !== targetArea?.id,
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
      Alert.alert('Gagal', res.error);
      return;
    }

    const user = candidates.find(u => u.id === selectedUserId);
    Alert.alert(
      'Berhasil',
      `Berhasil reassign ${user?.full_name ?? ''} ke ${targetArea.name}`,
    );
    onSuccess?.();
    onClose();
  }, [selectedUserId, targetArea, reason, candidates, onClose, onSuccess]);

  const footerContent = (
    <NBButton
      title="Konfirmasi Pindah"
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
      title="Pindah Petugas"
      type="sheet"
      size="md"
      scrollable
      avoidKeyboard
      footer={footerContent}
    >
      {/* Target area info */}
      {targetArea && (
        <View style={styles.targetInfo}>
          <Text style={styles.targetLabel}>Tujuan:</Text>
          <Text style={styles.targetName}>{targetArea.name}</Text>
          <Text style={styles.targetStats}>
            {targetArea.total_active}/{targetArea.total_required} aktif
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
          Tidak ada petugas aktif yang tersedia untuk reassign
        </Text>
      ) : (
        <>
          <Text style={styles.sectionLabel}>Pilih Petugas</Text>
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
          <Text style={styles.sectionLabel}>Alasan (Opsional)</Text>
          <TextInput
            style={styles.reasonInput}
            value={reason}
            onChangeText={setReason}
            placeholder="Tuliskan alasan reassign..."
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
    fontSize: nbTypography.fontSize.sm,
    color: nbColors.gray600,
  },
  targetName: {
    fontSize: nbTypography.fontSize.sm,
    fontWeight: nbTypography.fontWeight.bold,
    color: nbColors.black,
    flex: 1,
  },
  targetStats: {
    fontSize: nbTypography.fontSize.xs,
    color: nbColors.gray600,
  },
  loader: {
    marginVertical: nbSpacing.xl,
  },
  emptyText: {
    fontSize: nbTypography.fontSize.sm,
    color: nbColors.gray500,
    fontStyle: 'italic',
    textAlign: 'center',
    marginVertical: nbSpacing.xl,
  },
  sectionLabel: {
    fontSize: nbTypography.fontSize.sm,
    fontWeight: nbTypography.fontWeight.bold,
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
    fontSize: nbTypography.fontSize.base,
    fontWeight: nbTypography.fontWeight.semibold,
    color: nbColors.black,
  },
  userMeta: {
    fontSize: nbTypography.fontSize.sm,
    color: nbColors.gray600,
    marginTop: 2,
  },
  reasonSection: {
    marginTop: nbSpacing.md,
  },
  reasonInput: {
    backgroundColor: nbColors.gray100,
    borderRadius: nbRadius.base,
    borderWidth: nbBorders.thin,
    borderColor: nbColors.gray300,
    paddingHorizontal: nbSpacing.md,
    paddingVertical: nbSpacing.sm,
    fontSize: nbTypography.fontSize.base,
    color: nbColors.black,
    minHeight: 60,
    textAlignVertical: 'top',
  },
  charCount: {
    fontSize: nbTypography.fontSize.xs,
    color: nbColors.gray400,
    textAlign: 'right',
    marginTop: 4,
  },
});
