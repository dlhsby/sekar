/**
 * OvertimeSelfiePhotosSection — Clock-in/out selfie verification photos
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
interface OvertimeSelfiePhotosSectionProps {
  shift?: { clock_in_photo_url?: string | null; clock_out_photo_url?: string | null } | null;
  onPhotoPress: (uri: string) => void;
}

export const OvertimeSelfiePhotosSection: React.FC<OvertimeSelfiePhotosSectionProps> = ({
  shift,
  onPhotoPress,
}) => {
  if (!shift || (!shift.clock_in_photo_url && !shift.clock_out_photo_url)) return null;

  return (
    <NBCard style={styles.card}>
      <NBCardHeader>
        <View style={styles.sectionHeaderRow}>
          <MaterialCommunityIcons name="account-circle-outline" size={14} color={nbColors.gray700} style={{ marginRight: nbSpacing.xs }} />
          <NBText variant="mono-sm" color="gray700" uppercase style={{ letterSpacing: 0.6 }}>SELFIE VERIFIKASI</NBText>
        </View>
      </NBCardHeader>
      <NBCardContent>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.photosContainer}
        >
          {shift.clock_in_photo_url && (
            <View style={styles.selfiePhotoContainer}>
              <TouchableOpacity
                onPress={() => onPhotoPress(shift.clock_in_photo_url!)}
                accessibilityRole="button"
                accessibilityLabel="Lihat selfie mulai lembur"
              >
                <Image
                  source={{ uri: shift.clock_in_photo_url }}
                  style={styles.photo as any}
                  resizeMode="cover"
                />
              </TouchableOpacity>
              <NBText variant="body-sm" color="black" style={styles.selfiePhotoLabel}>Mulai Lembur</NBText>
            </View>
          )}
          {shift.clock_out_photo_url && (
            <View style={styles.selfiePhotoContainer}>
              <TouchableOpacity
                onPress={() => onPhotoPress(shift.clock_out_photo_url!)}
                accessibilityRole="button"
                accessibilityLabel="Lihat selfie selesai lembur"
              >
                <Image
                  source={{ uri: shift.clock_out_photo_url }}
                  style={styles.photo as any}
                  resizeMode="cover"
                />
              </TouchableOpacity>
              <NBText variant="body-sm" color="black" style={styles.selfiePhotoLabel}>Selesai Lembur</NBText>
            </View>
          )}
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
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
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
  selfiePhotoContainer: {
    alignItems: 'center',
    gap: nbSpacing.xs,
  },
  selfiePhotoLabel: {
    textAlign: 'center',
  },
});
