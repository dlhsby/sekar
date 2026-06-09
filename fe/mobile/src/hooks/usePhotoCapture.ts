/**
 * usePhotoCapture Hook
 * Camera capture, validation, and management for 1-3 photos
 */

import { useState, useCallback } from 'react';
import { Alert } from 'react-native';
import { launchCamera, type ImagePickerResponse } from 'react-native-image-picker';

const MAX_PHOTOS = 3;

export function usePhotoCapture(maxPhotos: number = MAX_PHOTOS) {
  const [photos, setPhotos] = useState<string[]>([]);
  const [isCapturing, setIsCapturing] = useState(false);

  const capturePhoto = useCallback(async () => {
    if (photos.length >= maxPhotos) {
      Alert.alert('Batas Foto', `Maksimal ${maxPhotos} foto`);
      return;
    }

    setIsCapturing(true);
    try {
      const result: ImagePickerResponse = await launchCamera({
        mediaType: 'photo',
        quality: 0.8,
        maxWidth: 1920,
        maxHeight: 1920,
        includeBase64: true,
      });

      if (result.didCancel || !result.assets?.[0]?.base64) {
        return;
      }

      const base64 = `data:image/jpeg;base64,${result.assets[0].base64}`;
      setPhotos((prev) => [...prev, base64]);
    } catch {
      Alert.alert('Error', 'Gagal mengambil foto');
    } finally {
      setIsCapturing(false);
    }
  }, [photos.length, maxPhotos]);

  const removePhoto = useCallback((index: number) => {
    setPhotos((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const clearPhotos = useCallback(() => {
    setPhotos([]);
  }, []);

  return {
    photos,
    capturePhoto,
    removePhoto,
    clearPhotos,
    isCapturing,
    canAddMore: photos.length < maxPhotos,
    photoCount: photos.length,
  };
}
