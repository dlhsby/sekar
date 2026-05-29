/**
 * TaskCard — a single task row in the Tugas list, on the shared ListItemCard so
 * Tugas / Aktivitas / Lembur read identically (status pill · created date · title
 * · description · meta · creator).
 */

import React from 'react';
import { StyleSheet } from 'react-native';
import { ListItemCard, type ListItemMeta } from '../../../components/common';
import { nbSpacing } from '../../../constants/nbTokens';
import { taskPill } from '../../../utils/taskStatus';
import { formatDate, formatTime, TASK_PRIORITY_LABEL } from '../../../utils/statusHelpers';
import type { Task } from '../../../types/models.types';

interface TaskCardProps {
  task: Task;
  onPress: () => void;
}

function buildMeta(task: Task): ListItemMeta[] {
  const meta: ListItemMeta[] = [];
  const location = task.area?.name ?? task.rayon?.name;
  if (location) { meta.push({ icon: 'map-marker', label: location }); }
  if (task.deadline) { meta.push({ icon: 'clock-outline', label: formatDate(task.deadline) }); }
  if (task.priority) { meta.push({ icon: 'flag-outline', label: TASK_PRIORITY_LABEL[task.priority] ?? task.priority }); }
  return meta;
}

export function TaskCard({ task, onPress }: TaskCardProps): React.JSX.Element {
  const pill = taskPill(task.status);
  return (
    <ListItemCard
      statusTone={pill.tone}
      statusLabel={pill.label}
      rightText={`${formatDate(task.created_at)} · ${formatTime(task.created_at)}`}
      title={task.title}
      description={task.description || undefined}
      meta={buildMeta(task)}
      creatorText={task.creator ? `${task.creator.role} · ${task.creator.full_name}` : undefined}
      onPress={onPress}
      style={styles.spacing}
      accessibilityLabel={`Detail tugas ${task.title}`}
      testID="task-card"
    />
  );
}

const styles = StyleSheet.create({
  spacing: {
    marginBottom: nbSpacing.sm,
  },
});
