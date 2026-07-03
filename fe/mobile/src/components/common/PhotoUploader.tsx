/**
 * PhotoUploader
 * Reusable photo capture + display component.
 * Handles camera permission, capture, compression (via mediaService), and removal.
 * Used in TaskCompleteScreen, ActivitySubmissionScreen, OvertimeSubmitScreen.
 *
 * Props:
 *   photos       — current Photo[] array (parent-controlled state)
 *   onAdd        — called with new Photo after capture succeeds
 *   onRemove     — called with photo.id when user taps remove
 *   maxPhotos    — max allowed photos, default 3
 *   error        — optional validation error string shown above the list
 *   style        — optional outer container style override
 */

import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  type ViewStyle,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { mediaService, type Photo } from '../../services/media';
import { requestCameraPermission } from '../../services/permissions';
import { ImagePreviewModal } from './ImagePreviewModal';
import {
  nbColors,
  nbSpacing,
  nbType,
  nbBorders,
  nbRadius,
  nbShadows,
} from '../../constants/nbTokens';

const DEFAULT_MAX = 3;

export interface PhotoUploaderProps {
  photos: Photo[];
  onAdd: (photo: Photo) => void;
  onRemove: (photoId: string) => void;
  maxPhotos?: number;
  error?: string;
  style?: ViewStyle;
}

export function PhotoUploader({
  photos,
  onAdd,
  onRemove,
  maxPhotos = DEFAULT_MAX,
  error,
  style,
}: PhotoUploaderProps): React.JSX.Element {
  const { t } = useTranslation('components');
  const [previewUri, setPreviewUri] = useState<string | null>(null);

  const captureFromCamera = useCallback(async () => {
    const permission = await requestCameraPermission();
    if (!permission.granted) {
      if (permission.message) {
        Alert.alert(t('photoUploader.cameraPermissionTitle'), permission.message);
      }
      return;
    }
    try {
      const photo = await mediaService.capturePhoto(false);
      if (photo) { onAdd(photo); }
    } catch (err) {
      Alert.alert('Error', err instanceof Error ? err.message : t('photoUploader.capturePhotoError'));
    }
  }, [onAdd, t]);

  const pickFromGallery = useCallback(async () => {
    try {
      const remaining = maxPhotos - photos.length;
      const picked = await mediaService.pickFromGallery(remaining);
      picked.forEach((p) => onAdd(p));
    } catch (err) {
      Alert.alert('Error', err instanceof Error ? err.message : t('photoUploader.pickPhotoError'));
    }
  }, [photos.length, maxPhotos, onAdd, t]);

  const handleCapture = useCallback(() => {
    if (photos.length >= maxPhotos) {
      Alert.alert(t('photoUploader.maxPhotosTitle'), t('photoUploader.maxPhotosMessage', { max: maxPhotos }));
      return;
    }
    // May 12 — let the user pick camera OR gallery, mirroring the
    // standard pattern in TaskCompleteScreen / ActivitySubmissionScreen.
    Alert.alert(
      t('photoUploader.addPhotoTitle'),
      t('photoUploader.addPhotoMessage'),
      [
        { text: t('photoUploader.cameraOption'), onPress: () => { captureFromCamera(); } },
        { text: t('photoUploader.galleryOption'), onPress: () => { pickFromGallery(); } },
        { text: t('photoUploader.cancelOption'), style: 'cancel' },
      ],
      { cancelable: true },
    );
  }, [photos.length, maxPhotos, captureFromCamera, pickFromGallery, t]);

  return (
    <View style={style}>
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.list}
        contentContainerStyle={styles.listContent}
      >
        {photos.map((photo) => (
          <View key={photo.id} style={styles.photoItem}>
            <TouchableOpacity
              onPress={() => setPreviewUri(photo.uri)}
              accessibilityRole="button"
              accessibilityLabel={t('photoUploader.viewPhotoLabel')}
              accessibilityHint={t('photoUploader.viewPhotoHint')}
            >
              <Image source={{ uri: photo.uri }} style={styles.thumbnail} />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.removeButton}
              onPress={() => onRemove(photo.id)}
              accessibilityRole="button"
              accessibilityLabel={t('photoUploader.removePhotoLabel')}
            >
              <Text style={styles.removeText}>✕</Text>
            </TouchableOpacity>
          </View>
        ))}
        {photos.length < maxPhotos && (
          <TouchableOpacity
            style={styles.addButton}
            onPress={handleCapture}
            testID="add-photo-button"
            accessibilityRole="button"
            accessibilityLabel={t('photoUploader.addPhotoLabel')}
          >
            <Text style={styles.addIcon}>+</Text>
            <Text style={styles.addText}>{t('photoUploader.photoButtonText')}</Text>
          </TouchableOpacity>
        )}
      </ScrollView>
      <ImagePreviewModal
        uri={previewUri}
        onClose={() => setPreviewUri(null)}
        title={t('photoUploader.previewTitle')}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  errorText: {
    fontSize: nbType.bodySm.fontSize,
    color: nbColors.danger,
    marginBottom: nbSpacing.xs,
    fontWeight: nbType.bodyLg.fontWeight,
  },
  list: {
    marginTop: nbSpacing.sm,
  },
  listContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  photoItem: {
    marginRight: nbSpacing.sm,
    position: 'relative',
  },
  thumbnail: {
    width: 160,
    height: 160,
    borderRadius: nbRadius.base,
    borderWidth: nbBorders.widthBase,
    borderColor: nbColors.black,
  },
  removeButton: {
    position: 'absolute',
    top: -12,
    right: -12,
    backgroundColor: nbColors.danger,
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: nbBorders.widthBase,
    borderColor: nbColors.black,
    alignItems: 'center',
    justifyContent: 'center',
    ...nbShadows.sm,
  },
  removeText: {
    color: nbColors.white,
    fontSize: 24,
    fontWeight: nbType.h1.fontWeight,
  },
  addButton: {
    width: 160,
    height: 160,
    borderRadius: nbRadius.base,
    borderWidth: nbBorders.widthBase,
    borderColor: nbColors.black,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: nbColors.gray50,
  },
  addIcon: {
    fontSize: 32,
    color: nbColors.gray600,
  },
  addText: {
    color: nbColors.gray600,
    fontSize: nbType.caption.fontSize,
    marginTop: nbSpacing.xs,
  },
});
