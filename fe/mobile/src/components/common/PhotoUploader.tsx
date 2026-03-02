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

import React, { useCallback } from 'react';
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
import { mediaService, type Photo } from '../../services/media';
import { requestCameraPermission } from '../../services/permissions';
import {
  nbColors,
  nbSpacing,
  nbTypography,
  nbBorders,
  nbBorderRadius,
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
  const handleCapture = useCallback(async () => {
    if (photos.length >= maxPhotos) {
      Alert.alert('Maksimal Foto', `Anda hanya dapat menambahkan maksimal ${maxPhotos} foto.`);
      return;
    }

    const permission = await requestCameraPermission();
    if (!permission.granted) {
      if (permission.message) {
        Alert.alert('Izin Kamera', permission.message);
      }
      return;
    }

    try {
      const photo = await mediaService.capturePhoto(false);
      if (photo) {
        onAdd(photo);
      }
    } catch (err) {
      Alert.alert('Error', err instanceof Error ? err.message : 'Gagal mengambil foto');
    }
  }, [photos.length, maxPhotos, onAdd]);

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
            <Image source={{ uri: photo.uri }} style={styles.thumbnail} />
            <TouchableOpacity
              style={styles.removeButton}
              onPress={() => onRemove(photo.id)}
              accessibilityRole="button"
              accessibilityLabel="Hapus foto"
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
            accessibilityLabel="Tambah foto"
          >
            <Text style={styles.addIcon}>+</Text>
            <Text style={styles.addText}>Foto</Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  errorText: {
    fontSize: nbTypography.fontSize.sm,
    color: nbColors.danger,
    marginBottom: nbSpacing.xs,
    fontWeight: nbTypography.fontWeight.medium,
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
    borderRadius: nbBorderRadius.base,
    borderWidth: nbBorders.base,
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
    borderWidth: nbBorders.base,
    borderColor: nbColors.black,
    alignItems: 'center',
    justifyContent: 'center',
    ...nbShadows.sm,
  },
  removeText: {
    color: nbColors.white,
    fontSize: 24,
    fontWeight: nbTypography.fontWeight.bold,
  },
  addButton: {
    width: 160,
    height: 160,
    borderRadius: nbBorderRadius.base,
    borderWidth: nbBorders.base,
    borderColor: nbColors.black,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: nbColors.gray['50'],
  },
  addIcon: {
    fontSize: 32,
    color: nbColors.gray['600'],
  },
  addText: {
    color: nbColors.gray['600'],
    fontSize: nbTypography.fontSize.xs,
    marginTop: nbSpacing.xs,
  },
});
