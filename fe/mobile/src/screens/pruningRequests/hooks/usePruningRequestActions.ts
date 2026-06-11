/**
 * usePruningRequestActions — admin review/approve/reject/cancel handlers
 * Encapsulates alert logic, dispatch calls, toast notifications, and state updates.
 */

import React, { useCallback } from 'react';
import { Alert, ScrollView } from 'react-native';
import { useAppDispatch } from '../../../store/hooks';
import {
  reviewPruningRequest,
  cancelPruningRequest,
  fetchPruningRequestById,
} from '../../../store/slices/pruningRequestsSlice';
import { NBToast } from '../../../components/nb/NBToast';
import type { PruningRequest } from '../../../types/models.types';

export interface UsePruningRequestActionsProps {
  requestId: string;
  request: PruningRequest | null;
  scrollViewRef?: React.RefObject<ScrollView | null>;
}

export function usePruningRequestActions({
  requestId,
  request,
  scrollViewRef,
}: UsePruningRequestActionsProps) {
  const dispatch = useAppDispatch();

  const handleApprove = useCallback(async () => {
    Alert.alert(
      'Konfirmasi',
      'Setujui permohonan perantingan ini?',
      [
        { text: 'Batal', style: 'cancel' },
        {
          text: 'Setuju',
          onPress: async () => {
            try {
              await dispatch(
                reviewPruningRequest({ id: requestId, decision: 'approve' }),
              ).unwrap();
              NBToast.show({
                level: 'success',
                title: 'Berhasil',
                body: 'Permohonan telah disetujui.',
              });
            } catch (err: any) {
              NBToast.show({
                level: 'danger',
                title: 'Gagal',
                body: err?.message || 'Tidak dapat menyetujui permohonan.',
              });
            }
          },
        },
      ],
    );
  }, [dispatch, requestId]);

  const handleRejectPress = useCallback(() => {
    // Delegate state management to caller via onRejectPress callback
    // The 150ms delay gives the input time to render before scrolling
    setTimeout(() => {
      scrollViewRef?.current?.scrollToEnd({ animated: true });
    }, 150);
  }, [scrollViewRef]);

  const handleRejectSubmit = useCallback(
    async (rejectReason: string) => {
      if (!rejectReason.trim()) {
        NBToast.show({
          level: 'warning',
          title: 'Alasan diperlukan',
          body: 'Mohon isi alasan penolakan permohonan ini.',
        });
        return false;
      }
      try {
        await dispatch(
          reviewPruningRequest({
            id: requestId,
            decision: 'reject',
            reviewNotes: rejectReason.trim(),
          }),
        ).unwrap();
        NBToast.show({
          level: 'success',
          title: 'Berhasil',
          body: 'Permohonan telah ditolak.',
        });
        return true;
      } catch (err: any) {
        NBToast.show({
          level: 'danger',
          title: 'Gagal',
          body: err?.message || 'Tidak dapat menolak permohonan.',
        });
        return false;
      }
    },
    [dispatch, requestId],
  );

  const handleCancel = useCallback(() => {
    if (!request) return;
    Alert.alert(
      'Batalkan Permohonan',
      'Apakah Anda yakin ingin membatalkan permohonan ini? Tindakan ini tidak dapat dibatalkan.',
      [
        { text: 'Tidak', style: 'cancel' },
        {
          text: 'Ya, Batalkan',
          style: 'destructive',
          onPress: async () => {
            try {
              await dispatch(
                cancelPruningRequest({ id: request.id }),
              ).unwrap();
              NBToast.show({
                level: 'success',
                title: 'Permohonan dibatalkan',
                body: request.referenceCode || '',
              });
              dispatch(fetchPruningRequestById(request.id));
            } catch (e) {
              NBToast.show({
                level: 'danger',
                title: 'Gagal membatalkan',
                body: e instanceof Error ? e.message : 'Coba lagi.',
              });
            }
          },
        },
      ],
    );
  }, [dispatch, request]);

  return {
    handleApprove,
    handleRejectPress,
    handleRejectSubmit,
    handleCancel,
  };
}
