/**
 * TaskCompletionPhotos Component
 * Renders completion photos and metadata
 */

import React from 'react';
import { View, Image, StyleSheet } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { NBText } from '../../../components/nb';
import { nbColors, nbSpacing, nbBorders, nbRadius } from '../../../constants/nbTokens';
import { formatDateTime } from '../../../utils/dateUtils';
import type { Task } from '../../../types/models.types';

interface TaskCompletionPhotosProps {
  task: Task;
}

export function TaskCompletionPhotos({ task }: TaskCompletionPhotosProps): React.JSX.Element {
  const completionPhotos = task.completion_photo_urls ?? [];

  return (
    <View>
      {task.completed_at && (
        <View style={styles.detailRow}>
          <Icon name="check-circle" size={14} color={nbColors.success} />
          <NBText variant="body-sm" style={styles.detailRowTextStyle}>Selesai {formatDateTime(task.completed_at)}</NBText>
        </View>
      )}
      {task.completion_notes && (
        <NBText variant="body" style={[styles.descriptionStyle, { marginTop: nbSpacing.sm }]}>{task.completion_notes}</NBText>
      )}

      {/* Completion photos */}
      {completionPhotos.length > 0 && (
        <View style={styles.photoGrid}>
          <NBText variant="body-sm" style={styles.photoLabelStyle}>Foto Bukti ({completionPhotos.length})</NBText>
          <View style={styles.photoRow}>
            {completionPhotos.map((uri, index) => (
              <Image
                key={index}
                source={{ uri }}
                style={[
                  styles.completionPhoto,
                  completionPhotos.length === 1 && styles.completionPhotoFull,
                ]}
                resizeMode="cover"
              />
            ))}
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: nbSpacing.xs,
    marginBottom: nbSpacing.xs,
  },
  detailRowTextStyle: {
    flex: 1,
  },
  descriptionStyle: {},
  photoGrid: {
    marginTop: nbSpacing.sm,
  },
  photoLabelStyle: {
    marginBottom: nbSpacing.sm,
  },
  photoRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: nbSpacing.sm,
  },
  completionPhoto: {
    width: 100,
    height: 100,
    borderWidth: nbBorders.widthBase,
    borderColor: nbColors.black,
    borderRadius: nbRadius.sm,
  },
  completionPhotoFull: {
    width: '100%',
    height: 200,
  },
});
