/**
 * PhotosSection — displays photo gallery with tap-to-enlarge
 */

import React from 'react';
import { ScrollView, TouchableOpacity, Image, type ImageStyle, StyleSheet } from 'react-native';
import { NBCard, NBCardHeader, NBCardContent, NBText } from '../../../components/nb';
import { nbColors, nbSpacing, nbBorders, nbRadius, nbShadows } from '../../../constants/nbTokens';
import type { PruningRequest } from '../../../types/models.types';

interface PhotosSectionProps {
  request: PruningRequest;
  onPhotoPress: (photoUrl: string) => void;
}

const styles = StyleSheet.create({
  sectionTitle: {
    color: nbColors.black,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
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
});

export function PhotosSection({
  request,
  onPhotoPress,
}: PhotosSectionProps): React.JSX.Element | null {
  if (!request.photoUrls || request.photoUrls.length === 0) {
    return null;
  }

  return (
    <NBCard>
      <NBCardHeader>
        <NBText variant="h2" style={styles.sectionTitle}>
          📸 FOTO LOKASI ({request.photoUrls.length})
        </NBText>
      </NBCardHeader>
      <NBCardContent>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.photosContainer}
        >
          {request.photoUrls.map((photoUrl, index) => (
            <TouchableOpacity
              key={`${photoUrl}-${index}`}
              onPress={() => onPhotoPress(photoUrl)}
              accessibilityRole="button"
              accessibilityLabel={`Foto ${index + 1} dari ${request.photoUrls.length}`}
            >
              <Image source={{ uri: photoUrl }} style={styles.photo as ImageStyle} />
            </TouchableOpacity>
          ))}
        </ScrollView>
      </NBCardContent>
    </NBCard>
  );
}
