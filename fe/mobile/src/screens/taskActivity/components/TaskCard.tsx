/**
 * TaskCard
 * Extracted from TasksActivityScreen — renders a single task item in the list.
 */

import React from 'react';
import { TouchableOpacity, View, Text, StyleSheet } from 'react-native';
import { NBCard, NBBadge } from '../../../components/nb';
import { nbColors, nbSpacing, nbTypography } from '../../../constants/nbTokens';
import type { Task, TaskStatus } from '../../../types/models.types';
import { getTaskStatusLabel, getTaskStatusColor, TASK_PRIORITY_LABEL, formatDate, formatTime } from '../../../utils/statusHelpers';

interface TaskCardProps {
  task: Task;
  onPress: () => void;
}


export function TaskCard({ task, onPress }: TaskCardProps): React.JSX.Element {
  return (
    <TouchableOpacity style={styles.itemCard} onPress={onPress} testID="task-card">
      <NBCard variant="elevated" style={styles.cardInner}>
        {/* Header: primary text + created time | status badge */}
        <View style={styles.itemHeader}>
          <View style={styles.itemHeaderLeft}>
            <Text style={styles.itemPrimary} numberOfLines={1}>
              {task.title}
            </Text>
            <Text style={styles.itemTimestamp}>
              {formatDate(task.created_at)} · {formatTime(task.created_at)}
            </Text>
          </View>
          <View style={styles.itemHeaderRight}>
            <NBBadge
              text={getTaskStatusLabel(task.status)}
              color={getTaskStatusColor(task.status)}
            />
          </View>
        </View>
        {/* Description */}
        {task.description ? (
          <Text style={styles.itemDescription} numberOfLines={2}>
            {task.description}
          </Text>
        ) : null}
        {/* Meta row */}
        <View style={styles.itemMeta}>
          {task.assignee && (
            <Text style={styles.itemMetaChip}>👤 {task.assignee.full_name}</Text>
          )}
          {task.area && (
            <Text style={styles.itemMetaChip}>📍 {task.area.name}</Text>
          )}
          {!task.area && task.rayon && (
            <Text style={styles.itemMetaChip}>🗺️ {task.rayon.name}</Text>
          )}
          {task.priority && (
            <Text style={styles.itemMetaChip}>🔥 {TASK_PRIORITY_LABEL[task.priority] ?? task.priority}</Text>
          )}
          {task.deadline && (
            <Text style={styles.itemMetaChip}>⏰ {formatDate(task.deadline)}</Text>
          )}
          {task.tags && task.tags.length > 0 && (
            <Text style={styles.itemMetaChip}>🏷️ {task.tags.length} tag</Text>
          )}
        </View>
        {/* Creator row */}
        {task.creator && (
          <Text style={styles.itemCreator}>
            👤 {task.creator.role} - {task.creator.full_name}
          </Text>
        )}
      </NBCard>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  itemCard: {
    marginBottom: nbSpacing.sm,
  },
  cardInner: {
    padding: nbSpacing.md,
  },
  itemHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: nbSpacing.xs,
  },
  itemHeaderLeft: {
    flex: 1,
    marginRight: nbSpacing.sm,
  },
  itemHeaderRight: {
    alignItems: 'flex-end',
  },
  itemPrimary: {
    fontSize: nbTypography.fontSize.base,
    fontWeight: nbTypography.fontWeight.bold,
    color: nbColors.black,
    marginBottom: 2,
  },
  itemTimestamp: {
    fontSize: nbTypography.fontSize.xs,
    color: nbColors.gray[500],
  },
  itemDescription: {
    fontSize: nbTypography.fontSize.sm,
    color: nbColors.gray[600],
    marginBottom: nbSpacing.xs,
    lineHeight: 18,
  },
  itemMeta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: nbSpacing.xs,
    marginTop: 2,
  },
  itemMetaChip: {
    fontSize: nbTypography.fontSize.xs,
    color: nbColors.gray[500],
  },
  itemCreator: {
    fontSize: nbTypography.fontSize.xs,
    color: nbColors.gray[500],
    marginTop: nbSpacing.xs,
  },
});
