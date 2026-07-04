/**
 * SubmitPhotoCard — Photo grid display and camera/gallery controls.
 */

import React from 'react';
import {
  View,
  Image,
  TouchableOpacity,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import {
  NBCard,
  NBCardContent,
  NBCardHeader,
  NBButton,
  NBText,
} from '../../../components/nb';
import {
  nbColors,
  nbSpacing,
  nbBorders,
  nbRadius,
} from '../../../constants/nbTokens';
import type { Photo } from '../../../services/media/mediaService';

interface SubmitPhotoCardProps {
  photos: Photo[];
  handlePickFromCamera: () => Promise<void>;
  handlePickFromGallery: () => Promise<void>;
  handleRemovePhoto: (idx: number) => void;
  isBusy: boolean;
}

const MIN_PHOTOS = 1;
const MAX_PHOTOS = 5;

const styles = {
  card: { marginBottom: nbSpacing[4] },
  photoGrid: {
    flexDirection: 'row' as const,
    flexWrap: 'wrap' as const,
    gap: nbSpacing[2],
    marginBottom: nbSpacing[3],
  },
  photoWrap: {
    width: 80,
    height: 80,
    borderWidth: nbBorders.widthBase,
    borderColor: nbColors.black,
    borderRadius: nbRadius.base,
    backgroundColor: nbColors.gray200,
    overflow: 'hidden' as const,
    position: 'relative' as const,
  },
  photo: {
    flex: 1,
  },
  photoRemove: {
    position: 'absolute' as const,
    top: 2,
    right: 2,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: nbColors.black,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  photoActions: {
    flexDirection: 'row' as const,
    gap: nbSpacing[3],
  },
  helper: {
    color: nbColors.gray600,
    marginTop: nbSpacing[1],
  },
  emptyText: {
    color: nbColors.gray600,
    marginBottom: nbSpacing[3],
  },
};

export function SubmitPhotoCard(props: SubmitPhotoCardProps) {
  const { t } = useTranslation('pruning');
  const {
    photos,
    handlePickFromCamera,
    handlePickFromGallery,
    handleRemovePhoto,
    isBusy,
  } = props;

  return (
    <NBCard style={styles.card}>
      <NBCardHeader>
        <NBText variant="h3">{t('submitPhotoCard.title')}</NBText>
        <NBText variant="body-sm" style={styles.helper}>
          {t('submitPhotoCard.helper', { min: MIN_PHOTOS, max: MAX_PHOTOS })}
        </NBText>
      </NBCardHeader>
      <NBCardContent>
        {photos.length > 0 ? (
          <View style={styles.photoGrid}>
            {photos.map((p, idx) => (
              <View key={`${p.uri}-${idx}`} style={styles.photoWrap}>
                <Image source={{ uri: p.uri }} style={styles.photo} />
                <TouchableOpacity
                  onPress={() => handleRemovePhoto(idx)}
                  style={styles.photoRemove}
                  accessibilityRole="button"
                  accessibilityLabel={t('submitPhotoCard.removeButtonLabel', { number: idx + 1 })}
                >
                  <MaterialCommunityIcons name="close" size={16} color={nbColors.white} />
                </TouchableOpacity>
              </View>
            ))}
          </View>
        ) : (
          <NBText variant="body-sm" style={styles.emptyText}>
            {t('submitPhotoCard.emptyState')}
          </NBText>
        )}

        <View style={styles.photoActions}>
          <NBButton
            label={t('submitPhotoCard.cameraButton')}
            leftIcon="camera"
            variant="secondary"
            onPress={handlePickFromCamera}
            disabled={photos.length >= MAX_PHOTOS || isBusy}
            style={{ flex: 1 }}
          />
          <NBButton
            label={t('submitPhotoCard.galleryButton')}
            leftIcon="image-multiple"
            variant="secondary"
            onPress={handlePickFromGallery}
            disabled={photos.length >= MAX_PHOTOS || isBusy}
            style={{ flex: 1 }}
          />
        </View>
      </NBCardContent>
    </NBCard>
  );
}
