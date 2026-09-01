/**
 * TaskMetadata Component
 * Renders deadline, area, and district information
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { NBText } from '../../../components/nb';
import { nbColors, nbSpacing } from '../../../constants/nbTokens';
import { formatDateTime } from '../../../utils/dateUtils';
import type { Task } from '../../../types/models.types';

interface TaskMetadataProps {
  task: Task;
  isDeadlinePast: boolean;
}

export function TaskMetadata({ task, isDeadlinePast }: TaskMetadataProps): React.JSX.Element {
  return (
    <View style={styles.metaGrid}>
      {task.deadline && (
        <View style={styles.metaItem}>
          <Icon name="calendar-clock" size={14} color={isDeadlinePast ? nbColors.danger : nbColors.gray500} />
          <NBText variant="caption" style={[styles.metaTextStyle, isDeadlinePast && styles.metaTextDangerStyle]}>
            {formatDateTime(task.deadline)}
          </NBText>
        </View>
      )}
      {task.area && (
        <View style={styles.metaItem}>
          <Icon name="map-marker" size={14} color={nbColors.gray500} />
          <NBText variant="caption" style={styles.metaTextStyle}>{task.area.name}</NBText>
        </View>
      )}
      {task.district && (
        <View style={styles.metaItem}>
          <Icon name="map" size={14} color={nbColors.gray500} />
          <NBText variant="caption" style={styles.metaTextStyle}>{task.district.name}</NBText>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  metaGrid: {
    gap: nbSpacing.xs,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: nbSpacing.xs,
  },
  metaTextStyle: {},
  metaTextDangerStyle: {},
});
