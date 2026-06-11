/**
 * useOvertimeActions — Approval/rejection handlers and canApprove/canClockOut logic
 */

import { useState, useCallback, useMemo, useEffect } from 'react';
import { Alert, ScrollView } from 'react-native';
import type { Overtime } from '../../../types/models.types';
import { approveOvertime, rejectOvertime } from '../../../services/api/overtimeApi';

export interface UseOvertimeActionsReturn {
  canClockOut: boolean;
  canApprove: boolean;
  showRejectInput: boolean;
  rejectReason: string;
  isSubmitting: boolean;
  setShowRejectInput: (show: boolean) => void;
  setRejectReason: (reason: string) => void;
  handleTolakPress: () => void;
  handleApprove: () => Promise<void>;
  handleRejectSubmit: () => Promise<void>;
  handleRejectCancel: () => void;
}

export function useOvertimeActions(
  overtime: Overtime | null,
  user: any, // Redux user type
  scrollViewRef: React.RefObject<ScrollView | null>,
  onOvertimeUpdate: (updated: Overtime) => void,
): UseOvertimeActionsReturn {
  const [showRejectInput, setShowRejectInput] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!showRejectInput) return;
    const id = setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 150);
    return () => clearTimeout(id);
  }, [showRejectInput, scrollViewRef]);

  const canClockOut = useMemo(
    () => overtime?.status === 'in_progress' && user?.id === overtime?.user_id,
    [overtime, user],
  );

  const canApprove = useMemo(() => {
    if (!overtime || !user || overtime.status !== 'pending') return false;
    const submitterRole = overtime.user?.role;
    if (user.role === 'korlap') {
      return (submitterRole === 'satgas' || submitterRole === 'linmas') &&
             user.area_id != null && overtime.area_id === user.area_id;
    }
    if (user.role === 'kepala_rayon') {
      if (!user.rayon_id) return false;
      const inSameRayon =
        overtime.area?.rayon_id === user.rayon_id ||
        overtime.user?.rayon_id === user.rayon_id;
      return inSameRayon && (submitterRole === 'korlap' || submitterRole === 'admin_data');
    }
    return false;
  }, [overtime, user]);

  const handleTolakPress = useCallback(() => {
    setShowRejectInput(true);
  }, []);

  const handleApprove = useCallback(async () => {
    if (!overtime || isSubmitting) return;
    Alert.alert('Konfirmasi', 'Setujui pengajuan lembur ini?', [
      { text: 'Batal', style: 'cancel' },
      {
        text: 'Setuju',
        onPress: async () => {
          setIsSubmitting(true);
          try {
            const response = await approveOvertime(overtime.id);
            if (response.error) {
              Alert.alert('Error', response.error);
              return;
            }
            if (response.data) onOvertimeUpdate(response.data);
            Alert.alert('Berhasil', 'Lembur disetujui');
          } catch {
            Alert.alert('Error', 'Gagal menyetujui lembur');
          } finally {
            setIsSubmitting(false);
          }
        },
      },
    ]);
  }, [overtime, isSubmitting, onOvertimeUpdate]);

  const handleRejectSubmit = useCallback(async () => {
    if (!overtime || !rejectReason.trim()) {
      Alert.alert('Error', 'Alasan penolakan wajib diisi');
      return;
    }
    setIsSubmitting(true);
    try {
      const response = await rejectOvertime(overtime.id, rejectReason.trim());
      if (response.error) {
        Alert.alert('Error', response.error);
        return;
      }
      if (response.data) onOvertimeUpdate(response.data);
      setShowRejectInput(false);
      setRejectReason('');
      Alert.alert('Berhasil', 'Lembur ditolak');
    } catch {
      Alert.alert('Error', 'Gagal menolak lembur');
    } finally {
      setIsSubmitting(false);
    }
  }, [overtime, rejectReason, onOvertimeUpdate]);

  const handleRejectCancel = useCallback(() => {
    setShowRejectInput(false);
    setRejectReason('');
  }, []);

  return {
    canClockOut,
    canApprove,
    showRejectInput,
    rejectReason,
    isSubmitting,
    setShowRejectInput,
    setRejectReason,
    handleTolakPress,
    handleApprove,
    handleRejectSubmit,
    handleRejectCancel,
  };
}
