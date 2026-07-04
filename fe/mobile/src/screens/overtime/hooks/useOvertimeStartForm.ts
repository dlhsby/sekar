/**
 * useOvertimeStartForm
 * Manages form state, validation, and submission logic for the "Mulai Lembur" state.
 */

import { useState, useCallback, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { useAppDispatch } from '../../../store/hooks';
import {
  setSubmitting,
  addOvertime,
  setError,
} from '../../../store/slices/overtimeSlice';
import {
  startOvertime,
} from '../../../services/api/overtimeApi';
import {
  getCurrentShift,
} from '../../../services/api/shiftsApi';
import { mediaService, type Photo } from '../../../services/media';
import { setCurrentShift } from '../../../store/slices/shiftSlice';
import { locationTracker } from '../../../services/location/locationTracker';
import type { StartOvertimeRequest } from '../../../types/api.types';
import type { Coordinates } from '../../../types/geo.types';
import type { MainTabScreenProps } from '../../../types/navigation.types';
import { NBToast } from '../../../components/nb';

const DRAFT_KEY = 'overtime_start_draft';
const DRAFT_MAX_AGE_MS = 24 * 60 * 60 * 1_000;

interface StartDraft {
  reason: string;
  savedAt: string;
}

interface StartErrors {
  location?: string;
}

export function useOvertimeStartForm(
  location: Coordinates | null,
  activeOvertime: any,
  isFocused: boolean,
) {
  const { t } = useTranslation();
  const navigation = useNavigation<MainTabScreenProps<'OvertimeSubmit'>['navigation']>();
  const dispatch = useAppDispatch();

  const [reason, setReason] = useState('');
  const [startSelfie, setStartSelfie] = useState<Photo | null>(null);
  const [startErrors, setStartErrors] = useState<StartErrors>({});

  // Load draft on mount (only when no active overtime)
  useEffect(() => {
    if (activeOvertime !== null) { return; }

    let isMounted = true;

    AsyncStorage.getItem(DRAFT_KEY)
      .then((raw) => {
        if (!isMounted || !raw) { return; }
        const draft = JSON.parse(raw) as StartDraft;
        const age = Date.now() - new Date(draft.savedAt).getTime();
        if (age > DRAFT_MAX_AGE_MS) {
          void AsyncStorage.removeItem(DRAFT_KEY);
          return;
        }
        if (!draft.reason) { return; }
        Alert.alert(
          t('overtime:startForm.draftTitle'),
          t('overtime:startForm.draftMessage'),
          [
            {
              text: t('overtime:startForm.draftDiscard'),
              style: 'destructive',
              onPress: () => void AsyncStorage.removeItem(DRAFT_KEY),
            },
            {
              text: t('overtime:startForm.draftContinue'),
              onPress: () => {
                if (isMounted) { setReason(draft.reason); }
              },
            },
          ],
        );
      })
      .catch(() => {});

    return () => { isMounted = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Auto-save on reason change
  useEffect(() => {
    if (activeOvertime) { return; }
    const draft: StartDraft = {
      reason,
      savedAt: new Date().toISOString(),
    };
    void AsyncStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
  }, [reason, activeOvertime]);

  // Save on blur / unmount
  useEffect(() => {
    if (isFocused) { return; }
    if (activeOvertime) { return; }
    const draft: StartDraft = {
      reason,
      savedAt: new Date().toISOString(),
    };
    void AsyncStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isFocused]);

  const validateForm = useCallback((): boolean => {
    const errs: StartErrors = {};
    if (!location) {
      errs.location = t('overtime:startForm.locationError');
    }
    setStartErrors(errs);
    return Object.keys(errs).length === 0;
  }, [location, t]);

  const handleSubmit = useCallback(async () => {
    if (!validateForm()) { return; }
    dispatch(setSubmitting(true));
    try {
      const selfieBase64 = startSelfie ? await mediaService.convertToBase64(startSelfie) : undefined;
      const dto: StartOvertimeRequest = {
        gps_lat: location!.latitude,
        gps_lng: location!.longitude,
        ...(reason.trim() ? { reason: reason.trim() } : {}),
        selfie_photo: selfieBase64,
      };
      const response = await startOvertime(dto);
      if (response.data) {
        dispatch(addOvertime(response.data));
        void AsyncStorage.removeItem(DRAFT_KEY);
        if (response.data.shift_id) {
          const shiftRes = await getCurrentShift();
          if (shiftRes.data) {
            dispatch(setCurrentShift(shiftRes.data as any));
            await locationTracker.initialize(response.data.shift_id);
          }
        }
        navigation.navigate('Lembur' as any);
      } else if (response.error) {
        dispatch(setError(response.error));
        const errMsg = response.error.includes('end normal shift')
          ? t('overtime:startForm.activeShiftError')
          : response.error;
        NBToast.show({ level: 'danger', title: t('overtime:startForm.toastStartError'), body: errMsg });
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : t('overtime:startForm.toastGenericError');
      dispatch(setError(msg));
      NBToast.show({ level: 'danger', title: t('overtime:startForm.toastError'), body: msg });
    } finally {
      dispatch(setSubmitting(false));
    }
  }, [validateForm, startSelfie, location, reason, dispatch, navigation, t]);

  const handleLeave = useCallback(() => {
    const hasData = Boolean(reason || startSelfie);
    if (!hasData) {
      navigation.navigate('Lembur' as any);
      return;
    }
    Alert.alert(
      t('overtime:startForm.saveDraftTitle'),
      t('overtime:startForm.saveDraftMessage'),
      [
        {
          text: t('overtime:startForm.saveDraftNo'),
          style: 'destructive',
          onPress: () => {
            setReason('');
            setStartSelfie(null);
            void AsyncStorage.removeItem(DRAFT_KEY);
            navigation.navigate('Lembur' as any);
          },
        },
        {
          text: t('overtime:startForm.saveDraftYes'),
          onPress: () => {
            const draft: StartDraft = {
              reason,
              savedAt: new Date().toISOString(),
            };
            void AsyncStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
            navigation.navigate('Lembur' as any);
          },
        },
      ],
    );
  }, [reason, startSelfie, navigation, t]);

  return {
    reason,
    setReason,
    startSelfie,
    setStartSelfie,
    startErrors,
    setStartErrors,
    validateForm,
    handleSubmit,
    handleLeave,
  };
}
