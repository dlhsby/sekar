/**
 * TaskCard
 * Extracted from TasksActivityScreen — renders a single task item in the list.
 */

import React from 'react';
import { TouchableOpacity, View, StyleSheet } from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { NBCard, NBBadge, NBText } from '../../../components/nb';
import { nbColors, nbSpacing } from '../../../constants/nbTokens';
import type { Task, TaskStatus } from '../../../types/models.types';
import { getTaskStatusLabel, getTaskStatusColor, TASK_PRIORITY_LABEL, formatDate, formatTime } from '../../../utils/statusHelpers';
import { PlantStatusChip } from './PlantStatusChip';

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
            <NBText variant="body" style={styles.itemPrimary} numberOfLines={1}>
              {task.title}
            </NBText>
            <NBText variant="caption" color="gray500" style={styles.itemTimestamp}>
              {formatDate(task.created_at)} · {formatTime(task.created_at)}
            </NBText>
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
          <NBText variant="body-sm" color="gray600" style={styles.itemDescription} numberOfLines={2}>
            {task.description}
          </NBText>
        ) : null}
        {/* Meta row */}
        <View style={styles.itemMeta}>
          {task.assignee && (
            <View style={styles.itemMetaChip}>
              <MaterialCommunityIcons name="account" size={11} color={nbColors.gray500} />
              <NBText variant="caption" color="gray500"> {task.assignee.full_name}</NBText>
            </View>
          )}
          {task.area && (
            <View style={styles.itemMetaChip}>
              <MaterialCommunityIcons name="map-marker" size={11} color={nbColors.gray500} />
              <NBText variant="caption" color="gray500"> {task.area.name}</NBText>
            </View>
          )}
          {!task.area && task.rayon && (
            <View style={styles.itemMetaChip}>
              <MaterialCommunityIcons name="map-outline" size={11} color={nbColors.gray500} />
              <NBText variant="caption" color="gray500"> {task.rayon.name}</NBText>
            </View>
          )}
          {task.priority && (
            <View style={styles.itemMetaChip}>
              <MaterialCommunityIcons name="alert-circle-outline" size={11} color={nbColors.gray500} />
              <NBText variant="caption" color="gray500"> {TASK_PRIORITY_LABEL[task.priority] ?? task.priority}</NBText>
            </View>
          )}
          {task.deadline && (
            <View style={styles.itemMetaChip}>
              <MaterialCommunityIcons name="clock-outline" size={11} color={nbColors.gray500} />
              <NBText variant="caption" color="gray500"> {formatDate(task.deadline)}</NBText>
            </View>
          )}
          {task.tags && task.tags.length > 0 && (
            <View style={styles.itemMetaChip}>
              <MaterialCommunityIcons name="tag-outline" size={11} color={nbColors.gray500} />
              <NBText variant="caption" color="gray500"> {task.tags.length} tag</NBText>
            </View>
          )}
          {/* Plant status for pruning tasks with area assigned */}
          {task.area_id && (
            <PlantStatusChip areaId={task.area_id} taskTitle={task.title} />
          )}
        </View>
        {/* Creator row */}
        {task.creator && (
          <View style={styles.itemCreatorRow}>
            <MaterialCommunityIcons name="account-outline" size={11} color={nbColors.gray500} />
            <NBText variant="caption" color="gray500"> {task.creator.role} - {task.creator.full_name}</NBText>
          </View>
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
    fontWeight: '700',
    color: nbColors.black,
    marginBottom: 2,
  },
  itemTimestamp: {},
  itemDescription: {
    marginBottom: nbSpacing.xs,
  },
  itemMeta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: nbSpacing.xs,
    marginTop: 2,
  },
  itemMetaChip: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  itemCreatorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: nbSpacing.xs,
  },
});
