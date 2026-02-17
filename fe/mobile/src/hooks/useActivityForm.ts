/**
 * useActivityForm Hook
 * Manages activity submission form state, validation, draft persistence, and submission
 * Extracted from ActivitySubmissionScreen for separation of concerns
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { Alert, FlatList } from 'react-native';
import Geolocation from 'react-native-geolocation-service';
import AsyncStorage from '@react-native-async-storage/async-storage';
import DeviceInfo from 'react-native-device-info';
import { useAppDispatch, useAppSelector } from '../store/store';
import { createActivity } from '../services/api/activitiesApi';
import { getMyActivityTypes } from '../services/api/activityTypesApi';
import { setSubmitting, setError } from '../store/slices/activitiesSlice';
import { addToQueue as addToOfflineQueue } from '../services/sync/offlineQueue';
import { mediaService, type Photo } from '../services/media';
import { requestCameraPermission } from '../services/permissions';
import { sanitizeMultilineText } from '../utils/sanitize';
import config from '../constants/config';
import type { ActivityType } from '../types/models.types';

export interface FormState {
  photos: Photo[];
  description: string;
  activityTypeId: string | null;
  location: {
    latitude: number;
    longitude: number;
    accuracy: number;
  } | null;
}

export interface FormErrors {
  photos?: string;
  description?: string;
  activityType?: string;
  location?: string;
}

export function useActivityForm(photoListRef: React.RefObject<FlatList | null>) {
  const dispatch = useAppDispatch();

  const { currentShift } = useAppSelector((state) => state.shift);
  const { isOnline } = useAppSelector((state) => state.offline);
  const { isSubmitting, error: activityError } = useAppSelector((state) => state.activities);

  const [form, setForm] = useState<FormState>({
    photos: [],
    description: '',
    activityTypeId: null,
    location: null,
  });

  const [errors, setErrors] = useState<FormErrors>({});
  const [isLoadingLocation, setIsLoadingLocation] = useState(false);
  const [activityTypes, setActivityTypes] = useState<ActivityType[]>([]);
  const [sortedActivityTypes, setSortedActivityTypes] = useState<ActivityType[]>([]);
  const [isLoadingTypes, setIsLoadingTypes] = useState(false);

  const formRef = useRef<FormState>(form);
  const saveDraftRef = useRef<(() => Promise<void>) | undefined>(undefined);

  useEffect(() => { formRef.current = form; }, [form]);

  // Load activity types
  const loadActivityTypes = useCallback(async () => {
    setIsLoadingTypes(true);
    try {
      const response = await getMyActivityTypes();
      if (response.error) { throw new Error(response.error); }
      if (response.data && Array.isArray(response.data.data)) {
        const types = response.data.data;
        setActivityTypes(types);

        // Sort alphabetically and move "Lainnya" to end
        const sorted = [...types].sort((a, b) =>
          a.name.localeCompare(b.name, 'id')
        );

        const lainyaIndex = sorted.findIndex(t =>
          t.code.toLowerCase() === 'lainnya' ||
          t.name.toLowerCase() === 'lainnya'
        );

        if (lainyaIndex > -1) {
          const lainnya = sorted.splice(lainyaIndex, 1)[0];
          sorted.push(lainnya);
        }

        setSortedActivityTypes(sorted);
      }
    } catch (error) {
      Alert.alert('Error', 'Gagal memuat jenis aktivitas. Coba lagi nanti.');
      console.error('Failed to load activity types:', error);
    } finally {
      setIsLoadingTypes(false);
    }
  }, []);

  // Get current GPS location
  const getCurrentLocation = useCallback(() => {
    setIsLoadingLocation(true);
    Geolocation.getCurrentPosition(
      (position) => {
        setForm((prev) => ({
          ...prev,
          location: {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
          },
        }));
        setErrors((prev) => ({ ...prev, location: undefined }));
        setIsLoadingLocation(false);
      },
      (error) => {
        console.error('Location error:', error);
        let errorMessage = 'Tidak dapat mendapatkan lokasi GPS';
        if (error.code === 1) { errorMessage = 'Izin lokasi ditolak'; }
        else if (error.code === 3) { errorMessage = 'Waktu habis. Coba di area terbuka.'; }
        else if (error.code === 5) { errorMessage = 'Aktifkan GPS di pengaturan.'; }
        setErrors((prev) => ({ ...prev, location: errorMessage }));
        setIsLoadingLocation(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 5000,
        forceRequestLocation: true,
        forceLocationManager: false,
        showLocationDialog: true,
      }
    );
  }, []);

  // Check disk space
  const checkDiskSpace = useCallback(async (): Promise<boolean> => {
    try {
      const freeDiskStorage = await DeviceInfo.getFreeDiskStorage();
      const freeDiskStorageMB = freeDiskStorage / (1024 * 1024);
      if (freeDiskStorageMB < config.MIN_FREE_STORAGE_MB) {
        Alert.alert(
          'Penyimpanan Penuh',
          `Ruang penyimpanan tersisa ${Math.round(freeDiskStorageMB)}MB. Minimal ${config.MIN_FREE_STORAGE_MB}MB diperlukan.`,
          [{ text: 'OK' }]
        );
        return false;
      }
      if (freeDiskStorageMB < 200) {
        console.warn(`[ActivitySubmission] Low disk space: ${Math.round(freeDiskStorageMB)}MB remaining`);
      }
      return true;
    } catch (error) {
      console.error('[ActivitySubmission] Failed to check disk space:', error);
      return true;
    }
  }, []);

  // Add photo from camera
  const handleAddPhoto = useCallback(async () => {
    if (form.photos.length >= 3) {
      Alert.alert('Maksimal Foto', 'Anda hanya dapat menambahkan maksimal 3 foto.');
      return;
    }

    const hasSpace = await checkDiskSpace();
    if (!hasSpace) { return; }

    const permissionResult = await requestCameraPermission();
    if (!permissionResult.granted) {
      if (permissionResult.message) { Alert.alert('Izin Kamera', permissionResult.message); }
      return;
    }

    try {
      const photo = await mediaService.capturePhoto(false);
      if (photo) {
        setForm((prev) => ({ ...prev, photos: [...prev.photos, photo] }));
        setErrors((prev) => ({ ...prev, photos: undefined }));
        setTimeout(() => { photoListRef.current?.scrollToEnd({ animated: true }); }, 100);
      }
    } catch (error) {
      Alert.alert('Error', error instanceof Error ? error.message : 'Gagal mengambil foto');
    }
  }, [form.photos, checkDiskSpace, photoListRef]);

  // Remove photo
  const handleRemovePhoto = useCallback(async (photoId: string) => {
    const photo = form.photos.find((p) => p.id === photoId);
    if (photo) {
      await mediaService.deletePhoto(photo.uri);
      setForm((prev) => ({ ...prev, photos: prev.photos.filter((p) => p.id !== photoId) }));
    }
  }, [form.photos]);

  // Validate form
  const validateForm = useCallback((): boolean => {
    const newErrors: FormErrors = {};
    if (form.photos.length === 0) { newErrors.photos = 'Tambahkan minimal 1 foto'; }
    if (!form.description.trim()) { newErrors.description = 'Deskripsi wajib diisi'; }
    else if (form.description.length < 5) { newErrors.description = 'Deskripsi minimal 5 karakter'; }
    else if (form.description.length > 500) { newErrors.description = 'Deskripsi maksimal 500 karakter'; }
    if (!form.activityTypeId) { newErrors.activityType = 'Pilih jenis aktivitas'; }
    if (!form.location) { newErrors.location = 'Lokasi GPS diperlukan'; }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [form]);

  // Save draft
  const saveDraft = useCallback(async () => {
    try {
      const draft = {
        photos: form.photos,
        description: form.description,
        activityTypeId: form.activityTypeId,
        timestamp: Date.now(),
      };
      await AsyncStorage.setItem('activity_draft', JSON.stringify(draft));
    } catch (error) {
      console.error('Failed to save draft:', error);
    }
  }, [form]);

  useEffect(() => { saveDraftRef.current = saveDraft; }, [saveDraft]);

  // Restore draft
  const restoreDraft = useCallback(async () => {
    try {
      const draftStr = await AsyncStorage.getItem('activity_draft');
      if (!draftStr) { return; }
      const draft = JSON.parse(draftStr);
      if (Date.now() - draft.timestamp < 24 * 60 * 60 * 1000) {
        Alert.alert(
          'Draft Ditemukan',
          'Anda memiliki draft aktivitas yang belum terkirim. Lanjutkan?',
          [
            { text: 'Hapus', style: 'destructive', onPress: () => AsyncStorage.removeItem('activity_draft') },
            {
              text: 'Lanjutkan',
              onPress: () => {
                setForm((prev) => ({
                  ...prev,
                  photos: draft.photos || [],
                  description: draft.description || '',
                  activityTypeId: draft.activityTypeId || null,
                }));
              },
            },
          ]
        );
      } else {
        await AsyncStorage.removeItem('activity_draft');
      }
    } catch (error) {
      console.error('Failed to restore draft:', error);
    }
  }, []);

  // Initialize on mount
  useEffect(() => {
    getCurrentLocation();
    loadActivityTypes();
    restoreDraft();

    const draftInterval = setInterval(() => {
      const currentForm = formRef.current;
      if (currentForm.description.length >= 5 || currentForm.photos.length > 0) {
        saveDraftRef.current?.();
      }
    }, 30000);

    return () => clearInterval(draftInterval);
  }, []);

  // Reset form after successful submission
  const resetForm = useCallback(() => {
    setForm({ photos: [], description: '', activityTypeId: null, location: null });
    setTimeout(() => { photoListRef.current?.scrollToOffset({ offset: 0, animated: false }); }, 100);
    getCurrentLocation();
  }, [getCurrentLocation, photoListRef]);

  // Submit activity
  const handleSubmit = useCallback(async (
    onNavigateClockIn: () => void,
    onNavigateActivities: () => void,
  ) => {
    if (!currentShift) {
      Alert.alert(
        'Shift Belum Aktif',
        'Anda belum clock-in. Clock-in terlebih dahulu untuk membuat aktivitas.',
        [
          { text: 'Clock In Sekarang', onPress: onNavigateClockIn },
          { text: 'Simpan Draft', onPress: () => saveDraft() },
        ]
      );
      return;
    }

    if (!validateForm()) {
      Alert.alert('Form Tidak Valid', 'Periksa kembali form Anda.');
      return;
    }

    dispatch(setSubmitting(true));

    try {
      const photoBase64Array: string[] = [];
      for (const photo of form.photos) {
        const base64 = await mediaService.convertToBase64(photo);
        photoBase64Array.push(base64);
      }

      const activityData = {
        activity_type_id: form.activityTypeId!,
        description: sanitizeMultilineText(form.description),
        photo_urls: photoBase64Array,
        gps_lat: form.location!.latitude,
        gps_lng: form.location!.longitude,
      };

      if (isOnline) {
        const response = await createActivity(activityData);
        if (response.error) { throw new Error(response.error); }
        if (response.data) {
          await AsyncStorage.removeItem('activity_draft');
          for (const photo of form.photos) { await mediaService.deletePhoto(photo.uri); }
          resetForm();
          Alert.alert('Berhasil', 'Aktivitas berhasil dikirim!', [
            { text: 'OK', onPress: onNavigateActivities },
          ]);
        }
      } else {
        await addToOfflineQueue('activity', activityData);
        await AsyncStorage.removeItem('activity_draft');
        resetForm();
        Alert.alert(
          'Mode Offline',
          'Aktivitas disimpan dan akan dikirim saat online.',
          [{ text: 'OK', onPress: onNavigateActivities }]
        );
      }
    } catch (error) {
      dispatch(setError(error instanceof Error ? error.message : 'Gagal mengirim aktivitas'));
      Alert.alert(
        'Gagal Mengirim',
        'Terjadi kesalahan. Aktivitas disimpan sebagai draft.',
        [
          { text: 'Coba Lagi', onPress: () => handleSubmit(onNavigateClockIn, onNavigateActivities) },
          { text: 'Simpan Draft', onPress: () => saveDraft() },
        ]
      );
    } finally {
      dispatch(setSubmitting(false));
    }
  }, [form, currentShift, isOnline, dispatch, saveDraft, validateForm, resetForm]);

  // Update form fields
  const setDescription = useCallback((text: string) => {
    setForm((prev) => ({ ...prev, description: text }));
    setErrors((prev) => ({ ...prev, description: undefined }));
  }, []);

  const setActivityTypeId = useCallback((id: string) => {
    setForm((prev) => ({ ...prev, activityTypeId: id }));
    setErrors((prev) => ({ ...prev, activityType: undefined }));
  }, []);

  const clearError = useCallback(() => { dispatch(setError('')); }, [dispatch]);

  return {
    form,
    errors,
    isLoadingLocation,
    activityTypes,
    sortedActivityTypes,
    isLoadingTypes,
    isSubmitting,
    isOnline,
    activityError,
    getCurrentLocation,
    loadActivityTypes,
    handleAddPhoto,
    handleRemovePhoto,
    handleSubmit,
    setDescription,
    setActivityTypeId,
    saveDraft,
    clearError,
  };
}
