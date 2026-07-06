/**
 * TaskHeader Component
 * Renders task title, description, status, and priority badges
 */

import React from 'react';
import { useTranslation } from 'react-i18next';
import { View, StyleSheet } from 'react-native';
import {
  NBBadge,
  NBText,
} from '../../../components/nb';
import { nbSpacing } from '../../../constants/nbTokens';
import { getStatusLabel, getStatusVariant, getPriorityLabel, getPriorityVariant } from '../../../utils/statusHelpers';
import type { Task } from '../../../types/models.types';

interface TaskHeaderProps {
  task: Task;
}

export function TaskHeader({ task }: TaskHeaderProps): React.JSX.Element {
  const { t } = useTranslation('common');

  return (
    <View>
      {/* Status + Priority row */}
      <View style={styles.badgeRow}>
        <NBBadge text={getStatusLabel(task.status)} color={getStatusVariant(task.status)} />
        <NBBadge text={getPriorityLabel(task.priority)} color={getPriorityVariant(task.priority)} />
      </View>

      {/* Title */}
      <NBText variant="h2" style={styles.titleStyle}>{task.title}</NBText>

      {/* Description */}
      {task.description ? (
        <NBText variant="body" style={styles.descriptionStyle}>{task.description}</NBText>
      ) : (
        <NBText variant="body-sm" style={styles.descriptionEmptyStyle}>{t('ui.noDescription')}</NBText>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  badgeRow: {
    flexDirection: 'row',
    gap: nbSpacing.sm,
    marginBottom: nbSpacing.sm,
  },
  titleStyle: {
    marginBottom: nbSpacing.xs,
  },
  descriptionStyle: {},
  descriptionEmptyStyle: {},
});
