/**
 * useActivityForm Hook
 * Manages activity submission form state, validation, draft persistence, and submission
 * Extracted from ActivitySubmissionScreen for separation of concerns
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { Alert } from 'react-native';
import Geolocation from 'react-native-geolocation-service';
import AsyncStorage from '@react-native-async-storage/async-storage';
import i18n from '../i18n/config';
import { useAppDispatch, useAppSelector } from '../store/store';
import { createActivity } from '../services/api/activitiesApi';
import { getMyActivityTypes } from '../services/api/activityTypesApi';
import { getUsers } from '../services/api/usersApi';
import { setSubmitting, setError } from '../store/slices/activitiesSlice';
import { addToQueue as addToOfflineQueue } from '../services/sync/offlineQueue';
import { mediaService, type Photo } from '../services/media';
import { sanitizeMultilineText } from '../utils/sanitize';
import type { ActivityType, User } from '../types/models.types';

export interface FormState {
  photos: Photo[];
  description: string;
  activityTypeId: string | null;
  taggedUserIds: string[]; // ADR-038: tag co-workers involved in this activity
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

export function useActivityForm() {
  const dispatch = useAppDispatch();

  const { currentShift } = useAppSelector((state) => state.shift);
  const { isOnline } = useAppSelector((state) => state.offline);
  const { isSubmitting, error: activityError } = useAppSelector((state) => state.activities);
  const authUser = useAppSelector((state) => state.auth.user);

  const [form, setForm] = useState<FormState>({
    photos: [],
    description: '',
    activityTypeId: null,
    taggedUserIds: [],
    location: null,
  });

  const [errors, setErrors] = useState<FormErrors>({});
  const [isLoadingLocation, setIsLoadingLocation] = useState(false);
  const [activityTypes, setActivityTypes] = useState<ActivityType[]>([]);
  const [sortedActivityTypes, setSortedActivityTypes] = useState<ActivityType[]>([]);
  const [isLoadingTypes, setIsLoadingTypes] = useState(false);
  const [taggableUsers, setTaggableUsers] = useState<User[]>([]);
  const [isLoadingTaggableUsers, setIsLoadingTaggableUsers] = useState(false);

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
      Alert.alert('Error', i18n.t('activities:submission.noTypesAvailable'));
      if (__DEV__) { console.error('Failed to load activity types:', error); }
    } finally {
      setIsLoadingTypes(false);
    }
  }, []);

  // ADR-038: load co-workers in the same area as the active shift, excluding self.
  // Tagging is a feed-visibility hint, so we keep the scope narrow (same-area peers).
  const loadTaggableUsers = useCallback(async () => {
    const areaId = currentShift?.location_id;
    if (!areaId || !authUser) {
      setTaggableUsers([]);
      return;
    }
    setIsLoadingTaggableUsers(true);
    try {
      const response = await getUsers();
      if (response.data) {
        const peers = response.data.filter(
          (u) => u.id !== authUser.id && u.location_id === areaId,
        );
        setTaggableUsers(peers);
      }
    } catch (error) {
      if (__DEV__) { console.error('Failed to load taggable users:', error); }
    } finally {
      setIsLoadingTaggableUsers(false);
    }
  }, [currentShift?.location_id, authUser]);

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
        if (__DEV__) { console.error('Location error:', error); }
        let errorMessage = i18n.t('activities:locationMessages.locationError');
        if (error.code === 1) { errorMessage = i18n.t('activities:locationMessages.permissionDenied'); }
        else if (error.code === 3) { errorMessage = i18n.t('activities:locationMessages.timeoutError'); }
        else if (error.code === 5) { errorMessage = i18n.t('activities:locationMessages.gpsDisabled'); }
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

  // Add photo (called by PhotoUploader after capture)
  const addPhoto = useCallback((photo: Photo) => {
    setForm((prev) => ({ ...prev, photos: [...prev.photos, photo] }));
    setErrors((prev) => ({ ...prev, photos: undefined }));
  }, []);

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
    if (form.photos.length === 0) { newErrors.photos = i18n.t('activities:validation.photosRequired'); }
    if (!form.description.trim()) { newErrors.description = i18n.t('activities:validation.descriptionRequired'); }
    else if (form.description.length < 5) { newErrors.description = i18n.t('activities:validation.descriptionMinLength'); }
    else if (form.description.length > 500) { newErrors.description = i18n.t('activities:validation.descriptionMaxLength'); }
    if (!form.activityTypeId) { newErrors.activityType = i18n.t('activities:validation.activityTypeRequired'); }
    if (!form.location) { newErrors.location = i18n.t('activities:validation.locationRequired'); }
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
        taggedUserIds: form.taggedUserIds,
        timestamp: Date.now(),
      };
      await AsyncStorage.setItem('activity_draft', JSON.stringify(draft));
    } catch (error) {
      if (__DEV__) { console.error('Failed to save draft:', error); }
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
          i18n.t('activities:draftMessages.found'),
          i18n.t('activities:draftMessages.foundMessage'),
          [
            { text: i18n.t('activities:draftMessages.delete'), style: 'destructive', onPress: () => AsyncStorage.removeItem('activity_draft') },
            {
              text: i18n.t('activities:draftMessages.continue'),
              onPress: () => {
                setForm((prev) => ({
                  ...prev,
                  photos: draft.photos || [],
                  description: draft.description || '',
                  activityTypeId: draft.activityTypeId || null,
                  taggedUserIds: draft.taggedUserIds || [],
                }));
                getCurrentLocation(); // Re-acquire fresh GPS after draft restore
              },
            },
          ]
        );
      } else {
        await AsyncStorage.removeItem('activity_draft');
      }
    } catch (error) {
      if (__DEV__) { console.error('Failed to restore draft:', error); }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- getCurrentLocation is called within Alert callback; it's a stable callback defined in this hook
  }, []);

  // Initialize on mount
  useEffect(() => {
    getCurrentLocation();
    loadActivityTypes();
    loadTaggableUsers();
    restoreDraft();

    const draftInterval = setInterval(() => {
      const currentForm = formRef.current;
      if (currentForm.description.length >= 5 || currentForm.photos.length > 0) {
        saveDraftRef.current?.();
      }
    }, 30000);

    return () => clearInterval(draftInterval);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- loaders are stable callbacks defined in this hook; effect runs once on mount by design
  }, []);

  // Reset form (does NOT clear draft from storage — use clearDraft for that)
  const resetForm = useCallback(() => {
    setForm({ photos: [], description: '', activityTypeId: null, taggedUserIds: [], location: null });
    getCurrentLocation();
  }, [getCurrentLocation]);

  // Clear draft from AsyncStorage
  const clearDraft = useCallback(async () => {
    await AsyncStorage.removeItem('activity_draft');
  }, []);

  // Submit activity
  const handleSubmit = useCallback(async (
    onNavigateClockIn: () => void,
    onNavigateActivities: () => void,
    onValidationFail?: () => void,
  ) => {
    if (!currentShift) {
      Alert.alert(
        i18n.t('activities:submitAlerts.shiftNotActiveTitle'),
        i18n.t('activities:submitAlerts.shiftNotActiveMessage'),
        [
          { text: i18n.t('activities:submitAlerts.clockInButton'), onPress: onNavigateClockIn },
          { text: i18n.t('activities:submitAlerts.saveDraftButton'), onPress: () => saveDraft() },
        ]
      );
      return;
    }

    if (!validateForm()) {
      onValidationFail?.();
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
        // ADR-038: include tagged users (omitted when empty so old payload shape is preserved)
        ...(form.taggedUserIds.length > 0 ? { tagged_user_ids: form.taggedUserIds } : {}),
      };

      if (isOnline) {
        const response = await createActivity(activityData);
        if (response.error) { throw new Error(response.error); }
        if (response.data) {
          // Activity created successfully; the server response only includes id and created_at.
          // The activity will be fetched on next activities list refresh.
          await AsyncStorage.removeItem('activity_draft');
          for (const photo of form.photos) { await mediaService.deletePhoto(photo.uri); }
          resetForm();
          Alert.alert(i18n.t('activities:submitAlerts.successTitle'), i18n.t('activities:submitAlerts.successMessage'), [
            { text: i18n.t('activities:submitAlerts.okButton'), onPress: onNavigateActivities },
          ]);
        }
      } else {
        await addToOfflineQueue('activity', activityData);
        await AsyncStorage.removeItem('activity_draft');
        resetForm();
        Alert.alert(
          i18n.t('activities:submitAlerts.offlineTitle'),
          i18n.t('activities:submitAlerts.offlineMessage'),
          [{ text: i18n.t('activities:submitAlerts.okButton'), onPress: onNavigateActivities }]
        );
      }
    } catch (error) {
      dispatch(setError(error instanceof Error ? error.message : i18n.t('activities:submitAlerts.failureTitle')));
      Alert.alert(
        i18n.t('activities:submitAlerts.failureTitle'),
        i18n.t('activities:submitAlerts.failureMessage'),
        [
          { text: i18n.t('activities:submitAlerts.retryButton'), onPress: () => handleSubmit(onNavigateClockIn, onNavigateActivities) },
          { text: i18n.t('activities:submitAlerts.saveDraftButton'), onPress: () => saveDraft() },
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

  const setTaggedUserIds = useCallback((ids: string[]) => {
    setForm((prev) => ({ ...prev, taggedUserIds: ids }));
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
    taggableUsers,
    isLoadingTaggableUsers,
    getCurrentLocation,
    loadActivityTypes,
    loadTaggableUsers,
    addPhoto,
    handleRemovePhoto,
    handleSubmit,
    setDescription,
    setActivityTypeId,
    setTaggedUserIds,
    saveDraft,
    clearError,
    resetForm,
    clearDraft,
    restoreDraft,
  };
}
