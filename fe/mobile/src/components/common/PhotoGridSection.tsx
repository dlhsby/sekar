/**
 * PhotoGridSection — reusable horizontal photo gallery with tap-to-enlarge
 * Consolidates PhotosSection, OvertimePhotosSection, OvertimeSelfiePhotosSection
 */

import React, { useMemo } from 'react';
import { ScrollView, TouchableOpacity, Image, View, type ImageStyle, StyleSheet } from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { NBCard, NBCardHeader, NBCardContent, NBText } from '../nb';
import { nbColors, nbSpacing, nbBorders, nbRadius, nbShadows } from '../../constants/nbTokens';

interface PhotoItem {
  url: string;
  label?: string;
}

export interface PhotoGridSectionProps {
  photos: string[] | PhotoItem[];
  onPhotoPress: (photoUrl: string) => void;
  headerType: 'emoji' | 'icon';
  title: string;
  subtitle?: string;
  count?: number;
  iconName?: string;
  testID?: string;
}

const styles = StyleSheet.create({
  sectionTitleEmoji: {
    color: nbColors.black,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sectionHeaderColumn: {
    flexDirection: 'column',
    gap: nbSpacing.xs,
  },
  sectionSubtitle: {
    marginTop: nbSpacing.xs,
  },
  photosContainer: {
    gap: nbSpacing.sm,
    paddingVertical: nbSpacing.xs,
  },
  photo: {
    width: 160,
    height: 160,
    borderRadius: nbRadius.base,
    borderWidth: nbBorders.widthBase,
    borderColor: nbColors.black,
    ...nbShadows.sm,
  },
  photoWithLabelContainer: {
    alignItems: 'center',
    gap: nbSpacing.xs,
  },
  photoLabel: {
    textAlign: 'center',
  },
});

function normalizePhotos(photos: string[] | PhotoItem[]): PhotoItem[] {
  if (Array.isArray(photos)) {
    if (photos.length === 0) return [];
    const first = photos[0];
    if (typeof first === 'string') {
      return (photos as string[]).map((url) => ({ url, label: undefined }));
    }
    return photos as PhotoItem[];
  }
  return [];
}

function getPhotoCount(photos: string[] | PhotoItem[]): number {
  if (Array.isArray(photos)) {
    return photos.length;
  }
  return 0;
}

export function PhotoGridSection({
  photos,
  onPhotoPress,
  headerType,
  title,
  subtitle,
  count,
  iconName,
  testID,
}: PhotoGridSectionProps): React.JSX.Element | null {
  const normalizedPhotos = useMemo(() => normalizePhotos(photos), [photos]);

  if (normalizedPhotos.length === 0) {
    return null;
  }

  const displayCount = count ?? getPhotoCount(photos);
  const hasLabels = normalizedPhotos.some((p) => p.label);

  return (
    <NBCard testID={testID}>
      <NBCardHeader>
        {headerType === 'emoji' ? (
          <NBText variant="h2" style={styles.sectionTitleEmoji}>
            📸 {title} ({displayCount})
          </NBText>
        ) : (
          <View style={styles.sectionHeaderRow}>
            {iconName && (
              <MaterialCommunityIcons
                name={iconName as any}
                size={14}
                color={nbColors.gray700}
                style={{ marginRight: nbSpacing.xs }}
              />
            )}
            <View style={styles.sectionHeaderColumn}>
              <NBText variant="mono-sm" color="gray700" uppercase style={{ letterSpacing: 0.6 }}>
                {title}
              </NBText>
              {subtitle && (
                <NBText variant="body-sm" color="gray600" style={styles.sectionSubtitle}>
                  {subtitle}
                </NBText>
              )}
            </View>
          </View>
        )}
      </NBCardHeader>
      <NBCardContent>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.photosContainer}
        >
          {normalizedPhotos.map((photo, index) => (
            <View
              key={`photo-${photo.url}-${index}`}
              style={hasLabels ? styles.photoWithLabelContainer : undefined}
            >
              <TouchableOpacity
                onPress={() => onPhotoPress(photo.url)}
                accessibilityRole="button"
                accessibilityLabel={
                  photo.label
                    ? `${photo.label} - Foto ${index + 1}`
                    : `Foto ${index + 1} dari ${normalizedPhotos.length}`
                }
              >
                <Image
                  source={{ uri: photo.url }}
                  style={styles.photo as ImageStyle}
                  resizeMode="cover"
                />
              </TouchableOpacity>
              {photo.label && (
                <NBText variant="body-sm" color="black" style={styles.photoLabel}>
                  {photo.label}
                </NBText>
              )}
            </View>
          ))}
        </ScrollView>
      </NBCardContent>
    </NBCard>
  );
}
