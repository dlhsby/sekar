/**
 * usePruningPhotoManagement — Photo capture from camera/gallery, removal, validation.
 */

import { useCallback, useState } from 'react';
import { Alert, Linking } from 'react-native';
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
        title: 'Batas foto',
        body: `Maksimal ${MAX_PHOTOS} foto.`,
      });
      return;
    }
    const perm = await requestCameraPermission();
    if (perm.status !== 'granted') {
      Alert.alert(
        'Izin kamera ditolak',
        'Aktifkan izin kamera di Pengaturan untuk mengambil foto.',
        [
          { text: 'Batal', style: 'cancel' },
          { text: 'Pengaturan', onPress: () => Linking.openSettings() },
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
        title: 'Gagal mengambil foto',
        body: e instanceof Error ? e.message : 'Unknown error',
      });
    }
  }, [photos.length]);

  const handlePickFromGallery = useCallback(async () => {
    const remaining = MAX_PHOTOS - photos.length;
    if (remaining <= 0) {
      NBToast.show({
        level: 'warning',
        title: 'Batas foto',
        body: `Maksimal ${MAX_PHOTOS} foto.`,
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
        title: 'Gagal memilih foto',
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
