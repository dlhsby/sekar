/**
 * usePruningRequestActions — admin review/approve/reject/cancel handlers
 * Encapsulates alert logic, dispatch calls, toast notifications, and state updates.
 */

import React, { useCallback } from 'react';
import { Alert, ScrollView } from 'react-native';
import { useTranslation } from 'react-i18next';
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
  const { t } = useTranslation();
  const dispatch = useAppDispatch();

  const handleApprove = useCallback(async () => {
    Alert.alert(
      t('pruning:actions.approve.confirm'),
      t('pruning:actions.approve.question'),
      [
        { text: t('pruning:actions.approve.cancel'), style: 'cancel' },
        {
          text: t('pruning:actions.approve.yes'),
          onPress: async () => {
            try {
              await dispatch(
                reviewPruningRequest({ id: requestId, decision: 'approve' }),
              ).unwrap();
              NBToast.show({
                level: 'success',
                title: t('pruning:actions.approve.success'),
                body: t('pruning:actions.approve.successMessage'),
              });
            } catch (err: any) {
              NBToast.show({
                level: 'danger',
                title: t('pruning:actions.approve.failed'),
                body: err?.message || t('pruning:actions.approve.failedMessage'),
              });
            }
          },
        },
      ],
    );
  }, [dispatch, requestId, t]);

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
          title: t('pruning:actions.reject.reasonRequired'),
          body: t('pruning:actions.reject.reasonPrompt'),
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
          title: t('pruning:actions.reject.success'),
          body: t('pruning:actions.reject.successMessage'),
        });
        return true;
      } catch (err: any) {
        NBToast.show({
          level: 'danger',
          title: t('pruning:actions.reject.failed'),
          body: err?.message || t('pruning:actions.reject.failedMessage'),
        });
        return false;
      }
    },
    [dispatch, requestId, t],
  );

  const handleCancel = useCallback(() => {
    if (!request) return;
    Alert.alert(
      t('pruning:actions.cancel.confirm'),
      t('pruning:actions.cancel.question'),
      [
        { text: t('pruning:actions.cancel.no'), style: 'cancel' },
        {
          text: t('pruning:actions.cancel.yes'),
          style: 'destructive',
          onPress: async () => {
            try {
              await dispatch(
                cancelPruningRequest({ id: request.id }),
              ).unwrap();
              NBToast.show({
                level: 'success',
                title: t('pruning:actions.cancel.success'),
                body: request.referenceCode || '',
              });
              dispatch(fetchPruningRequestById(request.id));
            } catch (e) {
              NBToast.show({
                level: 'danger',
                title: t('pruning:actions.cancel.failed'),
                body: e instanceof Error ? e.message : t('pruning:actions.cancel.failedRetry'),
              });
            }
          },
        },
      ],
    );
  }, [dispatch, request, t]);

  return {
    handleApprove,
    handleRejectPress,
    handleRejectSubmit,
    handleCancel,
  };
}
