/**
 * TaskAssignmentInfo Component
 * Renders creator and assignee information with arrow
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { NBText } from '../../../components/nb';
import { nbColors, nbSpacing } from '../../../constants/nbTokens';
import { formatDateTime } from '../../../utils/dateUtils';
import { formatUser } from '../hooks/taskHelpers';
import type { Task } from '../../../types/models.types';

interface TaskAssignmentInfoProps {
  task: Task;
}

export function TaskAssignmentInfo({ task }: TaskAssignmentInfoProps): React.JSX.Element {
  return (
    <View style={styles.assignRow}>
      <View style={styles.assignBlock}>
        <NBText variant="body-sm" style={styles.assignLabelStyle}>Dibuat oleh</NBText>
        <View style={styles.assignUserRow}>
          <Icon name="account-circle" size={16} color={nbColors.gray500} />
          <NBText variant="body-sm" style={styles.assignValueStyle}>{formatUser(task.creator)}</NBText>
        </View>
        {task.created_at && (
          <NBText variant="caption" style={styles.assignDateStyle}>{formatDateTime(task.created_at)}</NBText>
        )}
      </View>

      <View style={styles.assignArrow}>
        <Icon name="arrow-right" size={20} color={nbColors.gray400} />
      </View>

      <View style={styles.assignBlock}>
        <NBText variant="body-sm" style={styles.assignLabelStyle}>Ditugaskan ke</NBText>
        <View style={styles.assignUserRow}>
          <Icon
            name={task.assigned_to ? 'account' : 'account-question'}
            size={16}
            color={task.assigned_to ? nbColors.primary : nbColors.gray400}
          />
          <NBText variant="body-sm" style={[styles.assignValueStyle, !task.assigned_to && styles.assignValueEmptyStyle]} color={!task.assigned_to ? 'gray400' : undefined}>
            {task.assignee ? formatUser(task.assignee) : task.assigned_to ? '(petugas)' : 'Belum ditugaskan'}
          </NBText>
        </View>
        {task.assigned_at && (
          <NBText variant="caption" style={styles.assignDateStyle}>{formatDateTime(task.assigned_at)}</NBText>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  assignRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: nbSpacing.sm,
  },
  assignBlock: {
    flex: 1,
  },
  assignArrow: {
    paddingTop: nbSpacing.lg,
    alignItems: 'center',
  },
  assignLabelStyle: {
    marginBottom: nbSpacing.xs,
  },
  assignUserRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: nbSpacing.xs,
  },
  assignValueStyle: {
    flex: 1,
  },
  assignValueEmptyStyle: {},
  assignDateStyle: {
    marginTop: 2,
  },
});
