/**
 * OvertimePhotosSection — Photo gallery section (evidence photos)
 */

import React from 'react';
import { View, ScrollView, Image, TouchableOpacity, StyleSheet } from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import {
  NBCard,
  NBCardHeader,
  NBCardContent,
  NBText,
} from '../../../components/nb';
import {
  nbColors,
  nbSpacing,
  nbBorders,
  nbRadius,
  nbShadows,
} from '../../../constants/nbTokens';

interface OvertimePhotosSectionProps {
  photoUrls?: string[];
  onPhotoPress: (uri: string) => void;
}

export const OvertimePhotosSection: React.FC<OvertimePhotosSectionProps> = ({
  photoUrls,
  onPhotoPress,
}) => {
  if (!photoUrls || photoUrls.length === 0) return null;

  return (
    <NBCard style={styles.card}>
      <NBCardHeader>
        <View style={styles.headerColumn}>
          <View style={styles.sectionHeaderRow}>
            <MaterialCommunityIcons name="image-multiple-outline" size={14} color={nbColors.gray700} style={{ marginRight: nbSpacing.xs }} />
            <NBText variant="mono-sm" color="gray700" uppercase style={{ letterSpacing: 0.6 }}>FOTO BUKTI</NBText>
          </View>
          <NBText variant="body-sm" color="gray600" style={styles.sectionSubtitle}>{photoUrls.length} foto dilampirkan</NBText>
        </View>
      </NBCardHeader>
      <NBCardContent>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.photosContainer}
        >
          {photoUrls.map((url, index) => (
            <TouchableOpacity
              key={index}
              onPress={() => onPhotoPress(url)}
              accessibilityRole="button"
              accessibilityLabel="Lihat foto penuh"
              accessibilityHint="Ketuk untuk melihat foto dalam ukuran penuh"
            >
              <Image
                source={{ uri: url }}
                style={styles.photo as any}
                resizeMode="cover"
              />
            </TouchableOpacity>
          ))}
        </ScrollView>
      </NBCardContent>
    </NBCard>
  );
};

const styles = StyleSheet.create({
  card: {
    marginHorizontal: nbSpacing.md,
    marginBottom: nbSpacing.md,
    ...nbShadows.sm,
  },
  headerColumn: {
    flexDirection: 'column',
    gap: nbSpacing.xs,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
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
});
