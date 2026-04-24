/**
 * ReassignWorkerModal Component
 * Phase 2D Gap #5: Modal for reassigning workers between areas.
 * Lists active workers from source rayon, allows selection and reassignment.
 */

import React, { useState, useCallback, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
} from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import {
  nbColors,
  nbSpacing,
  nbTypography,
  nbBorders,
  nbBorderRadius,
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

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <MaterialCommunityIcons
              name="account-switch"
              size={20}
              color={nbColors.primary}
            />
            <Text style={styles.headerTitle}>Reassign Petugas</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <MaterialCommunityIcons name="close" size={20} color={nbColors.gray['700']} />
            </TouchableOpacity>
          </View>

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

          <ScrollView style={styles.body}>
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
                  placeholderTextColor={nbColors.gray['400']}
                  multiline
                  maxLength={200}
                />
                <Text style={styles.charCount}>{reason.length}/200</Text>
              </View>
            )}
          </ScrollView>

          {/* Submit button */}
          <View style={styles.footer}>
            <TouchableOpacity
              style={[
                styles.submitBtn,
                (!selectedUserId || isSubmitting) && styles.submitBtnDisabled,
              ]}
              onPress={handleSubmit}
              disabled={!selectedUserId || isSubmitting}
              activeOpacity={0.8}
            >
              {isSubmitting ? (
                <ActivityIndicator size="small" color={nbColors.black} />
              ) : (
                <Text style={styles.submitBtnText}>Konfirmasi Reassign</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  container: {
    backgroundColor: nbColors.white,
    borderTopLeftRadius: nbBorderRadius.lg,
    borderTopRightRadius: nbBorderRadius.lg,
    borderWidth: nbBorders.base,
    borderColor: nbColors.black,
    maxHeight: '80%',
    ...nbShadows.lg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: nbSpacing.md,
    borderBottomWidth: nbBorders.thin,
    borderBottomColor: nbColors.gray['300'],
    gap: nbSpacing.sm,
  },
  headerTitle: {
    flex: 1,
    fontSize: nbTypography.fontSize.lg,
    fontWeight: nbTypography.fontWeight.bold,
    color: nbColors.black,
  },
  closeBtn: {
    padding: nbSpacing.xs,
  },
  targetInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: nbSpacing.md,
    paddingVertical: nbSpacing.sm,
    backgroundColor: nbColors.gray['100'],
    gap: nbSpacing.xs,
  },
  targetLabel: {
    fontSize: nbTypography.fontSize.sm,
    color: nbColors.gray['600'],
  },
  targetName: {
    fontSize: nbTypography.fontSize.sm,
    fontWeight: nbTypography.fontWeight.bold,
    color: nbColors.black,
    flex: 1,
  },
  targetStats: {
    fontSize: nbTypography.fontSize.xs,
    color: nbColors.gray['600'],
  },
  body: {
    padding: nbSpacing.md,
  },
  loader: {
    marginVertical: nbSpacing.xl,
  },
  emptyText: {
    fontSize: nbTypography.fontSize.sm,
    color: nbColors.gray['500'],
    fontStyle: 'italic',
    textAlign: 'center',
    marginVertical: nbSpacing.xl,
  },
  sectionLabel: {
    fontSize: nbTypography.fontSize.sm,
    fontWeight: nbTypography.fontWeight.bold,
    color: nbColors.gray['700'],
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: nbSpacing.sm,
  },
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: nbSpacing.sm,
    paddingHorizontal: nbSpacing.sm,
    borderRadius: nbBorderRadius.base,
    marginBottom: nbSpacing.xs,
    backgroundColor: nbColors.gray['100'],
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
    color: nbColors.gray['600'],
    marginTop: 2,
  },
  reasonSection: {
    marginTop: nbSpacing.md,
  },
  reasonInput: {
    backgroundColor: nbColors.gray['100'],
    borderRadius: nbBorderRadius.base,
    borderWidth: nbBorders.thin,
    borderColor: nbColors.gray['300'],
    paddingHorizontal: nbSpacing.md,
    paddingVertical: nbSpacing.sm,
    fontSize: nbTypography.fontSize.base,
    color: nbColors.black,
    minHeight: 60,
    textAlignVertical: 'top',
  },
  charCount: {
    fontSize: nbTypography.fontSize.xs,
    color: nbColors.gray['400'],
    textAlign: 'right',
    marginTop: 4,
  },
  footer: {
    padding: nbSpacing.md,
    borderTopWidth: nbBorders.thin,
    borderTopColor: nbColors.gray['300'],
  },
  submitBtn: {
    backgroundColor: nbColors.primary,
    borderRadius: nbBorderRadius.base,
    borderWidth: nbBorders.base,
    borderColor: nbColors.black,
    paddingVertical: nbSpacing.md,
    alignItems: 'center',
    ...nbShadows.md,
  },
  submitBtnDisabled: {
    opacity: 0.5,
  },
  submitBtnText: {
    fontSize: nbTypography.fontSize.base,
    fontWeight: nbTypography.fontWeight.bold,
    color: nbColors.black,
  },
});
