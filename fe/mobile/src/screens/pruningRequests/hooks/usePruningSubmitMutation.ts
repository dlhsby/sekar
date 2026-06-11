/**
 * usePruningSubmitMutation — Submit workflow (validate → convert → dispatch → navigate).
 */

import { useCallback } from 'react';
import { useAppDispatch, useAppSelector } from '../../../store/hooks';
import {
  submitPruningRequest,
  clearError,
} from '../../../store/slices/pruningRequestsSlice';
import { mediaService, type Photo } from '../../../services/media/mediaService';
import { NBToast } from '../../../components/nb';
import type { FormState } from './usePruningSubmitForm';

interface SubmitPayload {
  address: string;
  lat: number;
  lng: number;
  photo_keys: string[];
  rayon_id?: string;
  kecamatan_name?: string;
  tree_count: number;
  target_count: number;
  tree_height_estimate: string;
  tree_diameter_estimate: string;
  requester_name: string;
  requester_phone: string;
  rt_leader_name: string;
  rt_leader_phone: string;
  notes?: string;
  expected_year?: number;
  expected_iso_week?: number;
}

function digitsOnly(s: string): string {
  return s.replace(/\D/g, '');
}

interface UsePruningSubmitMutationProps {
  formState: FormState;
  gpsLat: number | null;
  gpsLng: number | null;
  photos: Photo[];
  validate: () => string | null;
  clearDraft: () => Promise<void>;
  resetForm: () => void;
  navigation: any;
}

export function usePruningSubmitMutation({
  formState,
  gpsLat,
  gpsLng,
  photos,
  validate,
  clearDraft,
  resetForm,
  navigation,
}: UsePruningSubmitMutationProps) {
  const dispatch = useAppDispatch();
  const { isSubmitting } = useAppSelector((state) => state.pruningRequests);

  const handleSubmit = useCallback(async () => {
    dispatch(clearError());

    // Validate form fields
    const errMsg = validate();
    if (errMsg) {
      NBToast.show({
        level: 'warning',
        title: 'Periksa kembali',
        body: errMsg,
      });
      return;
    }

    // Validate GPS
    if (gpsLat == null || gpsLng == null) {
      NBToast.show({
        level: 'warning',
        title: 'Periksa kembali',
        body: 'Koordinat GPS belum terdeteksi. Tekan tombol perbarui pada kartu Lokasi.',
      });
      return;
    }

    // Validate photos
    if (photos.length < 1) {
      NBToast.show({
        level: 'warning',
        title: 'Periksa kembali',
        body: 'Minimal 1 foto diperlukan.',
      });
      return;
    }

    try {
      // Convert photos to base64 data URIs
      const photoKeys: string[] = [];
      for (const photo of photos) {
        photoKeys.push(await mediaService.convertToBase64(photo));
      }

      const tc = parseInt(formState.treeCount, 10);
      const payload: SubmitPayload = {
        address: formState.address.trim(),
        lat: gpsLat,
        lng: gpsLng,
        photo_keys: photoKeys,
        rayon_id: formState.rayonId || undefined,
        kecamatan_name: formState.kecamatanName.trim() || undefined,
        tree_count: tc,
        target_count: tc,
        tree_height_estimate: formState.treeHeight.trim(),
        tree_diameter_estimate: formState.treeDiameter.trim(),
        requester_name: formState.requesterName.trim(),
        requester_phone: digitsOnly(formState.requesterPhone),
        rt_leader_name: formState.rtLeaderName.trim(),
        rt_leader_phone: digitsOnly(formState.rtLeaderPhone),
        notes: formState.notes.trim() || undefined,
        expected_year: formState.expectedWeek?.year,
        expected_iso_week: formState.expectedWeek?.isoWeek,
      };

      await dispatch(submitPruningRequest(payload)).unwrap();

      await clearDraft();
      NBToast.show({
        level: 'success',
        title: 'Permohonan terkirim',
        body: 'Anda akan diberitahu setelah ditinjau.',
      });
      resetForm();
      navigation.navigate('Perantingan');
    } catch (e) {
      const body =
        e instanceof Error
          ? e.message
          : typeof e === 'string'
            ? e
            : (e as { message?: string; error?: string })?.message ??
              (e as { error?: string })?.error ??
              'Coba lagi.';
      NBToast.show({
        level: 'danger',
        title: 'Gagal mengirim permohonan',
        body,
        persistent: true,
      });
    }
  }, [
    formState,
    gpsLat,
    gpsLng,
    photos,
    validate,
    dispatch,
    clearDraft,
    resetForm,
    navigation,
  ]);

  const isBusy = isSubmitting;

  return { handleSubmit, isBusy };
}
