/**
 * useOvertimeEndForm
 * Manages form state, validation, and submission logic for the "Selesai Lembur" state.
 */

import { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useAppDispatch } from '../../../store/hooks';
import {
  setSubmitting,
  addOvertime,
  setError,
} from '../../../store/slices/overtimeSlice';
import { clockOutSuccess } from '../../../store/slices/shiftSlice';
import {
  endOvertime,
} from '../../../services/api/overtimeApi';
import { mediaService, type Photo } from '../../../services/media';
import { locationTracker } from '../../../services/location/locationTracker';
import { useNavigation } from '@react-navigation/native';
import type { EndOvertimeRequest } from '../../../types/api.types';
import type { Coordinates } from '../../../types/geo.types';
import type { MainTabScreenProps } from '../../../types/navigation.types';
import { NBToast } from '../../../components/nb';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

interface EndErrors {
  activityType?: string;
  description?: string;
  photos?: string;
  location?: string;
}

export function useOvertimeEndForm(location: Coordinates | null) {
  const { t } = useTranslation();
  const navigation = useNavigation<MainTabScreenProps<'OvertimeSubmit'>['navigation']>();
  const dispatch = useAppDispatch();

  const [endActivityTypeId, setEndActivityTypeId] = useState('');
  const [endDescription, setEndDescription] = useState('');
  const [endPhotos, setEndPhotos] = useState<Photo[]>([]);
  const [endSelfie, setEndSelfie] = useState<Photo | null>(null);
  const [endErrors, setEndErrors] = useState<EndErrors>({});

  const validateForm = useCallback((): boolean => {
    const errs: EndErrors = {};
    if (!endActivityTypeId || !UUID_REGEX.test(endActivityTypeId)) {
      errs.activityType = t('overtime:endForm.activityTypeError');
    }
    if (!endDescription.trim()) {
      errs.description = t('overtime:endForm.descriptionError');
    }
    if (endPhotos.length === 0) {
      errs.photos = t('overtime:endForm.photosError');
    }
    if (!location) {
      errs.location = t('overtime:endForm.locationError');
    }
    setEndErrors(errs);
    return Object.keys(errs).length === 0;
  }, [endActivityTypeId, endDescription, endPhotos, location, t]);

  const handleSubmit = useCallback(async () => {
    if (!validateForm()) { return; }
    dispatch(setSubmitting(true));
    try {
      const photoUrls: string[] = [];
      for (const photo of endPhotos) {
        const base64 = await mediaService.convertToBase64(photo);
        photoUrls.push(base64);
      }
      const selfieBase64 = endSelfie ? await mediaService.convertToBase64(endSelfie) : undefined;
      const dto: EndOvertimeRequest = {
        gps_lat: location!.latitude,
        gps_lng: location!.longitude,
        activity_type_id: endActivityTypeId,
        description: endDescription.trim(),
        photo_urls: photoUrls,
        selfie_photo: selfieBase64,
      };
      const response = await endOvertime(dto);
      if (response.data) {
        dispatch(addOvertime(response.data));
        locationTracker.stopImmediate();
        dispatch(clockOutSuccess());
        NBToast.show({ level: 'success', title: t('overtime:endForm.toastSuccess'), body: t('overtime:endForm.toastSuccessMessage') });
        navigation.navigate('Lembur' as any);
      } else if (response.error) {
        dispatch(setError(response.error));
        NBToast.show({ level: 'danger', title: t('overtime:endForm.toastEndError'), body: response.error });
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : t('overtime:endForm.toastGenericError');
      dispatch(setError(msg));
      NBToast.show({ level: 'danger', title: t('overtime:endForm.toastError'), body: msg });
    } finally {
      dispatch(setSubmitting(false));
    }
  }, [validateForm, endPhotos, endSelfie, location, endActivityTypeId, endDescription, dispatch, navigation, t]);

  const resetForm = useCallback(() => {
    setEndActivityTypeId('');
    setEndDescription('');
    setEndPhotos([]);
    setEndErrors({});
    setEndSelfie(null);
  }, []);

  return {
    endActivityTypeId,
    setEndActivityTypeId,
    endDescription,
    setEndDescription,
    endPhotos,
    setEndPhotos,
    endSelfie,
    setEndSelfie,
    endErrors,
    setEndErrors,
    validateForm,
    handleSubmit,
    resetForm,
  };
}
