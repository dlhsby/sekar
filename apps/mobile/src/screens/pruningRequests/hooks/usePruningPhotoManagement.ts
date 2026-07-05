/**
 * usePruningPhotoManagement — Photo capture from camera/gallery, removal, validation.
 */

import { useCallback, useState } from 'react';
import { Alert, Linking } from 'react-native';
import i18n from '../../../i18n/config';
import { mediaService, type Photo } from '../../../services/media/mediaService';
import {
  requestCameraPermission,
} from '../../../services/permissions/permissionService';
import { NBToast } from '../../../components/nb';

const MIN_PHOTOS = 1;
const MAX_PHOTOS = 5;

export function usePruningPhotoManagement() {
  const [photos, setPhotos] = useState<Photo[]>([]);

  const handlePickFromCamera = useCallback(async () => {
    if (photos.length >= MAX_PHOTOS) {
      NBToast.show({
        level: 'warning',
        title: i18n.t('pruning:photoManagement.photoLimitTitle'),
        body: i18n.t('pruning:photoManagement.photoLimitMessage', { max: MAX_PHOTOS }),
      });
      return;
    }
    const perm = await requestCameraPermission();
    if (perm.status !== 'granted') {
      Alert.alert(
        i18n.t('pruning:photoManagement.cameraPermissionDeniedTitle'),
        i18n.t('pruning:photoManagement.cameraPermissionDeniedMessage'),
        [
          { text: i18n.t('pruning:photoManagement.cancelButton'), style: 'cancel' },
          { text: i18n.t('pruning:photoManagement.settingsButton'), onPress: () => Linking.openSettings() },
        ],
      );
      return;
    }
    try {
      const photo = await mediaService.capturePhoto();
      if (photo) {
        setPhotos((prev) => [...prev, photo]);
      }
    } catch (e) {
      NBToast.show({
        level: 'danger',
        title: i18n.t('pruning:photoManagement.capturePhotoErrorTitle'),
        body: e instanceof Error ? e.message : 'Unknown error',
      });
    }
  }, [photos.length]);

  const handlePickFromGallery = useCallback(async () => {
    const remaining = MAX_PHOTOS - photos.length;
    if (remaining <= 0) {
      NBToast.show({
        level: 'warning',
        title: i18n.t('pruning:photoManagement.photoLimitTitle'),
        body: i18n.t('pruning:photoManagement.photoLimitMessage', { max: MAX_PHOTOS }),
      });
      return;
    }
    try {
      const newPhotos = await mediaService.pickFromGallery(remaining);
      if (newPhotos.length > 0) {
        setPhotos((prev) => [...prev, ...newPhotos].slice(0, MAX_PHOTOS));
      }
    } catch (e) {
      NBToast.show({
        level: 'danger',
        title: i18n.t('pruning:photoManagement.pickPhotoErrorTitle'),
        body: e instanceof Error ? e.message : 'Unknown error',
      });
    }
  }, [photos.length]);

  const handleRemovePhoto = useCallback((idx: number) => {
    setPhotos((prev) => prev.filter((_, i) => i !== idx));
  }, []);

  return {
    photos,
    setPhotos,
    handlePickFromCamera,
    handlePickFromGallery,
    handleRemovePhoto,
    MIN_PHOTOS,
    MAX_PHOTOS,
  };
}
