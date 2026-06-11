/**
 * useOvertimeStartForm
 * Manages form state, validation, and submission logic for the "Mulai Lembur" state.
 */

import { useState, useCallback, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
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
          'Lanjutkan Draft?',
          'Ditemukan form lembur yang belum selesai. Lanjutkan atau hapus?',
          [
            {
              text: 'Hapus Draft',
              style: 'destructive',
              onPress: () => void AsyncStorage.removeItem(DRAFT_KEY),
            },
            {
              text: 'Lanjutkan Draft',
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
      errs.location = 'GPS lokasi diperlukan. Ketuk "Perbarui GPS" untuk mencoba lagi.';
    }
    setStartErrors(errs);
    return Object.keys(errs).length === 0;
  }, [location]);

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
        navigation.navigate('Overtime' as any);
      } else if (response.error) {
        dispatch(setError(response.error));
        const errMsg = response.error.includes('end normal shift')
          ? 'Anda masih memiliki shift aktif. Selesaikan Clock Out shift biasa sebelum memulai lembur.'
          : response.error;
        NBToast.show({ level: 'danger', title: 'Gagal Mulai Lembur', body: errMsg });
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Gagal memulai lembur';
      dispatch(setError(msg));
      NBToast.show({ level: 'danger', title: 'Gagal', body: msg });
    } finally {
      dispatch(setSubmitting(false));
    }
  }, [validateForm, startSelfie, location, reason, dispatch, navigation]);

  const handleLeave = useCallback(() => {
    const hasData = Boolean(reason || startSelfie);
    if (!hasData) {
      navigation.navigate('Overtime' as any);
      return;
    }
    Alert.alert(
      'Simpan Draft?',
      'Simpan data lembur sebagai draft?',
      [
        {
          text: 'Tidak',
          style: 'destructive',
          onPress: () => {
            setReason('');
            setStartSelfie(null);
            void AsyncStorage.removeItem(DRAFT_KEY);
            navigation.navigate('Overtime' as any);
          },
        },
        {
          text: 'Ya',
          onPress: () => {
            const draft: StartDraft = {
              reason,
              savedAt: new Date().toISOString(),
            };
            void AsyncStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
            navigation.navigate('Overtime' as any);
          },
        },
      ],
    );
  }, [reason, startSelfie, navigation]);

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
